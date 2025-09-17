import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, groupsTable, groupMembershipsTable } from '../db/schema';
import { type JoinGroupInput } from '../schema';
import { joinGroup } from '../handlers/join_group';
import { eq, and } from 'drizzle-orm';

// Test data
const testUser = {
  wallet_address: '0x1234567890123456789012345678901234567890',
  username: 'testuser',
  ipfs_profile_pic_hash: null,
  registration_timestamp: new Date(),
  is_registered: true
};

const testGroup = {
  group_id: 1,
  name: 'Test Group',
  creator: '0x1111111111111111111111111111111111111111'
};

const testInput: JoinGroupInput = {
  group_id: 1,
  user_wallet_address: '0x1234567890123456789012345678901234567890'
};

describe('joinGroup', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully add user to group', async () => {
    // Create prerequisite user and group
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(groupsTable).values(testGroup).execute();

    const result = await joinGroup(testInput);

    // Verify the returned membership
    expect(result.group_id).toEqual(1);
    expect(result.user_wallet_address).toEqual(testUser.wallet_address);
    expect(result.id).toBeDefined();
    expect(result.joined_at).toBeInstanceOf(Date);
  });

  it('should save membership to database', async () => {
    // Create prerequisite user and group
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(groupsTable).values(testGroup).execute();

    const result = await joinGroup(testInput);

    // Query database to verify membership was saved
    const memberships = await db.select()
      .from(groupMembershipsTable)
      .where(eq(groupMembershipsTable.id, result.id))
      .execute();

    expect(memberships).toHaveLength(1);
    expect(memberships[0].group_id).toEqual(1);
    expect(memberships[0].user_wallet_address).toEqual(testUser.wallet_address);
    expect(memberships[0].joined_at).toBeInstanceOf(Date);
  });

  it('should throw error when group does not exist', async () => {
    // Create user but not group
    await db.insert(usersTable).values(testUser).execute();

    await expect(joinGroup(testInput)).rejects.toThrow(/Group with ID 1 does not exist/i);
  });

  it('should throw error when user does not exist', async () => {
    // Create group but not user
    await db.insert(groupsTable).values(testGroup).execute();

    await expect(joinGroup(testInput)).rejects.toThrow(/User with wallet address .* does not exist/i);
  });

  it('should throw error when user is already a member', async () => {
    // Create user and group
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(groupsTable).values(testGroup).execute();

    // First join should succeed
    await joinGroup(testInput);

    // Second join attempt should fail
    await expect(joinGroup(testInput)).rejects.toThrow(/User .* is already a member of group 1/i);
  });

  it('should allow same user to join different groups', async () => {
    // Create user and two groups
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(groupsTable).values(testGroup).execute();
    await db.insert(groupsTable).values({
      group_id: 2,
      name: 'Second Test Group',
      creator: '0x2222222222222222222222222222222222222222'
    }).execute();

    // Join first group
    const firstMembership = await joinGroup(testInput);
    expect(firstMembership.group_id).toEqual(1);

    // Join second group
    const secondInput: JoinGroupInput = {
      group_id: 2,
      user_wallet_address: testUser.wallet_address
    };
    const secondMembership = await joinGroup(secondInput);
    expect(secondMembership.group_id).toEqual(2);

    // Verify both memberships exist in database
    const memberships = await db.select()
      .from(groupMembershipsTable)
      .where(eq(groupMembershipsTable.user_wallet_address, testUser.wallet_address))
      .execute();

    expect(memberships).toHaveLength(2);
    expect(memberships.map(m => m.group_id).sort()).toEqual([1, 2]);
  });

  it('should allow different users to join same group', async () => {
    const secondUser = {
      wallet_address: '0x9876543210987654321098765432109876543210',
      username: 'testuser2',
      ipfs_profile_pic_hash: null,
      registration_timestamp: new Date(),
      is_registered: true
    };

    // Create users and group
    await db.insert(usersTable).values([testUser, secondUser]).execute();
    await db.insert(groupsTable).values(testGroup).execute();

    // First user joins group
    const firstMembership = await joinGroup(testInput);
    expect(firstMembership.user_wallet_address).toEqual(testUser.wallet_address);

    // Second user joins same group
    const secondInput: JoinGroupInput = {
      group_id: 1,
      user_wallet_address: secondUser.wallet_address
    };
    const secondMembership = await joinGroup(secondInput);
    expect(secondMembership.user_wallet_address).toEqual(secondUser.wallet_address);

    // Verify both memberships exist for the same group
    const memberships = await db.select()
      .from(groupMembershipsTable)
      .where(eq(groupMembershipsTable.group_id, 1))
      .execute();

    expect(memberships).toHaveLength(2);
    expect(memberships.map(m => m.user_wallet_address).sort()).toEqual([
      testUser.wallet_address,
      secondUser.wallet_address
    ].sort());
  });

  it('should handle concurrent join attempts gracefully', async () => {
    // Create user and group
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(groupsTable).values(testGroup).execute();

    // Attempt concurrent joins (one should succeed, one should fail)
    const promises = [
      joinGroup(testInput),
      joinGroup(testInput)
    ];

    const results = await Promise.allSettled(promises);

    // One should succeed, one should fail
    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    expect(successful).toHaveLength(1);
    expect(failed).toHaveLength(1);

    // Verify only one membership exists
    const memberships = await db.select()
      .from(groupMembershipsTable)
      .where(
        and(
          eq(groupMembershipsTable.group_id, testInput.group_id),
          eq(groupMembershipsTable.user_wallet_address, testInput.user_wallet_address)
        )
      )
      .execute();

    expect(memberships).toHaveLength(1);
  });
});