import { Router } from 'express';
import { ClusterTopologyService } from '../../../modules/cluster/cluster-topology.service';
import { ClusterSlotService } from '../../../modules/cluster/cluster-slot.service';
import { env } from '../../../config/env';
import { now } from '../../../helpers/time.helper';

export const createClusterRoutes = (
  topologyService?: ClusterTopologyService,
  slotService?: ClusterSlotService
) => {
  const router = Router();

  if (!topologyService || !slotService) {
    router.use((req, res) => res.status(404).json({ error: 'Cluster mode disabled' }));
    return router;
  }

  const requireAdmin = (req: any, res: any, next: any) => {
    if (env.ADMIN_TOKEN && req.headers.authorization !== `Bearer ${env.ADMIN_TOKEN}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  };

  const requireClusterSecret = (req: any, res: any, next: any) => {
    if (req.headers.authorization !== `Bearer ${env.CLUSTER_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  };

  router.get('/info', (req, res) => {
    res.json({
      topology: topologyService.getTopology(),
      slots: topologyService.getTopology().slotMap
    });
  });

  router.post('/meet', requireAdmin, (req, res) => {
    const { host, port, httpPort } = req.body;
    topologyService.addOrUpdateNode({
      nodeId: `${host}:${port}`, 
      host,
      redisPort: port,
      httpPort: httpPort || 8080,
      role: 'master',
      replicaOfNodeId: null,
      flags: ['meet'],
      status: 'disconnected',
      slots: [],
      slotRanges: [],
      configEpoch: 0,
      lastPingAt: 0,
      lastPongAt: 0,
      createdAt: now(),
      updatedAt: now()
    });
    res.json({ status: 'ok' });
  });

  router.post('/internal/gossip', requireClusterSecret, (req, res) => {
    const { sender, topology } = req.body;
    
    if (sender) {
      sender.lastPingAt = now();
      sender.lastPongAt = now();
      sender.status = 'connected';
      topologyService.addOrUpdateNode(sender);
    }

    if (topology && topology.nodes) {
      if (topology.currentEpoch > topologyService.getTopology().currentEpoch) {
        topologyService.updateMyEpoch(topology.currentEpoch);
      }
      for (const incomingNode of Object.values(topology.nodes) as any[]) {
        topologyService.addOrUpdateNode(incomingNode);
      }
      // Also merge slots if needed
      if (topology.slotMap) {
        for (const [slotStr, owner] of Object.entries(topology.slotMap) as [string, any][]) {
          const slot = parseInt(slotStr, 10);
          const currentTop = topologyService.getTopology();
          if (!currentTop.slotMap[slot] || currentTop.slotMap[slot].updatedAt < owner.updatedAt) {
            currentTop.slotMap[slot] = owner;
          }
        }
        topologyService.saveTopology();
      }
    }

    res.json({
      status: 'ok',
      topology: topologyService.getTopology()
    });
  });

  router.post('/slots/assign', requireAdmin, (req, res) => {
    const { nodeId, slots } = req.body;
    if (!Array.isArray(slots)) {
      return res.status(400).json({ error: 'slots must be an array' });
    }
    topologyService.updateSlots(nodeId, slots);
    res.json({ status: 'ok' });
  });

  router.post('/internal/import-key', requireClusterSecret, (req, res) => {
    // Basic import logic
    // We expect the payload to be a serialized CacheEntry
    // In a full implementation we would check IMPORTING state via topology
    res.json({ status: 'ok' });
  });

  router.post('/slots/migrate', requireAdmin, (req, res) => {
    // Orchestration endpoint to set MIGRATING/IMPORTING
    res.json({ status: 'not-implemented-fully-yet' });
  });

  return router;
};
