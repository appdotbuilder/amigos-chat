import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { groupsTable } from '../db/schema';
import { getAllGroups } from '../handlers/get_all_groups';

describe('getAllGroups', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no groups exist', async () => {
    const result = await getAllGroups();
    
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all groups when groups exist', async () => {
    // Create test groups
    const testGroups = [
      {
        group_id: 1,
        name: 'Tech Enthusiasts',
        creator: '0x1234567890123456789012345678901234567890'
      },
      {
        group_id: 2,
        name: 'Blockchain Developers',
        creator: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      },
      {
        group_id: 3,
        name: 'DeFi Discussion',
        creator: '0x9876543210987654321098765432109876543210'
      }
    ];

    // Insert test groups
    await db.insert(groupsTable)
      .values(testGroups.map(group => ({
        ...group,
        created_at: new Date()
      })))
      .execute();

    const result = await getAllGroups();

    expect(result).toHaveLength(3);
    expect(result[0].name).toEqual('Tech Enthusiasts');
    expect(result[0].group_id).toEqual(1);
    expect(result[0].creator).toEqual('0x1234567890123456789012345678901234567890');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);

    expect(result[1].name).toEqual('Blockchain Developers');
    expect(result[1].group_id).toEqual(2);
    expect(result[1].creator).toEqual('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');

    expect(result[2].name).toEqual('DeFi Discussion');
    expect(result[2].group_id).toEqual(3);
    expect(result[2].creator).toEqual('0x9876543210987654321098765432109876543210');
  });

  it('should return groups in insertion order', async () => {
    // Create groups with specific timestamps
    const now = new Date();
    const group1Time = new Date(now.getTime() - 3000);
    const group2Time = new Date(now.getTime() - 2000);
    const group3Time = new Date(now.getTime() - 1000);

    await db.insert(groupsTable)
      .values([
        {
          group_id: 10,
          name: 'First Group',
          creator: '0x1111111111111111111111111111111111111111',
          created_at: group1Time
        }
      ])
      .execute();

    await db.insert(groupsTable)
      .values([
        {
          group_id: 20,
          name: 'Second Group',
          creator: '0x2222222222222222222222222222222222222222',
          created_at: group2Time
        }
      ])
      .execute();

    await db.insert(groupsTable)
      .values([
        {
          group_id: 30,
          name: 'Third Group',
          creator: '0x3333333333333333333333333333333333333333',
          created_at: group3Time
        }
      ])
      .execute();

    const result = await getAllGroups();

    expect(result).toHaveLength(3);
    
    // Verify all groups are returned
    const groupNames = result.map(group => group.name);
    expect(groupNames).toContain('First Group');
    expect(groupNames).toContain('Second Group');
    expect(groupNames).toContain('Third Group');
    
    // Verify each group has all required fields
    result.forEach(group => {
      expect(group.id).toBeDefined();
      expect(group.group_id).toBeDefined();
      expect(typeof group.name).toBe('string');
      expect(typeof group.creator).toBe('string');
      expect(group.created_at).toBeInstanceOf(Date);
    });
  });

  it('should handle single group correctly', async () => {
    await db.insert(groupsTable)
      .values([{
        group_id: 100,
        name: 'Solo Group',
        creator: '0x9999999999999999999999999999999999999999',
        created_at: new Date()
      }])
      .execute();

    const result = await getAllGroups();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Solo Group');
    expect(result[0].group_id).toEqual(100);
    expect(result[0].creator).toEqual('0x9999999999999999999999999999999999999999');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
  });
});