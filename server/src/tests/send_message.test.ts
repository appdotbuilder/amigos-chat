import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, groupsTable, messagesTable } from '../db/schema';
import { type SendMessageInput } from '../schema';
import { sendMessage } from '../handlers/send_message';
import { eq } from 'drizzle-orm';

describe('sendMessage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test users helper
  const createTestUsers = async () => {
    const sender = await db.insert(usersTable)
      .values({
        wallet_address: '0x1234567890123456789012345678901234567890',
        username: 'sender_user',
        ipfs_profile_pic_hash: null,
        registration_timestamp: new Date(),
        is_registered: true
      })
      .returning()
      .execute();

    const recipient = await db.insert(usersTable)
      .values({
        wallet_address: '0x0987654321098765432109876543210987654321',
        username: 'recipient_user',
        ipfs_profile_pic_hash: null,
        registration_timestamp: new Date(),
        is_registered: true
      })
      .returning()
      .execute();

    return { sender: sender[0], recipient: recipient[0] };
  };

  // Create test group helper
  const createTestGroup = async () => {
    const group = await db.insert(groupsTable)
      .values({
        group_id: 12345,
        name: 'Test Group',
        creator: '0x1234567890123456789012345678901234567890'
      })
      .returning()
      .execute();

    return group[0];
  };

  describe('private messages', () => {
    it('should send a private message successfully', async () => {
      const { sender, recipient } = await createTestUsers();

      const input: SendMessageInput = {
        from_address: sender.wallet_address,
        to_address: recipient.wallet_address,
        group_id: null,
        content: 'Hello, this is a private message!',
        message_type: 'private'
      };

      const result = await sendMessage(input);

      // Validate message fields
      expect(result.from_address).toEqual(sender.wallet_address);
      expect(result.to_address).toEqual(recipient.wallet_address);
      expect(result.group_id).toBeNull();
      expect(result.content).toEqual('Hello, this is a private message!');
      expect(result.message_type).toEqual('private');
      expect(result.id).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save private message to database', async () => {
      const { sender, recipient } = await createTestUsers();

      const input: SendMessageInput = {
        from_address: sender.wallet_address,
        to_address: recipient.wallet_address,
        group_id: null,
        content: 'Database persistence test',
        message_type: 'private'
      };

      const result = await sendMessage(input);

      // Verify message was saved to database
      const messages = await db.select()
        .from(messagesTable)
        .where(eq(messagesTable.id, result.id))
        .execute();

      expect(messages).toHaveLength(1);
      expect(messages[0].from_address).toEqual(sender.wallet_address);
      expect(messages[0].to_address).toEqual(recipient.wallet_address);
      expect(messages[0].content).toEqual('Database persistence test');
      expect(messages[0].message_type).toEqual('private');
      expect(messages[0].timestamp).toBeInstanceOf(Date);
    });

    it('should reject private message when sender does not exist', async () => {
      const { recipient } = await createTestUsers();

      const input: SendMessageInput = {
        from_address: '0xnonexistent1234567890123456789012345678',
        to_address: recipient.wallet_address,
        group_id: null,
        content: 'This should fail',
        message_type: 'private'
      };

      await expect(sendMessage(input)).rejects.toThrow(/sender wallet address not found/i);
    });

    it('should reject private message when recipient does not exist', async () => {
      const { sender } = await createTestUsers();

      const input: SendMessageInput = {
        from_address: sender.wallet_address,
        to_address: '0xnonexistent1234567890123456789012345678',
        group_id: null,
        content: 'This should fail',
        message_type: 'private'
      };

      await expect(sendMessage(input)).rejects.toThrow(/recipient wallet address not found/i);
    });
  });

  describe('group messages', () => {
    it('should send a group message successfully', async () => {
      const { sender } = await createTestUsers();
      const group = await createTestGroup();

      const input: SendMessageInput = {
        from_address: sender.wallet_address,
        to_address: null,
        group_id: group.group_id,
        content: 'Hello everyone in the group!',
        message_type: 'group'
      };

      const result = await sendMessage(input);

      // Validate message fields
      expect(result.from_address).toEqual(sender.wallet_address);
      expect(result.to_address).toBeNull();
      expect(result.group_id).toEqual(group.group_id);
      expect(result.content).toEqual('Hello everyone in the group!');
      expect(result.message_type).toEqual('group');
      expect(result.id).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save group message to database', async () => {
      const { sender } = await createTestUsers();
      const group = await createTestGroup();

      const input: SendMessageInput = {
        from_address: sender.wallet_address,
        to_address: null,
        group_id: group.group_id,
        content: 'Group message persistence test',
        message_type: 'group'
      };

      const result = await sendMessage(input);

      // Verify message was saved to database
      const messages = await db.select()
        .from(messagesTable)
        .where(eq(messagesTable.id, result.id))
        .execute();

      expect(messages).toHaveLength(1);
      expect(messages[0].from_address).toEqual(sender.wallet_address);
      expect(messages[0].to_address).toBeNull();
      expect(messages[0].group_id).toEqual(group.group_id);
      expect(messages[0].content).toEqual('Group message persistence test');
      expect(messages[0].message_type).toEqual('group');
    });

    it('should reject group message when sender does not exist', async () => {
      const group = await createTestGroup();

      const input: SendMessageInput = {
        from_address: '0xnonexistent1234567890123456789012345678',
        to_address: null,
        group_id: group.group_id,
        content: 'This should fail',
        message_type: 'group'
      };

      await expect(sendMessage(input)).rejects.toThrow(/sender wallet address not found/i);
    });

    it('should reject group message when group does not exist', async () => {
      const { sender } = await createTestUsers();

      const input: SendMessageInput = {
        from_address: sender.wallet_address,
        to_address: null,
        group_id: 99999, // Non-existent group ID
        content: 'This should fail',
        message_type: 'group'
      };

      await expect(sendMessage(input)).rejects.toThrow(/group not found/i);
    });
  });

  describe('timestamp handling', () => {
    it('should set timestamp to current time', async () => {
      const { sender, recipient } = await createTestUsers();
      const beforeTime = new Date();

      const input: SendMessageInput = {
        from_address: sender.wallet_address,
        to_address: recipient.wallet_address,
        group_id: null,
        content: 'Timestamp test message',
        message_type: 'private'
      };

      const result = await sendMessage(input);
      const afterTime = new Date();

      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.timestamp >= beforeTime).toBe(true);
      expect(result.timestamp <= afterTime).toBe(true);

      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.created_at >= beforeTime).toBe(true);
      expect(result.created_at <= afterTime).toBe(true);
    });
  });

  describe('content validation', () => {
    it('should handle various content lengths', async () => {
      const { sender, recipient } = await createTestUsers();

      const testCases = [
        'Short message',
        'This is a much longer message that contains more details and information to test the content handling capabilities of the messaging system.',
        'A'.repeat(1000) // Maximum allowed length
      ];

      for (const content of testCases) {
        const input: SendMessageInput = {
          from_address: sender.wallet_address,
          to_address: recipient.wallet_address,
          group_id: null,
          content,
          message_type: 'private'
        };

        const result = await sendMessage(input);
        expect(result.content).toEqual(content);
      }
    });
  });
});