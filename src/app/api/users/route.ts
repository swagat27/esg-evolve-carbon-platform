import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";

// Upsert the app profile for the authenticated user
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const role = String(body.role || "ESGLead");
    const organizationId = parseInt(String(body.organizationId || "1"));

    if (!organizationId || Number.isNaN(organizationId)) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Check if a profile already exists
    const existing = await db.select().from(users).where(eq(users.authUserId, session.user.id)).limit(1);

    if (existing.length > 0) {
      const updated = await db
        .update(users)
        .set({ role, organizationId, updatedAt: now, name: session.user.name || existing[0].name, email: session.user.email })
        .where(eq(users.id, existing[0].id))
        .returning();
      return NextResponse.json(updated[0]);
    }

    const created = await db
      .insert(users)
      .values({
        authUserId: session.user.id,
        email: session.user.email,
        name: session.user.name || "",
        role,
        organizationId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(created[0], { status: 201 });
  } catch (error) {
    console.error("/api/users POST error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await db.select().from(users).where(eq(users.authUserId, session.user.id)).limit(1);
    if (!rows.length) return NextResponse.json(null);
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("/api/users GET error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}