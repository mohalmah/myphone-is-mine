import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSessionStore } from '@/stores/sessionStore';
import { useLogStream } from '@/hooks/useLogs';
import { LogLevelBadge } from '@/components/common/Badge';
import { Toggle } from '@/components/common/Toggle';
import { formatTimestamp } from '@/services/formatters';
import { useUIStore } from '@/stores/uiStore';
import type { LogEntry, LogLevel } from '@/types';

const ALL_LEVELS: LogLevel[] = ['V', 'D', 'I', 'W', 'E', 'F'];

const LEVEL_COLORS: Record<LogLevel, string> = {
  V: 'text-gray-500',
  D: 'text-blue-600 dark:text-blue-400',
  I: 'text-green-600 dark:text-green-400',
  W: 'text-yellow-600 dark:text-yellow-400',
  E: 'text-red-600 dark:text-red-400',
  F: 'text-red-700 dark:text-red-300',
};

const LEVEL_BG: Record<LogLevel, string> = {
  V: '',
  D: '',
  I: '',
  W: 'bg-yellow-50/40 dark:bg-yellow-900/10',
  E: 'bg-red-50/40 dark:bg-red-900/10',
  F: 'bg-red-100/60 dark:bg-red-900/20',
};

// ─── Log row component (used in both flat and grouped views) ─────────────────

function LogRow({ log, friendly }: { log: LogEntry; friendly: boolean }) {
  return (
    <div className={`flex items-start gap-2 px-3 py-1 border-b border-gray-50 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 ${LEVEL_BG[log.level]}`}>
      <span className="text-gray-400 w-20 flex-shrink-0 text-xs">
        {friendly
          ? formatTimestamp(log.captured_at, true)
          : new Date(log.captured_at).toISOString().slice(11, 23)}
      </span>
      <span className="w-6 flex-shrink-0">
        <LogLevelBadge level={log.level} />
      </span>
      <span className="text-purple-600 dark:text-purple-400 w-32 flex-shrink-0 truncate text-xs">
        {log.tag ?? '—'}
      </span>
      <span className={`flex-1 break-all text-xs ${LEVEL_COLORS[log.level]}`}>
        {log.message}
      </span>
      {!friendly && log.pid && (
        <span className="text-gray-400 flex-shrink-0 text-xs">
          {log.pid}/{log.tid}
        </span>
      )}
    </div>
  );
}

// ─── Grouped view ─────────────────────────────────────────────────────────────

interface TagGroup {
  tag: string;
  entries: LogEntry[];
  topLevel: LogLevel;
}

