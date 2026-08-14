import { useState } from 'react'
import { App as AntApp, Button, Card, Form, Input } from 'antd'

type ZnsFormValues = {
  appId: string
  accessToken: string
  secretKey: string
  templateId?: string
}

function ZnsConfig() {
  const { message } = AntApp.useApp()
  const [saving, setSaving] = useState(false)

  function handleSubmit() {
    setSaving(true)
    window.setTimeout(() => {
      message.success('Đã lưu cấu hình ZNS')
      setSaving(false)
    }, 500)
  }

  return (
    <Card title="Cấu hình ZNS" style={{ maxWidth: 560 }}>
      <Form<ZnsFormValues>
        layout="vertical"
        requiredMark={false}
        onFinish={handleSubmit}
        initialValues={{ templateId: '' }}
      >
        <Form.Item
          name="appId"
          label="Zalo App ID"
          rules={[{ required: true, message: 'Vui lòng nhập App ID' }]}
        >
          <Input placeholder="Nhập Zalo App ID" />
        </Form.Item>
        <Form.Item
          name="accessToken"
          label="Access Token"
          rules={[{ required: true, message: 'Vui lòng nhập Access Token' }]}
        >
          <Input.Password placeholder="Nhập Access Token" />
        </Form.Item>
        <Form.Item
          name="secretKey"
          label="Secret Key"
          rules={[{ required: true, message: 'Vui lòng nhập Secret Key' }]}
        >
          <Input.Password placeholder="Nhập Secret Key" />
        </Form.Item>
        <Form.Item name="templateId" label="Template ID (không bắt buộc)">
          <Input placeholder="Nhập Template ID" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={saving}>
          Lưu cấu hình
        </Button>
      </Form>
    </Card>
  )
}

export default ZnsConfig