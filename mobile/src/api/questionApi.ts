import client from './client'

export const questionApi = {
  delete: (id: string) => client.delete(`/questions/${id}`),
}
