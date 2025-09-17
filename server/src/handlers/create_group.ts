import { db } from '../db';
import { groupsTable } from '../db/schema';
import { type CreateGroupInput, type Group } from '../schema';

export const createGroup = async (input: CreateGroupInput): Promise<Group> => {
  try {
    // Insert group record
    const result = await db.insert(groupsTable)
      .values({
        group_id: input.group_id,
        name: input.name,
        creator: input.creator
      })
      .returning()
      .execute();

    const group = result[0];
    return group;
  } catch (error) {
    console.error('Group creation failed:', error);
    throw error;
  }
};