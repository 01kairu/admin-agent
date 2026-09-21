"use client";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import dynamic from 'next/dynamic';
import Link from "next/link";
const UpgradeButton = dynamic(() => import('./UpgradeButton'), { ssr: false });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type StepName =
  | "task_created"
  | "research"
  | "draft_email"
  | "send_email"
  | "completed"
  | "failed";

interface AgentStep {
  step: StepName;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

const STEP_META: Record<StepName, { icon: string; label: string }> = {
  task_created: { icon: "📋", label: "Task opened" },
  research: { icon: "🔍", label: "Researching" },
  draft_email: { icon: "✍️", label: "Drafting" },
  send_email: { icon: "📤", label: "Sending" },
  completed: { icon: "✅", label: "Done" },
  failed: { icon: "⚠️", label: "Failed" },
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour12: false });
  } catch {
    return iso;
  }
}

export default function Dashboard() {
  const router = useRouter();

  // ✅ ALL HOOKS DECLARED FIRST (Fixes the Rules of Hooks error)
  const [isLoading, setIsLoading] = useState(true);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [tasksUsed, setTasksUsed] = useState<number>(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [taskDescription, setTaskDescription] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bufferRef = useRef("");

  // ✅ AUTH CHECK (Runs after all hooks are registered)
  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      } else {
        setUserId(session.user.id);
        setUserEmail(session.user.email || "");

        // Fetch their plan and tasks used from the database
        const { data: profile } = await supabase
          .from("profiles")
          .select("plan, tasks_used")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          setUserPlan(profile.plan);
          setTasksUsed(profile.tasks_used);
        }

        setIsLoading(false);
      }
    }
    checkUser();
  }, [router]);

  // ✅ CONDITIONAL RETURN (Placed AFTER all hooks)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#14181F] flex items-center justify-center text-white">
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  async function handleRunAgent(e: React.FormEvent) {
    e.preventDefault();
    // BLOCK FREE USERS IF THEY HIT THE LIMIT
    if (userPlan === "free" && tasksUsed >= 3) {
      setError("You have reached your free limit of 3 tasks. Please upgrade to Pro to continue.");
      return;
    }
    if (!taskDescription.trim() || isRunning) return;

    setSteps([]);
    setError(null);
    setIsRunning(true);
    bufferRef.current = "";

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskDescription: taskDescription.trim(),
          userId: userId || "814b2896-3a24-4fde-90a2-ff1911a149d6",
          userEmail: userEmail.trim() || undefined,
          recipientEmail: recipientEmail.trim() || undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? `Request failed with status ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        bufferRef.current += decoder.decode(value, { stream: true });
        const lines = bufferRef.current.split("\n");
        bufferRef.current = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsedStep: AgentStep = JSON.parse(line);
            setSteps((prev) => [...prev, parsedStep]);
          } catch {
            // Skip malformed line
          }
        }
      }
      // Increment task count in database for free users
      if (userPlan === "free") {
        const newCount = tasksUsed + 1;
        setTasksUsed(newCount); // Update UI immediately

        await supabase
          .from("profiles")
          .update({ tasks_used: newCount })
          .eq("id", userId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsRunning(false);
    }
  }

  const lastStep = steps[steps.length - 1];
  const isFinished = lastStep?.step === "completed" || lastStep?.step === "failed";

  return (
    <main className="min-h-screen bg-[#14181F] font-sans text-[#E8E6DE]">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <header className="mb-10 border-b border-[#2A303C] pb-6 flex justify-between items-start">
          <div>
            <h1 className="font-serif text-3xl font-medium tracking-tight text-[#F6F1E4]">
              AdminAgent
            </h1>
            <p className="mt-2 text-sm text-[#9BA1AE]">
              Hand it a task. It researches, drafts, and sends — you watch the case unfold below.
            </p>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="text-sm text-[#9BA1AE] hover:text-[#F6F1E4] transition-colors"
          >
            Logout
          </button>
        </header>
        {/* Usage Stats Badge */}
        <div className="mb-6 flex items-center justify-between rounded-sm border border-[#2A303C] bg-[#1E2430] px-4 py-3">
          <div>
            <span className="text-sm font-bold text-[#F6F1E4]">
              {userPlan === "pro" ? "PRO PLAN" : "FREE PLAN"}
            </span>
            <span className="ml-2 text-xs text-[#9BA1AE]">
              {userPlan === "pro" ? "Unlimited tasks" : `${tasksUsed}/3 tasks used`}
            </span>
          </div>
          {userPlan === "free" && (
            <Link href="/" className="text-xs font-bold text-[#C98A2C] hover:underline">
              Upgrade to Pro
            </Link>
          )}
        </div>
        {userId && userEmail && (
          <div className="mb-6 p-4 rounded-sm border border-[#C98A2C] bg-[#1E2430]">
            <h3 className="text-[#F6F1E4] font-medium mb-2">Upgrade Your Plan</h3>
            <p className="text-sm text-[#9BA1AE] mb-3">
              Get unlimited tasks and priority support with our Pro plan.
            </p>
            <UpgradeButton userEmail={userEmail} userId={userId} />
          </div>
        )}

        <form
          onSubmit={handleRunAgent}
          className="rounded-sm bg-[#F6F1E4] p-6 text-[#1B1B16] shadow-[0_1px_0_rgba(0,0,0,0.2)]"
        >
          <label className="block text-sm font-medium" htmlFor="taskDescription">
            What do you need handled?
          </label>
          <textarea
            id="taskDescription"
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            placeholder="e.g. Cancel my Netflix subscription"
            rows={3}
            required
            className="mt-2 w-full resize-none rounded-sm border border-[#D8D0BC] bg-white/60 px-3 py-2 text-sm text-[#1B1B16] placeholder:text-[#8C8672] focus:border-[#C98A2C] focus:outline-none focus:ring-1 focus:ring-[#C98A2C]"
          />

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium" htmlFor="userEmail">
                Your email
              </label>
              <input
                id="userEmail"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-2 w-full rounded-sm border border-[#D8D0BC] bg-white/60 px-3 py-2 text-sm text-[#1B1B16] placeholder:text-[#8C8672] focus:border-[#C98A2C] focus:outline-none focus:ring-1 focus:ring-[#C98A2C]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium" htmlFor="recipientEmail">
                Company email <span className="font-normal text-[#8C8672]">(optional)</span>
              </label>
              <input
                id="recipientEmail"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="support@netflix.com"
                className="mt-2 w-full rounded-sm border border-[#D8D0BC] bg-white/60 px-3 py-2 text-sm text-[#1B1B16] placeholder:text-[#8C8672] focus:border-[#C98A2C] focus:outline-none focus:ring-1 focus:ring-[#C98A2C]"
              />
            </div>
          </div>
          <p className="mt-1.5 text-xs text-[#8C8672]">
            Leave this blank to have AdminAgent prepare a draft without sending it.
          </p>

          <button
            type="submit"
            disabled={isRunning || !taskDescription.trim()}
            className="mt-5 inline-flex items-center gap-2 rounded-sm bg-[#C98A2C] px-5 py-2.5 text-sm font-medium text-[#1B1B16] transition-colors hover:bg-[#B47A22] disabled:cursor-not-allowed disabled:bg-[#D8CBAA] disabled:text-[#8C8672]"
          >
            {isRunning ? (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#1B1B16]" />
                Working the case…
              </>
            ) : (
              "Run agent"
            )}
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-sm border border-[#6B3430] bg-[#2A1A18] px-4 py-3 text-sm text-[#E8A79C]">
            {error}
          </div>
        )}

        {steps.length > 0 && (
          <section className="mt-8">
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-lg text-[#F6F1E4]">
                Case log
              </h2>
              {!isFinished && isRunning && (
                <span className="text-xs text-[#9BA1AE]">streaming…</span>
              )}
            </div>

            <ol className="mt-3 divide-y divide-[#262C38] overflow-hidden rounded-sm border border-[#262C38] bg-[#1E2430] font-mono text-sm">
              {steps.map((s, i) => {
                const meta = STEP_META[s.step] ?? { icon: "•", label: s.step };
                const borderColor =
                  s.step === "failed"
                    ? "border-l-[#B33A3A]"
                    : s.step === "completed"
                      ? "border-l-[#4F9169]"
                      : "border-l-[#C98A2C]";

                return (
                  <li
                    key={`${s.step}-${i}`}
                    className={`flex gap-3 border-l-2 px-4 py-3 ${borderColor}`}
                  >
                    <span className="w-6 shrink-0 text-[#5C6270]">
                      {String(i + 1).padStart(3, "0")}
                    </span>
                    <span className="w-20 shrink-0 text-[#5C6270]">{formatTime(s.timestamp)}</span>
                    <span className="w-32 shrink-0 text-[#E8E6DE]">
                      {meta.icon} {meta.label}
                    </span>
                    <span className="text-[#B7BCC6]">{s.message}</span>
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </div>
    </main>
  );
}