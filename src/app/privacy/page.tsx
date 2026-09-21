import Link from "next/link";

export default function PrivacyPolicy() {
    return (
        <main className="min-h-screen bg-[#14181F] font-sans text-[#E8E6DE]">
            {/* Navigation */}
            <nav className="border-b border-[#2A303C] bg-[#14181F]/80 backdrop-blur-md sticky top-0 z-50">
                <div className="mx-auto max-w-6xl px-6 py-4 flex justify-between items-center">
                    <Link href="/" className="font-serif text-2xl font-medium tracking-tight text-[#F6F1E4]">
                        AdminAgent
                    </Link>
                    <Link
                        href="/login"
                        className="rounded-sm bg-[#C98A2C] px-5 py-2 text-sm font-medium text-[#1B1B16] transition-colors hover:bg-[#B47A22]"
                    >
                        Get Started
                    </Link>
                </div>
            </nav>

            {/* Content */}
            <div className="mx-auto max-w-3xl px-6 py-16">
                <h1 className="font-serif text-4xl font-medium text-[#F6F1E4] mb-8">Privacy Policy</h1>
                <p className="text-[#9BA1AE] mb-8">Last updated: {new Date().toLocaleDateString()}</p>

                <div className="prose prose-invert max-w-none space-y-6 text-[#B7BCC6]">
                    <section>
                        <h2 className="text-xl font-medium text-[#F6F1E4] mb-3">1. Information We Collect</h2>
                        <p>
                            We collect information you provide directly to us, including:
                        </p>
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                            <li>Email address</li>
                            <li>Payment information (processed securely through Paystack)</li>
                            <li>Task descriptions and content you submit to our AI agent</li>
                            <li>Communication preferences</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-medium text-[#F6F1E4] mb-3">2. How We Use Your Information</h2>
                        <p>We use the information we collect to:</p>
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                            <li>Provide, maintain, and improve our services</li>
                            <li>Process your payments and subscriptions</li>
                            <li>Send you administrative emails and updates</li>
                            <li>Respond to your comments and questions</li>
                            <li>Monitor and analyze trends and usage</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-medium text-[#F6F1E4] mb-3">3. Information Sharing</h2>
                        <p>
                            We do not sell, trade, or otherwise transfer your personal information to third parties.
                            We may share your information with:
                        </p>
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                            <li>Service providers (Paystack for payments, Resend for emails, Groq for AI)</li>
                            <li>Legal authorities when required by law</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-medium text-[#F6F1E4] mb-3">4. Data Security</h2>
                        <p>
                            We implement appropriate security measures to protect your personal information.
                            However, no method of transmission over the internet is 100% secure.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-medium text-[#F6F1E4] mb-3">5. Your Rights</h2>
                        <p>You have the right to:</p>
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                            <li>Access your personal data</li>
                            <li>Request correction of your data</li>
                            <li>Request deletion of your data</li>
                            <li>Opt-out of marketing communications</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-medium text-[#F6F1E4] mb-3">6. Contact Us</h2>
                        <p>
                            If you have questions about this Privacy Policy, please contact us at:{' '}
                            <a href="mailto:dkairu867@gmail.com" className="text-[#C98A2C] hover:underline">
                                dkairu867@gmail.com
                            </a>
                        </p>
                    </section>
                </div>
            </div>

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