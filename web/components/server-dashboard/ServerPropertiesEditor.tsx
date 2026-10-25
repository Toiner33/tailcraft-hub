'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PanelCard } from '@/components/shared/PanelCard';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { PropertyField } from '@/components/server-dashboard/PropertyField';
import { useServer } from '@/components/server-dashboard/ServerProvider';
import { useApiResource } from '@/hooks/use-api-resource';
import { apiFetch } from '@/lib/apiClient';
import type { StatusMessage } from '@/types/statusMessage';

interface PropertiesPayload {
  properties: Record<string, string>;
  lockedKeys?: string[];
}

export function ServerPropertiesEditor() {
  const { serverId } = useServer();
  const url = `/api/servers/${serverId}/config/properties`;
  const { data, loading, error: loadError, reload } = useApiResource<PropertiesPayload>(url);

  // Only the changed keys are kept here; they are layered over the loaded values.
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<StatusMessage | null>(null);

  const lockedKeys = data?.lockedKeys ?? [];
  const properties = { ...data?.properties, ...edits };
  const isDirty = Object.keys(edits).length > 0;

  const handleChange = (key: string, value: string) => {
    if (lockedKeys.includes(key)) return;
    setEdits((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const result = await apiFetch(url, { method: 'POST', body: { properties } });

    if (result.success) {
      setMessage({ variant: 'success', text: 'Saved! Restart the server container to apply changes.' });
      setEdits({});
      await reload(); // show what the server actually wrote
    } else {
      setMessage({ variant: 'error', text: `Save Error: ${result.error}` });
    }
    setSaving(false);
  };

  return (
    <PanelCard
      title="Server Configuration"
      badge={isDirty && <Badge variant="warning">Unsaved changes</Badge>}
      description={
        <>
          Edit settings in <code className="text-success">server.properties</code>
        </>
      }
      actions={
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      }
      loading={loading}
      loadingText="Loading server properties..."
    >
      <StatusBanner variant="error">
        {loadError && `Failed to load server properties: ${loadError}`}
      </StatusBanner>
      {message && <StatusBanner variant={message.variant}>{message.text}</StatusBanner>}

      <div className="grid max-h-96 grid-cols-1 gap-4 overflow-y-auto rounded-lg border bg-background p-2 md:grid-cols-2">
        {Object.entries(properties).map(([key, value]) => (
          <PropertyField
            key={key}
            name={key}
            value={value}
            locked={lockedKeys.includes(key)}
            onChange={(next) => handleChange(key, next)}
          />
        ))}
      </div>
    </PanelCard>
  );
}
