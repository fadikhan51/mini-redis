import { CommandDispatcher } from '../command-dispatcher.service';
import { RespSerializer } from '../../../infrastructure/tcp/resp.serializer';
import { CommandError } from '../../../helpers/errors';
import { ClusterTopologyService } from '../../cluster/cluster-topology.service';
import { ClusterSlotService } from '../../cluster/cluster-slot.service';
import { getHashSlot } from '../../../helpers/hash-slot.helper';
import { parseSlotRanges } from '../../../helpers/slot-range.helper';
import { RespType } from '../../../domain/resp/models/resp-types.model';

export const registerClusterHandlers = (
  dispatcher: CommandDispatcher,
  topologyService: ClusterTopologyService,
  slotService: ClusterSlotService
) => {

  dispatcher.register('ASKING', (cmd) => {
    cmd.session.isAsking = true;
    return RespSerializer.ok();
  });

  dispatcher.register('READONLY', (cmd) => {
    cmd.session.isReadOnly = true;
    return RespSerializer.ok();
  });

  dispatcher.register('READWRITE', (cmd) => {
    cmd.session.isReadOnly = false;
    return RespSerializer.ok();
  });

  dispatcher.register('CLUSTER', (cmd) => {
    if (cmd.args.length < 1) {
      throw new CommandError("ERR wrong number of arguments for 'cluster' command");
    }

    const subcmd = cmd.args[0].toString('utf-8').toUpperCase();

    switch (subcmd) {
      case 'INFO': {
        const top = topologyService.getTopology();
        const info = [
          `cluster_state:ok`,
          `cluster_slots_assigned:16384`,
          `cluster_slots_ok:16384`,
          `cluster_slots_pfail:0`,
          `cluster_slots_fail:0`,
          `cluster_known_nodes:${Object.keys(top.nodes).length}`,
          `cluster_size:${Object.values(top.nodes).filter(n => n.role === 'master').length}`,
          `cluster_current_epoch:${top.currentEpoch}`,
          `cluster_my_epoch:${top.nodes[top.myNodeId]?.configEpoch || 0}`,
          `cluster_stats_messages_sent:0`,
          `cluster_stats_messages_received:0`
        ].join('\r\n') + '\r\n';
        return RespSerializer.bulkString(info);
      }

      case 'NODES': {
        const nodes = topologyService.getNodes();
        const lines = nodes.map(n => {
          const flags = [...n.flags];
          if (n.role === 'master' && !flags.includes('master')) flags.push('master');
          if (n.role === 'replica' && !flags.includes('slave')) flags.push('slave');

          const ranges = parseSlotRanges(n.slots);
          const slotStr = ranges.map(r => r.start === r.end ? `${r.start}` : `${r.start}-${r.end}`).join(' ');

          return `${n.nodeId} ${n.host}:${n.redisPort}@${n.busPort || n.redisPort + 10000} ${flags.join(',')} ${n.replicaOfNodeId || '-'} ${n.lastPingAt} ${n.lastPongAt} ${n.configEpoch} connected ${slotStr}`.trim();
        });
        return RespSerializer.bulkString(lines.join('\n') + '\n');
      }

      case 'SLOTS': {
        const top = topologyService.getTopology();
        const masterMap = new Map<string, number[]>();
        for (const [slot, owner] of Object.entries(top.slotMap)) {
          if (!masterMap.has(owner.nodeId)) masterMap.set(owner.nodeId, []);
          masterMap.get(owner.nodeId)!.push(parseInt(slot, 10));
        }

        const respElements: any[] = [];
        
        for (const [nodeId, slots] of masterMap.entries()) {
          const ranges = parseSlotRanges(slots);
          const node = top.nodes[nodeId];
          if (!node) continue;

          for (const range of ranges) {
            const rangeArr: any[] = [
              { type: RespType.INTEGER, value: range.start },
              { type: RespType.INTEGER, value: range.end },
              { type: RespType.ARRAY, value: [
                { type: RespType.BULK_STRING, value: Buffer.from(node.host) },
                { type: RespType.INTEGER, value: node.redisPort },
                { type: RespType.BULK_STRING, value: Buffer.from(node.nodeId) }
              ]}
            ];
            
            const replicas = Object.values(top.nodes).filter(n => n.replicaOfNodeId === nodeId);
            for (const r of replicas) {
              rangeArr.push({ type: RespType.ARRAY, value: [
                { type: RespType.BULK_STRING, value: Buffer.from(r.host) },
                { type: RespType.INTEGER, value: r.redisPort },
                { type: RespType.BULK_STRING, value: Buffer.from(r.nodeId) }
              ]});
            }

            respElements.push({ type: RespType.ARRAY, value: rangeArr });
          }
        }
        return RespSerializer.array(respElements);
      }

      case 'KEYSLOT': {
        if (cmd.args.length !== 2) throw new CommandError("ERR wrong number of arguments for 'cluster keyslot'");
        return RespSerializer.integer(getHashSlot(cmd.args[1].toString('utf-8')));
      }

      case 'COUNTKEYSINSLOT': {
        if (cmd.args.length !== 2) throw new CommandError("ERR wrong number of arguments for 'cluster countkeysinslot'");
        const slot = parseInt(cmd.args[1].toString('utf-8'), 10);
        return RespSerializer.integer(slotService.countKeysInSlot(slot));
      }

      case 'GETKEYSINSLOT': {
        if (cmd.args.length !== 3) throw new CommandError("ERR wrong number of arguments for 'cluster getkeysinslot'");
        const slot = parseInt(cmd.args[1].toString('utf-8'), 10);
        const count = parseInt(cmd.args[2].toString('utf-8'), 10);
        const keys = slotService.getKeysInSlot(slot, count);
        return RespSerializer.array(keys.map(k => ({ type: RespType.BULK_STRING, value: Buffer.from(k) })));
      }

      default:
        throw new CommandError(`ERR unknown subcommand '${subcmd}' for 'cluster'`);
    }
  });
};
