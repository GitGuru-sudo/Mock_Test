import { useQuery } from '@tanstack/react-query'
import { dashboardAPI } from '../api/dashboard'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardAPI.getStats().then((r) => r.data),
    refetchInterval: 60_000,
  })
}
