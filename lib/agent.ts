/**
 * src/lib/agent.ts
 *
 * Core logic for the AdminAgent autonomous agent.
 */

import Groq from "groq-sdk";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Clients (server-side only)
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

// Using a reliable, fast Groq model
const GROQ_MODEL = "llama3-8b-8192";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentStepName =
    | "searching"
    | "drafting"
    | "sending"
    | "sent"
    | "complete"
    | "failed";

export interface AgentStep {
    step: AgentStepName;
    message: string;
    data?: Record<string, unknown>;
    timestamp: string;
}

export type OnStepCallback = (step: AgentStep) => void | Promise<void>;

export interface RunAdminAgentOptions {
    taskId?: string;
    onStep?: OnStepCallback;
    targetCompany?: string;
    recipientEmail?: string;
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
    const organic = (data.organic ?? []) as Array<{ title?: string; link?: string; snippet?: string }>;

    return organic.slice(0, 5).map((r) => ({
        title: r.title ?? "",
        link: r.link ?? "",
        snippet: r.snippet ?? "",
    }));
}

// ---------------------------------------------------------------------------
// Stage 2: Draft the email via Groq
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
        "You are AdminAgent. Respond ONLY with valid JSON of the shape " +
        '{"subject": string, "body": string}. No markdown, no code fences.';

    const userPrompt =
        `Task: ${taskDescription}\n` +
        `Target company: ${companyName}\n` +
        `User's email: ${userEmail}\n\n` +
        `Research notes:\n${contextBlock || "No research results found."}\n\n` +
        `Write a concise, polite, effective email. Sign off as the user.`;

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
        const cleaned = raw.replace(/^```json\s*|^```\s*|```$/g, "").trim();
        parsed = JSON.parse(cleaned);
    } catch {
        parsed = { subject: `Request — ${companyName}`, body: raw };
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
    fromLabel: string = "AdminAgent <onboarding@resend.dev>"
): Promise<{ id: string | null }> {
    const { data, error } = await resend.emails.send({
        from: fromLabel,
        to,
        subject,
        html: body,
    });

    if (error) {
        console.error("Resend error:", error);
        throw error;
    }

    return { id: data?.id ?? null };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export async function runAdminAgent(
    taskDescription: string,
    userId: string,
    options: RunAdminAgentOptions = {}
): Promise<RunAdminAgentResult> {
    const { onStep, targetCompany, recipientEmail, userEmail } = options;
    let taskId = options.taskId;

    try {
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

            if (error || !task) throw new Error(`Failed to create task: ${error?.message}`);
            taskId = task.id as string;
        }

        // 1. SEARCHING
        await supabaseAdmin.from("tasks").update({ status: "researching" }).eq("id", taskId);
        await emitStep(taskId, "searching", "Searching", onStep);

        const companyGuess = targetCompany ?? inferCompanyName(taskDescription);
        const research = await searchCancellationPolicy(companyGuess);

        // 2. DRAFTING
        await supabaseAdmin.from("tasks").update({ status: "drafting" }).eq("id", taskId);
        await emitStep(taskId, "drafting", "Drafting", onStep);

        const draft = await draftEmailWithGroq(
            taskDescription,
            companyGuess,
            research,
            userEmail ?? "the user"
        );

        // 3. SENDING
        let emailSent = false;
        if (recipientEmail) {
            await emitStep(taskId, "sending", "Sending", onStep);
            await sendEmailViaResend(recipientEmail, draft.subject, draft.body);
            emailSent = true;
            await emitStep(taskId, "sent", "Sent", onStep);
        } else {
            await emitStep(taskId, "sent", "Sent (Draft only)", onStep);
        }

        // 4. COMPLETE
        await supabaseAdmin.from("tasks").update({ status: "completed" }).eq("id", taskId);

        const summary = emailSent
            ? `Email sent to ${recipientEmail}.`
            : `Draft prepared for ${companyGuess}.`;

        await emitStep(
            taskId,
            "complete",
            "Complete",
            onStep,
            {
                research: research.map(r => r.snippet).join("\n"),
                draft: draft.body
            }
        );

        return { taskId, status: "completed", emailSent, summary };
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";

        if (taskId) {
            await supabaseAdmin.from("tasks").update({ status: "failed" }).eq("id", taskId);
            await emitStep(taskId, "failed", "Failed", onStep, { error: message });
        }

        return {
            taskId: taskId ?? "unknown",
            status: "failed",
            emailSent: false,
            summary: `Failed: ${message}`,
        };
    }
}

function inferCompanyName(taskDescription: string): string {
    const match = taskDescription.match(/(?:cancel|negotiate|contact)\s+(?:my\s+)?([A-Z][a-zA-Z0-9+&' ]{1,40})/i);
    return match?.[1]?.trim() ?? taskDescription.slice(0, 40);
}