import React from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useDeviceEvents } from '@/hooks/useWebSocket';

export default function LiveActivityPage() {
  const activeSession = useSessionStore((s) => s.activeSession);
  const sessionId = activeSession?.id ?? null;

  const { events, isSubscribed, clearEvents } = useDeviceEvents(sessionId, 500);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-bold text-gray-900 dark:text-white">Live Activity</h1>
          <span
            className={`h-2 w-2 rounded-full ${isSubscribed ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}
          />
        </div>
        <button
          type="button"
          onClick={clearEvents}
          className="text-xs px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-red-400 hover:text-red-500 transition-colors"
        >
          Clear
        </button>
      </div>

      <div className="flex-1 overflow-auto font-mono text-xs p-2 space-y-0.5">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-gray-500 dark:text-gray-400">
              {sessionId
                ? 'Waiting for events...'
                : 'Connect a device to see live events.'}
            </p>
          </div>
        ) : (
          [...events].reverse().map((event, i) => (
            <div
              key={i}
              className="flex items-start gap-2 px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <span className="text-gray-400 flex-shrink-0 w-16">
                {new Date(event.meta.timestamp).toISOString().slice(11, 23)}
              </span>
              <span className="text-purple-600 dark:text-purple-400 flex-shrink-0 w-20">
                {event.type}
              </span>
              <span className="text-gray-700 dark:text-gray-300 truncate flex-1">
                {JSON.stringify(event.data)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
