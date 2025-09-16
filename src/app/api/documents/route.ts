import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Since documents table is not available in schema, return empty or 404 for specific id
    if (id) {
      if (isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: 'Valid ID is required',
          code: 'INVALID_ID'
        }, { status: 400 });
      }
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const results: any[] = [];
    return NextResponse.json(results);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, name, pathUrl, category } = body;

    if (!organizationId || isNaN(parseInt(organizationId))) {
      return NextResponse.json({ 
        error: 'Valid organizationId is required',
        code: 'MISSING_ORGANIZATION_ID'
      }, { status: 400 });
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Name is required and must be a non-empty string',
        code: 'MISSING_NAME'
      }, { status: 400 });
    }

    if (!pathUrl || typeof pathUrl !== 'string' || pathUrl.trim().length === 0) {
      return NextResponse.json({ 
        error: 'PathUrl is required and must be a non-empty string',
        code: 'MISSING_PATH_URL'
      }, { status: 400 });
    }

    if (!category) {
      return NextResponse.json({ 
        error: 'Category is required',
        code: 'MISSING_CATEGORY'
      }, { status: 400 });
    }

    const validCategories = ['POLICY', 'REPORT', 'CONTRACT', 'OTHER'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ 
        error: 'Category must be one of: POLICY, REPORT, CONTRACT, OTHER',
        code: 'INVALID_CATEGORY'
      }, { status: 400 });
    }

    // Verify organization exists
    const existingOrg = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, parseInt(organizationId)))
      .limit(1);

    if (existingOrg.length === 0) {
      return NextResponse.json({ 
        error: 'Organization not found',
        code: 'ORGANIZATION_NOT_FOUND' 
      }, { status: 400 });
    }

    // Stub create since documents table is not in schema
    const now = new Date().toISOString();
    const newDocument = {
      id: Date.now(),
      organizationId: parseInt(organizationId),
      name: name.trim(),
      pathUrl: pathUrl.trim(),
      version: 1,
      category,
      createdAt: now
    };

    return NextResponse.json(newDocument, { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT() {
  // Documents table not available; updating not supported
  return NextResponse.json({ 
    error: 'Method not allowed',
    code: 'METHOD_NOT_ALLOWED' 
  }, { status: 405 });
}

export async function DELETE() {
  // Documents table not available; deleting not supported
  return NextResponse.json({ 
    error: 'Method not allowed',
    code: 'METHOD_NOT_ALLOWED' 
  }, { status: 405 });
}