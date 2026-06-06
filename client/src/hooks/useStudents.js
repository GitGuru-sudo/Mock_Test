import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentsAPI } from '../api/students'

export function useStudents(params) {
  return useQuery({
    queryKey: ['students', params],
    queryFn: () => studentsAPI.list(params).then((r) => r.data),
  })
}

export function useCreateStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => studentsAPI.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  })
}

export function useUpdateStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => studentsAPI.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  })
}

export function useDeleteStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => studentsAPI.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  })
}
