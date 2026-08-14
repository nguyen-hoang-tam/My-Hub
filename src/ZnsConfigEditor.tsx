import { useEffect, useState } from 'react'
import { App as AntApp, Button, Card, Col, Checkbox, Form, Input, Row, Select, Space, Switch, Tag, Typography } from 'antd'
import { ArrowLeftOutlined, DeleteOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons'
import { znsApi, type ZaloTemplate, type ZnsConfigItem } from './api'
import { DATA_FIELDS, DATA_FIELD_SAMPLES, TEMPLATE_PARAMS, TRIGGERS, statusMeta, typeMeta } from './zns'
import { TemplatePreview } from './ZnsPreview'
import { formatPrice } from './format'
import './ZnsConfig.css'

function ZnsConfigEditor({
  template,
  onBack,
  onSaved,
}: {
  template: ZaloTemplate
  onBack: () => void
  onSaved: (config: ZnsConfigItem) => void
}) {
  const { message, modal } = AntApp.useApp()
  const [form] = Form.useForm<{ name: string; accessToken: string; phone: string; enabled: boolean; trackingId: string }>()

  const [configId, setConfigId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sending, setSending] = useState(false)

  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [triggers, setTriggers] = useState<string[]>([])
  const [testPhone, setTestPhone] = useState('')

  useEffect(() => {
    let active = true
    znsApi
      .listConfigs()
      .then((configs) => {
        if (!active) return
        const found = configs.find((c) => c.templateId === template.templateId)
        if (found) {
          setConfigId(found.id)
          setMapping(found.mapping ?? {})
          setTriggers(found.triggers ?? [])
          form.setFieldsValue({
            name: found.name,
            accessToken: found.accessToken,
            phone: found.phone,
            enabled: found.enabled,
            trackingId: found.trackingId,
          })
        } else {
          form.setFieldsValue({
            name: template.name,
            accessToken: '',
            phone: '',
            enabled: true,
            trackingId: '',
          })
        }
      })
      .catch((e) => message.error(e instanceof Error ? e.message : 'Không thể tải cấu hình'))
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [template, form, message])

  function handleMappingChange(key: string, value: string) {
    setMapping((prev) => {
      const next = { ...prev }
      if (value) next[key] = value
      else delete next[key]
      return next
    })
  }

  function resolvedValues(): Record<string, string> {
    const values: Record<string, string> = {}
    for (const p of TEMPLATE_PARAMS) {
      const mapped = mapping[p.key]
      values[p.key] = mapped ? DATA_FIELD_SAMPLES[mapped] ?? mapped : ''
    }
    return values
  }

  async function saveConfig(): Promise<ZnsConfigItem | null> {
    const values = await form.validateFields().catch(() => null)
    if (!values) return null
    const input = {
      name: values.name.trim(),
      accessToken: values.accessToken.trim(),
      templateId: template.templateId,
      phone: values.phone.trim(),
      enabled: values.enabled,
      trackingId: values.trackingId ?? '',
      templateData: {},
      mapping,
      triggers,
    }
    setSaving(true)
    try {
      const config = configId
        ? await znsApi.updateConfig(configId, input)
        : await znsApi.createConfig(input)
      setConfigId(config.id)
      message.success('Đã lưu cấu hình')
      onSaved(config)
      return config
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Lưu cấu hình thất bại')
      return null
    } finally {
      setSaving(false)
    }
  }

  async function handleSave() {
    await saveConfig()
  }

  function confirmDelete() {
    if (!configId) {
      message.info('Cấu hình chưa được lưu')
      return
    }
    modal.confirm({
      title: 'Xóa cấu hình',
      content: `Bạn có chắc muốn xóa cấu hình của template "${template.name}"?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        setDeleting(true)
        try {
          await znsApi.deleteConfig(configId)
          message.success('Đã xóa cấu hình')
          onBack()
        } catch (e) {
          message.error(e instanceof Error ? e.message : 'Không thể xóa cấu hình')
        } finally {
          setDeleting(false)
        }
      },
    })
  }

  async function handleTestSend() {
    const values = form.getFieldsValue()
    const phone = testPhone.trim() || values.phone?.trim()
    if (!phone) {
      message.warning('Nhập số điện thoại để gửi thử')
      return
    }
    setSending(true)
    try {
      let config = configId ? await znsApi.getConfig(configId) : null
      if (!config) {
        config = await saveConfig()
      }
      if (!config) return
      const result = await znsApi.send({
        configId: config.id,
        templateData: resolvedValues(),
        phone,
        orderId: 'DH-TEST',
      })
      if (result.ok) {
        message.success('Đã gửi ZNS thử nghiệm thành công')
      } else {
        message.error(`Zalo trả lỗi (${result.status}): ${JSON.stringify(result.data)}`)
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Gửi thử thất bại')
    } finally {
      setSending(false)
    }
  }

  const st = statusMeta(template.status)
  const ty = typeMeta(template.type)
  const previewData = resolvedValues()

  return (
    <Card
      className="zns-editor"
      loading={loading}
      title={
        <Space>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack} aria-label="Quay lại" />
          <div>
            <div>Cấu hình template: {template.name}</div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              ID: {template.templateId}
            </Typography.Text>
          </div>
        </Space>
      }
      extra={
        <Space>
          <Button danger icon={<DeleteOutlined />} loading={deleting} onClick={confirmDelete}>
            Xóa cấu hình
          </Button>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
            Lưu cấu hình
          </Button>
        </Space>
      }
    >
      <Row gutter={[32, 24]}>
        <Col xs={24} lg={14}>
          <div className="zns-section-card">
            <div className="zns-section-title">Thông tin template</div>
            <div className="detail-grid">
              <div>
                <div className="detail-label">Loại</div>
                <div className="detail-value">
                  <Tag color={ty.color}>{ty.label}</Tag>
                </div>
              </div>
              <div>
                <div className="detail-label">Trạng thái</div>
                <div className="detail-value">
                  <Tag color={st.color}>{st.label}</Tag>
                </div>
              </div>
              <div>
                <div className="detail-label">Mục đích</div>
                <div className="detail-value">{template.purpose || '—'}</div>
              </div>
              <div>
                <div className="detail-label">Chi phí</div>
                <div className="detail-value">{template.price ? formatPrice(template.price) : '—'}</div>
              </div>
            </div>
          </div>

          <div className="zns-section-card">
            <div className="zns-section-title">Cấu hình chung</div>
            <Form form={form} layout="vertical" requiredMark={false}>
              <Row gutter={12}>
                <Col span={16}>
                  <Form.Item
                    name="name"
                    label="Tên cấu hình"
                    rules={[{ required: true, whitespace: true, message: 'Nhập tên cấu hình' }]}
                  >
                    <Input placeholder="VD: Xác nhận đơn hàng" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="enabled" label="Kích hoạt" valuePropName="checked">
                    <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                name="accessToken"
                label="Access Token"
                rules={[{ required: true, message: 'Nhập Access Token' }]}
              >
                <Input.Password placeholder="Access token của tài khoản Zalo OA" />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="phone" label="Số điện thoại nhận mặc định">
                    <Input placeholder="84987654321" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="trackingId" label="Tracking ID">
                    <Input placeholder="tracking_id — VD: abc123" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </div>

          <div className="zns-section-card">
            <div className="zns-section-title">Ánh xạ dữ liệu (Mapping)</div>
            <div className="mapping-table">
              <div className="mapping-row mapping-head">
                <div>Template param</div>
                <div>Nguồn dữ liệu (Link Tracking)</div>
              </div>
              {TEMPLATE_PARAMS.map((p) => (
                <div className="mapping-row" key={p.key}>
                  <div className="mapping-param">
                    <code>{`{{${p.key}}}`}</code>
                  </div>
                  <div>
                    <Select
                      className="mapping-select"
                      placeholder="Chọn field ▼"
                      allowClear
                      showSearch
                      mode="tags"
                      maxCount={1}
                      popupMatchSelectWidth={false}
                      suffixIcon={null}
                      options={DATA_FIELDS}
                      value={mapping[p.key] ? [mapping[p.key]] : []}
                      onChange={(vals) => handleMappingChange(p.key, vals[vals.length - 1] ?? '')}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="zns-section-card">
            <div className="zns-section-title">Điều kiện kích hoạt gửi ZNS</div>
            <Checkbox.Group
              value={triggers}
              onChange={(vals) => setTriggers(vals as string[])}
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              {TRIGGERS.map((t) => (
                <Checkbox key={t.key} value={t.key}>
                  {t.label}
                </Checkbox>
              ))}
            </Checkbox.Group>
          </div>

          <div className="zns-section-card">
            <div className="zns-section-title">Gửi thử nghiệm</div>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="Số điện thoại nhận tin thử — VD: 84987654321"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
              <Button type="primary" icon={<SendOutlined />} loading={sending} onClick={handleTestSend}>
                Gửi thử
              </Button>
            </Space.Compact>
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
              * Gửi mẫu tin đến số này để kiểm tra nội dung trước khi áp dụng chính thức.
            </Typography.Text>
          </div>
        </Col>

        <Col xs={24} lg={10}>
          <div className="zns-preview-panel">
            <Typography.Text strong>Xem trước nội dung template:</Typography.Text>
            <div style={{ marginTop: 12 }}>
              <TemplatePreview templateName={template.name} data={previewData} />
            </div>
          </div>
        </Col>
      </Row>
    </Card>
  )
}

export default ZnsConfigEditor