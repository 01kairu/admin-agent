"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import dynamic from "next/dynamic";

// Dynamically import UpgradeButton to prevent "window is not defined" SSR errors
const UpgradeButton = dynamic(() => import("./UpgradeButton"), { ssr: false });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [taskInput, setTaskInput] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"success" | "error">("success");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single()
          .then(({ data }) => setUser(data));
      }
    });
  }, []);

  const runAgent = async () => {
    if (!taskInput.trim() || !user) return;

    if (user.plan === "free" && (user.tasks_used || 0) >= 3) {
      setModalType("error");
      setStatusMessage("You've reached your 3-task limit. Upgrade to Pro.");
      setShowModal(true);
      setTimeout(() => setShowModal(false), 3000);
      return;
    }

    setIsRunning(true);
    setStatusMessage("Searching...");
    setShowModal(true);
    setModalType("success");

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskDescription: taskInput,
          userId: user.id,
          userEmail: user.email,
          recipientEmail: companyEmail || user.email,
        }),
      });

      if (!response.ok) {
        throw new Error("Agent failed");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);

            if (data.step === "searching") {
              setStatusMessage("Searching...");
            } else if (data.step === "drafting") {
              setStatusMessage("Drafting...");
            } else if (data.step === "sending") {
              setStatusMessage("Sending...");
            } else if (data.step === "sent" || data.step === "complete") {
              setModalType("success");
              setStatusMessage("Success!");
              setTimeout(() => setShowModal(false), 3000);

              await supabase
                .from("profiles")
                .update({ tasks_used: (user.tasks_used || 0) + 1 })
                .eq("id", user.id);

              const { data: refreshed } = await supabase.auth.getUser();
              if (refreshed.user) {
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("*")
                  .eq("id", refreshed.user.id)
                  .single();
                setUser(profile);
              }
              return;
            } else if (data.step === "failed") {
              throw new Error(data.data?.error || "Agent failed");
            }
          } catch (e) {
            console.error("Stream error:", e);
          }
        }
      }
    } catch (err) {
      setModalType("error");
      setStatusMessage(err instanceof Error ? err.message : "Failed");
      setTimeout(() => setShowModal(false), 3000);
    } finally {
      setIsRunning(false);
    }
  };

  if (!user) return <div className="min-h-screen bg-[#14181F] flex items-center justify-center text-[#9BA1AE]">Loading...</div>;

  return (
    <main className="min-h-screen bg-[#14181F] font-sans text-[#E8E6DE]">
      <header className="border-b border-[#2A303C]">
        <div className="mx-auto max-w-4xl px-6 py-6 flex justify-between items-center">
          <h1 className="font-serif text-3xl font-medium text-[#F6F1E4]">AdminAgent</h1>
          <Link href="/login" onClick={() => supabase.auth.signOut()} className="text-sm text-[#9BA1AE] hover:text-[#F6F1E4]">
            Logout
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8 rounded-sm border border-[#2A303C] bg-[#1E2430] p-4">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-medium text-[#F6F1E4]">
                {user.plan === "pro" ? "PRO PLAN" : "FREE PLAN"}
              </span>
              <span className="text-[#9BA1AE] ml-2">
                {user.plan === "pro" ? "Unlimited tasks" : `${user.tasks_used || 0}/3 tasks used`}
              </span>
            </div>
            {user.plan === "free" && (
              <Link href="#upgrade" className="text-sm text-[#C98A2C] hover:text-[#B47A22]">
                Upgrade to Pro
              </Link>
            )}
          </div>
        </div>

        {user.plan === "free" && (
          <div id="upgrade" className="mb-8 rounded-sm border border-[#C98A2C]/30 bg-[#1E2430] p-6">
            <h2 className="text-lg font-medium text-[#F6F1E4] mb-2">Upgrade Your Plan</h2>
            <p className="text-sm text-[#9BA1AE] mb-4">Get unlimited tasks and priority support.</p>
            <UpgradeButton userEmail={user.email} userId={user.id} />
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className={`rounded-sm px-8 py-6 shadow-2xl border ${modalType === "error" ? "bg-red-950/90 border-red-800" : "bg-[#1E2430]/95 border-[#C98A2C]"}`}>
              <div className="flex items-center gap-3">
                {isRunning ? (
                  <>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-[#C98A2C] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                      <span className="w-2 h-2 bg-[#C98A2C] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                      <span className="w-2 h-2 bg-[#C98A2C] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                    </div>
                    <span className="text-lg font-medium">{statusMessage}</span>
                  </>
                ) : modalType === "error" ? (
                  <span className="text-lg font-medium text-red-100">{statusMessage}</span>
                ) : (
                  <span className="text-lg font-medium text-green-400">{statusMessage}</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-sm border border-[#2A303C] bg-[#1E2430] p-6">
          <h2 className="text-lg font-medium text-[#F6F1E4] mb-4">What do you need handled?</h2>
          <textarea
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            placeholder="e.g. Cancel my Netflix subscription"
            className="w-full h-32 rounded-sm border border-[#2A303C] bg-[#14181F] p-4 text-[#E8E6DE] placeholder:text-[#5C6270] focus:border-[#C98A2C] focus:outline-none resize-none mb-4"
            disabled={isRunning}
          />
          <div className="mb-6">
            <label className="block text-sm text-[#9BA1AE] mb-2">Company email (optional)</label>
            <input
              type="email"
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
              placeholder="support@company.com"
              className="w-full rounded-sm border border-[#2A303C] bg-[#14181F] p-3 text-[#E8E6DE] placeholder:text-[#5C6270] focus:border-[#C98A2C] focus:outline-none"
              disabled={isRunning}
            />
          </div>
          <button
            onClick={runAgent}
            disabled={isRunning || !taskInput.trim()}
            className="w-full rounded-sm bg-[#C98A2C] py-3.5 text-base font-medium text-[#1B1B16] transition-colors hover:bg-[#B47A22] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? "Processing..." : "Run Agent"}
          </button>
        </div>
      </div>
    </main>
  );
}