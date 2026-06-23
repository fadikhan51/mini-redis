import { describe, it, expect, beforeEach } from 'vitest';
import { RespParser } from '../../src/infrastructure/tcp/resp.parser';

describe('RespParser', () => {
  let parser: RespParser;

  beforeEach(() => {
    parser = new RespParser();
  });

  it('should parse an inline command', () => {
    parser.append(Buffer.from('PING\r\n'));
    const parsed = parser.parse();
    expect(parsed.length).toBe(1);
    expect(parsed[0].map(b => b.toString('utf-8'))).toEqual(['PING']);
  });

  it('should parse an inline command with arguments', () => {
    parser.append(Buffer.from('SET key value\r\n'));
    const parsed = parser.parse();
    expect(parsed.length).toBe(1);
    expect(parsed[0].map(b => b.toString('utf-8'))).toEqual(['SET', 'key', 'value']);
  });

  it('should parse a RESP array command', () => {
    parser.append(Buffer.from('*3\r\n$3\r\nSET\r\n$3\r\nkey\r\n$5\r\nvalue\r\n'));
    const parsed = parser.parse();
    expect(parsed.length).toBe(1);
    expect(parsed[0].map(b => b.toString('utf-8'))).toEqual(['SET', 'key', 'value']);
  });

  it('should handle partial chunks', () => {
    parser.append(Buffer.from('*2\r\n$4\r\nECHO\r\n'));
    let parsed = parser.parse();
    expect(parsed.length).toBe(0); // Incomplete

    parser.append(Buffer.from('$5\r\nhello\r\n'));
    parsed = parser.parse();
    expect(parsed.length).toBe(1);
    expect(parsed[0].map(b => b.toString('utf-8'))).toEqual(['ECHO', 'hello']);
  });

  it('should handle pipelined commands', () => {
    parser.append(Buffer.from('PING\r\nPING\r\n*2\r\n$4\r\nECHO\r\n$2\r\nhi\r\n'));
    const parsed = parser.parse();
    expect(parsed.length).toBe(3);
    expect(parsed[0].map(b => b.toString('utf-8'))).toEqual(['PING']);
    expect(parsed[1].map(b => b.toString('utf-8'))).toEqual(['PING']);
    expect(parsed[2].map(b => b.toString('utf-8'))).toEqual(['ECHO', 'hi']);
  });
});
