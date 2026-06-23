import { createServer, Server, Socket } from 'net';
import { logger } from '../../config/logger';
import { env } from '../../config/env';
import { ConnectionSession } from './connection.session';
import { RespParser } from './resp.parser';
import { RespSerializer } from './resp.serializer';
import { CommandDispatcher } from '../../modules/commands/command-dispatcher.service';
import { Command } from '../../domain/command/models/command.model';
import { CacheService } from '../../modules/cache/cache.service';
import { PayloadTooLargeError } from '../../helpers/errors';

export class RedisTcpServer {
  private server: Server;
  private connections = new Map<string, Socket>();

  constructor(
    private readonly dispatcher: CommandDispatcher,
    private readonly cacheService: CacheService
  ) {
    this.server = createServer((socket) => this.handleConnection(socket));
    
    this.server.on('error', (err) => {
      logger.error({ err }, 'TCP Server error');
    });
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(env.REDIS_PORT, env.REDIS_HOST, () => {
        logger.info(`Redis TCP Server listening on ${env.REDIS_HOST}:${env.REDIS_PORT}`);
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      for (const socket of this.connections.values()) {
        socket.destroy();
      }
      this.connections.clear();

      this.server.close((err) => {
        if (err) return reject(err);
        logger.info('Redis TCP Server stopped');
        resolve();
      });
    });
  }

  private handleConnection(socket: Socket) {
    const session = new ConnectionSession(socket);
    const parser = new RespParser();
    this.connections.set(session.id, socket);
    
    logger.debug({ clientId: session.id }, 'Client connected');

    socket.on('data', (chunk: Buffer) => {
      try {
        parser.append(chunk);

        const parsedCommands = parser.parse();
        
        for (const args of parsedCommands) {
          if (args.length === 0) continue;
          
          const rawName = args[0].toString('utf-8');
          const cmd: Command = {
            rawName,
            normalizedName: rawName.toUpperCase(),
            args: args.slice(1),
            session
          };

          this.cacheService.trackCommand();
          const response = this.dispatcher.dispatch(cmd);
          
          if (response.length > 0) {
            socket.write(response);
          }
          
          if (cmd.normalizedName === 'QUIT') {
            socket.end();
            break;
          }
        }
      } catch (err: any) {
        if (err instanceof PayloadTooLargeError) {
          socket.write(RespSerializer.error('ERR payload too large'));
          socket.destroy();
        } else {
          logger.error({ err, clientId: session.id }, 'Error processing TCP data');
          socket.write(RespSerializer.error(`ERR ${err.message}`));
        }
      }
    });

    socket.on('end', () => {
      logger.debug({ clientId: session.id }, 'Client disconnected');
      this.connections.delete(session.id);
    });

    socket.on('error', (err) => {
      logger.error({ err, clientId: session.id }, 'Socket error');
      this.connections.delete(session.id);
    });
  }
}
