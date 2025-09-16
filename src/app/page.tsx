"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authClient, useSession } from "@/lib/auth-client";
import { motion } from "framer-motion";
import Image from "next/image";

type DashboardSummary = {
  kycStatus: string;
  openListings: number;
  emissionsMtd: number;
  unreadAlerts: number;
  recentTrades: Array<{id: number;listingId: number | null;volumeTco2e: number;pricePerTon: number;status: string;createdAt: string;}>;
  pendingOrders: number;
  additionalMetrics: {
    totalListingCount: number;
    completedTradeCount: number;
    totalEmissions: number;
    kycDocumentsCount: number;
  };
  recentAlerts: Array<{id: number;type: string;message: string;severity: string;isRead: boolean;createdAt: string;}>;
  organization: {name?: string;industry?: string | null;country?: string | null;annualEmissionsBaseline?: number | null;};
};

export default function HomePage() {
  const { data: session, isPending } = useSession();
  const [orgId, setOrgId] = useState<number>(1);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userEmail = session?.user?.email || "";

  useEffect(() => {
    const urlOrg = new URLSearchParams(window.location.search).get("orgId");
    if (urlOrg && !Number.isNaN(Number(urlOrg))) setOrgId(Number(urlOrg));
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    try {
      const pending = typeof window !== "undefined" ? localStorage.getItem("pending_profile") : null;
      if (!pending) return;
      const { role, organizationId } = JSON.parse(pending);
      const token = localStorage.getItem("bearer_token") || "";
      fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role, organizationId })
      }).finally(() => {
        try {localStorage.removeItem("pending_profile");} catch {}
      });
    } catch {}
  }, [session?.user]);

  useEffect(() => {
    if (!session?.user) return;
    setLoading(true);
    setError(null);

    const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : "";

    const fetchSummary = fetch(`/api/dashboard/summary?orgId=${orgId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(async (r) => {
      if (!r.ok) throw new Error((await r.json()).error || "Failed to load summary");
      return r.json();
    });

    const fetchListings = fetch(`/api/carbon-listings?limit=5&organizationId=${orgId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(async (r) => r.ok ? r.json() : []);

    Promise.all([fetchSummary, fetchListings]).
    then(([s, l]) => {
      setSummary(s);
      setListings(l);
    }).
    catch((e: any) => setError(String(e?.message || e))).
    finally(() => setLoading(false));
  }, [session?.user, orgId]);

  const kycColor = useMemo(() => {
    const status = summary?.kycStatus || "pending";
    return status === "verified" ? "text-emerald-600" : status === "rejected" ? "text-red-600" : "text-amber-600";
  }, [summary?.kycStatus]);

  return (
    <div className="min-h-screen">
      <SiteHeader userEmail={userEmail} />

      {!session?.user ?
      <PublicHero /> :

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold">ESG Evolve Dashboard</h1>
            <p className="muted">Welcome back{userEmail ? `, ${userEmail}` : ""}. Manage marketplace, compliance, and analytics in one place.</p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm muted">Organization ID</label>
            <input
            type="number"
            value={orgId}
            onChange={(e) => setOrgId(Number(e.target.value) || 1)}
            className="px-3 py-2 rounded-md border bg-transparent"
            min={1} />

          </div>

          {loading &&
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) =>
          <div key={i} className="card p-4 animate-pulse h-24" />
          )}
            </div>
        }

          {error &&
        <div className="card p-4 border-red-300 text-red-700 bg-red-50">{error}</div>
        }

          {summary && !loading && !error &&
        <>
              <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <MetricCard label="KYC Status" value={summary.kycStatus} valueClass={kycColor} />
                <MetricCard label="Open Listings" value={summary.openListings} />
                <MetricCard label="Emissions MTD (tCO₂e)" value={Number(summary.emissionsMtd || 0).toFixed(1)} />
                <MetricCard label="Unread Alerts" value={summary.unreadAlerts} />
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="card p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-semibold">Marketplace – Recent Listings</h2>
                      <Link className="text-sm text-blue-600 hover:underline" href="/marketplace">View all</Link>
                    </div>
                    <div className="space-y-3">
                      {listings.length === 0 && <p className="muted">No listings yet.</p>}
                      {listings.map((l) =>
                  <div key={l.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{l.type} • {l.standard} • {l.vintageYear}</span>
                            <span className="text-xs muted">{l.location || "Unknown location"}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">${Number(l.pricePerTon).toFixed(2)}/t</div>
                            <div className="text-xs muted">{Number(l.volumeTco2e).toFixed(0)} tCO₂e</div>
                          </div>
                        </div>
                  )}
                    </div>
                  </div>

                  <div className="card p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-semibold">Compliance – KYC Documents</h2>
                    </div>
                    <KycUploader orgId={orgId} onUploaded={() => setOrgId((v) => v)} />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="card p-5">
                    <h2 className="font-semibold mb-4">Alerts</h2>
                    <AlertsList orgId={orgId} />
                  </div>

                  <div className="card p-5">
                    <h2 className="font-semibold mb-4">Org Summary</h2>
                    <ul className="text-sm space-y-2">
                      <li>
                        <span className="muted">Organization:</span> {summary.organization?.name || `#${orgId}`}
                      </li>
                      <li>
                        <span className="muted">Industry:</span> {summary.organization?.industry || "—"}
                      </li>
                      <li>
                        <span className="muted">Country:</span> {summary.organization?.country || "—"}
                      </li>
                      <li>
                        <span className="muted">Baseline:</span> {summary.organization?.annualEmissionsBaseline ?? "—"}
                      </li>
                      <li>
                        <span className="muted">Docs:</span> {summary.additionalMetrics.kycDocumentsCount}
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Analytics – Price Forecasts</h2>
                  <Link className="text-sm text-blue-600 hover:underline" href="/analytics">Explore</Link>
                </div>
                <ForecastStrip />
              </section>
            </>
        }
        </main>
      }

      <SiteFooter />
    </div>);

}

