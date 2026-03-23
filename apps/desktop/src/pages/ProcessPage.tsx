import React from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useSystemResources, useThermalSamples } from '@/hooks/useProcess';
import { DataTable } from '@/components/common/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import type { ProcessEntry } from '@/types';

function GaugeBar({ value, max, color = 'bg-blue-500' }: { value: number; max: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-600 dark:text-gray-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function ProcessPage() {
  const activeSession = useSessionStore((s) => s.activeSession);
  const sessionId = activeSession?.id ?? null;

  const { data: resources } = useSystemResources(sessionId);
  const { data: thermalSamples } = useThermalSamples(sessionId);

  const displayResources = resources ?? null;
  const displayThermal = thermalSamples ?? [];

  const columns: ColumnDef<ProcessEntry>[] = [
    { accessorKey: 'name', header: 'Process' },
    { accessorKey: 'pid', header: 'PID' },
    {
      accessorKey: 'cpu_percent',
      header: 'CPU %',
      cell: ({ getValue }) => `${(getValue() as number).toFixed(1)}%`,
    },
    {
      accessorKey: 'rss_kb',
      header: 'RSS',
      cell: ({ getValue }) => `${((getValue() as number) / 1024).toFixed(0)} MB`,
    },
    { accessorKey: 'threads', header: 'Threads' },
    { accessorKey: 'state', header: 'State' },
  ];

  // Latest thermal sample per zone
  const thermalZones = displayThermal.reduce<Record<string, number>>((acc, s) => {
    acc[s.zone_name] = s.temperature_celsius;
    return acc;
  }, {});

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Process & Resources</h1>

      {/* System gauges */}
      {displayResources && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">CPU</p>
            <GaugeBar value={displayResources.total_cpu_percent} max={100} color="bg-blue-500" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {displayResources.total_cpu_percent.toFixed(1)}% total CPU usage
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">RAM</p>
            <GaugeBar
              value={displayResources.used_ram_kb}
              max={displayResources.total_ram_kb}
              color="bg-purple-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {(displayResources.used_ram_kb / 1024 / 1024).toFixed(1)} GB of {(displayResources.total_ram_kb / 1024 / 1024).toFixed(1)} GB used
            </p>
          </div>
        </section>
      )}

      {/* Thermal zones */}
      {Object.keys(thermalZones).length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Thermal</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(thermalZones).map(([zone, temp]) => (
              <div key={zone} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">{zone}</p>
                <p className={`text-lg font-bold ${temp > 50 ? 'text-red-500' : temp > 40 ? 'text-yellow-500' : 'text-green-600 dark:text-green-400'}`}>
                  {temp.toFixed(1)}°C
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Process table */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Processes ({displayResources ? displayResources.processes.length : 0})
        </h2>
        <DataTable
          data={displayResources ? displayResources.processes : []}
          columns={columns}
          emptyMessage="No process data available."
          className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
        />
      </section>
    </div>
  );
}
