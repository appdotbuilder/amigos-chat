import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { groupsTable } from '../db/schema';
import { type CreateGroupInput } from '../schema';
import { createGroup } from '../handlers/create_group';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateGroupInput = {
  group_id: 12345,
  name: 'Test Group',
  creator: '0x1234567890123456789012345678901234567890'
};

describe('createGroup', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a group', async () => {
    const result = await createGroup(testInput);

    // Basic field validation
    expect(result.group_id).toEqual(12345);
    expect(result.name).toEqual('Test Group');
    expect(result.creator).toEqual('0x1234567890123456789012345678901234567890');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save group to database', async () => {
    const result = await createGroup(testInput);

    // Query using proper drizzle syntax
    const groups = await db.select()
      .from(groupsTable)
      .where(eq(groupsTable.id, result.id))
      .execute();

    expect(groups).toHaveLength(1);
    expect(groups[0].group_id).toEqual(12345);
    expect(groups[0].name).toEqual('Test Group');
    expect(groups[0].creator).toEqual('0x1234567890123456789012345678901234567890');
    expect(groups[0].created_at).toBeInstanceOf(Date);
  });

  it('should create groups with different group_ids', async () => {
    const firstGroup = await createGroup(testInput);
    
    const secondInput: CreateGroupInput = {
      group_id: 67890,
      name: 'Another Test Group',
      creator: '0x0987654321098765432109876543210987654321'
    };
    
    const secondGroup = await createGroup(secondInput);

    // Verify both groups exist and are different
    expect(firstGroup.id).not.toEqual(secondGroup.id);
    expect(firstGroup.group_id).toEqual(12345);
    expect(secondGroup.group_id).toEqual(67890);
    expect(firstGroup.name).toEqual('Test Group');
    expect(secondGroup.name).toEqual('Another Test Group');
  });

  it('should query groups by group_id correctly', async () => {
    await createGroup(testInput);

    // Query by group_id
    const groups = await db.select()
      .from(groupsTable)
      .where(eq(groupsTable.group_id, 12345))
      .execute();

    expect(groups).toHaveLength(1);
    expect(groups[0].group_id).toEqual(12345);
    expect(groups[0].name).toEqual('Test Group');
    expect(groups[0].creator).toEqual('0x1234567890123456789012345678901234567890');
  });

  it('should reject duplicate group_id', async () => {
    // Create first group
    await createGroup(testInput);

    // Attempt to create second group with same group_id
    const duplicateInput: CreateGroupInput = {
      group_id: 12345, // Same group_id
      name: 'Duplicate Group',
      creator: '0x0987654321098765432109876543210987654321'
    };

    await expect(createGroup(duplicateInput)).rejects.toThrow(/duplicate key/i);
  });

  it('should handle groups with same name but different group_ids', async () => {
    const firstGroup = await createGroup(testInput);
    
    const sameNameInput: CreateGroupInput = {
      group_id: 67890, // Different group_id
      name: 'Test Group', // Same name
      creator: '0x0987654321098765432109876543210987654321'
    };
    
    const secondGroup = await createGroup(sameNameInput);

    // Both groups should be created successfully
    expect(firstGroup.id).not.toEqual(secondGroup.id);
    expect(firstGroup.group_id).toEqual(12345);
    expect(secondGroup.group_id).toEqual(67890);
    expect(firstGroup.name).toEqual(secondGroup.name); // Same name is allowed
  });
});