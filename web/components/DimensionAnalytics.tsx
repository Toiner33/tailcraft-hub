'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DIMENSIONS, DimensionStats, DimensionId } from '@/types/dimensions';

type TimeUnit = 'days' | 'months' | 'years';

export default function DimensionAnalytics() {
  const [dimensions, setDimensions] = useState<DimensionStats[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pruningDim, setPruningDim] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Dynamically initialize state from shared DIMENSIONS config
  const [timeValues, setTimeValues] = useState<Record<DimensionId, number>>(() =>
    DIMENSIONS.reduce((acc, dim) => ({ ...acc, [dim.id]: 30 }), {} as Record<DimensionId, number>)
  );

  const [timeUnits, setTimeUnits] = useState<Record<DimensionId, TimeUnit>>(() =>
    DIMENSIONS.reduce((acc, dim) => ({ ...acc, [dim.id]: 'days' }), {} as Record<DimensionId, TimeUnit>)
  );

  const fetchDimensionStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/world/dimensions');
      const data = await res.json();
      if (data.success) {
        setDimensions(data.dimensions);
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
  }, []);

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
      ? `Are you sure you want to COMPLETE RESET all region files in ${dimName}? All player builds in this dimension will be regenerated.`
      : `Are you sure you want to prune region files in ${dimName} unvisited/unmodified for over ${value} ${unit}?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setPruningDim(dimensionId);
      setStatusMessage(`Flushing chunk data and pruning ${dimName}...`);

      const res = await fetch('/api/world/prune', {
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
        <CardContent className="text-zinc-400">Scanning region files...</CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-zinc-800 bg-zinc-900 text-zinc-100 shadow-md mt-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold">Dimension Analytics & Region Pruner</CardTitle>
        <button
          onClick={fetchDimensionStats}
          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1 rounded border border-zinc-700 transition-colors"
        >
          Refresh Stats
        </button>
      </CardHeader>

      <CardContent className="space-y-4">
        {statusMessage && (
          <div className="p-3 text-xs rounded bg-zinc-800 border border-zinc-700 text-emerald-300">
            {statusMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dimensions.map((dim) => {
            const dimId = dim.id as DimensionId;
            const val = timeValues[dimId] ?? 30;
            const unit = timeUnits[dimId] ?? 'days';

            return (
              <div
                key={dim.id}
                className="p-4 rounded-lg bg-zinc-950/80 border border-zinc-800 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-zinc-200">{dim.name}</h3>
                    <span className="text-xs font-mono font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 rounded px-2 py-0.5">
                      {dim.formattedSize}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-zinc-500 mt-0.5">{dim.folderPath}</p>

                  <div className="mt-3 space-y-1 text-xs text-zinc-400">
                    <div className="flex justify-between">
                      <span>Region Files (.mca):</span>
                      <span className="font-mono text-zinc-200">{dim.fileCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Generated Chunks:</span>
                      <span className="font-mono text-zinc-200">
                        {dim.chunkCount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Updated:</span>
                      <span className="font-mono text-zinc-300">
                        {dim.lastModified
                          ? new Date(dim.lastModified).toLocaleTimeString()
                          : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-zinc-800/80 pt-3 space-y-3">
                  <span className="text-[11px] font-medium text-zinc-400 block">
                    Prune Inactive Regions:
                  </span>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded">
                      <button
                        onClick={() => handleValueChange(dimId, -1)}
                        className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors rounded-l"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={val}
                        onChange={(e) =>
                          setTimeValues({
                            ...timeValues,
                            [dimId]: Math.max(1, parseInt(e.target.value) || 1),
                          })
                        }
                        className="w-12 text-center text-xs font-mono bg-transparent text-zinc-100 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() => handleValueChange(dimId, 1)}
                        className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors rounded-r"
                      >
                        +
                      </button>
                    </div>

                    <select
                      value={unit}
                      onChange={(e) => handleUnitChange(dimId, e.target.value as TimeUnit)}
                      className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none flex-1"
                    >
                      <option value="days">Days</option>
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => handlePruneDimension(dimId, dim.name, false)}
                      disabled={pruningDim === dim.id || dim.fileCount === 0}
                      className="w-full bg-amber-900/50 hover:bg-amber-800 disabled:opacity-40 text-amber-200 text-xs py-1.5 rounded transition-colors border border-amber-800/60"
                    >
                      {pruningDim === dim.id ? 'Pruning...' : `Prune Older Than ${val} ${unit}`}
                    </button>

                    <button
                      onClick={() => handlePruneDimension(dimId, dim.name, true)}
                      disabled={pruningDim === dim.id || dim.fileCount === 0}
                      className="w-full bg-rose-900/50 hover:bg-rose-800 disabled:opacity-40 text-rose-200 text-xs py-1 rounded transition-colors border border-rose-800/60 text-[11px]"
                    >
                      Full Reset {dim.name}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}