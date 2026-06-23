export interface SlotOwner {
  slot: number;
  nodeId: string;
  shardId?: string;
  state: 'stable' | 'migrating' | 'importing';
  migratingToNodeId?: string;
  importingFromNodeId?: string;
  updatedAt: number;
}
