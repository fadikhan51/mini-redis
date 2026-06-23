export const bufferToInt = (buf: Buffer): number | null => {
  const str = buf.toString('utf-8');
  // allow negative numbers
  if (!/^-?\d+$/.test(str)) {
    return null;
  }
  const num = parseInt(str, 10);
  if (isNaN(num)) {
    return null;
  }
  return num;
};

export const bufferEqualsIgnoreCase = (buf: Buffer, str: string): boolean => {
  return buf.toString('utf-8').toUpperCase() === str.toUpperCase();
};
