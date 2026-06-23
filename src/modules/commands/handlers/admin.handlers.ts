import { CommandDispatcher } from '../command-dispatcher.service';
import { CacheService } from '../../cache/cache.service';
import { RespSerializer } from '../../../infrastructure/tcp/resp.serializer';
import { CommandError } from '../../../helpers/errors';
import { RespType } from '../../../domain/resp/models/resp-types.model';

export const registerAdminHandlers = (dispatcher: CommandDispatcher, cacheService: CacheService) => {
  dispatcher.register('DBSIZE', (cmd) => {
    if (cmd.args.length !== 0) throw new CommandError("ERR wrong number of arguments for 'dbsize' command");
    const size = cacheService.dbSize();
    return RespSerializer.integer(size);
  });

  dispatcher.register('INFO', (cmd) => {
    const infoStr = `# Server\r\nredis_version:6.0.0\r\n# Clients\r\nconnected_clients:1\r\n`;
    return RespSerializer.bulkString(infoStr);
  });

  dispatcher.register('FLUSHDB', (cmd) => {
    if (cmd.args.length !== 0) throw new CommandError("ERR wrong number of arguments for 'flushdb' command");
    cacheService.flushDb();
    return RespSerializer.ok();
  });

  dispatcher.register('KEYS', (cmd) => {
    if (cmd.args.length !== 1) throw new CommandError("ERR wrong number of arguments for 'keys' command");
    const pattern = cmd.args[0].toString('utf-8');
    const keys = cacheService.keys(pattern);
    const results = keys.map(k => ({ type: RespType.BULK_STRING, value: Buffer.from(k) }));
    return RespSerializer.array(results);
  });

  dispatcher.register('SCAN', (cmd) => {
    if (cmd.args.length < 1) throw new CommandError("ERR wrong number of arguments for 'scan' command");
    const cursor = parseInt(cmd.args[0].toString('utf-8'), 10);
    if (isNaN(cursor)) throw new CommandError("ERR invalid cursor");

    let match: string | undefined;
    let count = 10;

    for (let i = 1; i < cmd.args.length; i += 2) {
      const opt = cmd.args[i].toString('utf-8').toUpperCase();
      if (opt === 'MATCH' && i + 1 < cmd.args.length) {
        match = cmd.args[i+1].toString('utf-8');
      } else if (opt === 'COUNT' && i + 1 < cmd.args.length) {
        count = parseInt(cmd.args[i+1].toString('utf-8'), 10);
        if (isNaN(count) || count <= 0) throw new CommandError("ERR syntax error");
      } else {
        throw new CommandError("ERR syntax error");
      }
    }

    const result = cacheService.scan(cursor, match, count);
    
    return RespSerializer.array([
      { type: RespType.BULK_STRING, value: Buffer.from(result.newCursor.toString()) },
      { type: RespType.ARRAY, value: result.keys.map(k => ({ type: RespType.BULK_STRING, value: Buffer.from(k) })) }
    ]);
  });
};
