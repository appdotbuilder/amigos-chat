import { db } from '../db';
import { groupsTable } from '../db/schema';
import { type Group } from '../schema';

export const getAllGroups = async (): Promise<Group[]> => {
  try {
    const results = await db.select()
      .from(groupsTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch all groups:', error);
    throw error;
  }
};