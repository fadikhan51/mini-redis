export interface ClusterNode {
  nodeId: string;
  shardId?: string;
  host: string;
  redisPort: number;
  httpPort: number;
  busPort?: number;
  role: 'master' | 'replica';
  replicaOfNodeId: string | null;
  flags: string[];
  status: 'connected' | 'disconnected' | 'pfail' | 'fail';
  slots: number[];
  slotRanges: Array<{ start: number; end: number }>;
  configEpoch: number;
  lastPingAt: number;
  lastPongAt: number;
  createdAt: number;
  updatedAt: number;
}
