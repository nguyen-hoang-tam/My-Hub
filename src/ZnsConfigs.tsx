import { useEffect, useState } from 'react'
import {
  App as AntApp,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Modal,
  Row,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SendOutlined,
} from '@ant-design/icons'
import { znsApi, type ZnsConfigInput, type ZnsConfigItem } from './api'
import { formatDate } from './format'
import './ZnsConfig.css'

const TEMPLATE_FIELDS: Array<{ key: string; label: string; placeholder: string; half: boolean }> = [
  { key: 'ky', label: 'Kỳ (ky)', placeholder: '1', half: true },
  { key: 'thang', label: 'Tháng (thang)', placeholder: '4/2020', half: true },
  { key: 'start_date', label: 'Ngày bắt đầu (start_date)', placeholder: '20/03/2020', half: true },
  { key: 'end_date', label: 'Ngày kết thúc (end_date)', placeholder: '20/04/2020', half: true },
  { key: 'customer', label: 'Khách hàng (customer)', placeholder: 'Nguyễn Thị Hoàng Anh', half: true },
  { key: 'cid', label: 'Mã KH (cid)', placeholder: 'PE010299485', half: true },
  { key: 'address', label: 'Địa chỉ (address)', placeholder: 'VNG Campus, TP.HCM', half: false },
  { key: 'amount', label: 'Điện năng (amount)', placeholder: '100', half: true },
  { key: 'total', label: 'Tổng tiền (total)', placeholder: '100000', half: true },
]

