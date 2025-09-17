import { db } from '../db';
import { groupsTable, groupMembershipsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type GetUserGroupsInput, type Group } from '../schema';

export async function getUserGroups(input: GetUserGroupsInput): Promise<Group[]> {
  try {
    // Query groups that the user is a member of by joining groups and group_memberships tables
    const results = await db.select()
      .from(groupsTable)
      .innerJoin(
        groupMembershipsTable,
        eq(groupsTable.group_id, groupMembershipsTable.group_id)
      )
      .where(eq(groupMembershipsTable.user_wallet_address, input.user_wallet_address))
      .execute();

    // Extract group data from the joined result
    return results.map(result => ({
      id: result.groups.id,
      group_id: result.groups.group_id,
      name: result.groups.name,
      creator: result.groups.creator,
      created_at: result.groups.created_at
    }));
  } catch (error) {
    console.error('Get user groups failed:', error);
    throw error;
  }
}