import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { carbonListings, tradeOrders, organizations } from '@/db/schema';
import { eq, and, or, ne, gte, lte, desc, asc } from 'drizzle-orm';

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
    const { 
      side, 
      organizationId, 
      volumeTco2e, 
      maxPricePerTon, 
      minPricePerTon, 
      standard, 
      vintageYear, 
      location,
      createOrder 
    } = body;

    // Validate required fields
    if (!side || !organizationId || !volumeTco2e) {
      return NextResponse.json({
        error: "side, organizationId, and volumeTco2e are required",
        code: "MISSING_REQUIRED_FIELDS"
      }, { status: 400 });
    }

    // Validate side
    if (!['BUY', 'SELL'].includes(side)) {
      return NextResponse.json({
        error: "side must be either BUY or SELL",
        code: "INVALID_SIDE"
      }, { status: 400 });
    }

    // Validate organizationId
    if (isNaN(parseInt(organizationId))) {
      return NextResponse.json({
        error: "organizationId must be a valid integer",
        code: "INVALID_ORGANIZATION_ID"
      }, { status: 400 });
    }

    // Validate volumeTco2e
    if (isNaN(parseFloat(volumeTco2e)) || parseFloat(volumeTco2e) <= 0) {
      return NextResponse.json({
        error: "volumeTco2e must be a positive number",
        code: "INVALID_VOLUME"
      }, { status: 400 });
    }

    // Validate price constraints if provided
    if (maxPricePerTon && (isNaN(parseFloat(maxPricePerTon)) || parseFloat(maxPricePerTon) <= 0)) {
      return NextResponse.json({
        error: "maxPricePerTon must be a positive number",
        code: "INVALID_MAX_PRICE"
      }, { status: 400 });
    }

    if (minPricePerTon && (isNaN(parseFloat(minPricePerTon)) || parseFloat(minPricePerTon) <= 0)) {
      return NextResponse.json({
        error: "minPricePerTon must be a positive number",
        code: "INVALID_MIN_PRICE"
      }, { status: 400 });
    }

    // Validate vintageYear if provided
    if (vintageYear && (isNaN(parseInt(vintageYear)) || parseInt(vintageYear) < 2000 || parseInt(vintageYear) > 2030)) {
      return NextResponse.json({
        error: "vintageYear must be a valid year between 2000 and 2030",
        code: "INVALID_VINTAGE_YEAR"
      }, { status: 400 });
    }

    // Determine opposite side for matching
    const oppositeSide = side === 'BUY' ? 'SELL' : 'BUY';
    const requestedVolume = parseFloat(volumeTco2e);

    // Build query for matching listings
    let query = db.select({
      id: carbonListings.id,
      organizationId: carbonListings.organizationId,
      type: carbonListings.type,
      volumeTco2e: carbonListings.volumeTco2e,
      pricePerTon: carbonListings.pricePerTon,
      standard: carbonListings.standard,
      vintageYear: carbonListings.vintageYear,
      location: carbonListings.location,
      status: carbonListings.status,
      createdAt: carbonListings.createdAt
    }).from(carbonListings);

    const conditions = [
      eq(carbonListings.type, oppositeSide),
      eq(carbonListings.status, 'OPEN'),
      ne(carbonListings.organizationId, parseInt(organizationId)), // Don't match with same organization
      gte(carbonListings.volumeTco2e, 0.1) // Minimum volume threshold
    ];

    // Apply filters
    if (standard) {
      const validStandards = ['VERRA', 'GOLD_STANDARD', 'CDM', 'OTHERS'];
      if (validStandards.includes(standard)) {
        conditions.push(eq(carbonListings.standard, standard));
      }
    }

    if (vintageYear) {
      // Allow vintage years within ±2 years for flexibility
      const yearInt = parseInt(vintageYear);
      conditions.push(
        and(
          gte(carbonListings.vintageYear, yearInt - 2),
          lte(carbonListings.vintageYear, yearInt + 2)
        )
      );
    }

    // Price filtering based on side
    if (side === 'BUY') {
      // Buyer wants to match with sellers (SELL listings)
      // Prefer lowest prices within max price constraint
      if (maxPricePerTon) {
        conditions.push(lte(carbonListings.pricePerTon, parseFloat(maxPricePerTon)));
      }
    } else {
      // Seller wants to match with buyers (BUY listings)  
      // Prefer highest prices within min price constraint
      if (minPricePerTon) {
        conditions.push(gte(carbonListings.pricePerTon, parseFloat(minPricePerTon)));
      }
    }

    query = query.where(and(...conditions));

    // Apply sorting based on matching logic
    if (side === 'BUY') {
      // For buyers, prefer lowest prices first
      query = query.orderBy(asc(carbonListings.pricePerTon));
    } else {
      // For sellers, prefer highest prices first
      query = query.orderBy(desc(carbonListings.pricePerTon));
    }

    query = query.limit(50); // Limit results for performance

    const matchingListings = await query;

    // Process matches and calculate match volumes
    const matches = [];
    let totalMatchedVolume = 0;
    let remainingVolume = requestedVolume;

    for (const listing of matchingListings) {
      if (remainingVolume <= 0) break;

      const matchVolume = Math.min(remainingVolume, listing.volumeTco2e);
      
      // Get organization details for the match
      const orgDetails = await db.select({
        id: organizations.id,
        name: organizations.name,
        country: organizations.country
      })
      .from(organizations)
      .where(eq(organizations.id, listing.organizationId))
      .limit(1);

      matches.push({
        listing: {
          ...listing,
          organization: orgDetails[0] || null
        },
        matchVolume: matchVolume,
        pricePerTon: listing.pricePerTon,
        totalValue: matchVolume * listing.pricePerTon
      });

      totalMatchedVolume += matchVolume;
      remainingVolume -= matchVolume;
    }

    // If createOrder is true and we have matches, create a trade order for the best match
    let createdOrder = null;
    if (createOrder && matches.length > 0) {
      const bestMatch = matches[0];
      const now = Date.now();

      const orderData = {
        listingId: bestMatch.listing.id,
        buyerOrgId: side === 'BUY' ? parseInt(organizationId) : bestMatch.listing.organizationId,
        sellerOrgId: side === 'SELL' ? parseInt(organizationId) : bestMatch.listing.organizationId,
        volumeTco2e: bestMatch.matchVolume,
        pricePerTon: bestMatch.pricePerTon,
        status: 'PENDING',
        createdAt: now,
        updatedAt: now
      };

      const newOrder = await db.insert(tradeOrders)
        .values(orderData)
        .returning();

      createdOrder = {
        order: newOrder[0],
        listing: bestMatch.listing
      };
    }

    const response = {
      matches: matches,
      totalMatchedVolume: totalMatchedVolume,
      requestedVolume: requestedVolume,
      fulfillmentRate: totalMatchedVolume / requestedVolume,
      matchCount: matches.length,
      ...(createdOrder && { createdOrder })
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('POST marketplace match error:', error);
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