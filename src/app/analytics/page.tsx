"use client"

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";

export default function AnalyticsPage() {
  const { data: session, isPending } = useSession();
  const [standard, setStandard] = useState<string>("");
  const [horizon, setHorizon] = useState<number>(3);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    const sp = new URLSearchParams();
    sp.set("horizonMonths", String(horizon));
    if (standard) sp.set("standard", standard);
    setLoading(true);
    setError(null);
    fetch(`/api/analytics/trends?${sp.toString()}`)
      .then(async (r) => (r.ok ? r.json() : Promise.reject(await r.json())))
      .then(setData)
      .catch((e) => setError(e?.error || "Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [session?.user, standard, horizon]);

  if (isPending) return <div className="p-6">Loading...</div>;
  if (!session?.user) {
    if (typeof window !== "undefined") window.location.href = "/sign-in";
    return null;
  }

  const forecasts = data?.forecasts || [];
  const aggregates = data?.trends?.aggregates || [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Market Analytics</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">Back to dashboard</Link>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select value={standard} onChange={(e) => setStandard(e.target.value)} className="px-3 py-2 rounded-md border bg-transparent">
            <option value="">All Standards</option>
            {['VERRA','GOLD_STANDARD','CDM','OTHERS'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={horizon} onChange={(e) => setHorizon(Number(e.target.value) || 3)} className="px-3 py-2 rounded-md border bg-transparent">
            {[3,6,12,24].map((m) => <option key={m} value={m}>{m} months</option>)}
          </select>
        </div>

        {loading && <div className="h-24 animate-pulse" />}
        {error && <div className="text-sm text-red-600">{error}</div>}

        {!loading && !error && (
          <div className="space-y-8">
            <section>
              <h2 className="font-semibold mb-2">Forecasts</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {forecasts.map((g: any) => (
                  <div key={g.standard} className="border rounded-md px-3 py-2">
                    <div className="text-xs muted">{g.standard}</div>
                    <div className="text-sm font-semibold">{g.forecasts?.[0]?.predictedPrice ? `$${Number(g.forecasts[0].predictedPrice).toFixed(2)}` : '—'}</div>
                    <div className="text-xs muted">h={g.forecasts?.[0]?.horizonMonths || horizon}m</div>
                  </div>
                ))}
                {forecasts.length === 0 && <div className="muted text-sm">No forecasts available.</div>}
              </div>
            </section>

            <section>
              <h2 className="font-semibold mb-2">Recent Price Distribution</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {aggregates.map((a: any) => (
                  <div key={a.standard} className="card p-4">
                    <div className="text-sm font-medium mb-2">{a.standard}</div>
                    <MiniBar min={Number(a.minPrice)} max={Number(a.maxPrice)} avg={Number(a.avgPrice)} />
                    <div className="text-xs muted mt-2">vol: {String(a.totalVolume)} • trades: {String(a.tradeCount)}</div>
                  </div>
                ))}
                {aggregates.length === 0 && <div className="muted text-sm">Not enough trade data.</div>}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniBar({ min, max, avg }: { min: number; max: number; avg: number }) {
  if (!isFinite(min) || !isFinite(max) || !isFinite(avg) || max <= 0) return <div className="muted text-xs">—</div>;
  const width = 220;
  const scale = (v: number) => Math.max(0, Math.min(1, (v - min) / (max - min)));
  const avgX = scale(avg) * width;
  return (
    <div className="relative h-8">
      <div className="h-2 bg-gray-200 rounded" />
      <div className="absolute top-0 left-0 h-2 bg-emerald-500 rounded" style={{ width: width }} />
      <div className="absolute top-0 h-2 bg-blue-500" style={{ left: 0, width: avgX }} />
      <div className="text-xs mt-2 flex justify-between">
        <span>${min.toFixed(2)}</span>
        <span>avg ${avg.toFixed(2)}</span>
        <span>${max.toFixed(2)}</span>
      </div>
    </div>
  );
}