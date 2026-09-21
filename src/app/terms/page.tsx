import Link from "next/link";

export default function TermsOfService() {
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
                <h1 className="font-serif text-4xl font-medium text-[#F6F1E4] mb-8">Terms of Service</h1>
                <p className="text-[#9BA1AE] mb-8">Last updated: {new Date().toLocaleDateString()}</p>

                <div className="prose prose-invert max-w-none space-y-6 text-[#B7BCC6]">
                    <section>
                        <h2 className="text-xl font-medium text-[#F6F1E4] mb-3">1. Agreement to Terms</h2>
                        <p>
                            By accessing or using AdminAgent ("the Service"), you agree to be bound by these Terms of Service.
                            If you disagree with any part of the terms, you may not access the service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-medium text-[#F6F1E4] mb-3">2. Description of Service</h2>
                        <p>
                            AdminAgent is an AI-powered administrative assistant that helps users automate tasks such as:
                        </p>
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                            <li>Researching company policies and procedures</li>
                            <li>Drafting professional emails and communications</li>
                            <li>Sending emails on your behalf</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-medium text-[#F6F1E4] mb-3">3. User Accounts</h2>
                        <p>
                            To use our service, you must create an account. You are responsible for:
                        </p>
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                            <li>Maintaining the security of your account</li>
                            <li>All activities that occur under your account</li>
                            <li>Providing accurate and complete information</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-medium text-[#F6F1E4] mb-3">4. Acceptable Use</h2>
                        <p>You agree not to use the service to:</p>
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                            <li>Send spam, harassment, or illegal content</li>
                            <li>Violate any laws or regulations</li>
                            <li>Infringe on others' intellectual property rights</li>
                            <li>Transmit malware or harmful code</li>
                            <li>Interfere with the service's operation</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-medium text-[#F6F1E4] mb-3">5. Subscription and Billing</h2>
                        <p>
                            <strong>Free Plan:</strong> 3 tasks per month at no cost<br />
                            <strong>Pro Plan:</strong> Unlimited tasks for $3/month (or local equivalent)
                        </p>
                        <p className="mt-2">
                            Payments are processed securely through Paystack. Subscription fees are non-refundable
                            except as required by law.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-medium text-[#F6F1E4] mb-3">6. Limitation of Liability</h2>
                        <p>
                            AdminAgent is provided "as is" without warranties of any kind. We are not liable for:
                        </p>
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                            <li>Accuracy of AI-generated content</li>
                            <li>Delivery or non-delivery of emails</li>
                            <li>Any damages arising from use of the service</li>
                            <li>Third-party services (Paystack, Resend, Groq)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-medium text-[#F6F1E4] mb-3">7. Termination</h2>
                        <p>
                            We may terminate or suspend your account at any time, with or without notice, for any reason,
                            including violation of these terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-medium text-[#F6F1E4] mb-3">8. Changes to Terms</h2>
                        <p>
                            We reserve the right to modify these terms at any time. We will notify users of material changes
                            via email or through the service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-medium text-[#F6F1E4] mb-3">9. Contact Information</h2>
                        <p>
                            For any questions about these Terms, please contact us at:{' '}
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