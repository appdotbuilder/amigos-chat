import { db } from '../db';
import { groupMembershipsTable, groupsTable, usersTable } from '../db/schema';
import { type JoinGroupInput, type GroupMembership } from '../schema';
import { eq, and } from 'drizzle-orm';

export const joinGroup = async (input: JoinGroupInput): Promise<GroupMembership> => {
  try {
    // Check if group exists
    const groupExists = await db.select()
      .from(groupsTable)
      .where(eq(groupsTable.group_id, input.group_id))
      .execute();

    if (groupExists.length === 0) {
      throw new Error(`Group with ID ${input.group_id} does not exist`);
    }

    // Check if user exists
    const userExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.wallet_address, input.user_wallet_address))
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with wallet address ${input.user_wallet_address} does not exist`);
    }

    // Check if user is already a member of the group
    const existingMembership = await db.select()
      .from(groupMembershipsTable)
      .where(
        and(
          eq(groupMembershipsTable.group_id, input.group_id),
          eq(groupMembershipsTable.user_wallet_address, input.user_wallet_address)
        )
      )
      .execute();

    if (existingMembership.length > 0) {
      throw new Error(`User ${input.user_wallet_address} is already a member of group ${input.group_id}`);
    }

    // Insert the new group membership
    const result = await db.insert(groupMembershipsTable)
      .values({
        group_id: input.group_id,
        user_wallet_address: input.user_wallet_address
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Group join failed:', error);
    throw error;
  }
};