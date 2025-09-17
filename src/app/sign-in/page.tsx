"use client"

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center">Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
}

function SignInContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registered = params.get("registered") === "true";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await authClient.signIn.email({
        email: email.trim(),
        password: password.trim(),
        rememberMe,
        callbackURL: "/",
      });

      if (error?.code) {
        const errorMap: Record<string, string> = {
          INVALID_CREDENTIALS: "Invalid email or password. Please try again.",
          USER_NOT_FOUND: "No account found for this email. Please register first.",
          EMAIL_NOT_VERIFIED: "Email not verified. Please check your inbox for the verification link.",
          TOO_MANY_REQUESTS: "Too many attempts. Please wait a moment and try again.",
        };
        setError(errorMap[error.code] || "Sign in failed. Please make sure you have already registered and try again.");
        setLoading(false);
        return;
      }

      // Success
      setLoading(false);
      router.push("/");
    } catch (err: any) {
      setError(err?.message || "Sign in failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold">ESG Evolve</Link>
          <nav className="text-sm">
            <Link href="/register" className="text-blue-600 hover:underline">Create account</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 grid place-items-center px-4 py-10">
        <div className="w-full max-w-md card p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Sign in</h1>
            <p className="muted text-sm mt-1">Access your marketplace and compliance dashboard.</p>
            {registered && (
              <p className="text-emerald-600 text-sm mt-2">Registration successful. Please sign in.</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-transparent"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-transparent"
                placeholder="••••••••"
                autoComplete="off"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <span className="muted">Forgot password?</span>
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-2"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-sm muted mt-4">
            Don't have an account?{" "}
            <Link href="/register" className="text-blue-600 hover:underline">Create one</Link>
          </p>
        </div>
      </main>
    </div>
  );
}