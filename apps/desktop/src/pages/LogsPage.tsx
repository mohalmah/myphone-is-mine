import React, { useState, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSessionStore } from '@/stores/sessionStore';
import { useLogStream } from '@/hooks/useLogs';
import { LogLevelBadge } from '@/components/common/Badge';
import { Toggle } from '@/components/common/Toggle';
import { formatTimestamp } from '@/services/formatters';
import { useUIStore } from '@/stores/uiStore';
import type { LogLevel } from '@/types';
import { generateMockLogs } from '@/services/mockData';

const ALL_LEVELS: LogLevel[] = ['V', 'D', 'I', 'W', 'E', 'F'];

const LEVEL_COLORS: Record<LogLevel, string> = {
  V: 'text-gray-500',
  D: 'text-blue-600 dark:text-blue-400',
  I: 'text-green-600 dark:text-green-400',
  W: 'text-yellow-600 dark:text-yellow-400',
  E: 'text-red-600 dark:text-red-400',
  F: 'text-red-700 dark:text-red-300',
};

export default function LogsPage() {
  const activeSession = useSessionStore((s) => s.activeSession);
  const friendlyMode = useUIStore((s) => s.friendlyMode);

  const sessionId = activeSession?.id ?? null;
  const { logs: streamLogs, paused, togglePause, clearLogs } = useLogStream(sessionId);

  // Use mock data when no session active
  const displayLogs = sessionId ? streamLogs : generateMockLogs(200);

  const [enabledLevels, setEnabledLevels] = useState<Set<LogLevel>>(
    new Set(ALL_LEVELS),
  );
  const [tagFilter, setTagFilter] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);

  const parentRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Filter logs
  const filteredLogs = displayLogs.filter((log) => {
    if (!enabledLevels.has(log.level)) return false;
    if (tagFilter && !log.tag?.toLowerCase().includes(tagFilter.toLowerCase()))
      return false;
    if (
      messageSearch &&
      !log.message.toLowerCase().includes(messageSearch.toLowerCase())
    )
      return false;
    return true;
  });

  const virtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 20,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && !paused && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [filteredLogs.length, autoScroll, paused]);

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
            checked={autoScroll}
            onChange={setAutoScroll}
            label="Auto-scroll"
          />
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
        {filteredLogs.length.toLocaleString()} entries
        {filteredLogs.length !== displayLogs.length && ` (of ${displayLogs.length.toLocaleString()})`}
      </div>

      {/* Virtual log table */}
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
                className="flex items-start gap-2 px-3 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-50 dark:border-gray-900"
              >
                <span className="text-gray-400 w-20 flex-shrink-0">
                  {friendlyMode
                    ? formatTimestamp(log.captured_at, true)
                    : new Date(log.captured_at).toISOString().slice(11, 23)}
                </span>
                <span className="w-6 flex-shrink-0">
                  <LogLevelBadge level={log.level} />
                </span>
                <span className="text-purple-600 dark:text-purple-400 w-32 flex-shrink-0 truncate">
                  {log.tag ?? '—'}
                </span>
                <span className={`flex-1 break-all ${LEVEL_COLORS[log.level]}`}>
                  {log.message}
                </span>
                {!friendlyMode && log.pid && (
                  <span className="text-gray-400 flex-shrink-0">
                    {log.pid}/{log.tid}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
