import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { escrows, tradeOrders } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Simplified auth for testing - in production this should use proper auth
async function validateAuth(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }
  // For testing purposes, accept any bearer token
  return { user: { id: 'test_user' } };
}

export async function POST(request: NextRequest) {
  try {
    const session = await validateAuth(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, amount, currency } = body;

    // Validate required fields
    if (!orderId) {
      return NextResponse.json({
        error: "orderId is required",
        code: "MISSING_ORDER_ID"
      }, { status: 400 });
    }

    if (!amount) {
      return NextResponse.json({
        error: "amount is required",
        code: "MISSING_AMOUNT"
      }, { status: 400 });
    }

    // Validate orderId is integer
    if (isNaN(parseInt(orderId))) {
      return NextResponse.json({
        error: "orderId must be a valid integer",
        code: "INVALID_ORDER_ID"
      }, { status: 400 });
    }

    // Validate amount is positive
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json({
        error: "amount must be a positive number",
        code: "INVALID_AMOUNT"
      }, { status: 400 });
    }

    // Check if order exists and has valid status
    const order = await db.select()
      .from(tradeOrders)
      .where(eq(tradeOrders.id, parseInt(orderId)))
      .limit(1);

    if (order.length === 0) {
      return NextResponse.json({
        error: "Order not found",
        code: "ORDER_NOT_FOUND"
      }, { status: 404 });
    }

    // Validate order status
    const validStatuses = ['PENDING', 'ESCROW'];
    if (!validStatuses.includes(order[0].status)) {
      return NextResponse.json({
        error: `Order status must be PENDING or ESCROW, current status is ${order[0].status}`,
        code: "INVALID_ORDER_STATUS"
      }, { status: 400 });
    }

    const now = Date.now();
    const escrowCurrency = currency || 'USD';

    // Create escrow record
    const newEscrow = await db.insert(escrows).values({
      orderId: parseInt(orderId),
      amount: parseFloat(amount),
      currency: escrowCurrency,
      status: 'HELD',
      createdAt: now,
      releasedAt: null,
    }).returning();

    // Update order status to ESCROW
    await db.update(tradeOrders)
      .set({
        status: 'ESCROW',
        updatedAt: now
      })
      .where(eq(tradeOrders.id, parseInt(orderId)));

    return NextResponse.json(newEscrow[0], { status: 201 });

  } catch (error) {
    console.error('POST escrow hold error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error,
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    error: 'Method not allowed',
    code: 'METHOD_NOT_ALLOWED'
  }, { status: 405 });
}

export async function PUT(request: NextRequest) {
  return NextResponse.json({
    error: 'Method not allowed',
    code: 'METHOD_NOT_ALLOWED'
  }, { status: 405 });
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({
    error: 'Method not allowed',
    code: 'METHOD_NOT_ALLOWED'
  }, { status: 405 });
}