import { describe, it, expect } from 'vitest';
import { crc16 } from '../../src/helpers/crc16.helper';
import { getHashSlot } from '../../src/helpers/hash-slot.helper';

describe('CRC16 & Hash Slot Helpers', () => {
  it('should calculate CRC16 correctly', () => {
    // Standard Redis cluster test values
    expect(crc16('123456789')).toBe(0x31C3);
    expect(crc16('foo')).toBe(0xAF96); // 44950 -> 44950 % 16384 = 12182
  });

  it('should calculate correct hash slot without hash tags', () => {
    expect(getHashSlot('foo')).toBe(12182);
    expect(getHashSlot('bar')).toBe(5061);
  });

  it('should correctly parse hash tags', () => {
    expect(getHashSlot('user:{123}:profile')).toBe(getHashSlot('123'));
    expect(getHashSlot('{}foo')).toBe(getHashSlot('{}foo')); // Empty tag {} is ignored by Redis
    expect(getHashSlot('foo{bar}baz')).toBe(getHashSlot('bar'));
    expect(getHashSlot('foo{bar}baz{qux}')).toBe(getHashSlot('bar')); // Only first tag is used
  });
});
