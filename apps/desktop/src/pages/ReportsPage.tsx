import React, { useState } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { ipc } from '@/services/ipc';

type ExportFormat = 'json' | 'csv' | 'har' | 'report';

const FORMAT_OPTIONS: { format: ExportFormat; label: string; description: string }[] = [
  { format: 'json', label: 'JSON Export', description: 'All collected data in JSON format.' },
  { format: 'csv', label: 'CSV Export', description: 'Tabular data in CSV format for spreadsheets.' },
  { format: 'har', label: 'HAR Export', description: 'HTTP Archive format (proxy data only).' },
  { format: 'report', label: 'HTML Report', description: 'Human-readable HTML report with insights.' },
];

export default function ReportsPage() {
  const activeSession = useSessionStore((s) => s.activeSession);
  const sessionId = activeSession?.id ?? null;

  const [outputPath, setOutputPath] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (format: ExportFormat) => {
    if (!sessionId || !outputPath) return;
    setIsExporting(true);
    setError(null);
    try {
      switch (format) {
        case 'json':
          await ipc.exportCommands.export_json(sessionId, outputPath);
          break;
        case 'csv':
          await ipc.exportCommands.export_csv(sessionId, outputPath);
          break;
        case 'har':
          await ipc.exportCommands.export_har(sessionId, outputPath);
          break;
        case 'report':
          await ipc.exportCommands.generate_report(sessionId, outputPath);
          break;
      }
      setLastExport(`Exported to: ${outputPath}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-4 space-y-6 max-w-xl">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Reports & Export</h1>

      {!sessionId && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Connect a device and start a session to export data.
          </p>
        </div>
      )}

      {/* Output path */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Output Path
        </label>
        <input
          type="text"
          placeholder="/home/user/phonescope-export.json"
          value={outputPath}
          onChange={(e) => setOutputPath(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
        />
      </div>

      {/* Export options */}
      <div className="space-y-3">
        {FORMAT_OPTIONS.map(({ format, label, description }) => (
          <div
            key={format}
            className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
            </div>
            <button
              type="button"
              disabled={!sessionId || !outputPath || isExporting}
              onClick={() => void handleExport(format)}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              Export
            </button>
          </div>
        ))}
      </div>

      {lastExport && (
        <p className="text-sm text-green-600 dark:text-green-400">{lastExport}</p>
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
