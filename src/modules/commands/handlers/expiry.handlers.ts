import { CommandDispatcher } from '../command-dispatcher.service';
import { CacheService } from '../../cache/cache.service';
import { RespSerializer } from '../../../infrastructure/tcp/resp.serializer';
import { CommandError } from '../../../helpers/errors';
import { bufferToInt } from '../../../helpers/buffer.helper';

export const registerExpiryHandlers = (dispatcher: CommandDispatcher, cacheService: CacheService) => {
  dispatcher.register('EXPIRE', (cmd) => {
    if (cmd.args.length < 2) throw new CommandError("ERR wrong number of arguments for 'expire' command");
    const key = cmd.args[0].toString('utf-8');
    const seconds = bufferToInt(cmd.args[1]);
    if (seconds === null) throw new CommandError("ERR value is not an integer or out of range");

    // simplified: ignoring NX/XX/GT/LT options for now to fit mini-redis scope
    const result = cacheService.expire(key, seconds);
    return RespSerializer.integer(result);
  });

  dispatcher.register('PEXPIRE', (cmd) => {
    if (cmd.args.length < 2) throw new CommandError("ERR wrong number of arguments for 'pexpire' command");
    const key = cmd.args[0].toString('utf-8');
    const ms = bufferToInt(cmd.args[1]);
    if (ms === null) throw new CommandError("ERR value is not an integer or out of range");

    const result = cacheService.pexpire(key, ms);
    return RespSerializer.integer(result);
  });

  dispatcher.register('TTL', (cmd) => {
    if (cmd.args.length !== 1) throw new CommandError("ERR wrong number of arguments for 'ttl' command");
    const result = cacheService.ttl(cmd.args[0].toString('utf-8'));
    return RespSerializer.integer(result);
  });

  dispatcher.register('PTTL', (cmd) => {
    if (cmd.args.length !== 1) throw new CommandError("ERR wrong number of arguments for 'pttl' command");
    const result = cacheService.pttl(cmd.args[0].toString('utf-8'));
    return RespSerializer.integer(result);
  });

  dispatcher.register('PERSIST', (cmd) => {
    if (cmd.args.length !== 1) throw new CommandError("ERR wrong number of arguments for 'persist' command");
    const result = cacheService.persist(cmd.args[0].toString('utf-8'));
    return RespSerializer.integer(result);
  });
};
