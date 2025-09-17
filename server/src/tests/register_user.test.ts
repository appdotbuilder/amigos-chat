import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterUserInput } from '../schema';
import { registerUser } from '../handlers/register_user';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: RegisterUserInput = {
  wallet_address: '0x1234567890123456789012345678901234567890',
  username: 'testuser123',
  ipfs_profile_pic_hash: 'QmTestHash123456789'
};

// Test input without profile pic
const testInputNoProfilePic: RegisterUserInput = {
  wallet_address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  username: 'userWithoutPic',
  ipfs_profile_pic_hash: null
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a user with profile pic', async () => {
    const result = await registerUser(testInput);

    // Basic field validation
    expect(result.wallet_address).toEqual('0x1234567890123456789012345678901234567890');
    expect(result.username).toEqual('testuser123');
    expect(result.ipfs_profile_pic_hash).toEqual('QmTestHash123456789');
    expect(result.is_registered).toBe(true);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.registration_timestamp).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should register a user without profile pic', async () => {
    const result = await registerUser(testInputNoProfilePic);

    // Verify null profile pic is handled correctly
    expect(result.wallet_address).toEqual('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');
    expect(result.username).toEqual('userWithoutPic');
    expect(result.ipfs_profile_pic_hash).toBeNull();
    expect(result.is_registered).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.registration_timestamp).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await registerUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].wallet_address).toEqual('0x1234567890123456789012345678901234567890');
    expect(users[0].username).toEqual('testuser123');
    expect(users[0].ipfs_profile_pic_hash).toEqual('QmTestHash123456789');
    expect(users[0].is_registered).toBe(true);
    expect(users[0].registration_timestamp).toBeInstanceOf(Date);
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should enforce unique wallet address constraint', async () => {
    // Register first user
    await registerUser(testInput);

    // Attempt to register same wallet address again
    const duplicateInput: RegisterUserInput = {
      wallet_address: '0x1234567890123456789012345678901234567890', // Same address
      username: 'differentUsername',
      ipfs_profile_pic_hash: 'DifferentHash'
    };

    // Should throw error due to unique constraint violation
    await expect(registerUser(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should set registration_timestamp to current time', async () => {
    const beforeRegistration = new Date();
    const result = await registerUser(testInput);
    const afterRegistration = new Date();

    // Check that registration timestamp is within reasonable range
    expect(result.registration_timestamp.getTime()).toBeGreaterThanOrEqual(beforeRegistration.getTime());
    expect(result.registration_timestamp.getTime()).toBeLessThanOrEqual(afterRegistration.getTime());
  });

  it('should handle multiple user registrations', async () => {
    const user1Input: RegisterUserInput = {
      wallet_address: '0x1111111111111111111111111111111111111111',
      username: 'user1',
      ipfs_profile_pic_hash: 'Hash1'
    };

    const user2Input: RegisterUserInput = {
      wallet_address: '0x2222222222222222222222222222222222222222',
      username: 'user2',
      ipfs_profile_pic_hash: null
    };

    const result1 = await registerUser(user1Input);
    const result2 = await registerUser(user2Input);

    // Verify both users are registered with different IDs
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.wallet_address).toEqual('0x1111111111111111111111111111111111111111');
    expect(result2.wallet_address).toEqual('0x2222222222222222222222222222222222222222');

    // Verify both are saved in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(2);
  });
});