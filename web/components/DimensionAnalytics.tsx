'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DimensionStats, DimensionId } from '@/types/dimensions';

type TimeUnit = 'days' | 'months' | 'years';

interface DimensionAnalyticsProps {
  serverId: string; // Accept serverId as a prop
}

export default function DimensionAnalytics({ serverId }: DimensionAnalyticsProps) {
  const [dimensions, setDimensions] = useState<DimensionStats[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDimId, setSelectedDimId] = useState<DimensionId>('overworld');
  const [pruningDim, setPruningDim] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Dynamically managed state for pruning thresholds and time units per dimension ID
  const [timeValues, setTimeValues] = useState<Record<DimensionId, number>>({});
  const [timeUnits, setTimeUnits] = useState<Record<DimensionId, TimeUnit>>({});

  const fetchDimensionStats = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/servers/${serverId}/world/dimensions`);
      const data = await res.json();
      if (data.success) {
        setDimensions(data.dimensions);
        // If the current selected dimension is no longer in the list, default to the first one available
        if (data.dimensions.length > 0 && !data.dimensions.some((d: DimensionStats) => d.id === selectedDimId)) {
          setSelectedDimId(data.dimensions[0].id);
        }
      } else {
        setStatusMessage(`Error: ${data.error}`);
      }
    } catch {
      setStatusMessage('Failed to fetch dimension stats.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDimensionStats();
  }, [serverId]);

  const handleValueChange = (dimId: DimensionId, delta: number) => {
    setTimeValues((prev) => ({
      ...prev,
      [dimId]: Math.max(1, (prev[dimId] ?? 30) + delta),
    }));
  };

  const handleUnitChange = (dimId: DimensionId, unit: TimeUnit) => {
    setTimeUnits((prev) => ({ ...prev, [dimId]: unit }));
  };

  const calculateDays = (value: number, unit: TimeUnit): number => {
    if (unit === 'days') return value;
    if (unit === 'months') return value * 30;
    if (unit === 'years') return value * 365;
    return value;
  };

  const handlePruneDimension = async (
    dimensionId: DimensionId,
    dimName: string,
    isFullReset: boolean
  ) => {
    const value = timeValues[dimensionId] ?? 30;
    const unit = timeUnits[dimensionId] ?? 'days';
    const totalDays = isFullReset ? 0 : calculateDays(value, unit);

    const confirmMessage = isFullReset
      ? `Are you sure you want to COMPLETE RESET all files in ${dimName}? All player builds in this dimension will be regenerated.`
      : `Are you sure you want to prune region files in ${dimName} unvisited/unmodified for over ${value} ${unit}?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setPruningDim(dimensionId);
      setStatusMessage(`Flushing chunk data and pruning ${dimName}...`);

      const res = await fetch(`/api/servers/${serverId}/world/prune`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dimensionId, daysOlderThan: totalDays }),
      });
      const data = await res.json();

      if (data.success) {
        setStatusMessage(data.message);
        await fetchDimensionStats();
      } else {
        setStatusMessage(`Prune failed: ${data.error}`);
      }
    } catch {
      setStatusMessage('Failed to execute prune command.');
    } finally {
      setPruningDim(null);
    }
  };

  if (loading) {
    return (
      <Card className="w-full border-zinc-800 bg-zinc-900 text-zinc-100 p-4 mt-6">
        <CardContent className="text-zinc-400">Scanning server dimensions...</CardContent>
      </Card>
    );
  }

  const activeDim = dimensions.find((d) => d.id === selectedDimId) || dimensions[0];
  const val = activeDim ? (timeValues[activeDim.id] ?? 30) : 30;
  const unit = activeDim ? (timeUnits[activeDim.id] ?? 'days') : 'days';

  return (
    <Card className="w-full border-zinc-800 bg-zinc-900 text-zinc-100 shadow-md mt-6">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <CardTitle className="text-xl font-bold">Dimension Analytics & Region Pruner</CardTitle>
        </div>

        <div className="flex items-center gap-2">
          {dimensions.length > 0 && (
            <select
              value={selectedDimId}
              onChange={(e) => setSelectedDimId(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs rounded px-3 py-1.5 focus:outline-none font-medium"
            >
              {dimensions.map((dim) => (
                <option key={dim.id} value={dim.id}>
                  {/* Show the full relative path and size so nested/identically named folders are distinct */}
                  {dim.folderPath === '' ? 'Overworld (Root)' : `${dim.folderPath}`} ({dim.formattedSize})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={fetchDimensionStats}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded border border-zinc-700 transition-colors"
          >
            Refresh Stats
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {statusMessage && (
          <div className="p-3 text-xs rounded bg-zinc-800 border border-zinc-700 text-emerald-300">
            {statusMessage}
          </div>
        )}

        {!activeDim ? (
          <div className="p-6 text-center text-zinc-500 text-sm">
            No dimensions with valid region files found for this server.
          </div>
        ) : (
          <div className="p-5 rounded-lg bg-zinc-950/80 border border-zinc-800 flex flex-col gap-5">
            {/* Dimension Overview Header */}
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base text-zinc-100">{activeDim.name}</h3>
                <span className="text-xs font-mono font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 rounded px-2.5 py-1">
                  {activeDim.formattedSize}
                </span>
              </div>
              <p className="text-xs font-mono text-zinc-500 mt-1">Path: {activeDim.folderPath}</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-zinc-900 text-xs text-zinc-400">
                <div className="bg-zinc-900/60 p-3 rounded border border-zinc-800/60">
                  <span className="block text-[11px] text-zinc-500">Region Files (.mca)</span>
                  <span className="font-mono text-zinc-100 text-sm font-semibold mt-0.5 block">
                    {activeDim.fileCount}
                  </span>
                </div>
                <div className="bg-zinc-900/60 p-3 rounded border border-zinc-800/60">
                  <span className="block text-[11px] text-zinc-500">Generated Chunks</span>
                  <span className="font-mono text-zinc-100 text-sm font-semibold mt-0.5 block">
                    {activeDim.chunkCount.toLocaleString()}
                  </span>
                </div>
                <div className="bg-zinc-900/60 p-3 rounded border border-zinc-800/60">
                  <span className="block text-[11px] text-zinc-500">Last Updated</span>
                  <span className="font-mono text-zinc-200 text-xs mt-1 block">
                    {activeDim.lastModified
                      ? new Date(activeDim.lastModified).toLocaleString()
                      : 'Never'}
                  </span>
                </div>
              </div>
            </div>

            {/* Pruning Control Section */}
            <div className="border-t border-zinc-800/80 pt-4 space-y-3">
              <span className="text-xs font-medium text-zinc-300 block">
                Prune Inactive Regions for <span className="text-zinc-100 font-semibold">{activeDim.name}</span>:
              </span>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded">
                  <button
                    onClick={() => handleValueChange(activeDim.id, -1)}
                    className="px-3 py-2 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors rounded-l"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={val}
                    onChange={(e) =>
                      setTimeValues({
                        ...timeValues,
                        [activeDim.id]: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className="w-14 text-center text-xs font-mono bg-transparent text-zinc-100 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => handleValueChange(activeDim.id, 1)}
                    className="px-3 py-2 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors rounded-r"
                  >
                    +
                  </button>
                </div>

                <select
                  value={unit}
                  onChange={(e) => handleUnitChange(activeDim.id, e.target.value as TimeUnit)}
                  className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none sm:w-36"
                >
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => handlePruneDimension(activeDim.id, activeDim.name, false)}
                  disabled={pruningDim === activeDim.id || activeDim.fileCount === 0}
                  className="w-full bg-amber-900/40 hover:bg-amber-900/60 disabled:opacity-40 text-amber-200 text-xs py-2 rounded transition-colors border border-amber-800/60 font-medium"
                >
                  {pruningDim === activeDim.id ? 'Pruning...' : `Prune Older Than ${val} ${unit}`}
                </button>

                <button
                  onClick={() => handlePruneDimension(activeDim.id, activeDim.name, true)}
                  disabled={pruningDim === activeDim.id || activeDim.fileCount === 0}
                  className="w-full bg-rose-900/40 hover:bg-rose-900/60 disabled:opacity-40 text-rose-200 text-xs py-2 rounded transition-colors border border-rose-800/60 font-medium"
                >
                  Full Reset {activeDim.name}
                </button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}