function SiteHeader({ userEmail }: {userEmail: string;}) {
  const { data: session } = useSession();
  const onLogout = async () => {
    const token = localStorage.getItem("bearer_token") || "";
    await authClient.signOut({
      fetchOptions: { headers: { Authorization: `Bearer ${token}` } }
    });
    localStorage.removeItem("bearer_token");
    window.location.href = "/";
  };

  return (
    <header className="relative">
      <div
        className="h-[220px] w-full bg-cover bg-center"
        style={{
          backgroundImage:
          'url(/globe.svg)'
        }}>

        <div className="w-full h-full bg-black/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between !text-black !opacity-100 !bg-[url(https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/5ef3f0ad-aaae-44e0-96e1-b173a1e4d4a9/visual-edit-uploads/1758056454567-3d8oeb9hm0b.jpg)] !bg-cover !bg-center">
            <div className="text-white">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">ESG Evolve</h1>
              <p className="opacity-90">Carbon Quota Brokerage & Compliance Advisory Platform</p>
            </div>
            <Image
              src=""
              alt="ESG Evolve platform illustration"
              width={180}
              height={110}
              className="hidden sm:block opacity-90 drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)] !text-transparent"
              priority />

          </div>
        </div>
      </div>
      <div className="absolute top-3 left-0 right-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <nav className="hidden md:flex items-center gap-6 text-white/90">
            <Link href="/" className="hover:underline">Home</Link>
            <Link href="/marketplace" className="hover:underline">Marketplace</Link>
            <Link href="/compliance" className="hover:underline">Compliance</Link>
            <Link href="/emissions" className="hover:underline">Emissions</Link>
            <Link href="/vault" className="hover:underline">Vault</Link>
            <Link href="/analytics" className="hover:underline">Analytics</Link>
            <Link href="/trade" className="hover:underline">Trade</Link>
          </nav>
          <div className="flex items-center gap-3">
            {!session?.user ?
            <>
                <Link href="/sign-in" className="btn btn-outline px-4 py-2 text-white border-white/70 hover:bg-white/10">Sign in</Link>
                <Link href="/register" className="btn btn-primary px-4 py-2">Create account</Link>
              </> :

            <div className="flex items-center gap-3">
                <span className="hidden sm:block text-white/90 text-sm">{userEmail}</span>
                <button onClick={onLogout} className="btn btn-outline px-3 py-2 text-white border-white/70 hover:bg-white/10">Sign out</button>
              </div>
            }
          </div>
        </div>
      </div>
    </header>);

}

