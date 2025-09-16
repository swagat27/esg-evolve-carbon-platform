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
    const { escrowId, orderId } = body;

    // Validate that at least one identifier is provided
    if (!escrowId && !orderId) {
      return NextResponse.json({
        error: "Either escrowId or orderId is required",
        code: "MISSING_IDENTIFIER"
      }, { status: 400 });
    }

    let escrowRecord;

    if (escrowId) {
      // Find by escrowId
      if (isNaN(parseInt(escrowId))) {
        return NextResponse.json({
          error: "escrowId must be a valid integer",
          code: "INVALID_ESCROW_ID"
        }, { status: 400 });
      }

      const escrowResult = await db.select()
        .from(escrows)
        .where(eq(escrows.id, parseInt(escrowId)))
        .limit(1);

      if (escrowResult.length === 0) {
        return NextResponse.json({
          error: "Escrow not found",
          code: "ESCROW_NOT_FOUND"
        }, { status: 404 });
      }

      escrowRecord = escrowResult[0];
    } else {
      // Find by orderId
      if (isNaN(parseInt(orderId))) {
        return NextResponse.json({
          error: "orderId must be a valid integer",
          code: "INVALID_ORDER_ID"
        }, { status: 400 });
      }

      const escrowResult = await db.select()
        .from(escrows)
        .where(eq(escrows.orderId, parseInt(orderId)))
        .limit(1);

      if (escrowResult.length === 0) {
        return NextResponse.json({
          error: "Escrow not found for this order",
          code: "ESCROW_NOT_FOUND"
        }, { status: 404 });
      }

      escrowRecord = escrowResult[0];
    }

    // Validate escrow status
    if (escrowRecord.status !== 'HELD') {
      return NextResponse.json({
        error: `Escrow status must be HELD, current status is ${escrowRecord.status}`,
        code: "INVALID_ESCROW_STATUS"
      }, { status: 400 });
    }

    const now = Date.now();

    // Update escrow status to RELEASED
    const releasedEscrow = await db.update(escrows)
      .set({
        status: 'RELEASED',
        releasedAt: now
      })
      .where(eq(escrows.id, escrowRecord.id))
      .returning();

    // Update related order status to SETTLED
    await db.update(tradeOrders)
      .set({
        status: 'SETTLED',
        updatedAt: now
      })
      .where(eq(tradeOrders.id, escrowRecord.orderId));

    return NextResponse.json({
      escrow: releasedEscrow[0],
      message: 'Escrow released and order settled successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('POST escrow release error:', error);
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