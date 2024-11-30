import { NextResponse } from 'next/server';
import { isWalletWhitelisted } from '@/utils/whitelisting';
import { db } from '@/db';
import { registrations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import * as nacl from 'tweetnacl';

interface EligibilityResponse {
  eligible: boolean;
  error?: string;
  message?: string;
  signature?: string;
}

async function checkRegistration(publicKey: string): Promise<boolean> {
  const existing = await db.query.registrations.findFirst({
    where: eq(registrations.walletAddress, publicKey)
  });
  return !!existing;
}

function signMessage(message: string, privateKey: string): string {
  const secretKeyBuffer = Buffer.from(privateKey, 'base64');
  const signature = nacl.sign.detached(
    new TextEncoder().encode(message),
    secretKeyBuffer
  );
  return Buffer.from(signature).toString('base64');
}

async function generateSignedMessage(publicKey: string): Promise<{ message: string; signature: string }> {
  const privateKey = process.env.PAYER_PRIV;
  if (!privateKey) {
    throw new Error('PAYER_PRIV not set');
  }

  const timestamp = Date.now();
  const message = `${publicKey}-${timestamp}`;
  const signature = signMessage(message, privateKey);

  return { message, signature };
}

export async function POST(request: Request) {
  try {
    const { publicKey } = await request.json();

    if (!publicKey) {
      return NextResponse.json(
        { error: 'Missing wallet address' },
        { status: 400 }
      );
    }

    const response: EligibilityResponse = { eligible: false };

    // Step 1: Check whitelist
    const isWhitelisted = await isWalletWhitelisted(publicKey);
    if (!isWhitelisted) {
      response.error = 'Wallet not whitelisted';
      return NextResponse.json(response);
    }

    // Step 2: Check if already registered
    const isRegistered = await checkRegistration(publicKey);
    if (isRegistered) {
      response.error = 'Wallet already registered';
      return NextResponse.json(response);
    }

    // Step 3: Generate signed message for eligible wallet
    try {
      const { message, signature } = await generateSignedMessage(publicKey);
      return NextResponse.json({
        eligible: true,
        message,
        signature
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to generate signature' },
        { status: 500 }
      );
    }

  } catch (error) {
    return NextResponse.json(
      { error: `Eligibility check failed: ${error}` },
      { status: 500 }
    );
  }
} 