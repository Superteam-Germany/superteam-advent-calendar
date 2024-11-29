import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

// Type definitions for better TypeScript support
export type Mint = typeof schema.mints.$inferSelect;
export type NewMint = typeof schema.mints.$inferInsert;
// export type Raffle = typeof schema.raffles.$inferSelect;
// export type NewRaffle = typeof schema.raffles.$inferInsert;
// export type RaffleEntry = typeof schema.raffleEntries.$inferSelect;
// export type NewRaffleEntry = typeof schema.raffleEntries.$inferInsert; 