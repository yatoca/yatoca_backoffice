import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    const { rows: keywords } = await query(`SELECT id, keyword FROM t_keywords ORDER BY keyword ASC`);
    return NextResponse.json({ keywords });
}