'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BackupFile {
  filename: string;
  sizeBytes: number;
  formattedSize: string;
  createdAt: string;
}

export default function BackupManager() {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [formattedTotalSize, setFormattedTotalSize] = useState<string>('0 B');
  const [isServerRunning, setIsServerRunning] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [restoringFile, setRestoringFile] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const fetchServerStatus = async () => {
    try {
      const res = await fetch('/api/docker/status');
      const data = await res.json();
      // Directly assign the boolean 'running' property from your API
      setIsServerRunning(Boolean(data.running));
    } catch {
      setIsServerRunning(false);
    }
  };

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/backups');
      const data = await res.json();
      if (data.success) {
        setBackups(data.backups);
        setFormattedTotalSize(data.formattedTotalSize || '0 B');
      } else {
        setStatusMessage(`Error: ${data.error}`);
      }
    } catch {
      setStatusMessage('Failed to load backups.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
    fetchServerStatus();

    const interval = setInterval(fetchServerStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      setStatusMessage('Compressing world folder into backup...');
      const res = await fetch('/api/backups', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setStatusMessage('Backup created successfully!');
        await fetchBackups();
      } else {
        setStatusMessage(`Backup failed: ${data.error}`);
      }
    } catch {
      setStatusMessage('Failed to create backup.');
    } finally {
      setCreating(false);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    await fetchServerStatus();
    if (isServerRunning) {
      setStatusMessage('Error: You must stop the server before restoring a backup.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to restore "${filename}"? This will save a safety copy of your live world, apply "${filename}", and remove the used archive.`
    );
    if (!confirmed) return;

    try {
      setRestoringFile(filename);
      setStatusMessage(`Restoring ${filename}... Creating safety snapshot and unpacking...`);
      
      const res = await fetch('/api/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      const data = await res.json();

      if (data.success) {
        setStatusMessage(data.message);
        // Refresh local backups list immediately so pre-restore snapshot appears and restored file disappears
        await fetchBackups(); 
      } else {
        setStatusMessage(`Restore Error: ${data.error}`);
      }
    } catch {
      setStatusMessage('Failed to restore backup.');
    } finally {
      setRestoringFile(null);
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    try {
      setDeletingFile(filename);
      setStatusMessage(`Deleting ${filename}...`);
      const res = await fetch(`/api/backups?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        setStatusMessage('Backup deleted successfully.');
        await fetchBackups();
      } else {
        setStatusMessage(`Delete failed: ${data.error}`);
      }
    } catch {
      setStatusMessage('Failed to delete backup.');
    } finally {
      setDeletingFile(null);
    }
  };

  if (loading) {
    return (
      <Card className="w-full border-zinc-800 bg-zinc-900 text-zinc-100 p-4">
        <CardContent className="text-zinc-400">Loading backups list...</CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-zinc-800 bg-zinc-900 text-zinc-100 p-2 shadow-md my-6">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <div className="flex items-center gap-3">
            <CardTitle className="text-xl font-bold">World Backups</CardTitle>
            <span className="text-xs font-mono font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 rounded px-2 py-0.5">
              Total Storage: {formattedTotalSize}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Manual snapshots saved in <code className="text-emerald-400">data/backups/</code>
          </p>
        </div>
        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs px-4 py-2 rounded transition-colors"
        >
          {creating ? 'Creating Archive...' : 'Create World Backup'}
        </button>
      </CardHeader>

      <CardContent className="space-y-4">
        {statusMessage && (
          <div className="p-3 text-xs rounded bg-zinc-800 border border-zinc-700 text-emerald-300">
            {statusMessage}
          </div>
        )}

        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto p-2 border border-zinc-800 rounded bg-black/40">
          {backups.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4 text-center">
              No backups found. Click "Create World Backup" above to make your first snapshot.
            </p>
          ) : (
            backups.map((backup) => (
              <div
                key={backup.filename}
                className="flex items-center justify-between p-3 rounded bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <div className="flex flex-col gap-1 overflow-hidden pr-4">
                  <span className="text-xs font-mono font-semibold text-zinc-200 truncate">
                    {backup.filename}
                  </span>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                    <span className="text-emerald-400 font-mono">{backup.formattedSize}</span>
                    <span>•</span>
                    <span>{new Date(backup.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRestoreBackup(backup.filename)}
                    disabled={isServerRunning || restoringFile === backup.filename}
                    title={isServerRunning ? 'Stop server to restore backups' : 'Restore world'}
                    className="bg-amber-900/60 hover:bg-amber-700 disabled:opacity-40 disabled:hover:bg-amber-900/60 disabled:cursor-not-allowed text-amber-200 text-xs px-3 py-1.5 rounded transition-colors border border-amber-800/50"
                  >
                    {restoringFile === backup.filename ? 'Restoring...' : 'Restore'}
                  </button>

                  <button
                    onClick={() => handleDeleteBackup(backup.filename)}
                    disabled={deletingFile === backup.filename}
                    className="bg-rose-900/60 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 text-rose-200 text-xs px-3 py-1.5 rounded transition-colors border border-rose-800/50"
                  >
                    {deletingFile === backup.filename ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
