import { useQuery } from '@tanstack/react-query';
import { ipc } from '@/services/ipc';

export function useNetworkFlows(sessionId: number | null, limit = 100) {
  return useQuery({
    queryKey: ['network-flows', sessionId, limit],
    queryFn: () => ipc.networkCommands.get_flows(sessionId!, limit),
    enabled: sessionId !== null,
    refetchInterval: 10_000,
  });
}

export function useHttpRequests(sessionId: number | null, limit = 100) {
  return useQuery({
    queryKey: ['http-requests', sessionId, limit],
    queryFn: () => ipc.networkCommands.get_requests(sessionId!, limit),
    enabled: sessionId !== null,
    refetchInterval: 5_000,
  });
}

export function useDnsQueries(sessionId: number | null, limit = 200) {
  return useQuery({
    queryKey: ['dns-queries', sessionId, limit],
    queryFn: () => ipc.networkCommands.get_dns_queries(sessionId!, limit),
    enabled: sessionId !== null,
    refetchInterval: 10_000,
  });
}

export function useDomainBreakdown(sessionId: number | null) {
  return useQuery({
    queryKey: ['domain-breakdown', sessionId],
    queryFn: () => ipc.networkCommands.get_domain_breakdown(sessionId!),
    enabled: sessionId !== null,
    refetchInterval: 30_000,
  });
}

export function useTopAppsByTraffic(sessionId: number | null, limit = 10) {
  return useQuery({
    queryKey: ['top-apps-traffic', sessionId, limit],
    queryFn: () => ipc.networkCommands.get_top_apps_by_traffic(sessionId!, limit),
    enabled: sessionId !== null,
    refetchInterval: 30_000,
  });
}
