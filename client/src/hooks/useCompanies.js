import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { companiesAPI } from '../api/companies'

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesAPI.list().then((r) => r.data),
  })
}

export function useCreateCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: companiesAPI.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  })
}
