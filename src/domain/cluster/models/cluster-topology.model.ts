import { ClusterNode } from './cluster-node.model';
import { ClusterShard } from './cluster-shard.model';
import { SlotOwner } from './slot-owner.model';

export interface ClusterTopology {
  currentEpoch: number;
  myNodeId: string;
  nodes: Record<string, ClusterNode>;
  shards: Record<string, ClusterShard>;
  slotMap: Record<number, SlotOwner>;
  version: number;
}
