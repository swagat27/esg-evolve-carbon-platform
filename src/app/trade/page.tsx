"use client"

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";

// Minimal types
type Listing = {
  id: number;
  organizationId: number;
  type: "SELL" | "BUY";
  volumeTco2e: number;
  pricePerTon: number;
  standard: string;
  vintageYear: number;
  location?: string | null;
  status: string;
};

export default function TradePage() {
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
        <h1 className="text-2xl font-bold">Trading & Escrow</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">Back to dashboard</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Open Listings</h2>
              <span className="muted text-sm">Org #{orgId}</span>
            </div>
            <ListingsPicker orgId={orgId} />
          </div>

          <div className="card p-5">
            <h2 className="font-semibold mb-4">Create Trade Order</h2>
            <CreateOrderForm />
          </div>

          {/* Orders List */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Orders</h2>
              <span className="muted text-sm">Buyer/Seller Org #{orgId}</span>
            </div>
            <OrdersList orgId={orgId} />
          </div>
        </div>

        <div className="space-y-6">
          {/* Marketplace Match */}
          <div className="card p-5">
            <h2 className="font-semibold mb-4">Marketplace – Match</h2>
            <MatchForm defaultOrgId={orgId} />
          </div>

          <div className="card p-5">
            <h2 className="font-semibold mb-4">Escrow – Hold Funds</h2>
            <EscrowHoldForm />
          </div>
          <div className="card p-5">
            <h2 className="font-semibold mb-4">Escrow – Release Funds</h2>
            <EscrowReleaseForm />
          </div>
        </div>
      </div>
    </div>
  );
}

