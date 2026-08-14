import { useState } from 'react'
import { Alert, App as AntApp, Button, Card, Checkbox, Col, Input, Row, Select, Space, Tag, Typography } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, SendOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { znsApi, type ZnsConfigInput, type ZnsConfigItem } from './api'
import { DATA_FIELD_SAMPLES, DATA_FIELDS, TRIGGERS } from './zns'
import './ZnsConfig.css'

function renderTemplate(text: string, values: Record<string, string>) {
  const parts = text.split(/(\{[^}]+\})/g)
  return (
    <span>
      {parts.map((p, i) => {
        if (!/^\{[^}]+\}$/.test(p)) return <span key={i}>{p}</span>
        const name = p.slice(1, -1)
        const value = values[name]
        return value ? (
          <b key={i} style={{ color: '#0958d9' }}>
            {value}
          </b>
        ) : (
          <span key={i} style={{ color: '#e02424', fontWeight: 600 }}>
            {p}
          </span>
        )
      })}
    </span>
  )
}

function ZnsConfigScreen({
  config,
  onBack,
  onSaved,
}: {
  config: ZnsConfigItem
  onBack: () => void
  onSaved: () => void
}) {
  const { message } = AntApp.useApp()

  const [mapping, setMapping] = useState<Record<string, string>>(config.mapping ?? {})
  const [events, setEvents] = useState<string[]>(config.events ?? [])
  const [accessToken, setAccessToken] = useState(config.accessToken ?? '')
  const [phone, setPhone] = useState(config.phone ?? '')

  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [testPhone, setTestPhone] = useState('')

  const [simEvent, setSimEvent] = useState<string | undefined>(TRIGGERS[0]?.key)
  const [simulating, setSimulating] = useState(false)
  const [simResult, setSimResult] = useState<string | null>(null)

  function handleMappingChange(key: string, value: string | undefined) {
    setMapping((prev) => {
      const next = { ...prev }
      if (value) next[key] = value
      else delete next[key]
      return next
    })
  }

  function resolveValues(): Record<string, string> {
    const values: Record<string, string> = {}
    for (const v of config.variables) {
      const field = mapping[v]
      values[v] = field ? DATA_FIELD_SAMPLES[field] ?? '' : ''
    }
    return values
  }

  async function handleSave() {
    if (!accessToken.trim()) {
      message.warning('Nhập Access Token để kích hoạt gửi ZNS')
      return
    }
    const input: ZnsConfigInput = {
      partnerId: config.partnerId,
      type: config.type,
      category: config.category,
      name: config.name,
      zaloTemplateId: config.zaloTemplateId,
      zaloTemplate: config.zaloTemplate,
      variables: config.variables,
      sampleMessage: config.sampleMessage,
      accessToken: accessToken.trim(),
      phone: phone.trim(),
      mapping,
      events,
      ready: true,
    }
    setSaving(true)
    try {
      await znsApi.updateConfig(config.id, input)
      message.success('Đã lưu cấu hình, template đã sẵn sàng')
      onSaved()
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Lưu cấu hình thất bại')
    } finally {
      setSaving(false)
    }
  }

  async function handleTestSend() {
    const target = testPhone.trim() || phone.trim()
    if (!target) {
      message.warning('Nhập số điện thoại để gửi thử')
      return
    }
    if (!accessToken.trim()) {
      message.warning('Nhập Access Token trước khi gửi thử')
      return
    }
    setSending(true)
    try {
      const result = await znsApi.send({
        configId: config.id,
        templateData: resolveValues(),
        phone: target,
        order: { order_code: 'DH-TEST' },
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

  async function handleSimulate() {
    if (!simEvent) return
    setSimulating(true)
    setSimResult(null)
    try {
      const result = await znsApi.triggerEvent(simEvent, DATA_FIELD_SAMPLES)
      setSimResult(
        result.sent > 0
          ? `Đã tự động gửi ${result.sent} template cho sự kiện "${result.event}"`
          : 'Không có template nào được kích hoạt cho sự kiện này (hãy chọn sự kiện ở phần trên và Lưu)'
      )
    } catch (e) {
      setSimResult(e instanceof Error ? e.message : 'Mô phỏng thất bại')
    } finally {
      setSimulating(false)
    }
  }

  const values = resolveValues()

  return (
    <Card
      className="zns-editor"
      title={
        <Space>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack} aria-label="Quay lại" />
          <div>
            <div>Cấu hình sử dụng template</div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {config.name} · Zalo Template Id: {config.zaloTemplateId}
            </Typography.Text>
          </div>
        </Space>
      }
      extra={
        <Space>
          <Button onClick={onBack}>Hủy</Button>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
            Lưu cấu hình
          </Button>
        </Space>
      }
    >
      {config.variables.length === 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Template chưa khai báo biến"
          description='Hãy vào "Sửa" và khai báo biến dạng {ten_bien} trong phần Mẫu zalo để có thể ánh xạ dữ liệu.'
        />
      )}

      <Row gutter={[32, 24]}>
        <Col xs={24} lg={14}>
          <div className="zns-section-card">
            <div className="zns-section-title">Ánh xạ dữ liệu (Mapping)</div>
            {config.variables.length === 0 ? (
              <Typography.Text type="secondary">Chưa có biến để ánh xạ.</Typography.Text>
            ) : (
              <div className="mapping-table">
                <div className="mapping-row mapping-head">
                  <div>Template param</div>
                  <div>Nguồn dữ liệu (Link Tracking)</div>
                </div>
                {config.variables.map((v) => (
                  <div className="mapping-row" key={v}>
                    <div className="mapping-param">
                      <code>{`{${v}}`}</code>
                    </div>
                    <div>
                      <Select
                        className="mapping-select"
                        placeholder="Chọn field ▼"
                        allowClear
                        showSearch
                        options={DATA_FIELDS}
                        value={mapping[v]}
                        onChange={(val) => handleMappingChange(v, val)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="zns-section-card">
            <div className="zns-section-title">Sự kiện kích hoạt gửi ZNS</div>
            <Checkbox.Group
              value={events}
              onChange={(vals) => setEvents(vals as string[])}
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
            <div className="zns-section-title">Cấu hình gửi</div>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <div>
                <Typography.Text style={{ display: 'block', marginBottom: 4 }}>
                  Access Token
                </Typography.Text>
                <Input.Password
                  placeholder="Access token của tài khoản Zalo OA"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                />
              </div>
              <div>
                <Typography.Text style={{ display: 'block', marginBottom: 4 }}>
                  Số điện thoại nhận mặc định
                </Typography.Text>
                <Input
                  placeholder="84987654321"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </Space>
          </div>

          <div className="zns-section-card">
            <div className="zns-section-title">Gửi thử nghiệm (tùy chọn)</div>
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
            <Typography.Text strong>Xem trước tin nhắn:</Typography.Text>
            <div className="zns-msg-bubble">
              {config.zaloTemplate ? (
                renderTemplate(config.zaloTemplate, values)
              ) : (
                <Typography.Text type="secondary">Chưa có nội dung mẫu</Typography.Text>
              )}
            </div>

            {config.ready && (
              <div style={{ marginTop: 12 }}>
                <Tag color="success">Sẵn sàng</Tag>
              </div>
            )}

            <Typography.Text strong style={{ display: 'block', marginTop: 16 }}>
              Mô phỏng sự kiện tự động gửi:
            </Typography.Text>
            <Space.Compact style={{ width: '100%', marginTop: 8 }}>
              <Select
                style={{ width: '100%' }}
                value={simEvent}
                onChange={setSimEvent}
                options={TRIGGERS.map((t) => ({ value: t.key, label: t.label }))}
              />
              <Button icon={<ThunderboltOutlined />} loading={simulating} onClick={handleSimulate}>
                Chạy
              </Button>
            </Space.Compact>
            {simResult && (
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                {simResult}
              </Typography.Text>
            )}
          </div>
        </Col>
      </Row>
    </Card>
  )
}

export default ZnsConfigScreen