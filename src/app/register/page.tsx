"use client"

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const roles = [
  { key: "CFO", label: "CFO" },
  { key: "PlantHead", label: "Plant Head" },
  { key: "ESGLead", label: "ESG Lead" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("ESGLead");
  const [organizationId, setOrganizationId] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await authClient.signUp.email({ email, name, password });
      if (res.error?.code) {
        setError("Registration failed");
        setLoading(false);
        return;
      }
      try { localStorage.setItem("pending_profile", JSON.stringify({ role, organizationId })); } catch {}
      // Persist role and org mapping for this auth user after they sign in
      // Redirect to sign-in with success flag
      router.push("/sign-in?registered=true");
    } catch (err: any) {
      setError(err?.message || "Registration failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold">ESG Evolve</Link>
          <nav className="text-sm">
            <Link href="/sign-in" className="text-blue-600 hover:underline">Sign in</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 grid place-items-center px-4 py-10">
        <div className="w-full max-w-lg card p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="muted text-sm mt-1">Access the carbon marketplace and compliance toolkit.</p>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm mb-1">Full name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-transparent"
                placeholder="Alex Morgan"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Work email</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-transparent"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Password</label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-transparent"
                placeholder="••••••••"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border bg-transparent"
                >
                  {roles.map((r) => (
                    <option key={r.key} value={r.key}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Organization ID</label>
                <input
                  type="number"
                  min={1}
                  value={organizationId}
                  onChange={(e) => setOrganizationId(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-md border bg-transparent"
                  placeholder="1"
                />
              </div>
            </div>

            {error && <div className="text-red-600 text-sm">{error}</div>}

            <button type="submit" disabled={loading} className="btn btn-primary py-2">
              {loading ? "Creating account..." : "Create account"}
            </button>

            <p className="text-sm muted">
              By creating an account you agree to our Terms and Privacy Policy.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}