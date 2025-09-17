import { serial, text, pgTable, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table - stores registered blockchain users
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  wallet_address: text('wallet_address').notNull().unique(),
  username: text('username').notNull(),
  ipfs_profile_pic_hash: text('ipfs_profile_pic_hash'), // Nullable for users without profile pics
  registration_timestamp: timestamp('registration_timestamp').notNull(),
  is_registered: boolean('is_registered').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Groups table - stores chat groups
export const groupsTable = pgTable('groups', {
  id: serial('id').primaryKey(),
  group_id: integer('group_id').notNull().unique(), // Matches blockchain group ID
  name: text('name').notNull(),
  creator: text('creator').notNull(), // Wallet address of creator
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Group memberships table - tracks which users are in which groups
export const groupMembershipsTable = pgTable('group_memberships', {
  id: serial('id').primaryKey(),
  group_id: integer('group_id').notNull(),
  user_wallet_address: text('user_wallet_address').notNull(),
  joined_at: timestamp('joined_at').defaultNow().notNull(),
});

// Messages table - stores chat message history
export const messagesTable = pgTable('messages', {
  id: serial('id').primaryKey(),
  from_address: text('from_address').notNull(),
  to_address: text('to_address'), // Nullable for group messages
  group_id: integer('group_id'), // Nullable for private messages
  content: text('content').notNull(),
  message_type: text('message_type').notNull(), // 'private' or 'group'
  timestamp: timestamp('timestamp').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  groupMemberships: many(groupMembershipsTable),
  sentMessages: many(messagesTable),
}));

export const groupsRelations = relations(groupsTable, ({ many }) => ({
  memberships: many(groupMembershipsTable),
  messages: many(messagesTable),
}));

export const groupMembershipsRelations = relations(groupMembershipsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [groupMembershipsTable.user_wallet_address],
    references: [usersTable.wallet_address],
  }),
  group: one(groupsTable, {
    fields: [groupMembershipsTable.group_id],
    references: [groupsTable.group_id],
  }),
}));

export const messagesRelations = relations(messagesTable, ({ one }) => ({
  sender: one(usersTable, {
    fields: [messagesTable.from_address],
    references: [usersTable.wallet_address],
  }),
  recipient: one(usersTable, {
    fields: [messagesTable.to_address],
    references: [usersTable.wallet_address],
  }),
  group: one(groupsTable, {
    fields: [messagesTable.group_id],
    references: [groupsTable.group_id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Group = typeof groupsTable.$inferSelect;
export type NewGroup = typeof groupsTable.$inferInsert;
export type GroupMembership = typeof groupMembershipsTable.$inferSelect;
export type NewGroupMembership = typeof groupMembershipsTable.$inferInsert;
export type Message = typeof messagesTable.$inferSelect;
export type NewMessage = typeof messagesTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  groups: groupsTable,
  groupMemberships: groupMembershipsTable,
  messages: messagesTable,
};