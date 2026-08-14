import { useEffect, useState } from 'react'
import {
  App as AntApp,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Row,
  Typography,
} from 'antd'
import { znsApi, type ZnsConfig as ZnsConfigData } from './api'
import './ZnsConfig.css'

type ConfigValues = {
  accessToken: string
  templateId: string
  phone: string
}

type TemplateValues = {
  ky?: string
  thang?: string
  start_date?: string
  end_date?: string
  customer?: string
  cid?: string
  address?: string
  amount?: string
  total?: string
  tracking_id?: string
}

const EMPTY_CONFIG: ZnsConfigData = { accessToken: '', templateId: '', phone: '' }

function ZnsConfig() {
  const { message } = AntApp.useApp()
  const [configForm] = Form.useForm<ConfigValues>()
  const [templateForm] = Form.useForm<TemplateValues>()

  const [config, setConfig] = useState<ZnsConfigData>(EMPTY_CONFIG)
  const [configSaving, setConfigSaving] = useState(false)
  const [sending, setSending] = useState(false)

  const templateValues = Form.useWatch<TemplateValues>([], templateForm) ?? {}

  useEffect(() => {
    const controller = new AbortController()
    znsApi
      .getConfig(controller.signal)
      .then((cfg) => {
        setConfig(cfg)
        configForm.setFieldsValue({
          accessToken: cfg.accessToken,
          templateId: cfg.templateId,
          phone: cfg.phone,
        })
      })
      .catch(() => {})
    return () => controller.abort()
  }, [configForm])

  async function handleSaveConfig() {
    const values = await configForm.validateFields().catch(() => null)
    if (!values) return
    setConfigSaving(true)
    try {
      const saved = await znsApi.saveConfig({
        accessToken: values.accessToken.trim(),
        templateId: values.templateId.trim(),
        phone: values.phone.trim(),
      })
      setConfig(saved)
      message.success('Đã lưu cấu hình ZNS')
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Lưu cấu hình thất bại')
    } finally {
      setConfigSaving(false)
    }
  }

  async function handleSend() {
    const values = await templateForm.validateFields().catch(() => null)
    if (!values) return
    const { tracking_id, ...rest } = values
    setSending(true)
    try {
      const result = await znsApi.send({
        templateData: Object.fromEntries(
          Object.entries(rest).filter(([, v]) => v !== undefined && v !== '')
        ),
        trackingId: tracking_id,
      })
      if (result.ok) {
        message.success('Đã gửi ZNS thành công')
      } else {
        message.error(`Zalo trả lỗi (${result.status}): ${JSON.stringify(result.data)}`)
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Gửi ZNS thất bại')
    } finally {
      setSending(false)
    }
  }

  const requestPayload = {
    phone: config.phone,
    template_id: config.templateId,
    template_data: {
      ky: templateValues.ky ?? '',
      thang: templateValues.thang ?? '',
      start_date: templateValues.start_date ?? '',
      end_date: templateValues.end_date ?? '',
      customer: templateValues.customer ?? '',
      cid: templateValues.cid ?? '',
      address: templateValues.address ?? '',
      amount: templateValues.amount ?? '',
      total: templateValues.total ?? '',
    },
    tracking_id: templateValues.tracking_id ?? '',
  }

  const t = templateValues

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={9}>
        <Card title="Cấu hình ZNS">
          <Form form={configForm} layout="vertical" requiredMark={false}>
            <Form.Item
              name="accessToken"
              label="Access Token"
              rules={[{ required: true, message: 'Vui lòng nhập Access Token' }]}
            >
              <Input.Password placeholder="Nhập Access Token" />
            </Form.Item>
            <Form.Item
              name="templateId"
              label="Template ID"
              rules={[{ required: true, message: 'Vui lòng nhập Template ID' }]}
            >
              <Input placeholder="VD: 7895417a7d3f9461cd2e" />
            </Form.Item>
            <Form.Item name="phone" label="Số điện thoại người nhận">
              <Input placeholder="VD: 84987654321" />
            </Form.Item>
            <Button type="primary" loading={configSaving} onClick={handleSaveConfig}>
              Lưu cấu hình
            </Button>
          </Form>
        </Card>
      </Col>

      <Col xs={24} lg={15}>
        <Card title="Xem trước template & gửi ZNS">
          <Form form={templateForm} layout="vertical" requiredMark={false}>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="ky" label="Kỳ (ky)">
                  <Input placeholder="1" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="thang" label="Tháng (thang)">
                  <Input placeholder="4/2020" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="start_date" label="Ngày bắt đầu (start_date)">
                  <Input placeholder="20/03/2020" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="end_date" label="Ngày kết thúc (end_date)">
                  <Input placeholder="20/04/2020" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="customer" label="Khách hàng (customer)">
                  <Input placeholder="Nguyễn Thị Hoàng Anh" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="cid" label="Mã KH (cid)">
                  <Input placeholder="PE010299485" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="address" label="Địa chỉ (address)">
                  <Input placeholder="VNG Campus, TP.HCM" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="amount" label="Điện năng (amount)">
                  <Input placeholder="100" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="total" label="Tổng tiền (total)">
                  <Input placeholder="100000" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="tracking_id" label="Tracking ID (không bắt buộc)">
                  <Input placeholder="tracking_id" />
                </Form.Item>
              </Col>
            </Row>
          </Form>

          <Divider plain>Xem trước tin nhắn</Divider>

          <div className="zns-preview">
            <div className="zns-preview-avatar">Z</div>
            <div className="zns-preview-bubble">
              <div className="zns-preview-title">Hóa đơn điện tử</div>
              <div className="zns-preview-row">
                <span>Kỳ sử dụng</span>
                <b>
                  {t.ky || '—'} / tháng {t.thang || '—'}
                </b>
              </div>
              <div className="zns-preview-row">
                <span>Thời gian</span>
                <b>
                  {t.start_date || '—'} → {t.end_date || '—'}
                </b>
              </div>
              <div className="zns-preview-row">
                <span>Khách hàng</span>
                <b>{t.customer || '—'}</b>
              </div>
              <div className="zns-preview-row">
                <span>Mã khách hàng</span>
                <b>{t.cid || '—'}</b>
              </div>
              <div className="zns-preview-row">
                <span>Địa chỉ</span>
                <b>{t.address || '—'}</b>
              </div>
              <div className="zns-preview-row">
                <span>Điện năng</span>
                <b>{t.amount || '—'} kWh</b>
              </div>
              <div className="zns-preview-total">Tổng: {t.total || '—'} VNĐ</div>
            </div>
          </div>

          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
            Payload gửi đến Zalo API:
          </Typography.Text>
          <pre className="zns-payload">{JSON.stringify(requestPayload, null, 2)}</pre>

          <Button
            type="primary"
            danger
            loading={sending}
            onClick={handleSend}
            style={{ marginTop: 12 }}
            disabled={!config.accessToken || !config.templateId}
          >
            Gửi ZNS
          </Button>
        </Card>
      </Col>
    </Row>
  )
}

export default ZnsConfig