import { db } from '@/db';
import { whitelist } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function isWalletWhitelisted(walletAddress: string): Promise<boolean> {
  console.log("🚀 ~ isWalletWhitelisted ~ walletAddress:", walletAddress)
  const result = await db.query.whitelist.findFirst({
    where: eq(whitelist.wallet, walletAddress),
  });
  console.log("🚀 ~ isWalletWhitelisted ~ result:", result)
  
  return !!result;
} 