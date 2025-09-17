import { z } from 'zod';

// User schema for blockchain users
export const userSchema = z.object({
  id: z.number(),
  wallet_address: z.string(),
  username: z.string(),
  ipfs_profile_pic_hash: z.string().nullable(),
  registration_timestamp: z.coerce.date(),
  is_registered: z.boolean(),
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Input schema for registering users
export const registerUserInputSchema = z.object({
  wallet_address: z.string().min(42).max(42), // Ethereum address length
  username: z.string().min(3).max(50),
  ipfs_profile_pic_hash: z.string().nullable()
});

export type RegisterUserInput = z.infer<typeof registerUserInputSchema>;

// Group schema for chat groups
export const groupSchema = z.object({
  id: z.number(),
  group_id: z.number(),
  name: z.string(),
  creator: z.string(),
  created_at: z.coerce.date()
});

export type Group = z.infer<typeof groupSchema>;

// Input schema for creating groups
export const createGroupInputSchema = z.object({
  group_id: z.number(),
  name: z.string().min(1).max(100),
  creator: z.string()
});

export type CreateGroupInput = z.infer<typeof createGroupInputSchema>;

// Group membership schema
export const groupMembershipSchema = z.object({
  id: z.number(),
  group_id: z.number(),
  user_wallet_address: z.string(),
  joined_at: z.coerce.date()
});

export type GroupMembership = z.infer<typeof groupMembershipSchema>;

// Input schema for joining groups
export const joinGroupInputSchema = z.object({
  group_id: z.number(),
  user_wallet_address: z.string()
});

export type JoinGroupInput = z.infer<typeof joinGroupInputSchema>;

// Message schema for chat messages (stored for history/persistence)
export const messageSchema = z.object({
  id: z.number(),
  from_address: z.string(),
  to_address: z.string().nullable(), // null for group messages
  group_id: z.number().nullable(), // null for private messages
  content: z.string(),
  message_type: z.enum(['private', 'group']),
  timestamp: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Message = z.infer<typeof messageSchema>;

// Input schema for sending messages
export const sendMessageInputSchema = z.object({
  from_address: z.string(),
  to_address: z.string().nullable(),
  group_id: z.number().nullable(),
  content: z.string().min(1).max(1000),
  message_type: z.enum(['private', 'group'])
});

export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

// User lookup schema
export const getUserInputSchema = z.object({
  wallet_address: z.string()
});

export type GetUserInput = z.infer<typeof getUserInputSchema>;

// Get groups by user schema
export const getUserGroupsInputSchema = z.object({
  user_wallet_address: z.string()
});

export type GetUserGroupsInput = z.infer<typeof getUserGroupsInputSchema>;

// Get messages schema
export const getMessagesInputSchema = z.object({
  user_address: z.string(),
  group_id: z.number().nullable(),
  to_address: z.string().nullable(),
  limit: z.number().int().positive().max(100).optional().default(50)
});

export type GetMessagesInput = z.infer<typeof getMessagesInputSchema>;