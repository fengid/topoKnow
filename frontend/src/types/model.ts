export interface AIModel {
  id: string
  provider: string
  display_name: string
}

export interface ModelsResponse {
  models: AIModel[]
  default_model: string
}
