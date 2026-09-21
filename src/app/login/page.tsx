"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

// Initialize Supabase client for the browser (using the public ANON key)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMessage("");
        setIsLoading(true);

        if (isSignUp) {
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) setMessage(error.message);
            else setMessage("Account created! You can now sign in.");
        } else {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) setMessage(error.message);
            else router.push("/dashboard"); // Redirect to dashboard on success
        }
        setIsLoading(false);
    }

    return (
        <div className="min-h-screen bg-[#14181F] flex items-center justify-center p-4">
            <div className="bg-[#F6F1E4] p-8 rounded-lg max-w-md w-full shadow-2xl">
                <h1 className="text-3xl font-bold text-[#14181F] mb-2 text-center">AdminAgent</h1>
                <p className="text-gray-600 text-center mb-6">
                    {isSignUp ? "Create your account" : "Welcome back"}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#C98A2C] focus:outline-none text-black"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#C98A2C] focus:outline-none text-black"
                            placeholder="••••••••"
                        />
                    </div>

                    {message && (
                        <div className={`p-3 rounded-md text-sm font-medium ${message.toLowerCase().includes("error") || message.toLowerCase().includes("invalid") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-[#C98A2C] hover:bg-[#b07824] text-white font-bold py-3 rounded-md transition-colors disabled:opacity-50"
                    >
                        {isLoading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
                    </button>
                </form>

                <div className="mt-6 text-center border-t border-gray-300 pt-4">
                    <button
                        onClick={() => { setIsSignUp(!isSignUp); setMessage(""); }}
                        className="text-sm text-[#C98A2C] hover:underline font-bold"
                    >
                        {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
                    </button>
                </div>
            </div>
        </div>
    );
}