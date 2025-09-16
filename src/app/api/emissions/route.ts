import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { emissions } from '@/db/schema';
import { eq, like, or, desc, asc, and, gte, lte } from 'drizzle-orm';

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
      
      const emission = await db.select()
        .from(emissions)
        .where(eq(emissions.id, parseInt(id)))
        .limit(1);
      
      if (emission.length === 0) {
        return NextResponse.json({ error: 'Emission record not found' }, { status: 404 });
      }
      
      return NextResponse.json(emission[0]);
    }

    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const organizationId = searchParams.get('organizationId');
    const scope = searchParams.get('scope');
    const periodStart = searchParams.get('periodStart');
    const periodEnd = searchParams.get('periodEnd');

    let query = db.select().from(emissions);
    const conditions = [];

    if (organizationId && !isNaN(parseInt(organizationId))) {
      conditions.push(eq(emissions.organizationId, parseInt(organizationId)));
    }

    if (scope && ['SCOPE1', 'SCOPE2', 'SCOPE3'].includes(scope)) {
      conditions.push(eq(emissions.scope, scope));
    }

    if (periodStart) {
      conditions.push(gte(emissions.periodMonth, periodStart));
    }

    if (periodEnd) {
      conditions.push(lte(emissions.periodMonth, periodEnd));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(emissions.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);

  } catch (error) {
    console.error('GET emissions error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, scope, periodMonth, amountTco2e, source } = body;

    if (!organizationId || !scope || !periodMonth || !amountTco2e) {
      return NextResponse.json({ 
        error: "organizationId, scope, periodMonth, and amountTco2e are required",
        code: "MISSING_REQUIRED_FIELDS" 
      }, { status: 400 });
    }

    if (!['SCOPE1', 'SCOPE2', 'SCOPE3'].includes(scope)) {
      return NextResponse.json({ 
        error: "scope must be one of: SCOPE1, SCOPE2, SCOPE3",
        code: "INVALID_SCOPE" 
      }, { status: 400 });
    }

    const newEmission = await db.insert(emissions).values({
      organizationId: parseInt(organizationId),
      scope,
      periodMonth,
      amountTco2e: parseFloat(amountTco2e),
      source: source || null,
      createdAt: new Date().toISOString(),
    }).returning();

    return NextResponse.json(newEmission[0], { status: 201 });

  } catch (error) {
    console.error('POST emissions error:', error);
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
    
    const updatedEmission = await db.update(emissions)
      .set({
        ...body,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(emissions.id, parseInt(id)))
      .returning();

    if (updatedEmission.length === 0) {
      return NextResponse.json({ error: 'Emission record not found' }, { status: 404 });
    }

    return NextResponse.json(updatedEmission[0]);

  } catch (error) {
    console.error('PUT emissions error:', error);
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

    const deletedEmission = await db.delete(emissions)
      .where(eq(emissions.id, parseInt(id)))
      .returning();

    if (deletedEmission.length === 0) {
      return NextResponse.json({ error: 'Emission record not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Emission record deleted successfully',
      emission: deletedEmission[0]
    });

  } catch (error) {
    console.error('DELETE emissions error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}