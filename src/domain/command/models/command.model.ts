import { ConnectionSession } from '../../../infrastructure/tcp/connection.session';

export interface Command {
  rawName: string;
  normalizedName: string; // usually uppercase
  args: Buffer[];
  session: ConnectionSession;
}
