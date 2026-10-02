import { NextResponse } from 'next/server';
import { getServerTemplate } from '@/lib/serverRegistry';

export async function GET() {
  try {
    const defaults = await getServerTemplate();
    return NextResponse.json({ success: true, defaults });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}