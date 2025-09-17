import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GetUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function getUser(input: GetUserInput): Promise<User | null> {
  try {
    // Query user by wallet address
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.wallet_address, input.wallet_address))
      .execute();

    // Return null if user not found
    if (results.length === 0) {
      return null;
    }

    // Return the first (and only) user found
    const user = results[0];
    return {
      id: user.id,
      wallet_address: user.wallet_address,
      username: user.username,
      ipfs_profile_pic_hash: user.ipfs_profile_pic_hash,
      registration_timestamp: user.registration_timestamp,
      is_registered: user.is_registered,
      created_at: user.created_at
    };
  } catch (error) {
    console.error('User lookup failed:', error);
    throw error;
  }
}