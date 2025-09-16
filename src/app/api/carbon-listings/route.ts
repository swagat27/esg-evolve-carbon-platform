import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { carbonListings, organizations } from '@/db/schema';
import { eq, like, or, desc, asc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      if (isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }
      
      const listing = await db.select()
        .from(carbonListings)
        .where(eq(carbonListings.id, parseInt(id)))
        .limit(1);
      
      if (listing.length === 0) {
        return NextResponse.json({ error: 'Carbon listing not found' }, { status: 404 });
      }
      
      return NextResponse.json(listing[0]);
    }

    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const organizationId = searchParams.get('organizationId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const standard = searchParams.get('standard');
    const search = searchParams.get('search');

    let query = db.select().from(carbonListings);
    const conditions = [];

    if (organizationId && !isNaN(parseInt(organizationId))) {
      conditions.push(eq(carbonListings.organizationId, parseInt(organizationId)));
    }

    if (type && ['SELL', 'BUY'].includes(type)) {
      conditions.push(eq(carbonListings.type, type));
    }

    if (status && ['OPEN', 'MATCHED', 'CANCELLED', 'COMPLETED'].includes(status)) {
      conditions.push(eq(carbonListings.status, status));
    }

    if (standard && ['VERRA', 'GOLD_STANDARD', 'CDM', 'OTHERS'].includes(standard)) {
      conditions.push(eq(carbonListings.standard, standard));
    }

    if (search) {
      conditions.push(like(carbonListings.location, `%${search}%`));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(carbonListings.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);

  } catch (error) {
    console.error('GET carbon listings error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, type, volumeTco2e, pricePerTon, standard, vintageYear, location } = body;

    if (!organizationId || !type || !volumeTco2e || !pricePerTon || !standard || !vintageYear) {
      return NextResponse.json({ 
        error: "organizationId, type, volumeTco2e, pricePerTon, standard, and vintageYear are required",
        code: "MISSING_REQUIRED_FIELDS" 
      }, { status: 400 });
    }

    if (!['SELL', 'BUY'].includes(type)) {
      return NextResponse.json({ 
        error: "type must be either SELL or BUY",
        code: "INVALID_TYPE" 
      }, { status: 400 });
    }

    if (!['VERRA', 'GOLD_STANDARD', 'CDM', 'OTHERS'].includes(standard)) {
      return NextResponse.json({ 
        error: "standard must be one of: VERRA, GOLD_STANDARD, CDM, OTHERS",
        code: "INVALID_STANDARD" 
      }, { status: 400 });
    }

    const newListing = await db.insert(carbonListings).values({
      organizationId: parseInt(organizationId),
      type,
      volumeTco2e: parseFloat(volumeTco2e),
      pricePerTon: parseFloat(pricePerTon),
      standard,
      vintageYear: parseInt(vintageYear),
      location: location || null,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    }).returning();

    return NextResponse.json(newListing[0], { status: 201 });

  } catch (error) {
    console.error('POST carbon listings error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const body = await request.json();
    
    const updatedListing = await db.update(carbonListings)
      .set({
        ...body,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(carbonListings.id, parseInt(id)))
      .returning();

    if (updatedListing.length === 0) {
      return NextResponse.json({ error: 'Carbon listing not found' }, { status: 404 });
    }

    return NextResponse.json(updatedListing[0]);

  } catch (error) {
    console.error('PUT carbon listings error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const deletedListing = await db.delete(carbonListings)
      .where(eq(carbonListings.id, parseInt(id)))
      .returning();

    if (deletedListing.length === 0) {
      return NextResponse.json({ error: 'Carbon listing not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Carbon listing deleted successfully',
      listing: deletedListing[0]
    });

  } catch (error) {
    console.error('DELETE carbon listings error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}