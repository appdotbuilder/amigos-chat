import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GetUserInput } from '../schema';
import { getUser } from '../handlers/get_user';

// Test wallet address and user data
const testWalletAddress = '0x1234567890123456789012345678901234567890';
const testUserData = {
  wallet_address: testWalletAddress,
  username: 'testuser',
  ipfs_profile_pic_hash: 'QmTestHash123',
  registration_timestamp: new Date('2024-01-01T00:00:00Z'),
  is_registered: true
};

const testInput: GetUserInput = {
  wallet_address: testWalletAddress
};

describe('getUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when found', async () => {
    // Create test user in database
    await db.insert(usersTable)
      .values(testUserData)
      .execute();

    const result = await getUser(testInput);

    expect(result).not.toBeNull();
    expect(result!.wallet_address).toEqual(testWalletAddress);
    expect(result!.username).toEqual('testuser');
    expect(result!.ipfs_profile_pic_hash).toEqual('QmTestHash123');
    expect(result!.registration_timestamp).toEqual(testUserData.registration_timestamp);
    expect(result!.is_registered).toEqual(true);
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null when user not found', async () => {
    const nonExistentInput: GetUserInput = {
      wallet_address: '0x9999999999999999999999999999999999999999'
    };

    const result = await getUser(nonExistentInput);

    expect(result).toBeNull();
  });

  it('should handle user with null profile pic hash', async () => {
    const userWithoutPic = {
      ...testUserData,
      ipfs_profile_pic_hash: null
    };

    await db.insert(usersTable)
      .values(userWithoutPic)
      .execute();

    const result = await getUser(testInput);

    expect(result).not.toBeNull();
    expect(result!.wallet_address).toEqual(testWalletAddress);
    expect(result!.ipfs_profile_pic_hash).toBeNull();
    expect(result!.username).toEqual('testuser');
    expect(result!.is_registered).toEqual(true);
  });

  it('should handle case-sensitive wallet address lookup', async () => {
    // Create user with lowercase address
    const lowercaseUserData = {
      ...testUserData,
      wallet_address: testWalletAddress.toLowerCase()
    };

    await db.insert(usersTable)
      .values(lowercaseUserData)
      .execute();

    // Search with uppercase address
    const uppercaseInput: GetUserInput = {
      wallet_address: testWalletAddress.toUpperCase()
    };

    const result = await getUser(uppercaseInput);

    // Should return null because addresses don't match (case-sensitive)
    expect(result).toBeNull();
  });

  it('should return user with is_registered false', async () => {
    const unregisteredUserData = {
      ...testUserData,
      is_registered: false
    };

    await db.insert(usersTable)
      .values(unregisteredUserData)
      .execute();

    const result = await getUser(testInput);

    expect(result).not.toBeNull();
    expect(result!.is_registered).toEqual(false);
    expect(result!.wallet_address).toEqual(testWalletAddress);
    expect(result!.username).toEqual('testuser');
  });

  it('should handle multiple users but return only matching one', async () => {
    const user1Data = {
      ...testUserData,
      wallet_address: '0x1111111111111111111111111111111111111111',
      username: 'user1'
    };

    const user2Data = {
      ...testUserData,
      username: 'user2'
    };

    // Insert multiple users
    await db.insert(usersTable)
      .values([user1Data, user2Data])
      .execute();

    const result = await getUser(testInput);

    expect(result).not.toBeNull();
    expect(result!.wallet_address).toEqual(testWalletAddress);
    expect(result!.username).toEqual('user2');
  });
});