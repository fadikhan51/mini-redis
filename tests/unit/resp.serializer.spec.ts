import { describe, it, expect } from 'vitest';
import { RespSerializer } from '../../src/infrastructure/tcp/resp.serializer';
import { RespType } from '../../src/domain/resp/models/resp-types.model';

describe('RespSerializer', () => {
  it('should serialize SIMPLE_STRING', () => {
    const buf = RespSerializer.ok();
    expect(buf.toString('utf-8')).toBe('+OK\r\n');
  });

  it('should serialize ERROR', () => {
    const buf = RespSerializer.error('ERR message');
    expect(buf.toString('utf-8')).toBe('-ERR message\r\n');
  });

  it('should serialize INTEGER', () => {
    const buf = RespSerializer.integer(42);
    expect(buf.toString('utf-8')).toBe(':42\r\n');
  });

  it('should serialize BULK_STRING', () => {
    const buf = RespSerializer.bulkString('hello');
    expect(buf.toString('utf-8')).toBe('$5\r\nhello\r\n');
  });

  it('should serialize null BULK_STRING', () => {
    const buf = RespSerializer.nullBulkString();
    expect(buf.toString('utf-8')).toBe('$-1\r\n');
  });

  it('should serialize ARRAY', () => {
    const buf = RespSerializer.array([
      { type: RespType.SIMPLE_STRING, value: 'OK' },
      { type: RespType.INTEGER, value: 1 }
    ]);
    expect(buf.toString('utf-8')).toBe('*2\r\n+OK\r\n:1\r\n');
  });

  it('should serialize null ARRAY', () => {
    const buf = RespSerializer.nullArray();
    expect(buf.toString('utf-8')).toBe('*-1\r\n');
  });
});
