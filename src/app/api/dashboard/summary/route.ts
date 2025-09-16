import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { organizations, carbonListings, tradeOrders, alerts } from '@/db/schema';
import { eq, and, gte, lt, sql, desc, count, or } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orgId = searchParams.get('orgId');

    if (!orgId || isNaN(parseInt(orgId))) {
      return NextResponse.json({ 
        error: "Valid organization ID is required",
        code: "INVALID_ORG_ID" 
      }, { status: 400 });
    }

    const organizationId = parseInt(orgId);

    // Check if organization exists
    const orgExists = await db.select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (orgExists.length === 0) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get current month boundaries
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const monthStart = `${currentYear}-${currentMonth}-01`;
    const nextMonthStart = currentMonth === '12' 
      ? `${currentYear + 1}-01-01`
      : `${currentYear}-${String(now.getMonth() + 2).padStart(2, '0')}-01`;

    // Fetch all dashboard data in parallel for better performance
    const [
      kycData,
      openListingsData,
      unreadAlertsData,
      recentTradesData,
      pendingOrdersData
    ] = await Promise.all([
      // KYC Status
      db.select({ kycStatus: organizations.kycStatus })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1),

      // Open Carbon Listings
      db.select({ count: count() })
        .from(carbonListings)
        .where(and(
          eq(carbonListings.organizationId, organizationId),
          eq(carbonListings.status, 'OPEN')
        )),

      // Unread Alerts
      db.select({ count: count() })
        .from(alerts)
        .where(and(
          eq(alerts.organizationId, organizationId),
          eq(alerts.isRead, false)
        )),

      // Recent Trades (last 5)
      db.select({
        id: tradeOrders.id,
        listingId: tradeOrders.listingId,
        volumeTco2e: tradeOrders.volumeTco2e,
        pricePerTon: tradeOrders.pricePerTon,
        status: tradeOrders.status,
        createdAt: tradeOrders.createdAt
      })
        .from(tradeOrders)
        .where(or(
          eq(tradeOrders.buyerOrgId, organizationId),
          eq(tradeOrders.sellerOrgId, organizationId)
        ))
        .orderBy(desc(tradeOrders.createdAt))
        .limit(5),

      // Pending Orders
      db.select({ count: count() })
        .from(tradeOrders)
        .where(and(
          or(
            eq(tradeOrders.buyerOrgId, organizationId),
            eq(tradeOrders.sellerOrgId, organizationId)
          ),
          eq(tradeOrders.status, 'PENDING')
        ))
    ]);

    // Format the response
    const kycStatus = kycData[0]?.kycStatus || 'pending';
    const openListings = openListingsData[0]?.count || 0;
    const emissionsMtd = 0; // table not available in schema
    const unreadAlerts = unreadAlertsData[0]?.count || 0;
    const recentTrades = recentTradesData.map(trade => ({
      id: trade.id,
      listingId: trade.listingId,
      volumeTco2e: trade.volumeTco2e,
      pricePerTon: trade.pricePerTon,
      status: trade.status,
      createdAt: trade.createdAt
    }));
    const pendingOrders = pendingOrdersData[0]?.count || 0;

    // Get additional metrics
    const [
      totalListingCountData,
      completedTradeCountData
      // totalEmissionsData // removed - table not in schema
    ] = await Promise.all([
      // Total listings
      db.select({ count: count() })
        .from(carbonListings)
        .where(eq(carbonListings.organizationId, organizationId)),

      // Completed trades this month
      db.select({ count: count() })
        .from(tradeOrders)
        .where(and(
          or(
            eq(tradeOrders.buyerOrgId, organizationId),
            eq(tradeOrders.sellerOrgId, organizationId)
          ),
          eq(tradeOrders.status, 'SETTLED'),
          gte(tradeOrders.createdAt, monthStart as unknown as number)
        ))
    ]);

    // Recent alerts
    const recentAlerts = await db.select({
      id: alerts.id,
      type: alerts.type,
      message: alerts.message,
      severity: alerts.severity,
      isRead: alerts.isRead,
      createdAt: alerts.createdAt
    })
      .from(alerts)
      .where(eq(alerts.organizationId, organizationId))
      .orderBy(desc(alerts.createdAt))
      .limit(3);

    // KYC documents count (table not available in schema)
    const kycDocumentsCount = 0;

    const dashboardData = {
      kycStatus,
      openListings,
      emissionsMtd,
      unreadAlerts,
      recentTrades,
      pendingOrders,
      additionalMetrics: {
        totalListingCount: totalListingCountData[0]?.count || 0,
        completedTradeCount: completedTradeCountData[0]?.count || 0,
        totalEmissions: 0,
        kycDocumentsCount
      },
      recentAlerts,
      organization: {
        name: orgExists[0].name,
        industry: orgExists[0].industry,
        country: orgExists[0].country,
        annualEmissionsBaseline: orgExists[0].annualEmissionsBaseline
      }
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Dashboard summary error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: 'DASHBOARD_ERROR'
    }, { status: 500 });
  }
}