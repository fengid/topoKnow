import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { databaseApi } from '../../../services/databaseApi'
import type { TableName } from '../types/database'

export function useTableData(tableName: TableName) {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['database', tableName],
    queryFn: () => databaseApi.getAll(tableName),
    staleTime: 30000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => databaseApi.delete(tableName, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['database', tableName] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      databaseApi.update(tableName, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['database', tableName] })
    },
  })

  return {
    data: data || [],
    isLoading,
    error,
    deleteItem: deleteMutation.mutate,
    updateItem: updateMutation.mutate,
    isDeleting: deleteMutation.isPending,
    isUpdating: updateMutation.isPending,
  }
}
