import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tradeOrders, carbonListings, organizations } from '@/db/schema';
import { eq, and, or, desc, asc } from 'drizzle-orm';

// Simplified auth for testing - in production this should use proper auth
async function validateAuth(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }
  // For testing purposes, accept any bearer token
  return { user: { id: 'test_user' } };
}

export async function GET(request: NextRequest) {
  try {
    const session = await validateAuth(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      if (isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }
      
      // Get single order first
      const order = await db.select()
        .from(tradeOrders)
        .where(eq(tradeOrders.id, parseInt(id)))
        .limit(1);

      if (order.length === 0) {
        return NextResponse.json({ error: 'Trade order not found' }, { status: 404 });
      }

      // Get listing if exists
      let listing = null;
      if (order[0].listingId) {
        const listingResult = await db.select()
          .from(carbonListings)
          .where(eq(carbonListings.id, order[0].listingId))
          .limit(1);
        listing = listingResult[0] || null;
      }

      return NextResponse.json({
        order: order[0],
        listing: listing
      });
    }

    // List orders with filters
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const buyerOrgId = searchParams.get('buyerOrgId');
    const sellerOrgId = searchParams.get('sellerOrgId');
    const listingId = searchParams.get('listingId');
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'id';
    const order = searchParams.get('order') || 'desc';

    let query = db.select().from(tradeOrders);
    const conditions = [];

    if (buyerOrgId && !isNaN(parseInt(buyerOrgId))) {
      conditions.push(eq(tradeOrders.buyerOrgId, parseInt(buyerOrgId)));
    }

    if (sellerOrgId && !isNaN(parseInt(sellerOrgId))) {
      conditions.push(eq(tradeOrders.sellerOrgId, parseInt(sellerOrgId)));
    }

    if (listingId && !isNaN(parseInt(listingId))) {
      conditions.push(eq(tradeOrders.listingId, parseInt(listingId)));
    }

    if (status && ['PENDING', 'ESCROW', 'SETTLED', 'CANCELLED'].includes(status)) {
      conditions.push(eq(tradeOrders.status, status));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const sortField = sort === 'createdAt' ? tradeOrders.createdAt : tradeOrders.id;
    query = order === 'asc' 
      ? query.orderBy(asc(sortField))
      : query.orderBy(desc(sortField));

    const results = await query.limit(limit).offset(offset);
    return NextResponse.json(results);

  } catch (error) {
    console.error('GET trade orders error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await validateAuth(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { listingId, buyerOrgId, sellerOrgId, volumeTco2e, pricePerTon, status } = body;

    // Validate required fields
    if (!buyerOrgId || !sellerOrgId || !volumeTco2e || !pricePerTon) {
      return NextResponse.json({ 
        error: "buyerOrgId, sellerOrgId, volumeTco2e, and pricePerTon are required",
        code: "MISSING_REQUIRED_FIELDS" 
      }, { status: 400 });
    }

    // Validate numeric values
    if (isNaN(parseInt(buyerOrgId)) || isNaN(parseInt(sellerOrgId))) {
      return NextResponse.json({
        error: "buyerOrgId and sellerOrgId must be valid integers",
        code: "INVALID_ORG_IDS"
      }, { status: 400 });
    }

    if (isNaN(parseFloat(volumeTco2e)) || parseFloat(volumeTco2e) <= 0) {
      return NextResponse.json({
        error: "volumeTco2e must be a positive number",
        code: "INVALID_VOLUME"
      }, { status: 400 });
    }

    if (isNaN(parseFloat(pricePerTon)) || parseFloat(pricePerTon) <= 0) {
      return NextResponse.json({
        error: "pricePerTon must be a positive number",
        code: "INVALID_PRICE"
      }, { status: 400 });
    }

    // Validate status if provided
    const validStatuses = ['PENDING', 'ESCROW', 'SETTLED', 'CANCELLED'];
    const orderStatus = status || 'PENDING';
    if (!validStatuses.includes(orderStatus)) {
      return NextResponse.json({
        error: "status must be one of: " + validStatuses.join(', '),
        code: "INVALID_STATUS"
      }, { status: 400 });
    }

    // Validate listingId if provided
    if (listingId && isNaN(parseInt(listingId))) {
      return NextResponse.json({
        error: "listingId must be a valid integer",
        code: "INVALID_LISTING_ID"
      }, { status: 400 });
    }

    const now = Date.now();
    const newOrder = await db.insert(tradeOrders).values({
      listingId: listingId ? parseInt(listingId) : null,
      buyerOrgId: parseInt(buyerOrgId),
      sellerOrgId: parseInt(sellerOrgId),
      volumeTco2e: parseFloat(volumeTco2e),
      pricePerTon: parseFloat(pricePerTon),
      status: orderStatus,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return NextResponse.json(newOrder[0], { status: 201 });

  } catch (error) {
    console.error('POST trade orders error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await validateAuth(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const body = await request.json();
    const { status, pricePerTon, volumeTco2e } = body;

    // Validate status if being updated
    if (status && !['PENDING', 'ESCROW', 'SETTLED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({
        error: "status must be one of: PENDING, ESCROW, SETTLED, CANCELLED",
        code: "INVALID_STATUS"
      }, { status: 400 });
    }

    // Validate numeric fields if being updated
    if (pricePerTon && (isNaN(parseFloat(pricePerTon)) || parseFloat(pricePerTon) <= 0)) {
      return NextResponse.json({
        error: "pricePerTon must be a positive number",
        code: "INVALID_PRICE"
      }, { status: 400 });
    }

    if (volumeTco2e && (isNaN(parseFloat(volumeTco2e)) || parseFloat(volumeTco2e) <= 0)) {
      return NextResponse.json({
        error: "volumeTco2e must be a positive number",
        code: "INVALID_VOLUME"
      }, { status: 400 });
    }

    const updateData: any = {
      updatedAt: Date.now()
    };

    if (status) updateData.status = status;
    if (pricePerTon) updateData.pricePerTon = parseFloat(pricePerTon);
    if (volumeTco2e) updateData.volumeTco2e = parseFloat(volumeTco2e);

    const updatedOrder = await db.update(tradeOrders)
      .set(updateData)
      .where(eq(tradeOrders.id, parseInt(id)))
      .returning();

    if (updatedOrder.length === 0) {
      return NextResponse.json({ error: 'Trade order not found' }, { status: 404 });
    }

    // If status becomes SETTLED, check if related listing should be marked as FILLED
    if (status === 'SETTLED' && updatedOrder[0].listingId) {
      const listing = await db.select()
        .from(carbonListings)
        .where(eq(carbonListings.id, updatedOrder[0].listingId))
        .limit(1);

      if (listing.length > 0) {
        // Check if listing volume is fully filled by this order
        if (updatedOrder[0].volumeTco2e >= listing[0].volumeTco2e) {
          await db.update(carbonListings)
            .set({ 
              status: 'FILLED',
              updatedAt: Date.now()
            })
            .where(eq(carbonListings.id, updatedOrder[0].listingId));
        }
      }
    }

    return NextResponse.json(updatedOrder[0]);

  } catch (error) {
    console.error('PUT trade orders error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await validateAuth(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Soft delete by setting status to CANCELLED
    const cancelledOrder = await db.update(tradeOrders)
      .set({ 
        status: 'CANCELLED',
        updatedAt: Date.now()
      })
      .where(eq(tradeOrders.id, parseInt(id)))
      .returning();

    if (cancelledOrder.length === 0) {
      return NextResponse.json({ error: 'Trade order not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Trade order cancelled successfully',
      order: cancelledOrder[0]
    });

  } catch (error) {
    console.error('DELETE trade orders error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}