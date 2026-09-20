/**
 * src/lib/agent.ts
 *
 * Core logic for the AdminAgent autonomous agent.
 *
 * WHY THE SHAPE OF THIS FILE:
 * Vercel's free-tier serverless functions time out at 10s. A full
 * "research the company -> ask the AI to draft an email -> send the email"
 * pipeline can easily take longer than that if it runs as one blocking call.
 *
 * The fix isn't to make the pipeline faster — it's to never let the HTTP
 * response wait on the whole pipeline at once. So `runAdminAgent` doesn't
 * return a single value at the end; it accepts an `onStep` callback and
 * invokes it after each stage completes. The API route (Next.js Route
 * Handler) wraps this in a `ReadableStream` and flushes bytes to the client
 * as each `onStep` fires. That keeps the connection "alive" with a steady
 * trickle of data, which is what actually prevents the platform from
 * killing the function — Vercel's timeout is about the function's total
 * execution wall-clock time, not about client inactivity, so streaming
 * doesn't raise the hard limit, but it does mean the user sees real-time
 * progress instead of a blank spinner, and it lets you redesign each stage
 * as its own short-lived call later (see note at the bottom of this file)
 * if a single run ever risks exceeding 10s.
 *
 * `runAdminAgent(taskDescription, userId)` keeps exactly the signature
 * requested. Streaming hooks (`onStep`, `taskId`) are passed as an optional
 * third argument so the function still works if called with just two args.
 */

