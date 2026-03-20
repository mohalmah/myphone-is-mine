import React from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useBatteryTimeline, useCurrentBattery } from '@/hooks/useBattery';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatTimestamp, formatTemperature } from '@/services/formatters';
import { useUIStore } from '@/stores/uiStore';
import { MOCK_BATTERY_SAMPLES, MOCK_BATTERY_STATS } from '@/services/mockData';

export default function BatteryPage() {
  const activeSession = useSessionStore((s) => s.activeSession);
  const sessionId = activeSession?.id ?? null;
  const friendlyMode = useUIStore((s) => s.friendlyMode);

  const { data: timeline } = useBatteryTimeline(sessionId);
  const { data: stats } = useCurrentBattery(sessionId);

  const displayTimeline = timeline ?? MOCK_BATTERY_SAMPLES;
  const displayStats = stats ?? MOCK_BATTERY_STATS;

  const chartData = displayTimeline.map((s) => ({
    time: new Date(s.captured_at).getTime(),
    level: s.level,
    temperature: s.temperature,
  }));

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Battery</h1>

      {/* Current stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Level</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {displayStats.current_level}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {displayStats.is_charging ? '⚡ Charging' : 'Discharging'}
          </p>
        </div>
        {displayStats.temperature && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Temperature</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatTemperature(displayStats.temperature, friendlyMode)}
            </p>
          </div>
        )}
        {displayStats.health && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Health</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {displayStats.health}
            </p>
          </div>
        )}
        {displayStats.estimated_drain_per_hour !== null && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Drain Rate</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {displayStats.estimated_drain_per_hour?.toFixed(1)}%/h
            </p>
          </div>
        )}
      </section>

      {/* Battery timeline chart */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Battery Level Timeline
        </h2>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="time"
                tickFormatter={(t) => formatTimestamp(new Date(t as number).toISOString(), friendlyMode)}
                tick={{ fontSize: 10 }}
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
              <Tooltip
                labelFormatter={(t) => formatTimestamp(new Date(t as number).toISOString(), friendlyMode)}
                formatter={(v) => [`${v as number}%`, 'Level']}
              />
              <Line
                type="monotone"
                dataKey="level"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
