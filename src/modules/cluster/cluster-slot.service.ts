export class ClusterSlotService {
  private slotKeys: Map<number, Set<string>> = new Map();

  public addKey(slot: number, key: string): void {
    let keys = this.slotKeys.get(slot);
    if (!keys) {
      keys = new Set();
      this.slotKeys.set(slot, keys);
    }
    keys.add(key);
  }

  public removeKey(slot: number, key: string): void {
    const keys = this.slotKeys.get(slot);
    if (keys) {
      keys.delete(key);
      if (keys.size === 0) {
        this.slotKeys.delete(slot);
      }
    }
  }

  public countKeysInSlot(slot: number): number {
    return this.slotKeys.get(slot)?.size || 0;
  }

  public getKeysInSlot(slot: number, count: number): string[] {
    const keys = this.slotKeys.get(slot);
    if (!keys) return [];
    
    const result: string[] = [];
    let i = 0;
    for (const key of keys) {
      if (i >= count) break;
      result.push(key);
      i++;
    }
    return result;
  }

  public clear(): void {
    this.slotKeys.clear();
  }
}
