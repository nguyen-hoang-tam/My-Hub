export interface ZnsConfigItem {
  id: string;
  partnerId: string;
  type: string;
  category: string;
  name: string;
  zaloTemplateId: string;
  zaloTemplate: string;
  variables: string[];
  sampleMessage: string;
  accessToken: string;
  phone: string;
  mapping: Record<string, string>;
  events: string[];
  ready: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ZnsHistoryItem {
  id: string;
  orderId: string;
  phone: string;
  templateId: string;
  templateName: string;
  sentAt: number;
  status: "success" | "failed";
  error: string;
  request: unknown;
  response: unknown;
}
