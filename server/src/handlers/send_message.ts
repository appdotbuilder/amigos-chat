import { db } from '../db';
import { messagesTable, usersTable, groupsTable } from '../db/schema';
import { type SendMessageInput, type Message } from '../schema';
import { eq } from 'drizzle-orm';

export const sendMessage = async (input: SendMessageInput): Promise<Message> => {
  try {
    // Validate sender exists
    const sender = await db.select()
      .from(usersTable)
      .where(eq(usersTable.wallet_address, input.from_address))
      .execute();

    if (sender.length === 0) {
      throw new Error('Sender wallet address not found');
    }

    // For private messages, validate recipient exists
    if (input.message_type === 'private' && input.to_address) {
      const recipient = await db.select()
        .from(usersTable)
        .where(eq(usersTable.wallet_address, input.to_address))
        .execute();

      if (recipient.length === 0) {
        throw new Error('Recipient wallet address not found');
      }
    }

    // For group messages, validate group exists
    if (input.message_type === 'group' && input.group_id) {
      const group = await db.select()
        .from(groupsTable)
        .where(eq(groupsTable.group_id, input.group_id))
        .execute();

      if (group.length === 0) {
        throw new Error('Group not found');
      }
    }

    // Insert message record
    const result = await db.insert(messagesTable)
      .values({
        from_address: input.from_address,
        to_address: input.to_address,
        group_id: input.group_id,
        content: input.content,
        message_type: input.message_type,
        timestamp: new Date() // Use current timestamp
      })
      .returning()
      .execute();

    const message = result[0];
    return {
      ...message,
      message_type: message.message_type as 'private' | 'group'
    };
  } catch (error) {
    console.error('Message sending failed:', error);
    throw error;
  }
};