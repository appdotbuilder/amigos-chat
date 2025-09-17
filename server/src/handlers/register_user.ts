import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterUserInput, type User } from '../schema';

export const registerUser = async (input: RegisterUserInput): Promise<User> => {
  try {
    // Insert user record with blockchain registration timestamp
    const result = await db.insert(usersTable)
      .values({
        wallet_address: input.wallet_address,
        username: input.username,
        ipfs_profile_pic_hash: input.ipfs_profile_pic_hash,
        registration_timestamp: new Date(), // Current timestamp for when they registered
        is_registered: true
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
};