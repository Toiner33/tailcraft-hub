'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Magic number constants for steppers
const STEP_INCREMENT = 1;
const MIN_PLAYERS = 1;

// Known property schemas for smart UI inputs
const ENUM_SCHEMAS: Record<string, string[]> = {
  gamemode: ['survival', 'creative', 'adventure', 'spectator'],
  difficulty: ['peaceful', 'easy', 'normal', 'hard'],
  'level-type': [
    'minecraft:normal',
    'minecraft:flat',
    'minecraft:large_biomes',
    'minecraft:amplified',
    'minecraft:single_biome_surface',
    'normal',
    'flat',
    'large_biomes',
    'amplified',
  ],
};

export default function ServerPropertiesEditor() {
  const [properties, setProperties] = useState<Record<string, string>>({});
  const [lockedKeys, setLockedKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/config/properties');
      const data = await res.json();
      if (data.success) {
        setProperties(data.properties);
        setLockedKeys(data.lockedKeys || []);
      } else {
        setStatusMessage(`Error: ${data.error}`);
      }
    } catch {
      setStatusMessage('Failed to fetch server properties.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleChange = (key: string, value: string) => {
    if (lockedKeys.includes(key)) return; // Prevent mutating locked keys
    setProperties((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setStatusMessage('');
      const res = await fetch('/api/config/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage('Saved! Restart the server container to apply changes.');
      } else {
        setStatusMessage(`Save Error: ${data.error}`);
      }
    } catch {
      setStatusMessage('Failed to save properties.');
    } finally {
      setSaving(false);
    }
  };

  const renderInputControl = (key: string, value: string, isLocked: boolean) => {
    // 1. Locked System Property (Read-Only)
    if (isLocked) {
      return (
        <input
          type="text"
          value={value}
          disabled
          className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-500 font-mono cursor-not-allowed select-none"
        />
      );
    }

    // 2. Boolean Switch
    if (value === 'true' || value === 'false') {
      const isChecked = value === 'true';
      return (
        <button
          type="button"
          onClick={() => handleChange(key, isChecked ? 'false' : 'true')}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isChecked ? 'bg-emerald-600' : 'bg-zinc-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isChecked ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      );
    }

    // 3. Enum Dropdown
    if (ENUM_SCHEMAS[key]) {
      return (
        <select
          value={value}
          onChange={(e) => handleChange(key, e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
        >
          {ENUM_SCHEMAS[key].map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    // 4. Numeric Stepper (+/-)
    if (!isNaN(Number(value)) && value.trim() !== '') {
      const numVal = Number(value);
      return (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleChange(key, String(Math.max(MIN_PLAYERS, numVal - STEP_INCREMENT)))}
            className="bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-200 text-xs px-3 py-1 rounded font-bold transition-colors"
          >
            -
          </button>
          <input
            type="number"
            value={value}
            onChange={(e) => handleChange(key, e.target.value)}
            className="w-24 min-w-[5rem] bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-center text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={() => handleChange(key, String(numVal + STEP_INCREMENT))}
            className="bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-200 text-xs px-3 py-1 rounded font-bold transition-colors"
          >
            +
          </button>
        </div>
      );
    }

    // 5. Default Text Input
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(key, e.target.value)}
        className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
      />
    );
  };

  if (loading) {
    return (
      <Card className="w-full border-zinc-800 bg-zinc-900 text-zinc-100 p-4">
        <CardContent className="text-zinc-400">Loading server properties...</CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-zinc-800 bg-zinc-900 text-zinc-100 p-2 shadow-md my-6">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-xl font-bold">Server Configuration</CardTitle>
          <p className="text-xs text-zinc-400 mt-1">
            Edit settings in <code className="text-emerald-400">server.properties</code>
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs px-4 py-2 rounded transition-colors"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </CardHeader>

      <CardContent className="space-y-4">
        {statusMessage && (
          <div className="p-3 text-xs rounded bg-zinc-800 border border-zinc-700 text-emerald-300">
            {statusMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto p-2 border border-zinc-800 rounded bg-black/40">
          {Object.entries(properties).map(([key, value]) => {
            const isLocked = lockedKeys.includes(key);

            return (
              <div
                key={key}
                className={`flex flex-col gap-2 p-2.5 rounded transition-colors ${
                  isLocked ? 'bg-zinc-950/30 border border-zinc-900 opacity-60' : 'bg-zinc-900/80 border border-zinc-800'
                }`}
              >
                <div className="flex justify-between items-center">
                  <label className="text-xs font-mono font-semibold text-zinc-300">
                    <span className={isLocked ? 'text-zinc-500 line-through' : ''}>{key}</span>
                  </label>
                  {isLocked && (
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold border border-zinc-800 rounded px-1.5 py-0.5">
                      System Locked
                    </span>
                  )}
                </div>
                {renderInputControl(key, value, isLocked)}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
