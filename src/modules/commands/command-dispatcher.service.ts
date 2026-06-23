import { Command } from '../../domain/command/models/command.model';
import { RespSerializer } from '../../infrastructure/tcp/resp.serializer';
import { UnsupportedCommandError, AuthError, CommandError } from '../../helpers/errors';
import { env } from '../../config/env';
import { ClusterRoutingService } from '../cluster/cluster-routing.service';
import { CommandKeyExtractor } from './command-key-extractor.service';

export type CommandHandler = (cmd: Command) => Buffer;

export class CommandDispatcher {
  private handlers = new Map<string, CommandHandler>();

  constructor(private readonly routingService?: ClusterRoutingService) {}

  public register(name: string, handler: CommandHandler) {
    this.handlers.set(name.toUpperCase(), handler);
  }

  public dispatch(cmd: Command): Buffer {
    try {
      if (env.REDIS_PASSWORD && !cmd.session.isAuthenticated && cmd.normalizedName !== 'AUTH' && cmd.normalizedName !== 'QUIT') {
        return RespSerializer.error('NOAUTH Authentication required.');
      }

      const handler = this.handlers.get(cmd.normalizedName);
      if (!handler) {
        throw new UnsupportedCommandError(cmd.rawName);
      }

      if (env.CLUSTER_ENABLED && this.routingService) {
        const keys = CommandKeyExtractor.extractKeys(cmd);
        if (keys.length > 0) {
          this.routingService.evaluateRoute(keys, cmd.session.isAsking);
        }
      }

      const result = handler(cmd);
      
      if (cmd.session.isAsking && cmd.normalizedName !== 'ASKING') {
        cmd.session.isAsking = false;
      }

      return result;
    } catch (err: any) {
      if (err instanceof UnsupportedCommandError || err instanceof AuthError || err instanceof CommandError) {
        return RespSerializer.error(err.message);
      }
      return RespSerializer.error(`ERR ${err.message}`);
    }
  }
}
