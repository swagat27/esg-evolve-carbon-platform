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
        </div>

        <div className="space-y-6">
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