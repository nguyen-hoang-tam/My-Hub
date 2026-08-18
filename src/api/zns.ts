import { request } from './client'

export type ZnsConfigItem = {
  id: string
  partnerId: string
  type: string
  category: string
  name: string
  zaloTemplateId: string
  zaloTemplate: string
  variables: string[]
  sampleMessage: string
  accessToken: string
  phone: string
  mapping: Record<string, string>
  events: string[]
  ready: boolean
  createdAt: number
  updatedAt: number
}

export type ZnsConfigInput = {
  partnerId: string
  type: string
  category: string
  name: string
  zaloTemplateId: string
  zaloTemplate: string
  variables: string[]
  sampleMessage: string
  accessToken: string
  phone: string
  mapping: Record<string, string>
  events: string[]
  ready: boolean
}

export type ZnsSendInput = {
  configId: string
  templateData?: Record<string, string>
  phone?: string
  order?: Record<string, string>
}

export type ZnsSendResult = {
  status: number
  ok: boolean
  data: unknown
}

export type ZnsEventResult = {
  event: string
  sent: number
  results: Array<{ configId: string; name: string; ok: boolean; data: unknown }>
}

export type ZnsHistoryItem = {
  id: string
  orderId: string
  phone: string
  templateId: string
  templateName: string
  sentAt: number
  status: 'success' | 'failed'
  error: string
  request: unknown
  response: unknown
}

export const znsApi = {
  listHistory: (signal?: AbortSignal): Promise<ZnsHistoryItem[]> =>
    request<ZnsHistoryItem[]>('/api/zns/history', { signal }),

  listConfigs: (signal?: AbortSignal): Promise<ZnsConfigItem[]> =>
    request<ZnsConfigItem[]>('/api/zns/configs', { signal }),

  getConfig: (id: string): Promise<ZnsConfigItem> =>
    request<ZnsConfigItem>(`/api/zns/configs/${id}`),

  createConfig: (input: ZnsConfigInput): Promise<ZnsConfigItem> =>
    request<ZnsConfigItem>('/api/zns/configs', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateConfig: (id: string, input: ZnsConfigInput): Promise<ZnsConfigItem> =>
    request<ZnsConfigItem>(`/api/zns/configs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  deleteConfig: (id: string): Promise<{ ok: boolean }> =>
    request<{ ok: boolean }>(`/api/zns/configs/${id}`, { method: 'DELETE' }),

  send: (input: ZnsSendInput): Promise<ZnsSendResult> =>
    request<ZnsSendResult>('/api/zns/send', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  triggerEvent: (eventKey: string, order?: Record<string, string>): Promise<ZnsEventResult> =>
    request<ZnsEventResult>(`/api/zns/events/${eventKey}`, {
      method: 'POST',
      body: JSON.stringify({ order }),
    }),
}
