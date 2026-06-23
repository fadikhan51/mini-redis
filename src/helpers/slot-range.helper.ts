export function parseSlotRanges(slots: number[]): Array<{ start: number; end: number }> {
  if (slots.length === 0) return [];
  const sorted = [...slots].sort((a, b) => a - b);
  const ranges: Array<{ start: number; end: number }> = [];
  
  let start = sorted[0];
  let prev = start;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== prev + 1) {
      ranges.push({ start, end: prev });
      start = sorted[i];
    }
    prev = sorted[i];
  }
  ranges.push({ start, end: prev });
  return ranges;
}
