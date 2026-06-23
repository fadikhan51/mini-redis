import { CommandResult } from '../../domain/command/models/command-result.model';
import { RespType } from '../../domain/resp/models/resp-types.model';

export class RespSerializer {
  public static encode(result: CommandResult): Buffer {
    switch (result.type) {
      case RespType.SIMPLE_STRING:
        return Buffer.from(`+${result.value}\r\n`);
      case RespType.ERROR:
        return Buffer.from(`-${result.value}\r\n`);
      case RespType.INTEGER:
        return Buffer.from(`:${result.value}\r\n`);
      case RespType.BULK_STRING: {
        if (result.value === null) {
          return Buffer.from('$-1\r\n');
        }
        const buf = Buffer.isBuffer(result.value) ? result.value : Buffer.from(String(result.value));
        return Buffer.concat([
          Buffer.from(`$${buf.length}\r\n`),
          buf as any,
          Buffer.from('\r\n')
        ]);
      }
      case RespType.ARRAY: {
        if (result.value === null) {
          return Buffer.from('*-1\r\n');
        }
        const arr = result.value as CommandResult[];
        const bufs: any[] = [Buffer.from(`*${arr.length}\r\n`)];
        for (const item of arr) {
          bufs.push(this.encode(item));
        }
        return Buffer.concat(bufs as any);
      }
      default:
        return Buffer.from('-ERR unknown RESP type\r\n');
    }
  }

  public static ok(): Buffer { return this.encode({ type: RespType.SIMPLE_STRING, value: 'OK' }); }
  public static pong(): Buffer { return this.encode({ type: RespType.SIMPLE_STRING, value: 'PONG' }); }
  public static nullBulkString(): Buffer { return this.encode({ type: RespType.BULK_STRING, value: null }); }
  public static nullArray(): Buffer { return this.encode({ type: RespType.ARRAY, value: null }); }
  public static integer(n: number): Buffer { return this.encode({ type: RespType.INTEGER, value: n }); }
  public static error(msg: string): Buffer { return this.encode({ type: RespType.ERROR, value: msg }); }
  public static bulkString(val: Buffer | string | null): Buffer { return this.encode({ type: RespType.BULK_STRING, value: val }); }
  public static array(results: CommandResult[]): Buffer { return this.encode({ type: RespType.ARRAY, value: results }); }
}
