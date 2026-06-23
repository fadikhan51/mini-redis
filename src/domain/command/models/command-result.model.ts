import { RespType } from '../../resp/models/resp-types.model';

export interface CommandResult {
  type: RespType;
  value: any;
}
