import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { resultsAPI } from '../api/results'

export function useResultsBySession(sessionId) {
  return useQuery({
    queryKey: ['results', 'session', sessionId],
    queryFn: () => resultsAPI.getBySession(sessionId).then((r) => r.data),
    enabled: !!sessionId,
  })
}

export function useRecordResult() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: resultsAPI.record,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['results'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateResult() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => resultsAPI.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['results'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
