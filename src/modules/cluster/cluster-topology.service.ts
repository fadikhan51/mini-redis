import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { ClusterTopology } from '../../domain/cluster/models/cluster-topology.model';
import { ClusterNode } from '../../domain/cluster/models/cluster-node.model';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { now } from '../../helpers/time.helper';

export class ClusterTopologyService {
  private topology: ClusterTopology;

  constructor() {
    this.topology = this.loadOrInitializeTopology();
  }

  public getTopology(): ClusterTopology {
    return this.topology;
  }

  public getMyNodeId(): string {
    return this.topology.myNodeId;
  }

  public getNodes(): ClusterNode[] {
    return Object.values(this.topology.nodes);
  }

  public getNode(nodeId: string): ClusterNode | undefined {
    return this.topology.nodes[nodeId];
  }

  public addOrUpdateNode(node: ClusterNode): void {
    const existing = this.topology.nodes[node.nodeId];
    if (!existing || existing.configEpoch < node.configEpoch || (existing.configEpoch === node.configEpoch && node.updatedAt > existing.updatedAt)) {
      this.topology.nodes[node.nodeId] = node;
      this.topology.version++;
      this.saveTopology();
    }
  }

  public removeNode(nodeId: string): void {
    if (this.topology.nodes[nodeId]) {
      delete this.topology.nodes[nodeId];
      this.topology.version++;
      this.saveTopology();
    }
  }

  public updateMyEpoch(epoch: number): void {
    this.topology.currentEpoch = Math.max(this.topology.currentEpoch, epoch);
    const me = this.topology.nodes[this.topology.myNodeId];
    if (me) {
      me.configEpoch = this.topology.currentEpoch;
      me.updatedAt = now();
    }
    this.topology.version++;
    this.saveTopology();
  }

  public updateSlots(nodeId: string, slots: number[]): void {
    const node = this.topology.nodes[nodeId];
    if (node) {
      node.slots = slots;
      for (const slot of slots) {
        this.topology.slotMap[slot] = {
          slot,
          nodeId,
          state: 'stable',
          updatedAt: now()
        };
      }
      this.topology.version++;
      this.saveTopology();
    }
  }

  private loadOrInitializeTopology(): ClusterTopology {
    const configPath = env.CLUSTER_CONFIG_FILE;
    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(raw) as ClusterTopology;
      } catch (err) {
        logger.error({ err, path: configPath }, 'Failed to read cluster topology file, generating new one.');
      }
    }

    const myNodeId = env.CLUSTER_NODE_ID || randomUUID().replace(/-/g, '');
    const topology: ClusterTopology = {
      currentEpoch: 0,
      myNodeId,
      nodes: {},
      shards: {},
      slotMap: {},
      version: 1
    };

    const me: ClusterNode = {
      nodeId: myNodeId,
      shardId: env.CLUSTER_SHARD_ID,
      host: env.CLUSTER_ANNOUNCE_HOST,
      redisPort: env.CLUSTER_ANNOUNCE_REDIS_PORT,
      httpPort: env.CLUSTER_ANNOUNCE_HTTP_PORT,
      busPort: env.CLUSTER_INTERNAL_PORT,
      role: env.CLUSTER_ROLE,
      replicaOfNodeId: env.CLUSTER_REPLICA_OF || null,
      flags: ['myself'],
      status: 'connected',
      slots: [],
      slotRanges: [],
      configEpoch: 0,
      lastPingAt: 0,
      lastPongAt: 0,
      createdAt: now(),
      updatedAt: now()
    };

    topology.nodes[myNodeId] = me;

    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(configPath, JSON.stringify(topology, null, 2), 'utf-8');
    return topology;
  }

  public saveTopology(): void {
    const configPath = env.CLUSTER_CONFIG_FILE;
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(this.topology, null, 2), 'utf-8');
  }
}
