import { NextResponse } from 'next/server';
import { getServers, createServer } from '@/lib/serverRegistry';

export async function GET() {
  try {
    const servers = await getServers();
    return NextResponse.json({ success: true, servers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newServer = await createServer(body);
    return NextResponse.json({ success: true, server: newServer });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}