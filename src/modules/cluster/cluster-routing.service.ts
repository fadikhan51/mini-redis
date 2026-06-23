import { ClusterTopologyService } from './cluster-topology.service';
import { getHashSlot } from '../../helpers/hash-slot.helper';
import { CommandError } from '../../helpers/errors';

export class ClusterRoutingService {
  constructor(private readonly topologyService: ClusterTopologyService) {}

  public evaluateRoute(keys: string[], isAsking: boolean = false): void {
    if (keys.length === 0) return;

    const slots = keys.map(k => getHashSlot(k));
    const firstSlot = slots[0];
    
    for (let i = 1; i < slots.length; i++) {
      if (slots[i] !== firstSlot) {
        throw new CommandError('CROSSSLOT Keys in request don\'t hash to the same slot');
      }
    }

    const slot = firstSlot;
    const top = this.topologyService.getTopology();
    const owner = top.slotMap[slot];

    if (!owner) {
      throw new CommandError(`CLUSTERDOWN Hash slot not served`);
    }

    const myNodeId = top.myNodeId;

    if (owner.nodeId === myNodeId) {
      if (owner.state === 'migrating') {
        if (isAsking) {
          return;
        }
        const targetNode = top.nodes[owner.migratingToNodeId!];
        if (targetNode) {
          throw new CommandError(`ASK ${slot} ${targetNode.host}:${targetNode.redisPort}`);
        } else {
          throw new CommandError(`CLUSTERDOWN Hash slot migrating but target unknown`);
        }
      }
      return;
    } else {
      if (owner.state === 'importing' && owner.importingFromNodeId && isAsking) {
        return;
      }

      const targetNode = top.nodes[owner.nodeId];
      if (targetNode) {
        throw new CommandError(`MOVED ${slot} ${targetNode.host}:${targetNode.redisPort}`);
      } else {
        throw new CommandError(`CLUSTERDOWN Hash slot not served`);
      }
    }
  }
}
