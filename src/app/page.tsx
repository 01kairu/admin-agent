"use client";
import Link from "next/link";

export default function LandingPage() {
    return (
        <main className="min-h-screen bg-[#14181F] font-sans text-[#E8E6DE]">
            {/* Navigation */}
            <nav className="border-b border-[#2A303C] bg-[#14181F]/80 backdrop-blur-md sticky top-0 z-50">
                <div className="mx-auto max-w-6xl px-6 py-4 flex justify-between items-center">
                    <h1 className="font-serif text-2xl font-medium tracking-tight text-[#F6F1E4]">
                        AdminAgent
                    </h1>
                    <Link
                        href="/login"
                        className="rounded-sm bg-[#C98A2C] px-5 py-2 text-sm font-medium text-[#1B1B16] transition-colors hover:bg-[#B47A22]"
                    >
                        Get Started
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="mx-auto max-w-4xl px-6 py-24 text-center">
                <div className="inline-block rounded-full border border-[#2A303C] bg-[#1E2430] px-4 py-1.5 text-xs font-medium text-[#9BA1AE] mb-6">
                    Now in Public Beta
                </div>
                <h2 className="font-serif text-5xl font-medium tracking-tight text-[#F6F1E4] sm:text-6xl">
                    Your AI Administrative <br />
                    <span className="text-[#C98A2C]">Assistant</span>
                </h2>
                <p className="mx-auto mt-6 max-w-2xl text-lg text-[#9BA1AE]">
                    Hand it a task. It researches, drafts, and sends — you watch the case unfold.
                    Stop wasting hours on tedious administrative work.
                </p>
                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                    <Link
                        href="/login"
                        className="w-full sm:w-auto rounded-sm bg-[#C98A2C] px-8 py-3.5 text-base font-medium text-[#1B1B16] transition-colors hover:bg-[#B47A22]"
                    >
                        Start Free Trial
                    </Link>
                    <a
                        href="#features"
                        className="w-full sm:w-auto rounded-sm border border-[#2A303C] bg-transparent px-8 py-3.5 text-base font-medium text-[#F6F1E4] transition-colors hover:bg-[#1E2430]"
                    >
                        See How It Works
                    </a>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="mx-auto max-w-6xl px-6 py-20 border-t border-[#2A303C]">
                <h3 className="text-center font-serif text-3xl text-[#F6F1E4] mb-12">How it works</h3>
                <div className="grid gap-8 md:grid-cols-3">
                    {[
                        { icon: "🔍", title: "1. Research", desc: "The agent scours the web for the exact policies, contacts, and steps needed for your task." },
                        { icon: "✍️", title: "2. Draft", desc: "It writes a professional, context-aware email or message tailored to your specific situation." },
                        { icon: "📤", title: "3. Send", desc: "With your approval, it securely sends the communication and logs the outcome for you." }
                    ].map((feature, i) => (
                        <div key={i} className="rounded-sm border border-[#2A303C] bg-[#1E2430] p-6 transition-colors hover:border-[#C98A2C]/50">
                            <div className="mb-4 text-3xl">{feature.icon}</div>
                            <h4 className="text-xl font-medium text-[#F6F1E4] mb-2">{feature.title}</h4>
                            <p className="text-sm text-[#9BA1AE] leading-relaxed">{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Pricing Section */}
            <section className="mx-auto max-w-4xl px-6 py-20 border-t border-[#2A303C] text-center">
                <h3 className="font-serif text-3xl text-[#F6F1E4] mb-4">Simple, transparent pricing</h3>
                <p className="text-[#9BA1AE] mb-12">Start for free, upgrade when you need more power.</p>

                <div className="grid gap-8 md:grid-cols-2 max-w-3xl mx-auto">
                    {/* Free Tier */}
                    <div className="rounded-sm border border-[#2A303C] bg-[#1E2430] p-8 text-left">
                        <h4 className="text-lg font-medium text-[#9BA1AE]">Starter</h4>
                        <div className="mt-4 flex items-baseline gap-1">
                            <span className="text-4xl font-bold text-[#F6F1E4]">$0</span>
                            <span className="text-[#9BA1AE]">/month</span>
                        </div>
                        <ul className="mt-6 space-y-3 text-sm text-[#B7BCC6]">
                            <li className="flex items-center gap-2">✅ 3 tasks per month</li>
                            <li className="flex items-center gap-2">✅ AI Research & Drafting</li>
                            <li className="flex items-center gap-2">❌ Auto-sending emails</li>
                        </ul>
                        <Link href="/login" className="mt-8 block w-full rounded-sm border border-[#2A303C] bg-transparent py-3 text-center font-medium text-[#F6F1E4] transition-colors hover:bg-[#2A303C]">
                            Get Started
                        </Link>
                    </div>

                    {/* Pro Tier */}
                    <div className="rounded-sm border-2 border-[#C98A2C] bg-[#1E2430] p-8 text-left relative">
                        <div className="absolute -top-3 right-6 rounded-full bg-[#C98A2C] px-3 py-1 text-xs font-bold text-[#1B1B16]">
                            POPULAR
                        </div>
                        <h4 className="text-lg font-medium text-[#C98A2C]">Pro</h4>
                        <div className="mt-4 flex items-baseline gap-1">
                            <span className="text-4xl font-bold text-[#F6F1E4]">$3</span>
                            <span className="text-[#9BA1AE]">/month</span>
                        </div>
                        <ul className="mt-6 space-y-3 text-sm text-[#B7BCC6]">
                            <li className="flex items-center gap-2">✅ Unlimited tasks</li>
                            <li className="flex items-center gap-2">✅ AI Research & Drafting</li>
                            <li className="flex items-center gap-2">✅ Auto-sending emails</li>
                            <li className="flex items-center gap-2">✅ Priority support</li>
                        </ul>
                        <Link href="/login" className="mt-8 block w-full rounded-sm bg-[#C98A2C] py-3 text-center font-medium text-[#1B1B16] transition-colors hover:bg-[#B47A22]">
                            Upgrade to Pro
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-[#2A303C] py-8 text-center text-sm text-[#5C6270]">
                <div className="mx-auto max-w-6xl px-6">
                    <p className="mb-2">© {new Date().getFullYear()} AdminAgent. All rights reserved.</p>
                    <div className="space-x-4">
                        <Link href="/privacy" className="hover:text-[#9BA1AE]">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-[#9BA1AE]">Terms of Service</Link>
                    </div>
                </div>
            </footer>
        </main>
    );
}