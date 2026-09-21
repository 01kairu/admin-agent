import { runAdminAgent } from "@/lib/agent";
import type { AgentStep } from "@/lib/agent";

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
        return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    const { taskDescription, userId, userEmail, recipientEmail } = body;

    if (!taskDescription || !userId || !userEmail) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const sendStep = (step: AgentStep) => {
                try {
                    controller.enqueue(encoder.encode(JSON.stringify(step) + "\n"));
                } catch {
                    // Ignore if controller is closed
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
                    message: "Failed",
                    data: { error: message },
                    timestamp: new Date().toISOString(),
                });
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-cache",
        },
    });
}