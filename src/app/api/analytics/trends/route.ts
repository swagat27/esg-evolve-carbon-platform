import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tradeOrders, carbonListings } from '@/db/schema';
import { eq, and, desc, asc, sql, between, gte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const standard = searchParams.get('standard');
    const horizonMonths = parseInt(searchParams.get('horizonMonths') || '12');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    // Validate horizonMonths
    if (isNaN(horizonMonths) || horizonMonths < 1 || horizonMonths > 60) {
      return NextResponse.json({ 
        error: "horizonMonths must be between 1 and 60",
        code: "INVALID_HORIZON_MONTHS" 
      }, { status: 400 });
    }

    // Fetch price forecasts - schema not available, return empty forecasts for now
    const forecasts: any[] = [];

    // Fetch historical trade data
    const tradesQuery = db.select({
      id: tradeOrders.id,
      volumeTco2e: tradeOrders.volumeTco2e,
      pricePerTon: tradeOrders.pricePerTon,
      status: tradeOrders.status,
      createdAt: tradeOrders.createdAt,
      standard: carbonListings.standard,
    })
    .from(tradeOrders)
    .innerJoin(carbonListings, eq(tradeOrders.listingId, carbonListings.id))
    .where(eq(tradeOrders.status, 'SETTLED'))
    .orderBy(desc(tradeOrders.createdAt))
    .limit(limit);

    const trades = await tradesQuery;

    // Aggregate data by standard
    const aggregatesQuery = db.select({
      standard: carbonListings.standard,
      avgPrice: sql`AVG(${tradeOrders.pricePerTon})`.as('avgPrice'),
      minPrice: sql`MIN(${tradeOrders.pricePerTon})`.as('minPrice'),
      maxPrice: sql`MAX(${tradeOrders.pricePerTon})`.as('maxPrice'),
      totalVolume: sql`SUM(${tradeOrders.volumeTco2e})`.as('totalVolume'),
      tradeCount: sql`COUNT(${tradeOrders.id})`.as('tradeCount'),
    })
    .from(tradeOrders)
    .innerJoin(carbonListings, eq(tradeOrders.listingId, carbonListings.id))
    .where(eq(tradeOrders.status, 'SETTLED'))
    .groupBy(carbonListings.standard);

    if (standard && ['VERRA', 'GOLD_STANDARD', 'CDM', 'OTHERS'].includes(standard)) {
      aggregatesQuery.where(
        and(
          eq(tradeOrders.status, 'SETTLED'),
          eq(carbonListings.standard, standard)
        )
      );
    }

    const aggregates = await aggregatesQuery;

    // Calculate market insights
    const insights = {
      overallTrend: 'STABLE', // Will be calculated based on price movements
      mostActiveStandard: '',
      priceVolatility: 0,
      marketLiquidity: 'LOW',
    };

    // Find most active standard by trade count
    let maxTrades = 0;
    aggregates.forEach(agg => {
      if (agg.tradeCount > maxTrades) {
        maxTrades = agg.tradeCount;
        insights.mostActiveStandard = agg.standard as string;
      }
    });

    // Define price forecast standards
    const forecastStandards = standard && ['VERRA', 'GOLD_STANDARD', 'CDM', 'OTHERS'].includes(standard) 
      ? [standard] 
      : ['VERRA', 'GOLD_STANDARD', 'CDM', 'OTHERS'];

    // Calculate market liquidity based on recent trades
    const recentTrades = trades.filter(trade => {
      const tradeDate = new Date(trade.createdAt as unknown as string);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return tradeDate >= thirtyDaysAgo;
    });

    if (recentTrades.length > 20) {
      insights.marketLiquidity = 'HIGH';
    } else if (recentTrades.length > 5) {
      insights.marketLiquidity = 'MEDIUM';
    }

    // Calculate price volatility
    if (trades.length > 0) {
      const prices = trades.map(t => t.pricePerTon as number);
      const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
      insights.priceVolatility = Math.sqrt(variance) / mean * 100;
    }

    // Prepare response
    const trendsData = {
      trends: {
        historical: trades,
        aggregates: aggregates,
      },
      forecasts: forecastStandards.map(std => ({
        standard: std,
        forecasts: forecasts.filter(f => f.standard === std),
      })),
      marketInsights: insights,
      metadata: {
        totalTrades: trades.length,
        totalForecasts: forecasts.length,
        standards: ['VERRA', 'GOLD_STANDARD', 'CDM', 'OTHERS'],
        horizonMonths,
        generatedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(trendsData, { status: 200 });

  } catch (error) {
    console.error('Analytics trends GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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