type FormValues = {
  name: string
  accessToken: string
  templateId: string
  phone: string
  enabled: boolean
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

const EMPTY_FORM: Partial<FormValues> = {
  name: '',
  accessToken: '',
  templateId: '',
  phone: '',
  enabled: true,
  tracking_id: '',
}

function valuesToInput(v: FormValues): ZnsConfigInput {
  return {
    name: v.name.trim(),
    accessToken: v.accessToken.trim(),
    templateId: v.templateId.trim(),
    phone: v.phone.trim(),
    enabled: v.enabled,
    trackingId: v.tracking_id ?? '',
    templateData: {
      ky: v.ky ?? '',
      thang: v.thang ?? '',
      start_date: v.start_date ?? '',
      end_date: v.end_date ?? '',
      customer: v.customer ?? '',
      cid: v.cid ?? '',
      address: v.address ?? '',
      amount: v.amount ?? '',
      total: v.total ?? '',
    },
  }
}

function inputToValues(c: ZnsConfigItem): FormValues {
  return {
    name: c.name,
    accessToken: c.accessToken,
    templateId: c.templateId,
    phone: c.phone,
    enabled: c.enabled,
    ky: c.templateData.ky ?? '',
    thang: c.templateData.thang ?? '',
    start_date: c.templateData.start_date ?? '',
    end_date: c.templateData.end_date ?? '',
    customer: c.templateData.customer ?? '',
    cid: c.templateData.cid ?? '',
    address: c.templateData.address ?? '',
    amount: c.templateData.amount ?? '',
    total: c.templateData.total ?? '',
    tracking_id: c.trackingId ?? '',
  }
}

function TemplatePreview({ data }: { data: Record<string, string> }) {
  return (
    <div className="zns-preview">
      <div className="zns-preview-avatar">Z</div>
      <div className="zns-preview-bubble">
        <div className="zns-preview-title">Hóa đơn điện tử</div>
        <div className="zns-preview-row">
          <span>Kỳ sử dụng</span>
          <b>
            {data.ky || '—'} / tháng {data.thang || '—'}
          </b>
        </div>
        <div className="zns-preview-row">
          <span>Thời gian</span>
          <b>
            {data.start_date || '—'} → {data.end_date || '—'}
          </b>
        </div>
        <div className="zns-preview-row">
          <span>Khách hàng</span>
          <b>{data.customer || '—'}</b>
        </div>
        <div className="zns-preview-row">
          <span>Mã khách hàng</span>
          <b>{data.cid || '—'}</b>
        </div>
        <div className="zns-preview-row">
          <span>Địa chỉ</span>
          <b>{data.address || '—'}</b>
        </div>
        <div className="zns-preview-row">
          <span>Điện năng</span>
          <b>{data.amount || '—'} kWh</b>
        </div>
        <div className="zns-preview-total">Tổng: {data.total || '—'} VNĐ</div>
      </div>
    </div>
  )
}

function ZnsConfigs() {
  const { message, modal } = AntApp.useApp()
  const [form] = Form.useForm<FormValues>()

  const [configs, setConfigs] = useState<ZnsConfigItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<ZnsConfigItem | null>(null)
  const [saving, setSaving] = useState(false)

  const [detail, setDetail] = useState<ZnsConfigItem | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    znsApi
      .listConfigs(controller.signal)
      .then((data) => {
        setError(null)
        setConfigs(data)
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : 'Không thể tải danh sách cấu hình')
        }
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  function openAdd() {
    setEditing(null)
    form.setFieldsValue(EMPTY_FORM)
    setEditorOpen(true)
  }

  function openEdit(item: ZnsConfigItem) {
    setEditing(item)
    form.setFieldsValue(inputToValues(item))
    setEditorOpen(true)
  }

  async function handleSave() {
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    const input = valuesToInput(values)
    setSaving(true)
    try {
      if (editing) {
        await znsApi.updateConfig(editing.id, input)
        message.success('Đã cập nhật cấu hình')
      } else {
        await znsApi.createConfig(input)
        message.success('Đã thêm cấu hình')
      }
      const data = await znsApi.listConfigs()
      setConfigs(data)
      setEditorOpen(false)
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Lưu cấu hình thất bại')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(item: ZnsConfigItem, checked: boolean) {
    setTogglingId(item.id)
    try {
      const updated = await znsApi.toggleConfig(item.id)
      setConfigs((prev) => prev.map((c) => (c.id === item.id ? updated : c)))
      message.success(checked ? 'Đã bật cấu hình' : 'Đã tắt cấu hình')
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Không thể thay đổi trạng thái')
    } finally {
      setTogglingId(null)
    }
  }

  function confirmDelete(item: ZnsConfigItem) {
    modal.confirm({
      title: 'Xóa cấu hình',
      content: `Bạn có chắc muốn xóa cấu hình "${item.name}"?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        setDeletingId(item.id)
        try {
          await znsApi.deleteConfig(item.id)
          setConfigs((prev) => prev.filter((c) => c.id !== item.id))
          message.success('Đã xóa cấu hình')
        } catch (e) {
          message.error(e instanceof Error ? e.message : 'Không thể xóa cấu hình')
        } finally {
          setDeletingId(null)
        }
      },
    })
  }

  async function handleSend(item: ZnsConfigItem) {
    setSendingId(item.id)
    try {
      const result = await znsApi.send({ configId: item.id })
      if (result.ok) {
        message.success('Đã gửi ZNS thành công')
      } else {
        message.error(`Zalo trả lỗi (${result.status}): ${JSON.stringify(result.data)}`)
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Gửi ZNS thất bại')
    } finally {
      setSendingId(null)
    }
  }

  const columns: ColumnsType<ZnsConfigItem> = [
    {
      title: 'Tên cấu hình',
      dataIndex: 'name',
      key: 'name',
      render: (_, item) => (
        <div>
          <div className="cell-name">{item.name}</div>
          <div className="cell-desc">Template: {item.templateId}</div>
        </div>
      ),
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (value: string) => value || '—',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (_, item) => (
        <Space>
          <Switch
            size="small"
            checked={item.enabled}
            loading={togglingId === item.id}
            onChange={(checked) => handleToggle(item, checked)}
          />
          <Tag color={item.enabled ? 'success' : 'default'}>
            {item.enabled ? 'Bật' : 'Tắt'}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Cập nhật',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (value: number) => <span className="cell-date">{formatDate(value)}</span>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right',
      width: 260,
      render: (_, item) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setDetail(item)}>
            Xem
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(item)}>
            Sửa
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            loading={deletingId === item.id}
            onClick={() => confirmDelete(item)}
          >
            Xóa
          </Button>
        </Space>
      ),
    },
  ]

  const previewData = Form.useWatch<Partial<FormValues>>([], form) ?? {}

  return (
    <div>
      {error && (
        <Typography.Text type="danger" style={{ display: 'block', marginBottom: 12 }}>
          {error}
        </Typography.Text>
      )}

      <Card
        title="Danh sách cấu hình ZNS"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            Thêm cấu hình
          </Button>
        }
      >
        <Table<ZnsConfigItem>
          rowKey="id"
          columns={columns}
          dataSource={configs}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          locale={{ emptyText: 'Chưa có cấu hình nào. Bấm "Thêm cấu hình" để tạo.' }}
        />
      </Card>

      <Modal
        open={editorOpen}
        title={editing ? 'Sửa cấu hình ZNS' : 'Thêm cấu hình ZNS'}
        okText={editing ? 'Lưu thay đổi' : 'Thêm cấu hình'}
        cancelText="Hủy"
        confirmLoading={saving}
        onOk={handleSave}
        onCancel={() => setEditorOpen(false)}
        destroyOnClose
        width={880}
        maskClosable={!saving}
      >
        <Row gutter={24}>
          <Col xs={24} md={13}>
            <Form form={form} layout="vertical" requiredMark={false}>
              <Form.Item
                name="name"
                label="Tên cấu hình"
                rules={[{ required: true, whitespace: true, message: 'Nhập tên cấu hình' }]}
              >
                <Input placeholder="VD: Hóa đơn tiền điện" autoFocus />
              </Form.Item>
              <Form.Item
                name="accessToken"
                label="Access Token"
                rules={[{ required: true, message: 'Nhập Access Token' }]}
              >
                <Input.Password placeholder="Nhập Access Token" />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="templateId"
                    label="Template ID"
                    rules={[{ required: true, message: 'Nhập Template ID' }]}
                  >
                    <Input placeholder="7895417a7d3f9461cd2e" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="phone" label="Số điện thoại">
                    <Input placeholder="84987654321" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="enabled" label="Trạng thái" valuePropName="checked">
                <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
              </Form.Item>

              <Divider plain>Template data</Divider>
              <Row gutter={12}>
                {TEMPLATE_FIELDS.map((field) => (
                  <Col key={field.key} span={field.half ? 12 : 24}>
                    <Form.Item name={field.key} label={field.label}>
                      <Input placeholder={field.placeholder} />
                    </Form.Item>
                  </Col>
                ))}
              </Row>
              <Form.Item name="tracking_id" label="Tracking ID">
                <Input placeholder="tracking_id" />
              </Form.Item>
            </Form>
          </Col>
          <Col xs={24} md={11}>
            <Typography.Text strong>Xem trước:</Typography.Text>
            <div style={{ marginTop: 8 }}>
              <TemplatePreview data={previewData as Record<string, string>} />
            </div>
          </Col>
        </Row>
      </Modal>

      <Modal
        open={detail !== null}
        title={detail?.name ?? 'Chi tiết cấu hình'}
        footer={
          <Space>
            <Button onClick={() => setDetail(null)}>Đóng</Button>
            <Button
              type="primary"
              danger
              icon={<SendOutlined />}
              loading={sendingId === detail?.id}
              disabled={!detail?.enabled}
              onClick={() => detail && handleSend(detail)}
            >
              Gửi ZNS
            </Button>
          </Space>
        }
        onCancel={() => setDetail(null)}
        width={900}
      >
        {detail && (
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <div className="detail-grid">
                <div>
                  <div className="detail-label">Tên cấu hình</div>
                  <div className="detail-value">{detail.name}</div>
                </div>
                <div>
                  <div className="detail-label">Trạng thái</div>
                  <div className="detail-value">
                    <Tag color={detail.enabled ? 'success' : 'default'}>
                      {detail.enabled ? 'Bật' : 'Tắt'}
                    </Tag>
                  </div>
                </div>
                <div>
                  <div className="detail-label">Template ID</div>
                  <div className="detail-value">{detail.templateId}</div>
                </div>
                <div>
                  <div className="detail-label">Số điện thoại</div>
                  <div className="detail-value">{detail.phone || '—'}</div>
                </div>
                <div>
                  <div className="detail-label">Tracking ID</div>
                  <div className="detail-value">{detail.trackingId || '—'}</div>
                </div>
                <div>
                  <div className="detail-label">Access Token</div>
                  <div className="detail-value">••••••••{detail.accessToken.slice(-6)}</div>
                </div>
                <div>
                  <div className="detail-label">Ngày tạo</div>
                  <div className="detail-value">{formatDate(detail.createdAt)}</div>
                </div>
                <div>
                  <div className="detail-label">Cập nhật</div>
                  <div className="detail-value">{formatDate(detail.updatedAt)}</div>
                </div>
              </div>
            </Col>

            <Col xs={24} md={12}>
              <Typography.Text strong>Xem trước template:</Typography.Text>
              <div style={{ marginTop: 8 }}>
                <TemplatePreview data={detail.templateData} />
              </div>

              <Typography.Text
                type="secondary"
                style={{ fontSize: 12, display: 'block', marginTop: 12 }}
              >
                Payload gửi đến Zalo API:
              </Typography.Text>
              <pre className="zns-payload">
                {JSON.stringify(
                  {
                    phone: detail.phone,
                    template_id: detail.templateId,
                    template_data: detail.templateData,
                    tracking_id: detail.trackingId,
                  },
                  null,
                  2
                )}
              </pre>
            </Col>
          </Row>
        )}
      </Modal>
    </div>
  )
}

export default ZnsConfigs