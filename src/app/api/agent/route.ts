import { runAdminAgent } from "@/lib/agent";
import type { AgentStep } from "@/lib/agent";

// Free-tier note: `maxDuration` is a hint, not a guarantee — Vercel's Hobby
// plan hard-caps serverless function execution at 10s regardless of this
// value. Streaming doesn't raise that ceiling; it just means the user sees
// progress instead of a blank screen while the function is alive. If a run
// risks exceeding 10s, split the pipeline (see the note at the bottom of
// agent.ts) rather than relying on this number.
export const runtime = "nodejs";
export const maxDuration = 60;

interface AgentRequestBody {
    taskDescription?: string;
    userId?: string;
    userEmail?: string;
    recipientEmail?: string;
}

export async function POST(req: Request) {
    let body: AgentRequestBody;

    try {
        body = await req.json();
    } catch {
        return new Response(JSON.stringify({ error: "Request body must be valid JSON." }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    const { taskDescription, userId, userEmail, recipientEmail } = body;

    if (!taskDescription || typeof taskDescription !== "string") {
        return new Response(
            JSON.stringify({ error: "`taskDescription` is required." }),
            { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    if (!userId || typeof userId !== "string") {
        return new Response(JSON.stringify({ error: "`userId` is required." }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            // Each `onStep` fire is written as one line of newline-delimited JSON
            // and enqueued immediately, so the client can render it the instant
            // it arrives rather than waiting for the whole response to finish.
            const sendStep = (step: AgentStep) => {
                try {
                    controller.enqueue(encoder.encode(JSON.stringify(step) + "\n"));
                } catch {
                    // Controller may already be closed if the client disconnected —
                    // safe to ignore, runAdminAgent will finish its own work regardless.
                }
            };

            try {
                await runAdminAgent(taskDescription, userId, {
                    userEmail,
                    recipientEmail,
                    onStep: sendStep,
                });
            } catch (err) {
                const message = err instanceof Error ? err.message : "Unknown error";
                sendStep({
                    step: "failed",
                    message: `Unhandled error: ${message}`,
                    timestamp: new Date().toISOString(),
                });
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        status: 200,
        headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "X-Content-Type-Options": "nosniff",
        },
    });
}