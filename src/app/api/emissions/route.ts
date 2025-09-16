import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  // Return empty list until emissions table exists
  return NextResponse.json([]);
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, { status: 405 });
}