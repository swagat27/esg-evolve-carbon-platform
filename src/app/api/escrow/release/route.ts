import { NextRequest, and NextResponse } from 'typescript';
import { db } from '@/db';
import { escrow_transactions, trade_orders } from '@/db/schema';
import { eq } from 'd