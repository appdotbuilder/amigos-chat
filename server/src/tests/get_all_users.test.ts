import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterUserInput } from '../schema';
import { getAllUsers } from '../handlers/get_all_users';

// Test user inputs
const testUsers: RegisterUserInput[] = [
  {
    wallet_address: '0x1234567890123456789012345678901234567890',
    username: 'alice',
    ipfs_profile_pic_hash: 'QmTest1Hash'
  },
  {
    wallet_address: '0x2234567890123456789012345678901234567890',
    username: 'bob',
    ipfs_profile_pic_hash: null
  },
  {
    wallet_address: '0x3234567890123456789012345678901234567890',
    username: 'charlie',
    ipfs_profile_pic_hash: 'QmTest2Hash'
  }
];

describe('getAllUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getAllUsers();

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all registered users', async () => {
    // Create test users
    for (const user of testUsers) {
      await db.insert(usersTable)
        .values({
          wallet_address: user.wallet_address,
          username: user.username,
          ipfs_profile_pic_hash: user.ipfs_profile_pic_hash,
          registration_timestamp: new Date(),
          is_registered: true
        })
        .execute();
    }

    const result = await getAllUsers();

    expect(result).toHaveLength(3);
    
    // Verify all users are returned
    const walletAddresses = result.map(user => user.wallet_address);
    expect(walletAddresses).toContain(testUsers[0].wallet_address);
    expect(walletAddresses).toContain(testUsers[1].wallet_address);
    expect(walletAddresses).toContain(testUsers[2].wallet_address);
  });

  it('should return users with correct field structure', async () => {
    // Create a single test user
    await db.insert(usersTable)
      .values({
        wallet_address: testUsers[0].wallet_address,
        username: testUsers[0].username,
        ipfs_profile_pic_hash: testUsers[0].ipfs_profile_pic_hash,
        registration_timestamp: new Date(),
        is_registered: true
      })
      .execute();

    const result = await getAllUsers();

    expect(result).toHaveLength(1);
    const user = result[0];

    // Verify all required fields exist
    expect(user.id).toBeDefined();
    expect(typeof user.id).toBe('number');
    expect(user.wallet_address).toBe(testUsers[0].wallet_address);
    expect(user.username).toBe(testUsers[0].username);
    expect(user.ipfs_profile_pic_hash).toBe(testUsers[0].ipfs_profile_pic_hash);
    expect(user.registration_timestamp).toBeInstanceOf(Date);
    expect(user.is_registered).toBe(true);
    expect(user.created_at).toBeInstanceOf(Date);
  });

  it('should handle users with null profile pic hash', async () => {
    // Create user without profile pic
    await db.insert(usersTable)
      .values({
        wallet_address: testUsers[1].wallet_address,
        username: testUsers[1].username,
        ipfs_profile_pic_hash: null,
        registration_timestamp: new Date(),
        is_registered: true
      })
      .execute();

    const result = await getAllUsers();

    expect(result).toHaveLength(1);
    expect(result[0].ipfs_profile_pic_hash).toBeNull();
    expect(result[0].username).toBe(testUsers[1].username);
  });

  it('should return users ordered by creation date (newest first)', async () => {
    // Create users with different timestamps
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // Insert in reverse chronological order
    await db.insert(usersTable)
      .values({
        wallet_address: testUsers[2].wallet_address,
        username: testUsers[2].username,
        ipfs_profile_pic_hash: testUsers[2].ipfs_profile_pic_hash,
        registration_timestamp: twoHoursAgo,
        is_registered: true,
        created_at: twoHoursAgo
      })
      .execute();

    await db.insert(usersTable)
      .values({
        wallet_address: testUsers[1].wallet_address,
        username: testUsers[1].username,
        ipfs_profile_pic_hash: testUsers[1].ipfs_profile_pic_hash,
        registration_timestamp: oneHourAgo,
        is_registered: true,
        created_at: oneHourAgo
      })
      .execute();

    await db.insert(usersTable)
      .values({
        wallet_address: testUsers[0].wallet_address,
        username: testUsers[0].username,
        ipfs_profile_pic_hash: testUsers[0].ipfs_profile_pic_hash,
        registration_timestamp: now,
        is_registered: true,
        created_at: now
      })
      .execute();

    const result = await getAllUsers();

    expect(result).toHaveLength(3);
    
    // Verify users are ordered by created_at (newest first)
    expect(result[0].username).toBe(testUsers[0].username); // Most recent
    expect(result[1].username).toBe(testUsers[1].username); // Middle
    expect(result[2].username).toBe(testUsers[2].username); // Oldest

    // Verify timestamps are in descending order
    expect(result[0].created_at >= result[1].created_at).toBe(true);
    expect(result[1].created_at >= result[2].created_at).toBe(true);
  });

  it('should include both registered and unregistered users', async () => {
    // Create one registered and one unregistered user
    await db.insert(usersTable)
      .values({
        wallet_address: testUsers[0].wallet_address,
        username: testUsers[0].username,
        ipfs_profile_pic_hash: testUsers[0].ipfs_profile_pic_hash,
        registration_timestamp: new Date(),
        is_registered: true
      })
      .execute();

    await db.insert(usersTable)
      .values({
        wallet_address: testUsers[1].wallet_address,
        username: testUsers[1].username,
        ipfs_profile_pic_hash: testUsers[1].ipfs_profile_pic_hash,
        registration_timestamp: new Date(),
        is_registered: false
      })
      .execute();

    const result = await getAllUsers();

    expect(result).toHaveLength(2);
    
    // Verify both registered and unregistered users are returned
    const registeredUser = result.find(user => user.is_registered === true);
    const unregisteredUser = result.find(user => user.is_registered === false);

    expect(registeredUser).toBeDefined();
    expect(unregisteredUser).toBeDefined();
    expect(registeredUser?.wallet_address).toBe(testUsers[0].wallet_address);
    expect(unregisteredUser?.wallet_address).toBe(testUsers[1].wallet_address);
  });
});