import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, groupsTable, groupMembershipsTable } from '../db/schema';
import { type GetUserGroupsInput } from '../schema';
import { getUserGroups } from '../handlers/get_user_groups';

// Test data
const testUser = {
  wallet_address: '0x1234567890123456789012345678901234567890',
  username: 'testuser',
  ipfs_profile_pic_hash: null,
  registration_timestamp: new Date(),
  is_registered: true
};

const testUser2 = {
  wallet_address: '0xabcdef1234567890123456789012345678901234',
  username: 'testuser2',
  ipfs_profile_pic_hash: 'QmTest123',
  registration_timestamp: new Date(),
  is_registered: true
};

const testGroup1 = {
  group_id: 1,
  name: 'Test Group 1',
  creator: testUser.wallet_address
};

const testGroup2 = {
  group_id: 2,
  name: 'Test Group 2',
  creator: testUser2.wallet_address
};

const testGroup3 = {
  group_id: 3,
  name: 'Test Group 3',
  creator: testUser.wallet_address
};

describe('getUserGroups', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return groups that a user is a member of', async () => {
    // Create test users
    await db.insert(usersTable).values([testUser, testUser2]).execute();
    
    // Create test groups
    await db.insert(groupsTable).values([testGroup1, testGroup2, testGroup3]).execute();
    
    // Add user to groups 1 and 3
    await db.insert(groupMembershipsTable).values([
      {
        group_id: testGroup1.group_id,
        user_wallet_address: testUser.wallet_address
      },
      {
        group_id: testGroup3.group_id,
        user_wallet_address: testUser.wallet_address
      }
    ]).execute();

    const input: GetUserGroupsInput = {
      user_wallet_address: testUser.wallet_address
    };

    const result = await getUserGroups(input);

    // Should return 2 groups that the user is a member of
    expect(result).toHaveLength(2);
    
    // Check that correct groups are returned
    const groupIds = result.map(group => group.group_id).sort();
    expect(groupIds).toEqual([1, 3]);
    
    // Verify group details
    const group1 = result.find(g => g.group_id === 1);
    const group3 = result.find(g => g.group_id === 3);
    
    expect(group1).toBeDefined();
    expect(group1!.name).toEqual('Test Group 1');
    expect(group1!.creator).toEqual(testUser.wallet_address);
    expect(group1!.id).toBeDefined();
    expect(group1!.created_at).toBeInstanceOf(Date);
    
    expect(group3).toBeDefined();
    expect(group3!.name).toEqual('Test Group 3');
    expect(group3!.creator).toEqual(testUser.wallet_address);
    expect(group3!.id).toBeDefined();
    expect(group3!.created_at).toBeInstanceOf(Date);
  });

  it('should return empty array when user is not a member of any groups', async () => {
    // Create test users and groups but no memberships
    await db.insert(usersTable).values([testUser, testUser2]).execute();
    await db.insert(groupsTable).values([testGroup1, testGroup2]).execute();

    const input: GetUserGroupsInput = {
      user_wallet_address: testUser.wallet_address
    };

    const result = await getUserGroups(input);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return only groups for the specified user', async () => {
    // Create test users
    await db.insert(usersTable).values([testUser, testUser2]).execute();
    
    // Create test groups
    await db.insert(groupsTable).values([testGroup1, testGroup2]).execute();
    
    // Add different users to different groups
    await db.insert(groupMembershipsTable).values([
      {
        group_id: testGroup1.group_id,
        user_wallet_address: testUser.wallet_address
      },
      {
        group_id: testGroup2.group_id,
        user_wallet_address: testUser2.wallet_address
      }
    ]).execute();

    // Query groups for testUser
    const input: GetUserGroupsInput = {
      user_wallet_address: testUser.wallet_address
    };

    const result = await getUserGroups(input);

    expect(result).toHaveLength(1);
    expect(result[0].group_id).toEqual(1);
    expect(result[0].name).toEqual('Test Group 1');
  });

  it('should handle user with multiple group memberships correctly', async () => {
    // Create test users
    await db.insert(usersTable).values([testUser, testUser2]).execute();
    
    // Create multiple test groups
    await db.insert(groupsTable).values([testGroup1, testGroup2, testGroup3]).execute();
    
    // Add user to all groups
    await db.insert(groupMembershipsTable).values([
      {
        group_id: testGroup1.group_id,
        user_wallet_address: testUser.wallet_address
      },
      {
        group_id: testGroup2.group_id,
        user_wallet_address: testUser.wallet_address
      },
      {
        group_id: testGroup3.group_id,
        user_wallet_address: testUser.wallet_address
      }
    ]).execute();

    const input: GetUserGroupsInput = {
      user_wallet_address: testUser.wallet_address
    };

    const result = await getUserGroups(input);

    expect(result).toHaveLength(3);
    
    // Verify all groups are returned with correct details
    const sortedResult = result.sort((a, b) => a.group_id - b.group_id);
    expect(sortedResult[0].name).toEqual('Test Group 1');
    expect(sortedResult[1].name).toEqual('Test Group 2');
    expect(sortedResult[2].name).toEqual('Test Group 3');
    
    // Verify all have proper timestamps
    sortedResult.forEach(group => {
      expect(group.created_at).toBeInstanceOf(Date);
      expect(group.id).toBeDefined();
    });
  });

  it('should return empty array for non-existent user', async () => {
    // Create groups but no users or memberships
    await db.insert(usersTable).values([testUser]).execute();
    await db.insert(groupsTable).values([testGroup1]).execute();

    const input: GetUserGroupsInput = {
      user_wallet_address: '0x9999999999999999999999999999999999999999'
    };

    const result = await getUserGroups(input);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });
});