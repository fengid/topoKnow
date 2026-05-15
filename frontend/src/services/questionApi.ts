import client from './client'

// Question API (standalone)
export const questionApi = {
  delete: (id: string) => client.delete(`/questions/${id}`),
}
