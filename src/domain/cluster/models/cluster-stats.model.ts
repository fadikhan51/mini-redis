export interface ClusterStats {
  clusterState: 'ok' | 'fail';
  knownNodes: number;
  assignedSlots: number;
  okSlots: number;
  failedSlots: number;
  migratingSlots: number;
  importingSlots: number;
  localOwnedSlots: number;
  localKeyCount: number;
  localUsedMemoryBytes: number;
  movedRedirections: number;
  askRedirections: number;
  crossSlotErrors: number;
}
