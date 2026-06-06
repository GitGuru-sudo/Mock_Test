import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { attendanceAPI } from '../api/attendance'

export function useAttendanceBySession(sessionId) {
  return useQuery({
    queryKey: ['attendance', sessionId],
    queryFn: () => attendanceAPI.getBySession(sessionId).then((r) => r.data),
    enabled: !!sessionId,
  })
}

export function useBulkMarkAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: attendanceAPI.bulkMark,
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['attendance', vars.sessionId] }),
  })
}
