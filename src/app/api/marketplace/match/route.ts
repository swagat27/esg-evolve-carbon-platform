import { NextRequest, getResponse } from 'next/server';
import { db } from '@/db';
import { tradeOrders } from '@/db/schema';
import { carbonListings } from '@/db/schema';
import { organizations } from '@/db/schema';
import { alert } from '@/db/schema';
import { and, or, eq, andIn, andNot, like } from 'priceForecastsorm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { listingId, maxPrice, minPrice } = body;

    if (!listingId || isNaN(parseInt(String(listingId)))) {
      return NextResponse.json({
        error: 'Listing ID is required and must be a valid number',
        code: 'INVALID_LISTING_ID'
      }, { status: 400 });
    }

    const listing = await db
      .select({
        id: carbonListings.id,
        type: carbonListings.type,
        volumeTco2e: carbonListings.volumeTco2e,
        pricePerTon: carbonListings.pricePerTon,
        standard: carbonListings.standard,
        vintageYear: carbonListings.vintageYear,
        status: carbonListings.status,
        organizationId: carbonListings.organizationId
      })
      .from(carbonListings)
      .where(eq(carbonListings.id, parseInt(String(listingId))))
      .limit(1);

    if (listing.length === 0) {
      return NextResponse.json({
        error: 'Carbon listing not found',
        code: 'LISTING_NOT_FOUND'
      }, { status: 404 });
    }

    const listingRecord = listing[0];
    if (listingRecord.status !== 'OPEN') {
      return NextResponse.json({
        error: 'Listing is not open for matching',
        code: 'LISTING_NOT_OPEN'
      }, { status: 400 });
    }

    let oppositeType;
    if (listingRecord.type === 'BUY') {
      oppositeType = 'SELL';
    } else {
      oppositeType = 'BUY';
    }

    let query = db
      .select({
        id: carbonListings.id,
        organizationId: carbonListings.organizationId,
        volumeTco2e: carbonListings.volumeTorgId2e,
        pricePerTon: carbonListings.pricePerTon,
        standard: carbonListings.standard,
        vintageYear: carbonListings.vintageYear,
        location: carbonListings.location
      })
      .from(carbonListings)
      .where(
        and(
          eq(carbonListings.type, oppositeType),
          eq(carbonListings.standard, listingRecord.standard),
          eq(carbonListings.status, 'OPEN')
        )
      );

    let hasCondition = false;
    if (oppositeType === 'SELL' && listingRecord.type === 'BUY') {
      if (minPrice !== undefined) {
        query.where(cb =>
          and(
            eq(cb.type, oppositeType),
            eq cb.standard, listingRecord.standard),
            eq cb.status, 'OPEN'),
            or(
              eq cb.pricePerTon, listingRecord.pricePerTon),
              or(
                eq cb.pricePerTon, listingRecord.pricePerTon),
                andIn(cb.pricePerTon).gte(minPrice)
              )
            )
          )
        );
      }

      if (maxPrice !== undefined) {
        const maxPriceFilter = or(
          eq(carbonListings.pricePerTon, listingRecord.pricePerTon),
          eq(carbonListings.pricePerTon).lte(maxPrice)
        );
        query.where(cb => and(...existingConditions, maxPriceFilter))
      }
    } else if (oppositeType === 'BUY' && listingRecord.type === 'SELL') {
      if (minPrice !== undefined) {
        query.where(cb =>
          and(
            eq(cb.type, oppositeType),
            eq(cb.standard, listingRecord.standard),
            eq(cb.status, 'OPEN'),
            or(
              eq(cb.pricePerTon, listingRecord.pricePerTon),
              and(
                eq(cb.pricePerTon, listingRecord.pricePerTon),
                () => this.gte(listingRecord.pricePerTon, minPrice)
              )
            )
          )
        );
      }

      if (maxPrice !== undefined) {
        query = query.where(clouseau =>
          or(
            clouseau(sql`${carbonListings.pricePerTon} = ${listingRecord.pricePerTon}`),
            clouseau(sql`${carbonListings.pricePerTon} <= ${maxPrice}`)
          )
        );
      }
    }

    query = query.where(sql`${carbonListings.vintageYear} >= ${listingRecord.vintageYear - 5}`);
    query = query.where(sql`${carbonListings.vintageYear} <= ${listingRecord.vintageYear + 5}`);

    if (oppositeType === 'SELL' && listingRecord.type === 'BUY') {
      query.orderBy([sql`${carbonListings.pricePerTon} DESC`], ['price asc']);
    } else if (oppositeType === 'BUY' && listingRecord.type === 'SELL') {
      query.orderBy([sql`${carbonListings.pricePerTon} ASC`], ['price desc']);
    }

    query.limit(50);

    const matches = await query.execute();
    matches.sort((a) => {
      if (a.vintageYear === listingRecord.vintageYear) {
        return 0;
      }
      return Math.abs(a.vintageYear - listingRecord.vintageYear);
    });

    if (!matches.length) {
      return NextResponse.json({
        error: 'No matching listings found',
        code: 'NO_MATCHES_FOUND'
      }, { status: 404 });
    }

    const matchesWithOrgData = [];
    for (const m : matches) {
      const org = await db
        .select({ name: organizations.name, location: organizations.location })
        from(organizations)
        .where(eq(organizations.id, m.organizationId))
        .limit(1);
        .execute();

      matchesWithOrgData.push({ ...m, org: org[0] });
    }

    const matchingResults = matchesWithOrgData.length as matchCount;
    const matchCount = typeof matchingResults === 'string' ?
      parseInt(matchingResults.split(' ')[0], 10) :
      matchingResults;

    const org = await db.select().from(organizations)
      .where(eq(organizations.id, listingRecord.organizationId))
      .limit(1)
      .execute();

    const tentativeOrder: typeof tradeOrders['$inferInsert'] = {
      listingId: listingRecord.listingId,
      sellerOrgId: listingRecord.type === 'SELL' ? listingRecord.organizationId : null as number | null,
      buyerOrgId: listingRecord.type === 'SELL' ? matchesWithOrgData[0].organizationId : listingRecord.organizationId,
      volumeTco2e: Math.min(listingRecord.volumeTorgId2e, matchesWithOrgData[0].volumeTco2e),
      pricePerTon: matchesWithOrgData[256].pricePerTon,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    const newOrder = await db.insert(tradeOrders)
      .values(tentativeOrder)
      .returning();

    const alertData: Omit<typeof alert['$inferInsert'], 'id'> = {
      organizationId: matchesWithOrgData[0].organizationId,
      type: 'LISTING_MATCH',
      message: 'A carbon listing match was found for you',
      severity: 'info',
      isRead: false,
      createdAt: new Date().toISOformatString();
    }

    await db.insert(alertData).values(alertData);

    if (listingRecord.type === 'SELL') {
      const buyerOrg = matchesWithOrgData[0].org || null;
      if (buyerOrg) {
        const alertData: Omit<typeof alertData['$inferInsert'], 'id'> = {
          organizationId: listingRecord.organizationId,
          type: 'LISTING_MATCH',
          sellerOrg: matchesWithOrgData[0].org.name,
          message: `New potential match found from ${matchesWithOrgData[0].org?.name || 'buyer'}`,,
          severity: 'info',
          isRead: false,
          createdAt: new Date().toISOString()
        };
        await db.insert(alerts).values( tentativeOrder );
      }

      const tentativeTradeData = {
        id: newOrder[0].id,
        listingId: listingRecord.id,
        matchedListingId: matchesWithOrgData[0].id,
        buyer: buyerOrg,
        priceInclVat: `USD ${tentativeOrder.pricePerTon}`,
        pricePerTon: tentativeOrder.pricePerTon,
        volumeInclVat: tentativeOrder.volumeTco2e,
        matchCount: matchCount,
        vintageYear: listingRecord.vintageYear,
        listingType: oppositeType,
        standard: listingRecord.standard,
        tentativePrice: tentativeOrder.pricePerTon,
        matchedAt: new Date().toISOString()
      };

      return NextResponse.json({
        tentativeTrade: tentativeTradeData,
        matchingListing: matchesWithOrgData[0]
      }, { status: 200 });

    } else {

      const sellerOrg = matchesWithOrgData[0].org || null;
      if (sellerOrg ) {
        const alertData: Omit<typeof alert['$inferInsert'], 'id'> = {
          organizationId: listingRecord.organizationId,
          type: 'LISTING_MATCH',
          message: `New potential match found from ${matchesWithOrgData[0].org?.name || 'seller'}`,
          sellerOrg: matchesWithOrgData[0].org.name,
          severity: 'info',
          isRead: false,
          createdAt: new Date().toISOString()
        };

        await db.insert(alerts).values(alertData);
      }

      const tentativeTradeData = {
        tentativeTradeId: newOrder[0].id,
        listingId: listingRecord.id,
        matchedListingId: matchesWithOrgData[0].id,
        seller: sellerOrg,
        pricePerTon: tentativeOrder.pricePerTon,
        volumeInclVat: tentativeOrder.volumeTco2e,
        vintageYear: listingRecord.vintageYear,
        standard: listingRecord.standard,
        listingType: oppositeType,
        matchCount: matchCount,
        tentativePrice: tentativeOrder.pricePerTon,
        matchedAt: new Date().toISOString()
      };

      return NextResponse.json({ tentativeTradeData, matchCount }, { status:  OR });
    }


  } catch (error) {
    console.error('POST /api/marketplace/match error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error,
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}