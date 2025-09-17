import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, groupsTable, messagesTable } from '../db/schema';
import { type GetMessagesInput } from '../schema';
import { getMessages } from '../handlers/get_messages';

describe('getMessages', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const setupTestData = async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          wallet_address: '0x1234567890123456789012345678901234567890',
          username: 'alice',
          registration_timestamp: new Date(),
          is_registered: true,
          ipfs_profile_pic_hash: null
        },
        {
          wallet_address: '0x2345678901234567890123456789012345678901',
          username: 'bob',
          registration_timestamp: new Date(),
          is_registered: true,
          ipfs_profile_pic_hash: null
        },
        {
          wallet_address: '0x3456789012345678901234567890123456789012',
          username: 'charlie',
          registration_timestamp: new Date(),
          is_registered: true,
          ipfs_profile_pic_hash: null
        }
      ])
      .returning()
      .execute();

    // Create test group
    const groups = await db.insert(groupsTable)
      .values({
        group_id: 1,
        name: 'Test Group',
        creator: '0x1234567890123456789012345678901234567890'
      })
      .returning()
      .execute();

    return { users, groups };
  };

  it('should fetch private messages between two users', async () => {
    await setupTestData();

    const alice = '0x1234567890123456789012345678901234567890';
    const bob = '0x2345678901234567890123456789012345678901';

    // Create private messages between alice and bob
    await db.insert(messagesTable)
      .values([
        {
          from_address: alice,
          to_address: bob,
          group_id: null,
          content: 'Hello Bob!',
          message_type: 'private',
          timestamp: new Date('2024-01-01T10:00:00Z')
        },
        {
          from_address: bob,
          to_address: alice,
          group_id: null,
          content: 'Hi Alice!',
          message_type: 'private',
          timestamp: new Date('2024-01-01T10:01:00Z')
        },
        {
          from_address: alice,
          to_address: bob,
          group_id: null,
          content: 'How are you?',
          message_type: 'private',
          timestamp: new Date('2024-01-01T10:02:00Z')
        }
      ])
      .execute();

    const input: GetMessagesInput = {
      user_address: alice,
      to_address: bob,
      group_id: null,
      limit: 50
    };

    const result = await getMessages(input);

    expect(result).toHaveLength(3);
    
    // Verify messages are ordered by timestamp descending (newest first)
    expect(result[0].content).toBe('How are you?');
    expect(result[1].content).toBe('Hi Alice!');
    expect(result[2].content).toBe('Hello Bob!');

    // Verify all messages are between alice and bob
    result.forEach(message => {
      expect(
        (message.from_address === alice && message.to_address === bob) ||
        (message.from_address === bob && message.to_address === alice)
      ).toBe(true);
      expect(message.message_type).toBe('private');
      expect(message.group_id).toBeNull();
      expect(message.timestamp).toBeInstanceOf(Date);
      expect(message.created_at).toBeInstanceOf(Date);
    });
  });

  it('should fetch group messages', async () => {
    await setupTestData();

    const alice = '0x1234567890123456789012345678901234567890';
    const bob = '0x2345678901234567890123456789012345678901';
    const charlie = '0x3456789012345678901234567890123456789012';

    // Create group messages
    await db.insert(messagesTable)
      .values([
        {
          from_address: alice,
          to_address: null,
          group_id: 1,
          content: 'Welcome to the group!',
          message_type: 'group',
          timestamp: new Date('2024-01-01T10:00:00Z')
        },
        {
          from_address: bob,
          to_address: null,
          group_id: 1,
          content: 'Thanks Alice!',
          message_type: 'group',
          timestamp: new Date('2024-01-01T10:01:00Z')
        },
        {
          from_address: charlie,
          to_address: null,
          group_id: 1,
          content: 'Great to be here!',
          message_type: 'group',
          timestamp: new Date('2024-01-01T10:02:00Z')
        }
      ])
      .execute();

    const input: GetMessagesInput = {
      user_address: alice,
      to_address: null,
      group_id: 1,
      limit: 50
    };

    const result = await getMessages(input);

    expect(result).toHaveLength(3);
    
    // Verify messages are ordered by timestamp descending
    expect(result[0].content).toBe('Great to be here!');
    expect(result[1].content).toBe('Thanks Alice!');
    expect(result[2].content).toBe('Welcome to the group!');

    // Verify all messages are for the group
    result.forEach(message => {
      expect(message.group_id).toBe(1);
      expect(message.message_type).toBe('group');
      expect(message.to_address).toBeNull();
      expect(message.timestamp).toBeInstanceOf(Date);
      expect(message.created_at).toBeInstanceOf(Date);
    });
  });

  it('should respect limit parameter', async () => {
    await setupTestData();

    const alice = '0x1234567890123456789012345678901234567890';
    const bob = '0x2345678901234567890123456789012345678901';

    // Create 5 private messages
    const messages = Array.from({ length: 5 }, (_, i) => ({
      from_address: alice,
      to_address: bob,
      group_id: null,
      content: `Message ${i + 1}`,
      message_type: 'private' as const,
      timestamp: new Date(`2024-01-01T10:0${i}:00Z`)
    }));

    await db.insert(messagesTable).values(messages).execute();

    const input: GetMessagesInput = {
      user_address: alice,
      to_address: bob,
      group_id: null,
      limit: 3
    };

    const result = await getMessages(input);

    expect(result).toHaveLength(3);
    
    // Should get the 3 newest messages (highest timestamps)
    expect(result[0].content).toBe('Message 5');
    expect(result[1].content).toBe('Message 4');
    expect(result[2].content).toBe('Message 3');
  });

  it('should return empty array when neither group_id nor to_address is provided', async () => {
    await setupTestData();

    const input: GetMessagesInput = {
      user_address: '0x1234567890123456789012345678901234567890',
      to_address: null,
      group_id: null,
      limit: 50
    };

    const result = await getMessages(input);

    expect(result).toHaveLength(0);
  });

  it('should return empty array when no messages match criteria', async () => {
    await setupTestData();

    const input: GetMessagesInput = {
      user_address: '0x1234567890123456789012345678901234567890',
      to_address: '0x2345678901234567890123456789012345678901',
      group_id: null,
      limit: 50
    };

    // No messages created, should return empty array
    const result = await getMessages(input);

    expect(result).toHaveLength(0);
  });

  it('should not include messages from other groups when fetching group messages', async () => {
    await setupTestData();

    const alice = '0x1234567890123456789012345678901234567890';

    // Create a second group
    await db.insert(groupsTable)
      .values({
        group_id: 2,
        name: 'Another Group',
        creator: alice
      })
      .execute();

    // Create messages in both groups
    await db.insert(messagesTable)
      .values([
        {
          from_address: alice,
          to_address: null,
          group_id: 1,
          content: 'Message in group 1',
          message_type: 'group',
          timestamp: new Date('2024-01-01T10:00:00Z')
        },
        {
          from_address: alice,
          to_address: null,
          group_id: 2,
          content: 'Message in group 2',
          message_type: 'group',
          timestamp: new Date('2024-01-01T10:01:00Z')
        }
      ])
      .execute();

    const input: GetMessagesInput = {
      user_address: alice,
      to_address: null,
      group_id: 1,
      limit: 50
    };

    const result = await getMessages(input);

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('Message in group 1');
    expect(result[0].group_id).toBe(1);
  });

  it('should not include private messages when fetching group messages', async () => {
    await setupTestData();

    const alice = '0x1234567890123456789012345678901234567890';
    const bob = '0x2345678901234567890123456789012345678901';

    // Create both private and group messages
    await db.insert(messagesTable)
      .values([
        {
          from_address: alice,
          to_address: bob,
          group_id: null,
          content: 'Private message',
          message_type: 'private',
          timestamp: new Date('2024-01-01T10:00:00Z')
        },
        {
          from_address: alice,
          to_address: null,
          group_id: 1,
          content: 'Group message',
          message_type: 'group',
          timestamp: new Date('2024-01-01T10:01:00Z')
        }
      ])
      .execute();

    const input: GetMessagesInput = {
      user_address: alice,
      to_address: null,
      group_id: 1,
      limit: 50
    };

    const result = await getMessages(input);

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('Group message');
    expect(result[0].message_type).toBe('group');
    expect(result[0].group_id).toBe(1);
  });
});