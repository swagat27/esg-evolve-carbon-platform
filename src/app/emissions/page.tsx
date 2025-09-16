"use client"

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";

type Emission = {
  id: number;
  organizationId: number;
  scope: "SCOPE1" | "SCOPE2" | "SCOPE3";
  periodMonth: string; // YYYY-MM
  amountTco2e: number;
  source?: string | null;
  createdAt: string;
};

export default function EmissionsPage() {
  const { data: session, isPending } = useSession();
  const [orgId, setOrgId] = useState<number>(1);

  useEffect(() => {
    const urlOrg = new URLSearchParams(window.location.search).get("orgId");
    if (urlOrg && !Number.isNaN(Number(urlOrg))) setOrgId(Number(urlOrg));
  }, []);

  if (isPending) return <div className="p-6">Loading...</div>;
  if (!session?.user) {
    if (typeof window !== "undefined") window.location.href = "/sign-in";
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Emissions Dashboard</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">Back to dashboard</Link>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-4">Monthly Emissions</h2>
        <EmissionsBoard orgId={orgId} />
      </div>
    </div>
  );
}

function EmissionsBoard({ orgId }: { orgId: number }) {
  const [rows, setRows] = useState<Emission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<string>("");
  const [periodStart, setPeriodStart] = useState<string>("2024-01");
  const [periodEnd, setPeriodEnd] = useState<string>("2024-12");

  const qs = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("organizationId", String(orgId));
    sp.set("limit", "200");
    if (scope) sp.set("scope", scope);
    if (periodStart) sp.set("periodStart", `${periodStart}-01`);
    if (periodEnd) sp.set("periodEnd", `${periodEnd}-31`);
    return sp.toString();
  }, [orgId, scope, periodStart, periodEnd]);

  useEffect(() => {
    const token = localStorage.getItem("bearer_token") || "";
    setLoading(true);
    setError(null);
    fetch(`/api/emissions?${qs}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => (r.ok ? r.json() : Promise.reject(await r.json())))
      .then(setRows)
      .catch((e) => setError(e?.error || "Failed to load emissions"))
      .finally(() => setLoading(false));
  }, [qs]);

  const months = Array.from(new Set(rows.map((r) => r.periodMonth))).sort();
  const series = ["SCOPE1", "SCOPE2", "SCOPE3"] as const;

  const totalsByScope = series.map((s) => ({
    scope: s,
    total: rows.filter((r) => r.scope === s).reduce((acc, r) => acc + Number(r.amountTco2e), 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <select value={scope} onChange={(e) => setScope(e.target.value)} className="px-3 py-2 rounded-md border bg-transparent">
          <option value="">All Scopes</option>
          {series.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="px-3 py-2 rounded-md border bg-transparent" placeholder="YYYY-MM" />
        <input value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="px-3 py-2 rounded-md border bg-transparent" placeholder="YYYY-MM" />
      </div>

      {loading && <div className="h-24 animate-pulse" />}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {!loading && !error && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {totalsByScope.map((t) => (
              <div key={t.scope} className="card p-4">
                <div className="text-xs uppercase muted">{t.scope}</div>
                <div className="text-2xl font-semibold">{t.total.toFixed(1)} tCO₂e</div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left muted">
                  <th className="py-2 pr-3">Month</th>
                  {series.map((s) => (<th key={s} className="py-2 pr-3 text-right">{s}</th>))}
                  <th className="py-2 pr-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => {
                  const byScope: Record<string, number> = {};
                  series.forEach((s) => {
                    byScope[s] = rows.filter((r) => r.periodMonth === m && r.scope === s).reduce((acc, r) => acc + Number(r.amountTco2e), 0);
                  });
                  const rowTotal = series.reduce((acc, s) => acc + (byScope[s] || 0), 0);
                  return (
                    <tr key={m} className="border-t">
                      <td className="py-2 pr-3">{m}</td>
                      {series.map((s) => (<td key={s} className="py-2 pr-3 text-right">{(byScope[s] || 0).toFixed(1)}</td>))}
                      <td className="py-2 pr-3 text-right font-medium">{rowTotal.toFixed(1)}</td>
                    </tr>
                  );
                })}
                {months.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center muted">No emissions data.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}