import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionsAPI } from '../api/sessions'

export function useSessions(params) {
  return useQuery({
    queryKey: ['sessions', params],
    queryFn: () => sessionsAPI.list(params).then((r) => r.data),
  })
}

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: sessionsAPI.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })
}

export function useUpdateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => sessionsAPI.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })
}

export function useUpdateSessionStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }) => sessionsAPI.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })
}
