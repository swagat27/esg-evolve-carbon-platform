"use client"

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";

const CATEGORIES = ["POLICY", "REPORT", "CONTRACT", "OTHER"] as const;

type Doc = {
  id: number;
  organizationId: number;
  name: string;
  pathUrl: string;
  version: number;
  category: string;
  createdAt: string;
};

export default function VaultPage() {
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
        <h1 className="text-2xl font-bold">Document Vault</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">Back to dashboard</Link>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Documents</h2>
            <span className="muted text-sm">Org #{orgId}</span>
          </div>
          <DocumentsTable orgId={orgId} />
        </div>
        <div className="card p-5">
          <h2 className="font-semibold mb-4">Upload / New Version</h2>
          <UploadForm defaultOrgId={orgId} />
        </div>
      </section>
    </div>
  );
}

function DocumentsTable({ orgId }: { orgId: number }) {
  const [rows, setRows] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);

  const qs = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("organizationId", String(orgId));
    sp.set("limit", "50");
    if (category) sp.set("category", category);
    if (search) sp.set("search", search);
    return sp.toString();
  }, [orgId, category, search]);

  useEffect(() => {
    const token = localStorage.getItem("bearer_token") || "";
    setLoading(true);
    setError(null);
    fetch(`/api/documents?${qs}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => (r.ok ? r.json() : Promise.reject(await r.json())))
      .then(setRows)
      .catch((e) => setError(e?.error || "Failed to load documents"))
      .finally(() => setLoading(false));
  }, [qs, refreshKey]);

  const onDelete = async (id: number) => {
    if (!confirm("Delete this document?")) return;
    const token = localStorage.getItem("bearer_token") || "";
    const res = await fetch(`/api/documents?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setRefreshKey((k) => k + 1);
  };

  const onBumpVersion = async (doc: Doc) => {
    // Simple versioning: change name slightly to trigger new version per backend logic
    const token = localStorage.getItem("bearer_token") || "";
    const res = await fetch(`/api/documents?id=${doc.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: doc.name }),
    });
    if (res.ok) setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name/path" className="px-3 py-2 rounded-md border bg-transparent" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 rounded-md border bg-transparent">
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Version</th>
                <th className="py-2 pr-3">Created</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="py-2 pr-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{d.name}</span>
                      <a href={d.pathUrl} target="_blank" className="text-xs text-blue-600 hover:underline break-all">{d.pathUrl}</a>
                    </div>
                  </td>
                  <td className="py-2 pr-3">{d.category}</td>
                  <td className="py-2 pr-3">v{d.version}</td>
                  <td className="py-2 pr-3">{new Date(d.createdAt).toLocaleString()}</td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <button className="btn btn-outline px-2 py-1" onClick={() => onBumpVersion(d)}>New version</button>
                      <button className="btn btn-outline px-2 py-1" onClick={() => onDelete(d.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center muted">No documents found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UploadForm({ defaultOrgId }: { defaultOrgId: number }) {
  const [organizationId, setOrganizationId] = useState<number>(defaultOrgId);
  const [name, setName] = useState("");
  const [pathUrl, setPathUrl] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number]>("OTHER");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      const token = localStorage.getItem("bearer_token") || "";
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ organizationId, name, pathUrl, category }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
      setMsg("Document uploaded.");
      setName("");
      setPathUrl("");
    } catch (e: any) {
      setMsg(e?.message || "Failed to upload document");
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
          <label className="block text-sm mb-1">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="w-full px-3 py-2 rounded-md border bg-transparent">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1">Name</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-md border bg-transparent" placeholder="Document name" />
      </div>
      <div>
        <label className="block text-sm mb-1">Public URL</label>
        <input required value={pathUrl} onChange={(e) => setPathUrl(e.target.value)} className="w-full px-3 py-2 rounded-md border bg-transparent" placeholder="https://..." />
      </div>

      <button disabled={submitting} className="btn btn-primary py-2">{submitting ? "Uploading..." : "Upload"}</button>
      {msg && <div className="text-sm mt-1">{msg}</div>}
    </form>
  );
}