import { CommandDispatcher } from '../command-dispatcher.service';
import { CacheService } from '../../cache/cache.service';
import { RespSerializer } from '../../../infrastructure/tcp/resp.serializer';
import { CommandError } from '../../../helpers/errors';
import { bufferToInt } from '../../../helpers/buffer.helper';
import { RespType } from '../../../domain/resp/models/resp-types.model';

export const registerStringHandlers = (dispatcher: CommandDispatcher, cacheService: CacheService) => {
  dispatcher.register('SET', (cmd) => {
    if (cmd.args.length < 2) throw new CommandError("ERR wrong number of arguments for 'set' command");
    
    const key = cmd.args[0].toString('utf-8');
    const value = cmd.args[1];
    
    let ex: number | undefined;
    let px: number | undefined;
    let nx = false;
    let xx = false;
    let keepttl = false;
    let get = false;

    for (let i = 2; i < cmd.args.length; i++) {
      const opt = cmd.args[i].toString('utf-8').toUpperCase();
      if (opt === 'EX') {
        if (i + 1 >= cmd.args.length) throw new CommandError("ERR syntax error");
        ex = parseInt(cmd.args[++i].toString('utf-8'), 10);
        if (isNaN(ex)) throw new CommandError("ERR value is not an integer or out of range");
      } else if (opt === 'PX') {
        if (i + 1 >= cmd.args.length) throw new CommandError("ERR syntax error");
        px = parseInt(cmd.args[++i].toString('utf-8'), 10);
        if (isNaN(px)) throw new CommandError("ERR value is not an integer or out of range");
      } else if (opt === 'NX') {
        nx = true;
      } else if (opt === 'XX') {
        xx = true;
      } else if (opt === 'KEEPTTL') {
        keepttl = true;
      } else if (opt === 'GET') {
        get = true;
      } else {
        throw new CommandError("ERR syntax error");
      }
    }

    if (nx && xx) throw new CommandError("ERR syntax error");

    const result = cacheService.set(key, value, { ex, px, nx, xx, keepttl, get });
    
    if (get) {
      if (result === 'OK') return RespSerializer.nullBulkString();
      return RespSerializer.bulkString(result as Buffer | null);
    }
    
    if (result === null) {
      return RespSerializer.nullBulkString();
    }
    return RespSerializer.ok();
  });

  dispatcher.register('GET', (cmd) => {
    if (cmd.args.length !== 1) throw new CommandError("ERR wrong number of arguments for 'get' command");
    const val = cacheService.get(cmd.args[0].toString('utf-8'));
    return RespSerializer.bulkString(val);
  });

  dispatcher.register('DEL', (cmd) => {
    if (cmd.args.length < 1) throw new CommandError("ERR wrong number of arguments for 'del' command");
    const keys = cmd.args.map(b => b.toString('utf-8'));
    const count = cacheService.del(keys);
    return RespSerializer.integer(count);
  });

  dispatcher.register('EXISTS', (cmd) => {
    if (cmd.args.length < 1) throw new CommandError("ERR wrong number of arguments for 'exists' command");
    const keys = cmd.args.map(b => b.toString('utf-8'));
    const count = cacheService.exists(keys);
    return RespSerializer.integer(count);
  });

  dispatcher.register('MGET', (cmd) => {
    if (cmd.args.length < 1) throw new CommandError("ERR wrong number of arguments for 'mget' command");
    const results = cmd.args.map(b => {
      const val = cacheService.get(b.toString('utf-8'));
      return { type: RespType.BULK_STRING, value: val }; 
    });
    return RespSerializer.array(results);
  });

  dispatcher.register('MSET', (cmd) => {
    if (cmd.args.length < 2 || cmd.args.length % 2 !== 0) throw new CommandError("ERR wrong number of arguments for 'mset' command");
    for (let i = 0; i < cmd.args.length; i += 2) {
      cacheService.set(cmd.args[i].toString('utf-8'), cmd.args[i+1]);
    }
    return RespSerializer.ok();
  });

  dispatcher.register('GETDEL', (cmd) => {
    if (cmd.args.length !== 1) throw new CommandError("ERR wrong number of arguments for 'getdel' command");
    const key = cmd.args[0].toString('utf-8');
    const val = cacheService.get(key);
    cacheService.del([key]);
    return RespSerializer.bulkString(val);
  });

  dispatcher.register('GETEX', (cmd) => {
    if (cmd.args.length < 1) throw new CommandError("ERR wrong number of arguments for 'getex' command");
    const key = cmd.args[0].toString('utf-8');
    
    let ex: number | undefined;
    let px: number | undefined;
    let persist = false;

    for (let i = 1; i < cmd.args.length; i++) {
      const opt = cmd.args[i].toString('utf-8').toUpperCase();
      if (opt === 'EX') {
        if (i + 1 >= cmd.args.length) throw new CommandError("ERR syntax error");
        ex = parseInt(cmd.args[++i].toString('utf-8'), 10);
        if (isNaN(ex)) throw new CommandError("ERR value is not an integer or out of range");
      } else if (opt === 'PX') {
        if (i + 1 >= cmd.args.length) throw new CommandError("ERR syntax error");
        px = parseInt(cmd.args[++i].toString('utf-8'), 10);
        if (isNaN(px)) throw new CommandError("ERR value is not an integer or out of range");
      } else if (opt === 'PERSIST') {
        persist = true;
      } else {
        throw new CommandError("ERR syntax error");
      }
    }

    const val = cacheService.get(key);
    if (val) {
      if (persist) {
        cacheService.persist(key);
      } else if (ex !== undefined) {
        cacheService.expire(key, ex);
      } else if (px !== undefined) {
        cacheService.pexpire(key, px);
      }
    }
    return RespSerializer.bulkString(val);
  });

  dispatcher.register('INCR', (cmd) => {
    if (cmd.args.length !== 1) throw new CommandError("ERR wrong number of arguments for 'incr' command");
    const val = cacheService.incrBy(cmd.args[0].toString('utf-8'), 1);
    return RespSerializer.integer(parseInt(val.toString('utf-8'), 10));
  });

  dispatcher.register('DECR', (cmd) => {
    if (cmd.args.length !== 1) throw new CommandError("ERR wrong number of arguments for 'decr' command");
    const val = cacheService.incrBy(cmd.args[0].toString('utf-8'), -1);
    return RespSerializer.integer(parseInt(val.toString('utf-8'), 10));
  });

  dispatcher.register('INCRBY', (cmd) => {
    if (cmd.args.length !== 2) throw new CommandError("ERR wrong number of arguments for 'incrby' command");
    const inc = bufferToInt(cmd.args[1]);
    if (inc === null) throw new CommandError("ERR value is not an integer or out of range");
    const val = cacheService.incrBy(cmd.args[0].toString('utf-8'), inc);
    return RespSerializer.integer(parseInt(val.toString('utf-8'), 10));
  });

  dispatcher.register('DECRBY', (cmd) => {
    if (cmd.args.length !== 2) throw new CommandError("ERR wrong number of arguments for 'decrby' command");
    const dec = bufferToInt(cmd.args[1]);
    if (dec === null) throw new CommandError("ERR value is not an integer or out of range");
    const val = cacheService.incrBy(cmd.args[0].toString('utf-8'), -dec);
    return RespSerializer.integer(parseInt(val.toString('utf-8'), 10));
  });
};
