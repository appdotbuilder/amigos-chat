import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';
import { desc } from 'drizzle-orm';

export async function getAllUsers(): Promise<User[]> {
  try {
    // Fetch all users ordered by registration timestamp (newest first)
    const results = await db.select()
      .from(usersTable)
      .orderBy(desc(usersTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch all users:', error);
    throw error;
  }
}