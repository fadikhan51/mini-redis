import { env } from '../../config/env';
import { PayloadTooLargeError } from '../../helpers/errors';

export class RespParser {
  private buffer: Buffer = Buffer.alloc(0);

  public append(chunk: Buffer) {
    if (this.buffer.length + chunk.length > env.MAX_COMMAND_BYTES) {
      this.buffer = Buffer.alloc(0);
      throw new PayloadTooLargeError('Payload too large');
    }
    this.buffer = Buffer.concat([this.buffer, chunk]);
  }

  public parse(): Buffer[][] {
    const commands: Buffer[][] = [];
    
    while (this.buffer.length > 0) {
      const parsed = this.parseCommand();
      if (!parsed) {
        break; // Incomplete, wait for more chunks
      }
      commands.push(parsed);
    }

    return commands;
  }

  private parseCommand(): Buffer[] | null {
    if (this.buffer.length === 0) return null;

    if (this.buffer[0] !== 42) { // 42 = '*'
      return this.parseInlineCommand();
    }

    return this.parseArray();
  }

  private parseInlineCommand(): Buffer[] | null {
    const crlfIndex = this.buffer.indexOf('\r\n');
    if (crlfIndex === -1) return null;
    
    const line = this.buffer.subarray(0, crlfIndex).toString('utf-8');
    this.buffer = this.buffer.subarray(crlfIndex + 2);
    
    // Ignore empty lines
    if (!line.trim()) {
      return this.parseCommand();
    }

    const parts = line.split(' ').filter(Boolean);
    return parts.map(p => Buffer.from(p));
  }

  private parseArray(): Buffer[] | null {
    let offset = 0;
    
    const firstCrlf = this.buffer.indexOf('\r\n', offset);
    if (firstCrlf === -1) return null;
    
    const numElementsStr = this.buffer.subarray(offset + 1, firstCrlf).toString('utf-8');
    const numElements = parseInt(numElementsStr, 10);
    if (isNaN(numElements)) {
      throw new Error('ERR Protocol error: invalid multibulk length');
    }
    
    offset = firstCrlf + 2;
    const elements: Buffer[] = [];

    for (let i = 0; i < numElements; i++) {
      if (offset >= this.buffer.length) return null;
      
      if (this.buffer[offset] !== 36) { // 36 = '$'
        throw new Error(`ERR Protocol error: expected '$', got '${String.fromCharCode(this.buffer[offset])}'`);
      }
      
      const lenCrlf = this.buffer.indexOf('\r\n', offset);
      if (lenCrlf === -1) return null;
      
      const strLenStr = this.buffer.subarray(offset + 1, lenCrlf).toString('utf-8');
      const strLen = parseInt(strLenStr, 10);
      if (isNaN(strLen)) {
        throw new Error('ERR Protocol error: invalid bulk length');
      }
      
      const dataStart = lenCrlf + 2;
      const dataEnd = dataStart + strLen;
      
      if (dataEnd + 2 > this.buffer.length) return null;
      
      const bulkData = this.buffer.subarray(dataStart, dataEnd);
      
      if (this.buffer[dataEnd] !== 13 || this.buffer[dataEnd + 1] !== 10) {
        throw new Error('ERR Protocol error: expected CRLF after bulk string');
      }
      
      elements.push(bulkData);
      offset = dataEnd + 2;
    }

    this.buffer = this.buffer.subarray(offset);
    return elements;
  }
}
