import { db } from '../db';
import { messagesTable } from '../db/schema';
import { type GetMessagesInput, type Message } from '../schema';
import { eq, and, or, desc, SQL } from 'drizzle-orm';

export async function getMessages(input: GetMessagesInput): Promise<Message[]> {
  try {
    if (input.group_id !== null) {
      // Group messages: fetch messages for the specific group
      const results = await db.select()
        .from(messagesTable)
        .where(
          and(
            eq(messagesTable.group_id, input.group_id),
            eq(messagesTable.message_type, 'group')
          )
        )
        .orderBy(desc(messagesTable.timestamp))
        .limit(input.limit)
        .execute();

      return results.map(message => ({
        ...message,
        message_type: message.message_type as 'private' | 'group',
        timestamp: new Date(message.timestamp),
        created_at: new Date(message.created_at)
      }));
    } else if (input.to_address !== null) {
      // Private messages: fetch messages between user_address and to_address
      const results = await db.select()
        .from(messagesTable)
        .where(
          and(
            or(
              // Messages from user_address to to_address
              and(
                eq(messagesTable.from_address, input.user_address),
                eq(messagesTable.to_address, input.to_address)
              ),
              // Messages from to_address to user_address
              and(
                eq(messagesTable.from_address, input.to_address),
                eq(messagesTable.to_address, input.user_address)
              )
            ),
            eq(messagesTable.message_type, 'private')
          )
        )
        .orderBy(desc(messagesTable.timestamp))
        .limit(input.limit)
        .execute();

      return results.map(message => ({
        ...message,
        message_type: message.message_type as 'private' | 'group',
        timestamp: new Date(message.timestamp),
        created_at: new Date(message.created_at)
      }));
    } else {
      // Return empty array if neither group_id nor to_address is provided
      return [];
    }
  } catch (error) {
    console.error('Get messages failed:', error);
    throw error;
  }
}