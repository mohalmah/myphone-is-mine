import React from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useDomainBreakdown, useNetworkFlows } from '@/hooks/useNetwork';
import { DomainTag } from '@/components/common/DomainTag';
import { RiskBadge } from '@/components/common/Badge';
import { formatBytes } from '@/services/formatters';
import { useUIStore } from '@/stores/uiStore';
export default function NetworkPage() {
  const activeSession = useSessionStore((s) => s.activeSession);
  const sessionId = activeSession?.id ?? null;
  const friendlyMode = useUIStore((s) => s.friendlyMode);

  const { data: domainBreakdown } = useDomainBreakdown(sessionId);
  const { data: flows } = useNetworkFlows(sessionId);

  const displayDomains = domainBreakdown ?? [];
  const displayFlows = flows ?? [];

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Network</h1>

      {/* Domain breakdown */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Domain Breakdown
        </h2>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {['Domain', 'Risk', 'Sent', 'Received', 'Requests', 'Apps'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {displayDomains.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-xs text-gray-400">
                  {sessionId ? 'No domain data yet — requires helper app or root.' : 'Connect a device and start a session.'}
                </td></tr>
              )}
              {displayDomains.map((d) => (
                <tr key={d.domain} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-3 py-2">
                    <DomainTag domain={d.domain} category={d.category} />
                  </td>
                  <td className="px-3 py-2">
                    <RiskBadge risk={d.risk_level} />
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">
                    {formatBytes(d.bytes_sent, friendlyMode)}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">
                    {formatBytes(d.bytes_received, friendlyMode)}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">
                    {d.request_count}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">
                    {d.app_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Flow table */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Network Flows ({displayFlows.length})
        </h2>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {['App', 'Domain', 'Direction', 'Sent', 'Received'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {displayFlows.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-xs text-gray-400">
                  {sessionId ? 'No network flows yet — requires helper app or root.' : 'Connect a device and start a session.'}
                </td></tr>
              )}
              {displayFlows.map((flow) => (
                <tr key={flow.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-3 py-2 text-xs font-mono text-gray-700 dark:text-gray-300">
                    {flow.package_name ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    {flow.domain_name ? (
                      <DomainTag domain={flow.domain_name} category={flow.domain_category} />
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">
                    {flow.direction === 'outbound' ? '↑' : '↓'} {flow.direction}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">
                    {formatBytes(flow.bytes_sent, friendlyMode)}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">
                    {formatBytes(flow.bytes_received, friendlyMode)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
