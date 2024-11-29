import { NextResponse } from 'next/server';
import { db } from '@/db';
import { registrations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const registered = await db.query.registrations.findFirst({
      where: eq(registrations.walletAddress, wallet)
    });

    return NextResponse.json({ 
      isRegistered: !!registered && registered.isActive 
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to check registration: ${error}` },
      { status: 500 }
    );
  }
} 