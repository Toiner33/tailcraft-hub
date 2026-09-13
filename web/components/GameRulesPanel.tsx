'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GAMERULES, GAMERULE_CATEGORIES } from '@/types/gamerules';

export default function GamerulesPanel() {
  const [values, setValues] = useState<Record<string, boolean | number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>('');

  // Filtering State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  /**
   * Helper to look up a rule's value by checking both raw key and clean key.
   */
  const getRuleValue = (ruleName: string, defaultValue: boolean | number) => {
    const cleanName = ruleName.replace('minecraft:', '');
    if (values[ruleName] !== undefined) return values[ruleName];
    if (values[cleanName] !== undefined) return values[cleanName];
    return defaultValue;
  };

  const fetchGamerules = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/world/gamerules');
      const data = await res.json();
      if (data.success) {
        setValues(data.gamerules || {});
        setIsLive(data.isLive);
        setWarning(data.warning || null);
      }
    } catch {
      setStatusMsg('Failed to fetch gamerules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGamerules();
  }, []);

  const handleUpdate = async (ruleName: string, newValue: boolean | number) => {
    const cleanName = ruleName.replace('minecraft:', '');

    // 1. Optimistic UI update so the user sees immediate change
    setValues((prev) => ({
      ...prev,
      [ruleName]: newValue,
      [cleanName]: newValue,
    }));

    try {
      const res = await fetch('/api/world/gamerules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleName: cleanName, value: newValue }),
      });

      const data = await res.json();

      if (data.success) {
        setIsLive(Boolean(data.isLive));

        if (data.isLive) {
          setWarning(null);
          setStatusMsg(`Updated ${cleanName} live via RCON.`);
        } else {
          setWarning('Server is offline. Rule saved to configuration files for next restart.');
          setStatusMsg(`Saved ${cleanName} to local server config (Offline Mode).`);
        }
      } else {
        // Revert optimistic update only when the API explicitly fails to write
        setStatusMsg(data.error || `Failed to update ${cleanName}`);
        fetchGamerules(); 
      }
    } catch {
      setStatusMsg(`Network error updating ${cleanName}`);
      fetchGamerules();
    }
  };

  // Global search & category filtering logic
  const filteredRules = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return GAMERULES.filter((rule) => {
      const cleanName = rule.name.replace('minecraft:', '').toLowerCase();
      const matchesSearch =
        cleanName.includes(q) ||
        rule.name.toLowerCase().includes(q) ||
        rule.description.toLowerCase().includes(q) ||
        rule.category.toLowerCase().includes(q);

      const matchesCategory =
        selectedCategory === 'All' || rule.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  if (loading) {
    return (
      <Card className="w-full border-zinc-800 bg-zinc-900 text-zinc-100 p-4 mt-6">
        <CardContent className="text-zinc-400 text-xs">
          Loading gamerules configuration...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-zinc-800 bg-zinc-900 text-zinc-100 shadow-lg mt-6">
      <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CardTitle className="text-xl font-bold">
            Interactive Gamerules Panel
          </CardTitle>
          <span
            className={`text-xs px-2 py-0.5 rounded font-mono ${
              isLive
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : 'bg-amber-950 text-amber-400 border border-amber-800'
            }`}
          >
            {isLive ? 'LIVE (RCON)' : 'OFFLINE'}
          </span>
        </div>

        {/* Global Search Bar */}
        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Global search gamerules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {warning && (
          <div className="p-3 text-xs rounded bg-amber-950/40 border border-amber-800/80 text-amber-300">
            ⚠️ {warning}
          </div>
        )}

        {statusMsg && (
          <div className="p-2 text-xs rounded bg-emerald-950/40 border border-emerald-800 text-emerald-300">
            {statusMsg}
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-zinc-800 text-xs">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
              selectedCategory === 'All'
                ? 'bg-zinc-800 text-zinc-100 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All Rules
          </button>
          {GAMERULE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-zinc-800 text-zinc-100 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Gamerules List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-125 overflow-y-auto pr-1">
          {filteredRules.length === 0 ? (
            <div className="col-span-2 text-center text-zinc-500 py-8 text-xs italic">
              No gamerules matching "{searchQuery}" found.
            </div>
          ) : (
            filteredRules.map((rule) => {
              const currentVal = getRuleValue(rule.name, rule.defaultValue);

              return (
                <div
                  key={rule.name}
                  className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 flex flex-col justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-zinc-200 break-all">
                        {rule.name.replace('minecraft:', '')}
                      </span>
                      <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded shrink-0">
                        {rule.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                      {rule.description}
                    </p>
                  </div>

                  {/* Interactive Control */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50 mt-1">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono">
                      Type: {rule.type}
                    </span>

                    {rule.type === 'boolean' ? (
                      <button
                        onClick={() => handleUpdate(rule.name, !Boolean(currentVal))}
                        className={`px-3 py-1 text-xs rounded font-medium transition-colors border ${
                          currentVal
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                            : 'bg-rose-950 text-rose-300 border-rose-800 hover:bg-rose-900'
                        }`}
                      >
                        {currentVal ? 'TRUE' : 'FALSE'}
                      </button>
                    ) : (
                      <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded">
                        <button
                          onClick={() =>
                            handleUpdate(
                              rule.name,
                              Math.max(rule.min ?? 0, (Number(currentVal) || 0) - 1)
                            )
                          }
                          className="px-2 py-0.5 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-l"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={Number(currentVal)}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setValues((prev) => ({
                              ...prev,
                              [rule.name]: isNaN(val) ? 0 : val,
                            }));
                          }}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value, 10);
                            handleUpdate(
                              rule.name,
                              Math.max(rule.min ?? 0, isNaN(val) ? 0 : val)
                            );
                          }}
                          className="w-14 text-center text-xs font-mono bg-transparent text-zinc-100 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          onClick={() =>
                            handleUpdate(rule.name, (Number(currentVal) || 0) + 1)
                          }
                          className="px-2 py-0.5 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-r"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}