import { ServerProfile } from './server';

export const BACKUP_PURPOSES = {
  USER_TRIGGER: 'user-trigger',
  PRE_RESET: 'pre-reset',
  PRE_RESTORE: 'pre-restore',
  PRE_RECREATE: 'pre-recreate',
} as const;

export type BackupPurpose = typeof BACKUP_PURPOSES[keyof typeof BACKUP_PURPOSES];

export interface CreateBackupOptions {
  server: ServerProfile;
  purpose: BackupPurpose;
  customBackupsDir?: string;
}

export interface BackupResult {
  success: boolean;
  filename?: string;
  destinationPath?: string;
  sizeBytes?: number;
  error?: string;
}