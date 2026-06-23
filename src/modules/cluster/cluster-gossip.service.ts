import { ClusterTopologyService } from './cluster-topology.service';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { now } from '../../helpers/time.helper';

export class ClusterGossipService {
  private timer?: NodeJS.Timeout;

  constructor(private readonly topologyService: ClusterTopologyService) {}

  public start() {
    if (!env.CLUSTER_ENABLED) return;
    this.timer = setInterval(() => this.gossip(), env.CLUSTER_GOSSIP_INTERVAL_MS);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async gossip() {
    const nodes = this.topologyService.getNodes().filter(n => n.nodeId !== this.topologyService.getMyNodeId());
    if (nodes.length === 0) return;

    const target = nodes[Math.floor(Math.random() * nodes.length)];
    target.lastPingAt = now();
    
    try {
      const myNodeId = this.topologyService.getMyNodeId();
      const me = this.topologyService.getNode(myNodeId);
      if (!me) return;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), env.CLUSTER_NODE_TIMEOUT_MS);

      const url = `http://${target.host}:${target.httpPort}/internal/cluster/gossip`;
      
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.CLUSTER_SECRET}`
        },
        body: JSON.stringify({
          sender: me,
          topology: this.topologyService.getTopology()
        }),
        signal: controller.signal as any
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        target.lastPongAt = now();
        target.status = 'connected';
        
        const responseData = await res.json();
        if (responseData && responseData.topology) {
          this.mergeTopology(responseData.topology);
        }
      } else {
        throw new Error(`Gossip failed with status ${res.status}`);
      }
    } catch (err) {
      logger.debug({ err, target: target.nodeId }, 'Gossip failed');
      const timeSinceLastPong = now() - target.lastPongAt;
      if (timeSinceLastPong > env.CLUSTER_NODE_TIMEOUT_MS * 2) {
        target.status = 'pfail';
      }
      if (timeSinceLastPong > env.CLUSTER_NODE_TIMEOUT_MS * 4) {
        target.status = 'fail';
      }
    }
  }

  public mergeTopology(incoming: any) {
    if (!incoming || !incoming.nodes) return;
    
    const top = this.topologyService.getTopology();
    if (incoming.currentEpoch > top.currentEpoch) {
      this.topologyService.updateMyEpoch(incoming.currentEpoch);
    }

    for (const [nodeId, incomingNode] of Object.entries(incoming.nodes) as [string, any][]) {
      this.topologyService.addOrUpdateNode(incomingNode);
    }
  }
}
