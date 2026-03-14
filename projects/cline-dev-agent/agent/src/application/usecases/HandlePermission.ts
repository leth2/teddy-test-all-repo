import { IACPBridge } from '../../domain/ports/IACPBridge';

export interface HandlePermissionInput {
  requestId: string;
  approved: boolean;
}

// S: 권한 응답 단일 책임 유스케이스
export class HandlePermission {
  constructor(private readonly bridge: IACPBridge) {}

  execute(input: HandlePermissionInput): void {
    this.bridge.respondPermission(input.requestId, input.approved);
  }
}
