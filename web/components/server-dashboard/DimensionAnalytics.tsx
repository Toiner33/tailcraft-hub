'use client';

import { useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OptionSelect } from '@/components/shared/OptionSelect';
import { PanelCard } from '@/components/shared/PanelCard';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { DimensionPruner, type TimeUnit } from '@/components/server-dashboard/DimensionPruner';
import { useServer } from '@/components/server-dashboard/ServerProvider';
import { useApiResource } from '@/hooks/use-api-resource';
import { useConfirm } from '@/hooks/use-confirm';
import { apiFetch } from '@/lib/apiClient';
import type { DimensionId, DimensionStats } from '@/types/dimensions';
import type { StatusMessage } from '@/types/statusMessage';

const DEFAULT_PRUNE_VALUE = 30;
const DAYS_PER_UNIT: Record<TimeUnit, number> = { days: 1, months: 30, years: 365 };

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <span className="block text-[11px] text-muted-foreground">{label}</span>
      <span className="mt-0.5 block font-mono text-sm font-semibold">{children}</span>
    </div>
  );
}

export function DimensionAnalytics() {
  const { serverId } = useServer();
  const { confirm, confirmDialog } = useConfirm();
  const { data, loading, error: loadError, reload } = useApiResource<{
    dimensions: DimensionStats[];
  }>(`/api/servers/${serverId}/world/dimensions`);

  const [selectedDimId, setSelectedDimId] = useState<DimensionId>('overworld');
  const [pruningDim, setPruningDim] = useState<string | null>(null);
  const [message, setMessage] = useState<StatusMessage | null>(null);

  // Prune settings are remembered per dimension.
  const [timeValues, setTimeValues] = useState<Record<string, number>>({});
  const [timeUnits, setTimeUnits] = useState<Record<string, TimeUnit>>({});

  const dimensions = data?.dimensions ?? [];
  // If the selected dimension disappeared from the list, show the first one.
  const activeDim = dimensions.find((dim) => dim.id === selectedDimId) ?? dimensions[0];

  const dimensionLabel = (dim: DimensionStats) =>
    `${dim.folderPath === '' ? 'Overworld (Root)' : dim.folderPath} (${dim.formattedSize})`;

  const handlePrune = async (dim: DimensionStats, isFullReset: boolean) => {
    const value = timeValues[dim.id] ?? DEFAULT_PRUNE_VALUE;
    const unit = timeUnits[dim.id] ?? 'days';
    const totalDays = isFullReset ? 0 : value * DAYS_PER_UNIT[unit];

    const confirmed = await confirm(
      isFullReset
        ? {
            title: `Reset ${dim.name}?`,
            description: `This will COMPLETELY RESET all files in ${dim.name}. All player builds in this dimension will be regenerated.`,
            confirmLabel: 'Full Reset',
            variant: 'destructive',
          }
        : {
            title: `Prune ${dim.name}?`,
            description: `This will prune region files in ${dim.name} unvisited/unmodified for over ${value} ${unit}.`,
            confirmLabel: 'Prune',
            variant: 'warning',
          }
    );
    if (!confirmed) return;

    setPruningDim(dim.id);
    setMessage({ variant: 'info', text: `Flushing chunk data and pruning ${dim.name}...` });

    const result = await apiFetch<{ message: string }>(`/api/servers/${serverId}/world/prune`, {
      method: 'POST',
      body: { dimensionId: dim.id, daysOlderThan: totalDays },
    });

    if (result.success) {
      setMessage({ variant: 'success', text: result.message });
      await reload();
    } else {
      setMessage({ variant: 'error', text: `Prune failed: ${result.error}` });
    }
    setPruningDim(null);
  };

  return (
    <PanelCard
      title="Dimension Analytics & Region Pruner"
      actions={
        <>
          {activeDim && (
            <OptionSelect
              value={activeDim.id}
              options={dimensions.map((dim) => ({ value: dim.id, label: dimensionLabel(dim) }))}
              onChange={setSelectedDimId}
              className="w-auto"
            />
          )}
          <Button variant="outline" onClick={() => void reload()}>
            Refresh Stats
          </Button>
        </>
      }
      loading={loading}
      loadingText="Scanning server dimensions..."
    >
      <StatusBanner variant="error">
        {loadError && `Failed to load dimension stats: ${loadError}`}
      </StatusBanner>
      {message && <StatusBanner variant={message.variant}>{message.text}</StatusBanner>}

      {!activeDim ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          No dimensions with valid region files found for this server.
        </p>
      ) : (
        <div className="flex flex-col gap-5 rounded-lg border bg-background p-5">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">{activeDim.name}</h3>
              <Badge variant="success" className="font-mono">
                {activeDim.formattedSize}
              </Badge>
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              Path: {activeDim.folderPath}
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-3">
              <Stat label="Region Files (.mca)">{activeDim.fileCount}</Stat>
              <Stat label="Generated Chunks">{activeDim.chunkCount.toLocaleString()}</Stat>
              <Stat label="Last Updated">
                {activeDim.lastModified ? new Date(activeDim.lastModified).toLocaleString() : 'Never'}
              </Stat>
            </div>
          </div>

          <DimensionPruner
            dimension={activeDim}
            value={timeValues[activeDim.id] ?? DEFAULT_PRUNE_VALUE}
            unit={timeUnits[activeDim.id] ?? 'days'}
            onValueChange={(next) => setTimeValues((prev) => ({ ...prev, [activeDim.id]: next }))}
            onUnitChange={(next) => setTimeUnits((prev) => ({ ...prev, [activeDim.id]: next }))}
            pruning={pruningDim === activeDim.id}
            onPrune={(isFullReset) => handlePrune(activeDim, isFullReset)}
          />
        </div>
      )}

      {confirmDialog}
    </PanelCard>
  );
}
