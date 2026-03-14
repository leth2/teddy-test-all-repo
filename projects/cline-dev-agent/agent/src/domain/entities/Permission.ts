export type PermissionType = 'file-write' | 'file-delete' | 'command-execute' | 'network';

export interface PermissionRequest {
  id: string;
  type: PermissionType;
  description: string;
  details: unknown;
  timestamp: Date;
}

export interface PermissionResponse {
  requestId: string;
  approved: boolean;
}