function ListingsPicker({ orgId }: { orgId: number }) {
  const [rows, setRows] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("bearer_token") || "";
    setLoading(true);
    setError(null);
    fetch(`/api/carbon-listings?organizationId=${orgId}&status=OPEN&limit=25`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => (r.ok ? r.json() : Promise.reject(await r.json())))
      .then(setRows)
      .catch((e) => setError(e?.error || "Failed to load listings"))
      .finally(() => setLoading(false));
  }, [orgId]);

  if (loading) return <div className="h-24 animate-pulse" />;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left muted">
            <th className="py-2 pr-3">ID</th>
            <th className="py-2 pr-3">Type</th>
            <th className="py-2 pr-3">Standard</th>
            <th className="py-2 pr-3">Vintage</th>
            <th className="py-2 pr-3 text-right">Price/t</th>
            <th className="py-2 pr-3 text-right">Volume</th>
            <th className="py-2 pr-3">Location</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => (
            <tr key={l.id} className="border-t">
              <td className="py-2 pr-3">{l.id}</td>
              <td className="py-2 pr-3">{l.type}</td>
              <td className="py-2 pr-3">{l.standard}</td>
              <td className="py-2 pr-3">{l.vintageYear}</td>
              <td className="py-2 pr-3 text-right">${Number(l.pricePerTon).toFixed(2)}</td>
              <td className="py-2 pr-3 text-right">{Number(l.volumeTco2e).toFixed(0)} t</td>
              <td className="py-2 pr-3">{l.location || "—"}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={7} className="py-6 text-center muted">No open listings.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function CreateOrderForm() {
  const [listingId, setListingId] = useState<string>("");
  const [buyerOrgId, setBuyerOrgId] = useState<string>("");
  const [sellerOrgId, setSellerOrgId] = useState<string>("");
  const [volumeTco2e, setVolume] = useState<string>("");
  const [pricePerTon, setPrice] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      const token = localStorage.getItem("bearer_token") || "";
      const res = await fetch("/api/trade-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          listingId: Number(listingId),
          buyerOrgId: Number(buyerOrgId),
          sellerOrgId: Number(sellerOrgId),
          volumeTco2e: Number(volumeTco2e),
          pricePerTon: Number(pricePerTon),
          status: "PENDING",
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to create order");
      const data = await res.json();
      setMsg(`Order #${data.id} created.`);
    } catch (e: any) {
      setMsg(e?.message || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">Listing ID</label>
          <input required type="number" value={listingId} onChange={(e) => setListingId(e.target.value)} className="w-full px-3 py-2 rounded-md border bg-transparent" />
        </div>
        <div>
          <label className="block text-sm mb-1">Price per ton</label>
          <input required type="number" step="0.01" value={pricePerTon} onChange={(e) => setPrice(e.target.value)} className="w-full px-3 py-2 rounded-md border bg-transparent" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">Buyer Org ID</label>
          <input required type="number" value={buyerOrgId} onChange={(e) => setBuyerOrgId(e.target.value)} className="w-full px-3 py-2 rounded-md border bg-transparent" />
        </div>
        <div>
          <label className="block text-sm mb-1">Seller Org ID</label>
          <input required type="number" value={sellerOrgId} onChange={(e) => setSellerOrgId(e.target.value)} className="w-full px-3 py-2 rounded-md border bg-transparent" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">Volume (tCO₂e)</label>
          <input required type="number" step="1" value={volumeTco2e} onChange={(e) => setVolume(e.target.value)} className="w-full px-3 py-2 rounded-md border bg-transparent" />
        </div>
      </div>
      <button disabled={submitting} className="btn btn-primary py-2">{submitting ? "Creating..." : "Create order"}</button>
      {msg && <div className="text-sm mt-1">{msg}</div>}
    </form>
  );
}

function EscrowHoldForm() {
  const [orderId, setOrderId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<string>("USD");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      const token = localStorage.getItem("bearer_token") || "";
      const res = await fetch("/api/escrow/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: Number(orderId), amount: Number(amount), currency }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to hold funds");
      const data = await res.json();
      setMsg(`Escrow #${data.id || data.escrowId || "?"} held.`);
    } catch (e: any) {
      setMsg(e?.message || "Failed to hold funds");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">Order ID</label>
          <input required type="number" value={orderId} onChange={(e) => setOrderId(e.target.value)} className="w-full px-3 py-2 rounded-md border bg-transparent" />
        </div>
        <div>
          <label className="block text-sm mb-1">Amount</label>
          <input required type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-3 py-2 rounded-md border bg-transparent" />
        </div>
      </div>
      <div>
        <label className="block text-sm mb-1">Currency</label>
        <input value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full px-3 py-2 rounded-md border bg-transparent" />
      </div>
      <button disabled={submitting} className="btn btn-primary py-2">{submitting ? "Holding..." : "Hold funds"}</button>
      {msg && <div className="text-sm mt-1">{msg}</div>}
    </form>
  );
}

function EscrowReleaseForm() {
  const [escrowId, setEscrowId] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      const token = localStorage.getItem("bearer_token") || "";
      const payload: any = {};
      if (escrowId) payload.escrowId = Number(escrowId);
      if (orderId) payload.orderId = Number(orderId);
      const res = await fetch("/api/escrow/release", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to release funds");
      const data = await res.json();
      setMsg(`Escrow ${data.id || data.escrowId || ""} released.`);
    } catch (e: any) {
      setMsg(e?.message || "Failed to release funds");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">Escrow ID</label>
          <input type="number" value={escrowId} onChange={(e) => setEscrowId(e.target.value)} className="w-full px-3 py-2 rounded-md border bg-transparent" />
        </div>
        <div>
          <label className="block text-sm mb-1">Order ID</label>
          <input type="number" value={orderId} onChange={(e) => setOrderId(e.target.value)} className="w-full px-3 py-2 rounded-md border bg-transparent" />
        </div>
      </div>
      <button disabled={submitting} className="btn btn-primary py-2">{submitting ? "Releasing..." : "Release funds"}</button>
      {msg && <div className="text-sm mt-1">{msg}</div>}
    </form>
  );
}

// New: Orders list component (buyer or seller = orgId)
function OrdersList({ orgId }: { orgId: number }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("bearer_token") || "";
    setLoading(true);
    setError(null);
    // Fetch as buyer and as seller, then merge unique
    const fetchBuyer = fetch(`/api/trade-orders?buyerOrgId=${orgId}&limit=50&order=desc`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []);
    const fetchSeller = fetch(`/api/trade-orders?sellerOrgId=${orgId}&limit=50&order=desc`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []);
    Promise.all([fetchBuyer, fetchSeller])
      .then(([b, s]) => {
        const map = new Map<number, any>();
        [...b, ...s].forEach((o: any) => map.set(o.id, o));
        setRows(Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      })
      .catch(() => setError("Failed to load orders"))
      .finally(() => setLoading(false));
  }, [orgId]);

  if (loading) return <div className="h-24 animate-pulse" />;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left muted">
            <th className="py-2 pr-3">ID</th>
            <th className="py-2 pr-3">Listing</th>
            <th className="py-2 pr-3">Buyer</th>
            <th className="py-2 pr-3">Seller</th>
            <th className="py-2 pr-3 text-right">Price/t</th>
            <th className="py-2 pr-3 text-right">Volume</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3">Created</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className="border-t">
              <td className="py-2 pr-3">{o.id}</td>
              <td className="py-2 pr-3">{o.listingId ?? "—"}</td>
              <td className="py-2 pr-3">{o.buyerOrgId}</td>
              <td className="py-2 pr-3">{o.sellerOrgId}</td>
              <td className="py-2 pr-3 text-right">${Number(o.pricePerTon).toFixed(2)}</td>
              <td className="py-2 pr-3 text-right">{Number(o.volumeTco2e).toFixed(0)} t</td>
              <td className="py-2 pr-3">{o.status}</td>
              <td className="py-2 pr-3">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "—"}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={8} className="py-6 text-center muted">No orders.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// New: Marketplace Match form
function MatchForm({ defaultOrgId }: { defaultOrgId: number }) {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [organizationId, setOrganizationId] = useState<string>(String(defaultOrgId));
  const [volumeTco2e, setVolume] = useState<string>("");
  const [maxPricePerTon, setMaxPrice] = useState<string>("");
  const [minPricePerTon, setMinPrice] = useState<string>("");
  const [standard, setStandard] = useState<string>("");
  const [vintageYear, setVintageYear] = useState<string>("");
  const [createOrder, setCreateOrder] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setOrganizationId(String(defaultOrgId)); }, [defaultOrgId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const token = localStorage.getItem("bearer_token") || "";
      const payload: any = {
        side,
        organizationId: Number(organizationId),
        volumeTco2e: Number(volumeTco2e),
        createOrder,
      };
      if (maxPricePerTon) payload.maxPricePerTon = Number(maxPricePerTon);
      if (minPricePerTon) payload.minPricePerTon = Number(minPricePerTon);
      if (standard) payload.standard = standard;
      if (vintageYear) payload.vintageYear = Number(vintageYear);

      const res = await fetch("/api/marketplace/match", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Match failed");
      setResult(data);
    } catch (e: any) {
      setError(e?.message || "Failed to match");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Side</label>
            <select value={side} onChange={(e) => setSide(e.target.value as any)} className="w-full px-3 py-2 rounded-md border bg-transparent">
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Organization ID</label>
            <input required type="number" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} className="w-full px-3 py-2 rounded-md border bg-transparent" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Volume (tCO₂e)</label>
            <input required type="number" step="1" value={volumeTco2e} onChange={(e) => setVolume(e.target.value)} className="w-full px-3 py-2 rounded-md border bg-transparent" />
          </div>
          <div>
            <label className="block text-sm mb-1">Standard</label>
            <input placeholder="VERRA / GOLD_STANDARD / ..." value={standard} onChange={(e) => setStandard(e.target.value)} className="w-full px-3 py-2 rounded-md border bg-transparent" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1">Vintage Year</label>
            <input type="number" value={vintageYear} onChange={(e) => setVintageYear(e.target.value)} className="w-full px-3 py-2 rounded-md border bg-transparent" />
          </div>
          <div>
            <label className="block text-sm mb-1">Max Price/t</label>
            <input type="number" step="0.01" value={maxPricePerTon} onChange={(e) => setMaxPrice(e.target.value)} className="w-full px-3 py-2 rounded-md border bg-transparent" />
          </div>
          <div>
            <label className="block text-sm mb-1">Min Price/t</label>
            <input type="number" step="0.01" value={minPricePerTon} onChange={(e) => setMinPrice(e.target.value)} className="w-full px-3 py-2 rounded-md border bg-transparent" />
          </div>
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={createOrder} onChange={(e) => setCreateOrder(e.target.checked)} />
          Auto-create order for best match
        </label>
        <button disabled={submitting} className="btn btn-primary py-2">{submitting ? "Matching..." : "Find matches"}</button>
      </form>

      {error && <div className="text-sm text-red-600 mt-3">{error}</div>}

      {result && (
        <div className="mt-4 space-y-3">
          <div className="text-sm muted">{result.matchCount} matches • Fulfillment {(result.fulfillmentRate * 100).toFixed(1)}%</div>
          <div className="border rounded-md">
            <div className="divide-y">
              {result.matches?.map((m: any, idx: number) => (
                <div key={idx} className="px-3 py-2 text-sm flex items-center justify-between">
                  <div>
                    <div className="font-medium">Listing #{m.listing.id} • {m.listing.standard} • {m.listing.vintageYear}</div>
                    <div className="muted">Org #{m.listing.organizationId} • {m.listing.organization?.name || "Unknown"}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{Number(m.matchVolume).toFixed(0)} t @ ${Number(m.pricePerTon).toFixed(2)}/t</div>
                    <div className="muted">Total ${Number(m.totalValue).toFixed(2)}</div>
                  </div>
                </div>
              ))}
              {(!result.matches || result.matches.length === 0) && (
                <div className="px-3 py-4 text-center muted text-sm">No matches found.</div>
              )}
            </div>
          </div>
          {result.createdOrder?.order?.id && (
            <div className="text-sm">Created Order #{result.createdOrder.order.id}</div>
          )}
        </div>
      )}
    </div>
  );
}