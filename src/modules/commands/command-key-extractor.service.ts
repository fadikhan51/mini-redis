import { Command } from '../../domain/command/models/command.model';

export class CommandKeyExtractor {
  public static extractKeys(cmd: Command): string[] {
    const name = cmd.normalizedName;
    const args = cmd.args;

    if (args.length === 0) return [];

    switch (name) {
      case 'SET':
      case 'GET':
      case 'DEL':
      case 'EXISTS':
      case 'EXPIRE':
      case 'PEXPIRE':
      case 'TTL':
      case 'PTTL':
      case 'PERSIST':
      case 'INCR':
      case 'DECR':
      case 'INCRBY':
      case 'DECRBY':
      case 'GETDEL':
      case 'GETEX':
        if (name === 'DEL' || name === 'EXISTS') {
          return args.map(a => a.toString('utf-8'));
        }
        return [args[0].toString('utf-8')];

      case 'MGET':
        return args.map(a => a.toString('utf-8'));
        
      case 'MSET':
        const msetKeys: string[] = [];
        for (let i = 0; i < args.length; i += 2) {
          msetKeys.push(args[i].toString('utf-8'));
        }
        return msetKeys;

      default:
        return [];
    }
  }
}
