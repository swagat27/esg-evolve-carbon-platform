import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documents, organizations } from '@/db/schema';
import { eq, like, and, desc, asc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (id) {
      if (isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }
      
      const document = await db
        .select({
          id: documents.id,
          organizationId: documents.organizationId,
          name: documents.name,
          pathUrl: documents.pathUrl,
          version: documents.version,
          category: documents.category,
          createdAt: documents.createdAt
        })
        .from(documents)
        .where(eq(documents.id, parseInt(id)))
        .limit(1);
      
      if (document.length === 0) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
      
      return NextResponse.json(document[0]);
    }
    
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const organizationId = searchParams.get('organizationId');
    const category = searchParams.get('category');
    const version = searchParams.get('version');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';
    
    let query = db
      .select({
        id: documents.id,
        organizationId: documents.organizationId,
        name: documents.name,
        pathUrl: documents.pathUrl,
        version: documents.version,
        category: documents.category,
        createdAt: documents.createdAt
      })
      .from(documents);
    
    const conditions = [];
    
    if (organizationId && !isNaN(parseInt(organizationId))) {
      conditions.push(eq(documents.organizationId, parseInt(organizationId)));
    }
    
    if (category) {
      const validCategories = ['POLICY', 'REPORT', 'CONTRACT', 'OTHER'];
      if (validCategories.includes(category)) {
        conditions.push(eq(documents.category, category));
      }
    }
    
    if (version && !isNaN(parseInt(version))) {
      conditions.push(eq(documents.version, parseInt(version)));
    }
    
    if (search) {
      conditions.push(
        or(
          like(documents.name, `%${search}%`),
          like(documents.pathUrl, `%${search}%`)
        )
      );
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    if (sort === 'name') {
      query = order === 'desc' 
        ? query.orderBy(desc(documents.name))
        : query.orderBy(asc(documents.name));
    } else if (sort === 'version') {
      query = order === 'desc' 
        ? query.orderBy(desc(documents.version))
        : query.orderBy(asc(documents.version));
    } else if (sort === 'category') {
      query = order === 'desc' 
        ? query.orderBy(desc(documents.category))
        : query.orderBy(asc(documents.category));
    } else {
      query = order === 'desc' 
        ? query.orderBy(desc(documents.createdAt))
        : query.orderBy(asc(documents.createdAt));
    }
    
    const results = await query.limit(limit).offset(offset);
    
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
        error: "Valid organizationId is required",
        code: "MISSING_ORGANIZATION_ID" 
      }, { status: 400 });
    }
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ 
        error: "Name is required and must be a non-empty string",
        code: "MISSING_NAME" 
      }, { status: 400 });
    }
    
    if (!pathUrl || typeof pathUrl !== 'string' || pathUrl.trim().length === 0) {
      return NextResponse.json({ 
        error: "PathUrl is required and must be a non-empty string",
        code: "MISSING_PATH_URL" 
      }, { status: 400 });
    }
    
    if (!category) {
      return NextResponse.json({ 
        error: "Category is required",
        code: "MISSING_CATEGORY" 
      }, { status: 400 });
    }
    
    const validCategories = ['POLICY', 'REPORT', 'CONTRACT', 'OTHER'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ 
        error: "Category must be one of: POLICY, REPORT, CONTRACT, OTHER",
        code: "INVALID_CATEGORY" 
      }, { status: 400 });
    }
    
    const trimmedName = name.trim();
    const trimmedPathUrl = pathUrl.trim();
    
    const existingOrg = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, parseInt(organizationId)))
      .limit(1);
    
    if (existingOrg.length === 0) {
      return NextResponse.json({ 
        error: "Organization not found",
        code: "ORGANIZATION_NOT_FOUND" 
      }, { status: 400 });
    }
    
    const existingVersions = await db
      .select({ version: documents.version })
      .from(documents)
      .where(
        and(
          eq(documents.name, trimmedName),
          eq(documents.organizationId, parseInt(organizationId))
        )
      )
      .orderBy(desc(documents.version))
      .limit(1);
    
    const nextVersion = existingVersions.length > 0 ? existingVersions[0].version + 1 : 1;
    
    const newDocument = await db
      .insert(documents)
      .values({
        organizationId: parseInt(organizationId),
        name: trimmedName,
        pathUrl: trimmedPathUrl,
        version: nextVersion,
        category: category,
        createdAt: new Date().toISOString()
      })
      .returning({
        id: documents.id,
        organizationId: documents.organizationId,
        name: documents.name,
        pathUrl: documents.pathUrl,
        version: documents.version,
        category: documents.category,
        createdAt: documents.createdAt
      });
    
    return NextResponse.json(newDocument[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }
    
    const body = await request.json();
    const { name, pathUrl, category } = body;
    
    const existingDoc = await db
      .select()
      .from(documents)
      .where(eq(documents.id, parseInt(id)))
      .limit(1);
    
    if (existingDoc.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };
    
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ 
          error: "Name must be a non-empty string",
          code: "INVALID_NAME" 
        }, { status: 400 });
      }
      updateData.name = name.trim();
    }
    
    if (pathUrl !== undefined) {
      if (typeof pathUrl !== 'string' || pathUrl.trim().length === 0) {
        return NextResponse.json({ 
          error: "PathUrl must be a non-empty string",
          code: "INVALID_PATH_URL" 
        }, { status: 400 });
      }
      updateData.pathUrl = pathUrl.trim();
    }
    
    if (category !== undefined) {
      const validCategories = ['POLICY', 'REPORT', 'CONTRACT', 'OTHER'];
      if (!validCategories.includes(category)) {
        return NextResponse.json({ 
          error: "Category must be one of: POLICY, REPORT, CONTRACT, OTHER",
          code: "INVALID_CATEGORY" 
        }, { status: 400 });
      }
      updateData.category = category;
    }
    
    const contentChanged = updateData.name && updateData.name !== existingDoc[0].name;
    
    if (contentChanged) {
      const latestVersion = await db
        .select({ version: documents.version })
        .from(documents)
        .where(
          and(
            eq(documents.name, existingDoc[0].name),
            eq(documents.organizationId, existingDoc[0].organizationId)
          )
        )
        .orderBy(desc(documents.version))
        .limit(1);
      
      updateData.version = latestVersion[0].version + 1;
    }
    
    const updatedDocument = await db
      .update(documents)
      .set(updateData)
      .where(eq(documents.id, parseInt(id)))
      .returning({
        id: documents.id,
        organizationId: documents.organizationId,
        name: documents.name,
        pathUrl: documents.pathUrl,
        version: documents.version,
        category: documents.category,
        createdAt: documents.createdAt
      });
    
    return NextResponse.json(updatedDocument[0]);
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }
    
    const deletedDocument = await db
      .delete(documents)
      .where(eq(documents.id, parseInt(id)))
      .returning({
        id: documents.id,
        organizationId: documents.organizationId,
        name: documents.name,
        pathUrl: documents.pathUrl,
        version: documents.version,
        category: documents.category,
        createdAt: documents.createdAt
      });
    
    if (deletedDocument.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: 'Document deleted successfully',
      document: deletedDocument[0]
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}