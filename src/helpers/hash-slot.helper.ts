import { crc16 } from './crc16.helper';

export function getHashSlot(key: string | Buffer): number {
  let keyStr = Buffer.isBuffer(key) ? key.toString('utf-8') : key;
  
  const s = keyStr.indexOf('{');
  if (s >= 0) {
    const e = keyStr.indexOf('}', s + 1);
    if (e > 0 && e !== s + 1) {
      keyStr = keyStr.substring(s + 1, e);
    }
  }

  return crc16(keyStr) % 16384;
}
