"use client"

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";

const STANDARDS = ["VERRA", "GOLD_STANDARD", "CDM", "OTHERS"] as const;
const TYPES = ["SELL", "BUY"] as const;

export default function MarketplacePage() {
  const { data: session, isPending } = useSession();
  const [orgId, setOrgId] = useState<number>(1);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const urlOrg = new URLSearchParams(window.location.search).get("orgId");
    if (urlOrg && !Number.isNaN(Number(urlOrg))) setOrgId(Number(urlOrg));
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    const token = localStorage.getItem("bearer_token") || "";
    fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => (r.ok ? r.json() : null))
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [session?.user]);

  if (isPending) return <div className="p-6">Loading...</div>;
  if (!session?.user) {
    if (typeof window !== "undefined") window.location.href = "/sign-in";
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Carbon Quota Marketplace</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">Back to dashboard</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Live Listings</h2>
            <span className="muted text-sm">Org #{orgId}</span>
          </div>
          <ListingsTable orgId={orgId} />
        </div>

        <div className="card p-5">
          <h2 className="font-semibold mb-4">Create Listing</h2>
          {(() => {
            const role = profile?.role as string | undefined;
            const canCreate = role === "CFO" || role === "ESGLead";
            if (!role) return <div className="muted text-sm">Loading your access...</div>;
            if (!canCreate) {
              return (
                <div className="text-sm">
                  Your role (<span className="font-medium">{role}</span>) does not allow creating listings.
                  Please contact your ESG Lead or CFO.
                </div>
              );
            }
            return (
              <CreateListingForm
                defaultOrgId={orgId}
                onCreated={() => { /* table refresh via state key */ }}
              />
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function ListingsTable({ orgId }: { orgId: number }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<string>("");
  const [standard, setStandard] = useState<string>("");
  const [status, setStatus] = useState<string>("OPEN");
  const [refreshKey, setRefreshKey] = useState(0);

  const params = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("organizationId", String(orgId));
    sp.set("limit", "25");
    if (type) sp.set("type", type);
    if (standard) sp.set("standard", standard);
    if (status) sp.set("status", status);
    return sp.toString();
  }, [orgId, type, standard, status]);

  useEffect(() => {
    const token = localStorage.getItem("bearer_token") || "";
    setLoading(true);
    setError(null);
    fetch(`/api/carbon-listings?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => (r.ok ? r.json() : Promise.reject(await r.json())))
      .then((d) => setRows(d))
      .catch((e) => setError(e?.error || "Failed to load listings"))
      .finally(() => setLoading(false));
  }, [params, refreshKey]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select value={type} onChange={(e) => setType(e.target.value)} className="px-3 py-2 rounded-md border bg-transparent">
          <option value="">All Types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={standard} onChange={(e) => setStandard(e.target.value)} className="px-3 py-2 rounded-md border bg-transparent">
          <option value="">All Standards</option>
          {STANDARDS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 rounded-md border bg-transparent">
          {['OPEN','MATCHED','CANCELLED','COMPLETED',''].map((s) => <option key={s || 'ALL'} value={s}>{s || 'All Statuses'}</option>)}
        </select>
        <button className="btn btn-outline px-3 py-2" onClick={() => setRefreshKey((k) => k + 1)}>Refresh</button>
      </div>

      {loading && <div className="h-24 animate-pulse" />}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left muted">
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Standard</th>
                <th className="py-2 pr-3">Vintage</th>
                <th className="py-2 pr-3">Location</th>
                <th className="py-2 pr-3 text-right">Price/t</th>
                <th className="py-2 pr-3 text-right">Volume</th>
                <th className="py-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2 pr-3">{r.type}</td>
                  <td className="py-2 pr-3">{r.standard}</td>
                  <td className="py-2 pr-3">{r.vintageYear}</td>
                  <td className="py-2 pr-3">{r.location || '—'}</td>
                  <td className="py-2 pr-3 text-right">${Number(r.pricePerTon).toFixed(2)}</td>
                  <td className="py-2 pr-3 text-right">{Number(r.volumeTco2e).toFixed(0)} t</td>
                  <td className="py-2 pr-3">{r.status}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="py-6 text-center muted">No listings found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CreateListingForm({ defaultOrgId, onCreated }: { defaultOrgId: number; onCreated: () => void }) {
  const [organizationId, setOrganizationId] = useState<number>(defaultOrgId);
  const [type, setType] = useState<typeof TYPES[number]>("SELL");
  const [standard, setStandard] = useState<typeof STANDARDS[number]>("VERRA");
  const [vintageYear, setVintageYear] = useState<number>(2022);
  const [location, setLocation] = useState("");
  const [pricePerTon, setPricePerTon] = useState<string>("20");
  const [volumeTco2e, setVolume] = useState<string>("100");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      const token = localStorage.getItem("bearer_token") || "";
      const res = await fetch("/api/carbon-listings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          organizationId,
          type,
          volumeTco2e: Number(volumeTco2e),
          pricePerTon: Number(pricePerTon),
          standard,
          vintageYear: Number(vintageYear),
          location,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to create listing");
      setMsg("Listing created successfully.");
      onCreated();
    } catch (e: any) {
      setMsg(e?.message || "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">Organization ID</label>
          <input type="number" min={1} value={organizationId} onChange={(e) => setOrganizationId(Number(e.target.value) || 1)} className="w-full px-3 py-2 rounded-md border bg-transparent" />
        </div>
        <div>
          <label className="block text-sm mb-1">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full px-3 py-2 rounded-md border bg-transparent">
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">Standard</label>
          <select value={standard} onChange={(e) => setStandard(e.target.value as any)} className="w-full px-3 py-2 rounded-md border bg-transparent">
            {STANDARDS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Vintage Year</label>
          <input type="number" value={vintageYear} onChange={(e) => setVintageYear(Number(e.target.value) || 2022)} className="w-full px-3 py-2 rounded-md border bg-transparent" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">Price per ton (USD)</label>
          <input type="number" step="0.01" value={pricePerTon} onChange={(e) => setPricePerTon(e.target.value)} className="w-full px-3 py-2 rounded-md border bg-transparent" />
        </div>
        <div>
          <label className="block text-sm mb-1">Volume (tCO₂e)</label>
          <input type="number" step="1" value={volumeTco2e} onChange={(e) => setVolume(e.target.value)} className="w-full px-3 py-2 rounded-md border bg-transparent" />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1">Location</label>
        <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full px-3 py-2 rounded-md border bg-transparent" placeholder="Project location (optional)" />
      </div>

      <button disabled={submitting} className="btn btn-primary py-2">{submitting ? "Creating..." : "Create listing"}</button>
      {msg && <div className="text-sm mt-1">{msg}</div>}
    </form>
  );
}