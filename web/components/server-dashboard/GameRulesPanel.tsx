'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PanelCard } from '@/components/shared/PanelCard';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { GameruleCard } from '@/components/server-dashboard/GameruleCard';
import { useServer } from '@/components/server-dashboard/ServerProvider';
import { useApiResource } from '@/hooks/use-api-resource';
import { apiFetch } from '@/lib/apiClient';
import { GAMERULES, GAMERULE_CATEGORIES } from '@/types/gamerules';
import type { StatusMessage } from '@/types/statusMessage';

type RuleValue = boolean | number;

interface GamerulesPayload {
  gamerules?: Record<string, RuleValue>;
  isLive?: boolean;
  warning?: string;
}

/**
 * Changes made in this panel, layered over the loaded values. They belong to one
 * loaded `base`: after a refetch the server's values are authoritative again.
 */
interface LocalChanges {
  base: GamerulesPayload | null;
  values: Record<string, RuleValue>;
  isLive?: boolean;
}

const NO_VALUES: Record<string, RuleValue> = {};

export function GameRulesPanel() {
  const { serverId, status } = useServer();
  const isRunning = Boolean(status?.running);
  const url = `/api/servers/${serverId}/world/gamerules`;

  // Refetch when the container starts or stops: live (RCON) values vs. config-file values.
  const { data, loading, error: loadError, reload } = useApiResource<GamerulesPayload>(url, {
    refreshKey: isRunning ? 'running' : 'stopped',
  });

  const [changes, setChanges] = useState<LocalChanges>({ base: null, values: {} });
  const [message, setMessage] = useState<StatusMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const changesApply = changes.base === data;
  const localValues = changesApply ? changes.values : NO_VALUES;
  const isLive = isRunning && ((changesApply ? changes.isLive : undefined) ?? data?.isLive ?? false);
  const warning = isLive ? null : (data?.warning ?? null);

  const getValue = (name: string, defaultValue: RuleValue): RuleValue =>
    localValues[name] ?? data?.gamerules?.[name] ?? data?.gamerules?.[`minecraft:${name}`] ?? defaultValue;

  const setLocal = (name: string, value: RuleValue) =>
    setChanges((prev) => {
      const sameBase = prev.base === data;
      return {
        base: data,
        values: { ...(sameBase ? prev.values : {}), [name]: value },
        isLive: sameBase ? prev.isLive : undefined,
      };
    });

  const clearLocal = (name: string) =>
    setChanges((prev) => {
      const values = { ...prev.values };
      delete values[name];
      return { ...prev, values };
    });

  const saveRule = async (name: string, value: RuleValue) => {
    setLocal(name, value); // optimistic: the UI shows the new value right away

    const result = await apiFetch<{ isLive?: boolean }>(url, {
      method: 'POST',
      body: { ruleName: name, value },
    });

    if (result.success) {
      const live = Boolean(result.isLive);
      setChanges((prev) => ({ ...prev, isLive: live }));
      setMessage({
        variant: 'success',
        text: live
          ? `Updated ${name} live via RCON.`
          : `Saved ${name} to local server config (Offline Mode).`,
      });
    } else {
      clearLocal(name); // back to the server's value
      setMessage({ variant: 'error', text: result.error });
    }
  };

  const filteredRules = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return GAMERULES.filter((rule) => {
      const matchesSearch =
        rule.name.toLowerCase().includes(query) ||
        rule.description.toLowerCase().includes(query) ||
        rule.category.toLowerCase().includes(query);
      const matchesCategory = selectedCategory === 'All' || rule.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <PanelCard
      title="Interactive Gamerules Panel"
      badge={
        <Badge variant={isLive ? 'success' : 'warning'} className="font-mono">
          {isLive ? 'LIVE (RCON)' : 'OFFLINE'}
        </Badge>
      }
      actions={
        <>
          <Input
            placeholder="Global search gamerules..."
            aria-label="Search gamerules"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full md:w-64"
          />
          <Button variant="outline" onClick={() => void reload()}>
            Refresh
          </Button>
        </>
      }
      loading={loading}
      loadingText="Loading gamerules configuration..."
    >
      <StatusBanner variant="error">
        {loadError && `Failed to load gamerules: ${loadError}`}
      </StatusBanner>
      <StatusBanner variant="warning">{warning && `⚠️ ${warning}`}</StatusBanner>
      {message && <StatusBanner variant={message.variant}>{message.text}</StatusBanner>}

      <div className="flex items-center gap-1.5 overflow-x-auto border-b pb-1">
        {['All', ...GAMERULE_CATEGORIES].map((category) => (
          <Button
            key={category}
            size="sm"
            variant={selectedCategory === category ? 'secondary' : 'ghost'}
            className="whitespace-nowrap"
            onClick={() => setSelectedCategory(category)}
          >
            {category === 'All' ? 'All Rules' : category}
          </Button>
        ))}
      </div>

      <div className="grid max-h-125 grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2">
        {filteredRules.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground italic md:col-span-2">
            No gamerules matching &quot;{searchQuery}&quot; found.
          </p>
        ) : (
          filteredRules.map((rule) => (
            <GameruleCard
              key={rule.name}
              rule={rule}
              value={getValue(rule.name, rule.defaultValue)}
              onToggle={saveRule}
              onNumberChange={setLocal}
              onNumberCommit={saveRule}
            />
          ))
        )}
      </div>
    </PanelCard>
  );
}