import Groq from "groq-sdk";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Clients (server-side only — this file must never be imported into
// client components; it uses the service role key and secret API keys).
// ---------------------------------------------------------------------------

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

const GROQ_MODEL = "openai/gpt-oss-120b";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentStepName =
    | "task_created"
    | "research"
    | "draft_email"
    | "send_email"
    | "completed"
    | "failed";

export interface AgentStep {
    step: AgentStepName;
    message: string;
    data?: Record<string, unknown>;
    timestamp: string;
}

/** Called after every stage of the pipeline finishes. Used to stream progress. */
export type OnStepCallback = (step: AgentStep) => void | Promise<void>;

export interface RunAdminAgentOptions {
    /** Existing task row to attach logs to. If omitted, a new task is created. */
    taskId?: string;
    /** Fired after each pipeline stage — wire this to a ReadableStream controller. */
    onStep?: OnStepCallback;
    /** Best-effort guess at target company, e.g. "Netflix". If omitted, the AI infers it. */
    targetCompany?: string;
    /** Where should the cancellation/negotiation email actually be sent? */
    recipientEmail?: string;
    /** The user's own email, used as the "from" identity / reply context. */
    userEmail?: string;
}

export interface RunAdminAgentResult {
    taskId: string;
    status: "completed" | "failed";
    emailSent: boolean;
    summary: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function now(): string {
    return new Date().toISOString();
}

/** Writes a row to agent_logs (service role key bypasses RLS) and fires onStep. */
async function emitStep(
    taskId: string,
    step: AgentStepName,
    message: string,
    onStep: OnStepCallback | undefined,
    data?: Record<string, unknown>,
    aiPrompt?: string,
    aiResponse?: string
): Promise<void> {
    const payload: AgentStep = { step, message, data, timestamp: now() };

    // Best-effort logging — a logging failure should never kill the pipeline.
    try {
        await supabaseAdmin.from("agent_logs").insert({
            task_id: taskId,
            step_name: step,
            ai_prompt: aiPrompt ?? null,
            ai_response: aiResponse ?? null,
        });
    } catch (err) {
        console.error("agent_logs insert failed:", err);
    }

    if (onStep) {
        await onStep(payload);
    }
}

// ---------------------------------------------------------------------------
// Stage 1: Web research via Serper.dev
// ---------------------------------------------------------------------------

interface SerperResult {
    title: string;
    link: string;
    snippet: string;
}

async function searchCancellationPolicy(companyName: string): Promise<SerperResult[]> {
    const response = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
            "X-API-KEY": process.env.SERPER_API_KEY!,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            q: `${companyName} how to cancel subscription customer support email policy`,
            num: 5,
        }),
    });

    if (!response.ok) {
        throw new Error(`Serper API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    const organic = (data.organic ?? []) as Array<{
        title?: string;
        link?: string;
        snippet?: string;
    }>;

    return organic.slice(0, 5).map((r) => ({
        title: r.title ?? "",
        link: r.link ?? "",
        snippet: r.snippet ?? "",
    }));
}

// ---------------------------------------------------------------------------
// Stage 2: Draft the cancellation/negotiation email via Groq
// ---------------------------------------------------------------------------

async function draftEmailWithGroq(
    taskDescription: string,
    companyName: string,
    researchContext: SerperResult[],
    userEmail: string
): Promise<{ subject: string; body: string; raw: string; prompt: string }> {
    const contextBlock = researchContext
        .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.link}`)
        .join("\n\n");

    const systemPrompt =
        "You are AdminAgent, an assistant that drafts polite, firm, effective " +
        "emails on behalf of a user to cancel subscriptions or negotiate bills. " +
        'Respond ONLY with valid JSON of the shape {"subject": string, "body": string}. ' +
        "No markdown, no code fences, no commentary outside the JSON.";

    const userPrompt =
        `Task: ${taskDescription}\n` +
        `Target company: ${companyName}\n` +
        `User's email (for signing off): ${userEmail}\n\n` +
        `Research notes gathered from the web about this company's cancellation ` +
        `process (may be incomplete or irrelevant — use judgment):\n\n${contextBlock || "No research results found."}\n\n` +
        `Write a concise, polite, effective email requesting the cancellation ` +
        `(or renegotiation, if the task implies a bill negotiation). Reference ` +
        `specifics from the research notes only if they're genuinely relevant. ` +
        `Sign off as the user.`;

    const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 700,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";

    let parsed: { subject: string; body: string };
    try {
        // Strip stray code fences in case the model ignores instructions.
        const cleaned = raw.replace(/^```json\s*|^```\s*|```$/g, "").trim();
        parsed = JSON.parse(cleaned);
    } catch {
        // Fallback: treat the whole response as the body if JSON parsing fails.
        parsed = { subject: `Cancellation Request — ${companyName}`, body: raw };
    }

    return { ...parsed, raw, prompt: userPrompt };
}

// ---------------------------------------------------------------------------
// Stage 3: Send the email via Resend
// ---------------------------------------------------------------------------

async function sendEmailViaResend(
    to: string,
    subject: string,
    body: string,
    const fromLabel = "AdminAgent <onboarding@resend.dev>";
): Promise<{ id: string | null }> {
    const { data, error } = await resend.emails.send({
        from: fromLabel,
        to,
        subject,
        text: body,
    });

    if (error) {
        throw new Error(`Resend API error: ${error.message}`);
    }

    return { id: data?.id ?? null };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

/**
 * Runs the full AdminAgent pipeline: research -> draft -> send.
 * Call `onStep` (via options) from an API route to stream progress to the UI.
 */
export async function runAdminAgent(
    taskDescription: string,
    userId: string,
    options: RunAdminAgentOptions = {}
): Promise<RunAdminAgentResult> {
    const { onStep, targetCompany, recipientEmail, userEmail } = options;
    let taskId = options.taskId;

    try {
        // ---- Setup: ensure we have a task row to attach logs to -------------
        if (!taskId) {
            const { data: task, error } = await supabaseAdmin
                .from("tasks")
                .insert({
                    user_id: userId,
                    task_type: "cancel_subscription",
                    target_company: targetCompany ?? "unknown",
                    status: "pending",
                })
                .select()
                .single();

            if (error || !task) {
                throw new Error(`Failed to create task: ${error?.message}`);
            }
            taskId = task.id as string;
        }

        await emitStep(taskId, "task_created", `Task ${taskId} started.`, onStep, {
            taskDescription,
        });

        // ---- Stage 1: Research ----------------------------------------------
        await supabaseAdmin.from("tasks").update({ status: "researching" }).eq("id", taskId);

        const companyGuess = targetCompany ?? inferCompanyName(taskDescription);
        const research = await searchCancellationPolicy(companyGuess);

        await emitStep(
            taskId,
            "research",
            `Found ${research.length} relevant result(s) for "${companyGuess}".`,
            onStep,
            { results: research }
        );

        // ---- Stage 2: Draft email --------------------------------------------
        await supabaseAdmin.from("tasks").update({ status: "drafting" }).eq("id", taskId);

        const draft = await draftEmailWithGroq(
            taskDescription,
            companyGuess,
            research,
            userEmail ?? "the user"
        );

        await emitStep(
            taskId,
            "draft_email",
            `Drafted email: "${draft.subject}"`,
            onStep,
            { subject: draft.subject, body: draft.body },
            draft.prompt,
            draft.raw
        );

        // ---- Stage 3: Send email ----------------------------------------------
        let emailSent = false;
        if (recipientEmail) {
            await sendEmailViaResend(recipientEmail, draft.subject, draft.body);
            emailSent = true;

            await emitStep(taskId, "send_email", `Email sent to ${recipientEmail}.`, onStep, {
                recipientEmail,
            });
        } else {
            await emitStep(
                taskId,
                "send_email",
                "No recipient email provided — skipped sending, email saved as a draft.",
                onStep
            );
        }

        await supabaseAdmin.from("tasks").update({ status: "completed" }).eq("id", taskId);

        const summary = emailSent
            ? `Cancellation email sent to ${recipientEmail} on your behalf.`
            : `Draft email prepared for ${companyGuess}. Provide a recipient email to send it.`;

        await emitStep(taskId, "completed", summary, onStep);

        return { taskId, status: "completed", emailSent, summary };
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";

        if (taskId) {
            await supabaseAdmin.from("tasks").update({ status: "failed" }).eq("id", taskId);
            await emitStep(taskId, "failed", `Agent failed: ${message}`, onStep);
        }

        return {
            taskId: taskId ?? "unknown",
            status: "failed",
            emailSent: false,
            summary: `Failed: ${message}`,
        };
    }
}

/** Very rough fallback extractor if no explicit target company is given. */
function inferCompanyName(taskDescription: string): string {
    const match = taskDescription.match(
        /(?:cancel|negotiate|contact)\s+(?:my\s+)?([A-Z][a-zA-Z0-9+&' ]{1,40})/
    );
    return match?.[1]?.trim() ?? taskDescription.slice(0, 40);
}

// ---------------------------------------------------------------------------
// USAGE FROM AN API ROUTE (not part of this file — shown here only as a
// comment so the intended streaming pattern is clear for the next step):
//
// export async function POST(req: Request) {
//   const { taskDescription, userId, recipientEmail, userEmail } = await req.json();
//
//   const stream = new ReadableStream({
//     async start(controller) {
//       const encoder = new TextEncoder();
//       await runAdminAgent(taskDescription, userId, {
//         recipientEmail,
//         userEmail,
//         onStep: (step) => {
//           controller.enqueue(encoder.encode(JSON.stringify(step) + "\n"));
//         },
//       });
//       controller.close();
//     },
//   });
//
//   return new Response(stream, {
//     headers: { "Content-Type": "application/x-ndjson" },
//   });
// }
//
// If a single stage (e.g. research) ever risks pushing total runtime past
// 10s on its own, split the pipeline further: persist `taskId` + `status`
// after each stage (already done above), and have the client re-POST to
// resume from the next stage rather than trying to run the whole thing in
// one invocation.
// ---------------------------------------------------------------------------