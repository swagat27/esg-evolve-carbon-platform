import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { alerts } from '@/db/schema';
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
      
      const alert = await db.select()
        .from(alerts)
        .where(eq(alerts.id, parseInt(id)))
        .limit(1);
      
      if (alert.length === 0) {
        return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
      }
      
      return NextResponse.json(alert[0]);
    }

    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const organizationId = searchParams.get('organizationId');
    const type = searchParams.get('type');
    const severity = searchParams.get('severity');
    const isRead = searchParams.get('is_read');

    let query = db.select().from(alerts);
    const conditions = [];

    if (organizationId && !isNaN(parseInt(organizationId))) {
      conditions.push(eq(alerts.organizationId, parseInt(organizationId)));
    }

    if (type && ['KYC', 'EMISSIONS_SPIKE', 'LISTING_MATCH', 'DEADLINE', 'OTHER'].includes(type)) {
      conditions.push(eq(alerts.type, type));
    }

    if (severity && ['info', 'warning', 'critical'].includes(severity)) {
      conditions.push(eq(alerts.severity, severity));
    }

    if (isRead !== null) {
      conditions.push(eq(alerts.isRead, isRead === 'true'));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(alerts.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);

  } catch (error) {
    console.error('GET alerts error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, type, message, severity } = body;

    if (!organizationId || !type || !message || !severity) {
      return NextResponse.json({ 
        error: "organizationId, type, message, and severity are required",
        code: "MISSING_REQUIRED_FIELDS" 
      }, { status: 400 });
    }

    if (!['KYC', 'EMISSIONS_SPIKE', 'LISTING_MATCH', 'DEADLINE', 'OTHER'].includes(type)) {
      return NextResponse.json({ 
        error: "type must be one of: KYC, EMISSIONS_SPIKE, LISTING_MATCH, DEADLINE, OTHER",
        code: "INVALID_TYPE" 
      }, { status: 400 });
    }

    if (!['info', 'warning', 'critical'].includes(severity)) {
      return NextResponse.json({ 
        error: "severity must be one of: info, warning, critical",
        code: "INVALID_SEVERITY" 
      }, { status: 400 });
    }

    const newAlert = await db.insert(alerts).values({
      organizationId: parseInt(organizationId),
      type,
      message,
      severity,
      isRead: false,
      createdAt: new Date().toISOString(),
    }).returning();

    return NextResponse.json(newAlert[0], { status: 201 });

  } catch (error) {
    console.error('POST alerts error:', error);
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
    
    const updatedAlert = await db.update(alerts)
      .set({
        ...body,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(alerts.id, parseInt(id)))
      .returning();

    if (updatedAlert.length === 0) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    return NextResponse.json(updatedAlert[0]);

  } catch (error) {
    console.error('PUT alerts error:', error);
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

    const deletedAlert = await db.delete(alerts)
      .where(eq(alerts.id, parseInt(id)))
      .returning();

    if (deletedAlert.length === 0) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Alert deleted successfully',
      alert: deletedAlert[0]
    });

  } catch (error) {
    console.error('DELETE alerts error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}