function PublicHero() {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div className="space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Trade carbon credits. Prove compliance. Forecast risk.
          </h2>
          <p className="text-lg text-muted-foreground muted">
            ESG Evolve is your end-to-end carbon quota marketplace and ESG compliance toolkit.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/sign-in" className="btn btn-primary px-5 py-3">Get started</Link>
            <a
              className="btn btn-outline px-5 py-3"
              href="#features">

              Learn more
            </a>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <li className="card p-3">• Carbon quota marketplace with escrow</li>
            <li className="card p-3">• Emissions tracking dashboard</li>
            <li className="card p-3">• Document vault with versioning</li>
            <li className="card p-3">• AI price forecasting & risk metrics</li>
          </ul>
        </div>
        <div className="rounded-xl overflow-hidden shadow">
          <img
            src="/window.svg"
            alt="ESG Evolve platform illustration"
            className="w-full h-full object-cover" />

        </div>
      </div>
    </main>);

}

function MetricCard({ label, value, valueClass }: {label: string;value: any;valueClass?: string;}) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide muted">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${valueClass || ""}`}>{String(value)}</div>
    </div>);

}

function AlertsList({ orgId }: {orgId: number;}) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("bearer_token") || "";
    setLoading(true);
    setError(null);
    fetch(`/api/alerts?organizationId=${orgId}&limit=5`, { headers: { Authorization: `Bearer ${token}` } }).
    then(async (r) => r.ok ? r.json() : Promise.reject(await r.json())).
    then(setAlerts).
    catch((e) => setError(e?.error || "Failed to load alerts")).
    finally(() => setLoading(false));
  }, [orgId]);

  if (loading) return <div className="h-24 animate-pulse" />;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!alerts.length) return <div className="muted text-sm">No recent alerts.</div>;

  return (
    <ul className="space-y-3">
      {alerts.map((a: any) =>
      <li key={a.id} className="border rounded-md px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{a.type}</span>
            <span className={`text-xs ${a.severity === "critical" ? "text-red-600" : a.severity === "warning" ? "text-amber-600" : "text-emerald-600"}`}>
              {a.severity}
            </span>
          </div>
          <p className="text-sm mt-1">{a.message}</p>
        </li>
      )}
    </ul>);

}

function KycUploader({ orgId, onUploaded }: {orgId: number;onUploaded: () => void;}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("bearer_token") || "";
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ organizationId: orgId, name, pathUrl: url, category: "OTHER" })
      });
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
      setMessage("Document saved. Our team will verify it shortly.");
      setName("");
      setUrl("");
      onUploaded();
    } catch (err: any) {
      setMessage(err?.message || "Failed to upload document");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Document name (e.g., KYC – Certificate of Incorporation)"
        className="md:col-span-2 px-3 py-2 rounded-md border bg-transparent" />

      <input
        required
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Document URL (public link)"
        className="md:col-span-2 px-3 py-2 rounded-md border bg-transparent" />

      <button disabled={submitting} className="btn btn-primary px-4 py-2 md:col-span-1">
        {submitting ? "Saving..." : "Submit"}
      </button>
      {message && <div className="md:col-span-5 text-sm mt-1">{message}</div>}
    </form>);

}

function ForecastStrip() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/analytics/trends?horizonMonths=3`).
    then(async (r) => r.ok ? r.json() : Promise.reject(await r.json())).
    then((d) => setData(d?.forecasts || [])).
    catch((e) => setError(e?.error || "Failed to load forecasts")).
    finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-16 animate-pulse" />;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
      {data.map((group: any) =>
      <div key={group.standard} className="border rounded-md px-3 py-2">
          <div className="text-xs muted">{group.standard}</div>
          <div className="text-sm font-semibold">
            {group.forecasts?.[0]?.predictedPrice ? `$${Number(group.forecasts[0].predictedPrice).toFixed(2)}` : "—"}
          </div>
          <div className="text-xs muted">h={group.forecasts?.[0]?.horizonMonths || "3"}m</div>
        </div>
      )}
    </div>);

}

function SiteFooter() {
  return (
    <footer className="border-t mt-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm muted">© {new Date().getFullYear()} ESG Evolve</div>
        <div className="flex items-center gap-4 text-sm">
          <a href="#" className="hover:underline">Privacy</a>
          <a href="#" className="hover:underline">Terms</a>
          <a href="#" className="hover:underline">Support</a>
        </div>
      </div>
    </footer>);

}