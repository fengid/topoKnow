export interface Prompt {
  id: string
  name: string
  category: string
  description: string
  template: string
  variables: string
  version: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreatePromptRequest {
  name: string
  category: string
  description?: string
  template: string
  variables?: string
  is_active?: boolean
}

export interface UpdatePromptRequest {
  name?: string
  category?: string
  description?: string
  template?: string
  variables?: string
  is_active?: boolean
}
