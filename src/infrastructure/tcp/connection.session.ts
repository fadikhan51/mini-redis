import { Socket } from 'net';

export class ConnectionSession {
  public id: string;
  public isAuthenticated: boolean = false;
  public isAsking: boolean = false;
  public isReadOnly: boolean = false;
  
  constructor(public readonly socket: Socket) {
    this.id = `${socket.remoteAddress}:${socket.remotePort}`;
  }
}
