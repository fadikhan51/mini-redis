export interface ClusterShard {
  shardId: string;
  masterNodeId: string;
  replicaNodeIds: string[];
  slotRanges: Array<{ start: number; end: number }>;
  status: 'ok' | 'fail' | 'pfail';
}
