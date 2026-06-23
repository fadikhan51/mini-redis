import { CommandDispatcher } from '../command-dispatcher.service';
import { RespSerializer } from '../../../infrastructure/tcp/resp.serializer';
import { env } from '../../../config/env';
import { AuthError, CommandError } from '../../../helpers/errors';

export const registerConnectionHandlers = (dispatcher: CommandDispatcher) => {
  dispatcher.register('PING', (cmd) => {
    if (cmd.args.length > 1) throw new CommandError("ERR wrong number of arguments for 'ping' command");
    if (cmd.args.length === 1) {
      return RespSerializer.bulkString(cmd.args[0]);
    }
    return RespSerializer.pong();
  });

  dispatcher.register('ECHO', (cmd) => {
    if (cmd.args.length !== 1) throw new CommandError("ERR wrong number of arguments for 'echo' command");
    return RespSerializer.bulkString(cmd.args[0]);
  });

  dispatcher.register('QUIT', (cmd) => {
    if (cmd.args.length !== 0) throw new CommandError("ERR wrong number of arguments for 'quit' command");
    // Standard Redis responds +OK and then closes. 
    // We can write it directly to socket here and let the socket handler close it, 
    // or just return OK and let tcp server check for QUIT command name.
    return RespSerializer.ok();
  });

  dispatcher.register('AUTH', (cmd) => {
    if (cmd.args.length !== 1 && cmd.args.length !== 2) {
      throw new CommandError("ERR wrong number of arguments for 'auth' command");
    }
    const password = cmd.args[cmd.args.length - 1].toString('utf-8');
    
    if (!env.REDIS_PASSWORD) {
      throw new CommandError('ERR Client sent AUTH, but no password is set');
    }

    if (password !== env.REDIS_PASSWORD) {
      throw new AuthError('WRONGPASS invalid username-password pair or user is disabled.');
    }

    cmd.session.isAuthenticated = true;
    return RespSerializer.ok();
  });

  dispatcher.register('SELECT', (cmd) => {
    if (cmd.args.length !== 1) throw new CommandError("ERR wrong number of arguments for 'select' command");
    const db = cmd.args[0].toString('utf-8');
    if (db !== '0') {
      throw new CommandError('ERR invalid DB index');
    }
    return RespSerializer.ok();
  });

  dispatcher.register('HELLO', (cmd) => {
    // Return NOPROTO to force standard clients to fallback to RESP2
    return RespSerializer.error('NOPROTO unsupported protocol version');
  });
};
