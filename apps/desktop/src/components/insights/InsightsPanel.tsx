import React from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useInsights } from '@/hooks/useInsights';
import { useSessionStore } from '@/stores/sessionStore';
import { InsightCard } from './InsightCard';

export function InsightsPanel() {
  const { insightsPanelOpen, toggleInsightsPanel } = useUIStore();
  const activeSession = useSessionStore((s) => s.activeSession);
  const { insights, dismiss } = useInsights(activeSession?.id ?? null);

  return (
    <aside
      className={`
        flex flex-col border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-850
        flex-shrink-0 transition-all duration-200
        ${insightsPanelOpen ? 'w-64' : 'w-8'}
      `}
    >
      {/* Toggle button */}
      <button
        type="button"
        onClick={toggleInsightsPanel}
        className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 self-start flex-shrink-0 mt-1"
        title={insightsPanelOpen ? 'Collapse insights' : 'Expand insights'}
      >
        {insightsPanelOpen ? '→' : '←'}
      </button>

      {insightsPanelOpen && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Insights
              {insights.length > 0 && (
                <span className="ml-1.5 text-blue-600 dark:text-blue-400">
                  ({insights.length})
                </span>
              )}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {insights.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
                {activeSession ? 'No insights yet.' : 'Connect a device to see insights.'}
              </p>
            ) : (
              insights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onDismiss={dismiss}
                />
              ))
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
