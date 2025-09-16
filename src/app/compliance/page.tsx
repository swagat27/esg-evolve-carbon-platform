"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";

export default function CompliancePage() {
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
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Compliance Toolkit</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">Back to dashboard</Link>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5">
          <h2 className="font-semibold mb-4">Organization KYC</h2>
          <KycForm orgId={orgId} />
        </div>
        <div className="card p-5">
          <h2 className="font-semibold mb-4">Recent KYC Documents</h2>
          <KycDocs orgId={orgId} />
        </div>
      </section>
    </div>
  );
}

function KycForm({ orgId }: { orgId: number }) {
  const [docType, setDocType] = useState("incorporation_doc");
  const [fileUrl, setFileUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);

    try {
      const token = localStorage.getItem("bearer_token") || "";
      // Save as generic document for now; backend also has kycDocuments table but route isn’t exposed.
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          organizationId: orgId,
          name: `KYC:${docType}`,
          pathUrl: fileUrl,
          category: "OTHER",
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setMsg("KYC document submitted for verification.");
      setFileUrl("");
    } catch (e: any) {
      setMsg(e?.message || "Failed to submit KYC document");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
      <select
        value={docType}
        onChange={(e) => setDocType(e.target.value)}
        className="md:col-span-2 px-3 py-2 rounded-md border bg-transparent"
      >
        <option value="incorporation_doc">Certificate of Incorporation</option>
        <option value="msme_certificate">MSME/Udyam Certificate</option>
        <option value="pan_copy">PAN/TAX ID Copy</option>
        <option value="address_proof">Registered Address Proof</option>
      </select>
      <input
        required
        value={fileUrl}
        onChange={(e) => setFileUrl(e.target.value)}
        placeholder="Public file URL (PDF)"
        className="md:col-span-2 px-3 py-2 rounded-md border bg-transparent"
      />
      <button disabled={submitting} className="btn btn-primary px-4 py-2 md:col-span-1">
        {submitting ? "Submitting..." : "Submit"}
      </button>
      {msg && <div className="md:col-span-5 text-sm mt-1">{msg}</div>}
    </form>
  );
}

function KycDocs({ orgId }: { orgId: number }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("bearer_token") || "";
    setLoading(true);
    setError(null);
    fetch(`/api/documents?organizationId=${orgId}&limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => (r.ok ? r.json() : Promise.reject(await r.json())))
      .then(setDocs)
      .catch((e) => setError(e?.error || "Failed to load documents"))
      .finally(() => setLoading(false));
  }, [orgId]);

  if (loading) return <div className="h-24 animate-pulse" />;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  return (
    <ul className="space-y-3">
      {docs.filter((d: any) => String(d.name || "").startsWith("KYC:")).map((d: any) => (
        <li key={d.id} className="border rounded-md px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{d.name}</span>
            <a href={d.pathUrl} target="_blank" className="text-xs text-blue-600 hover:underline">View</a>
          </div>
          <div className="text-xs muted mt-1">v{d.version} • {new Date(d.createdAt).toLocaleString()}</div>
        </li>
      ))}
      {docs.filter((d: any) => String(d.name || "").startsWith("KYC:")).length === 0 && (
        <li className="muted text-sm">No KYC docs yet.</li>
      )}
    </ul>
  );
}