function GroupedView({
  groups,
  friendly,
}: {
  groups: TagGroup[];
  friendly: boolean;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (tag: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  return (
    <div className="flex-1 overflow-auto font-mono text-xs">
      {groups.map((g) => (
        <div key={g.tag} className="border-b border-gray-100 dark:border-gray-800">
          {/* Group header */}
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
            onClick={() => toggle(g.tag)}
          >
            <span className="text-gray-400 w-4 flex-shrink-0">
              {expanded.has(g.tag) ? '▼' : '▶'}
            </span>
            <span className={`w-6 flex-shrink-0`}>
              <LogLevelBadge level={g.topLevel} />
            </span>
            <span className="font-medium text-purple-600 dark:text-purple-400 flex-1 truncate">
              {g.tag}
            </span>
            <span className="text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">
              {g.entries.length}
            </span>
          </button>

          {/* Group entries */}
          {expanded.has(g.tag) && (
            <div className="pl-4 bg-gray-50/50 dark:bg-gray-900/30">
              {g.entries.map((log) => (
                <LogRow key={log.id} log={log} friendly={friendly} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LogsPage() {
  const activeSession = useSessionStore((s) => s.activeSession);
  const friendlyMode = useUIStore((s) => s.friendlyMode);

  const sessionId = activeSession?.id ?? null;
  const { logs: displayLogs, paused, togglePause, clearLogs } = useLogStream(sessionId);

  const [enabledLevels, setEnabledLevels] = useState<Set<LogLevel>>(
    new Set(ALL_LEVELS),
  );
  const [tagFilter, setTagFilter] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [groupByTag, setGroupByTag] = useState(false);

  const parentRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Filter logs
  const filteredLogs = useMemo(() => displayLogs.filter((log) => {
    if (!enabledLevels.has(log.level)) return false;
    if (tagFilter && !log.tag?.toLowerCase().includes(tagFilter.toLowerCase()))
      return false;
    if (
      messageSearch &&
      !log.message.toLowerCase().includes(messageSearch.toLowerCase())
    )
      return false;
    return true;
  }), [displayLogs, enabledLevels, tagFilter, messageSearch]);

  // Build tag groups (sorted by entry count desc)
  const tagGroups = useMemo((): TagGroup[] => {
    if (!groupByTag) return [];
    const map = new Map<string, LogEntry[]>();
    for (const log of filteredLogs) {
      const key = log.tag ?? '(no tag)';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(log);
    }
    return Array.from(map.entries())
      .map(([tag, entries]) => {
        // Pick highest severity level seen in this group
        const levels: LogLevel[] = ['F', 'E', 'W', 'I', 'D', 'V'];
        const topLevel = levels.find((l) => entries.some((e) => e.level === l)) ?? 'V';
        return { tag, entries, topLevel };
      })
      .sort((a, b) => b.entries.length - a.entries.length);
  }, [filteredLogs, groupByTag]);

  const virtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 20,
  });

  // Auto-scroll to bottom (flat mode only)
  useEffect(() => {
    if (!groupByTag && autoScroll && !paused && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [filteredLogs.length, autoScroll, paused, groupByTag]);

  const toggleLevel = (level: LogLevel) => {
    setEnabledLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
        {/* Level filters */}
        <div className="flex items-center gap-1">
          {ALL_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => toggleLevel(level)}
              className={`
                px-2 py-0.5 rounded text-xs font-mono font-medium border transition-colors
                ${enabledLevels.has(level)
                  ? `border-current ${LEVEL_COLORS[level]}`
                  : 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-600'
                }
              `}
            >
              {level}
            </button>
          ))}
        </div>

        {/* Tag filter */}
        <input
          type="text"
          placeholder="Filter by tag..."
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 w-36"
        />

        {/* Message search */}
        <input
          type="text"
          placeholder="Search messages..."
          value={messageSearch}
          onChange={(e) => setMessageSearch(e.target.value)}
          className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 w-44"
        />

        <div className="ml-auto flex items-center gap-3">
          <Toggle
            checked={groupByTag}
            onChange={setGroupByTag}
            label="Group by tag"
          />
          {!groupByTag && (
            <Toggle
              checked={autoScroll}
              onChange={setAutoScroll}
              label="Auto-scroll"
            />
          )}
          <button
            type="button"
            onClick={togglePause}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              paused
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
            }`}
          >
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button
            type="button"
            onClick={clearLogs}
            className="px-3 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-red-400 hover:text-red-500 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Count */}
      <div className="px-4 py-1 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        {groupByTag
          ? `${tagGroups.length} tags · ${filteredLogs.length.toLocaleString()} entries`
          : `${filteredLogs.length.toLocaleString()} entries`}
        {filteredLogs.length !== displayLogs.length && ` (of ${displayLogs.length.toLocaleString()})`}
      </div>

      {filteredLogs.length === 0 && (
        <div className="flex items-center justify-center h-32 text-xs text-gray-400 dark:text-gray-600">
          {sessionId ? 'Waiting for log entries…' : 'Connect a device to stream logs.'}
        </div>
      )}

      {/* Grouped view */}
      {groupByTag && filteredLogs.length > 0 && (
        <GroupedView groups={tagGroups} friendly={friendlyMode} />
      )}

      {/* Flat virtual log table */}
      {!groupByTag && (
        <div ref={parentRef} className="flex-1 overflow-auto font-mono text-xs">
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const log = filteredLogs[virtualItem.index];
              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <LogRow log={log} friendly={friendlyMode} />
                </div>
              );
            })}
          </div>
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
