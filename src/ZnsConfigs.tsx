import { useEffect, useState } from 'react'
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Row,
  Select,
  Space,
  Table,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons'
import { znsApi, type ZnsConfigInput, type ZnsConfigItem } from './api'
import { CATEGORY_OPTIONS, PARTNER_OPTIONS, PUSHSALE_VARS, TYPE_OPTIONS, extractVariables } from './zns'
import { formatDate } from './format'
import './ZnsConfig.css'

type FormValues = {
  partnerId?: string
  type?: string
  category?: string
  name: string
  zaloTemplateId: string
  zaloTemplate: string
  variables?: string
  sampleMessage: string
}

function HighlightedText({ text }: { text: string }) {
  const parts = text.split(/(\{[^}]+\})/g)
  return (
    <span>
      {parts.map((p, i) =>
        /^\{[^}]+\}$/.test(p) ? (
          <span key={i} style={{ color: '#e02424', fontWeight: 600 }}>
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </span>
  )
}

function ZnsConfigs() {
  const { message, modal } = AntApp.useApp()
  const [form] = Form.useForm<FormValues>()

  const [configs, setConfigs] = useState<ZnsConfigItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState<ZnsConfigItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function reload() {
    try {
      const data = await znsApi.listConfigs()
      setConfigs(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải danh sách cấu hình')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    znsApi
      .listConfigs()
      .then((data) => {
        if (!active) return
        setConfigs(data)
        setError(null)
      })
      .catch((e) => {
        if (!active) return
        setError(e instanceof Error ? e.message : 'Không thể tải danh sách cấu hình')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const zaloTemplate = Form.useWatch('zaloTemplate', form)
  const variablesValue = Form.useWatch('variables', form)

  useEffect(() => {
    if (!zaloTemplate) return
    const vars = extractVariables(zaloTemplate)
    const current = (form.getFieldValue('variables') ?? '').split(',').map((v: string) => v.trim().replace(/[{}]/g, '')).filter(Boolean)
    if (current.join(',') !== vars.join(',')) {
      form.setFieldValue('variables', vars.join(','))
    }
  }, [zaloTemplate, form])

  function openCreate() {
    setEditing(null)
    setCreating(true)
    form.resetFields()
    form.setFieldsValue({ type: 'Zalo' })
  }

  function openEdit(item: ZnsConfigItem) {
    setCreating(false)
    setEditing(item)
    form.setFieldsValue({
      partnerId: item.partnerId,
      type: item.type,
      category: item.category,
      name: item.name,
      zaloTemplateId: item.zaloTemplateId,
      zaloTemplate: item.zaloTemplate,
      variables: item.variables.join(','),
      sampleMessage: item.sampleMessage,
    })
  }

  function closeEditor() {
    setEditing(null)
    setCreating(false)
  }

  async function handleSave() {
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    const input: ZnsConfigInput = {
      partnerId: values.partnerId ?? '',
      type: values.type ?? 'Zalo',
      category: values.category ?? '',
      name: values.name.trim(),
      zaloTemplateId: values.zaloTemplateId.trim(),
      zaloTemplate: values.zaloTemplate.trim(),
      variables: (values.variables ?? '')
        .split(',')
        .map((v) => v.trim().replace(/[{}]/g, ''))
        .filter(Boolean),
      sampleMessage: values.sampleMessage.trim(),
    }
    setSaving(true)
    try {
      if (editing) {
        await znsApi.updateConfig(editing.id, input)
        message.success('Cập nhật template thành công')
      } else {
        await znsApi.createConfig(input)
        message.success('Tạo mới template thành công')
      }
      await reload()
      closeEditor()
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Lưu template thất bại')
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete(item: ZnsConfigItem) {
    modal.confirm({
      title: 'Xóa mẫu tin nhắn',
      content: `Bạn có chắc muốn xóa "${item.name}"?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        setDeletingId(item.id)
        try {
          await znsApi.deleteConfig(item.id)
          setConfigs((prev) => prev.filter((c) => c.id !== item.id))
          message.success('Đã xóa mẫu tin nhắn')
        } catch (e) {
          message.error(e instanceof Error ? e.message : 'Không thể xóa mẫu tin nhắn')
        } finally {
          setDeletingId(null)
        }
      },
    })
  }

  const editorOpen = creating || editing !== null

  if (editorOpen) {
    const isEdit = editing !== null
    const variables = (variablesValue ?? '')
      .split(',')
      .map((v: string) => v.trim())
      .filter(Boolean)
    return (
      <Card
        className="zns-editor"
        title={
          <Space>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={closeEditor} aria-label="Quay lại" />
            <span>{isEdit ? 'Cập nhật template' : 'Thêm mới mẫu tin nhắn ZNS'}</span>
          </Space>
        }
        extra={
          <Space>
            <Button onClick={closeEditor}>Hủy</Button>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
              {saving ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </Space>
        }
      >
        <Row gutter={[32, 24]}>
          <Col xs={24} lg={16}>
            <Form form={form} layout="vertical" requiredMark={false}>
              {isEdit && editing && (
                <Form.Item label="Id">
                  <Input value={editing.id} readOnly />
                </Form.Item>
              )}

              {isEdit && (
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="partnerId" label="PartnerId">
                      <Select
                        placeholder="Chọn đối tác"
                        allowClear
                        options={PARTNER_OPTIONS.map((p) => ({ value: p, label: p }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="type" label="Type (*)" rules={[{ required: true, message: 'Chọn loại kênh' }]}>
                      <Select options={TYPE_OPTIONS.map((t) => ({ value: t, label: t }))} />
                    </Form.Item>
                  </Col>
                </Row>
              )}

              {isEdit && (
                <Form.Item name="category" label="Loại mẫu tin nhắn (*)" rules={[{ required: true, message: 'Chọn loại mẫu tin nhắn' }]}>
                  <Select
                    placeholder="Chọn loại nghiệp vụ"
                    showSearch
                    options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))}
                  />
                </Form.Item>
              )}

              <Form.Item
                name="name"
                label="Tên (*)"
                rules={[{ required: true, whitespace: true, message: 'Nhập tên mẫu tin nhắn' }]}
              >
                <Input placeholder="VD: Cảm ơn khách hàng sau khi đặt hàng" />
              </Form.Item>

              <Form.Item
                name="zaloTemplateId"
                label="Zalo Template Id (*)"
                rules={[{ required: true, message: 'Nhập mã template trên Zalo' }]}
              >
                <Input placeholder="VD: 206632" />
              </Form.Item>

              <Form.Item
                name="zaloTemplate"
                label="Mẫu zalo (*)"
                tooltip="Nội dung là mẫu đã được Zalo duyệt (ZNS), cần thay đổi biến khớp với biến Pushsale."
                rules={[{ required: true, whitespace: true, message: 'Nhập nội dung mẫu Zalo' }]}
              >
                <Input.TextArea rows={5} placeholder="VD: Cảm ơn {quy_khach} đã đặt hàng. Mã đơn: {ma_don_hang}. Sản phẩm: {san_pham}, số lượng {so_luong}..." />
              </Form.Item>

              <Form.Item
                name="variables"
                label="Danh sách biến (*)"
                tooltip="Các biến cách nhau bởi dấu ','. Điền đúng định dạng: {quy_khach},{khach_hang_phone}..."
                rules={[{ required: true, message: 'Nhập danh sách biến' }]}
              >
                <Input placeholder="{quy_khach},{ma_don_hang},{ngay_dat_hang}..." />
              </Form.Item>

              <Form.Item
                name="sampleMessage"
                label="Tin nhắn mẫu (*)"
                tooltip="Điền thông tin y hệt phần Mẫu zalo (ZNS) với các giá trị mẫu."
                rules={[{ required: true, whitespace: true, message: 'Nhập tin nhắn mẫu' }]}
              >
                <Input.TextArea rows={4} placeholder="VD: Cảm ơn Nguyễn Văn A đã đặt hàng. Mã đơn: DH-1001, ngày đặt 14/08/2026, sản phẩm Áo thun, số lượng 2..." />
              </Form.Item>
            </Form>
          </Col>

          <Col xs={24} lg={8}>
            <div className="zns-preview-panel">
              <Typography.Text strong>Mẫu zalo (xem trước):</Typography.Text>
              <div className="zns-highlight-preview">
                <HighlightedText text={form.getFieldValue('zaloTemplate') || '...'} />
              </div>

              <Typography.Text strong style={{ display: 'block', marginTop: 16 }}>
                Tin nhắn mẫu:
              </Typography.Text>
              <div className="zns-msg-bubble">
                <HighlightedText text={form.getFieldValue('sampleMessage') || '...'} />
              </div>

              <Typography.Text strong style={{ display: 'block', marginTop: 16 }}>
                Biến Pushsale tham chiếu:
              </Typography.Text>
              <div className="vars-ref">
                {PUSHSALE_VARS.map((v) => (
                  <div className="vars-ref-row" key={v.pushsale}>
                    <code>{v.zalo}</code>
                    <span className="vars-ref-label">{v.label}</span>
                  </div>
                ))}
              </div>

              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
                Quý khách lưu ý: các tên biến cần đúng định dạng và chính xác như các biến Pushsale cung cấp. Khi khai báo
                biến chỉ điền dạng: {variables.length > 0 ? variables.map((v) => `{${v}}`).join(',') : '{quy_khach},{khach_hang_phone}...'}
              </Typography.Text>
            </div>
          </Col>
        </Row>
      </Card>
    )
  }

  const columns: ColumnsType<ZnsConfigItem> = [
    {
      title: 'Id',
      dataIndex: 'id',
      key: 'id',
      width: 90,
      render: (value: string) => <span className="cell-id">{value.slice(0, 8)}</span>,
    },
    {
      title: 'Tên',
      dataIndex: 'name',
      key: 'name',
      render: (_, item) => (
        <div>
          <div className="cell-name">{item.name}</div>
          <div className="cell-desc">Zalo Template Id: {item.zaloTemplateId}</div>
        </div>
      ),
    },
    {
      title: 'Loại mẫu tin nhắn',
      dataIndex: 'category',
      key: 'category',
      width: 200,
      render: (value: string) => value || '—',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 90,
      render: (value: string) => value || '—',
    },
    {
      title: 'PartnerId',
      dataIndex: 'partnerId',
      key: 'partnerId',
      width: 150,
      render: (value: string) => value || '—',
    },
    {
      title: 'Cập nhật',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 150,
      render: (value: number) => <span className="cell-date">{formatDate(value)}</span>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right',
      width: 160,
      render: (_, item) => (
        <Space>
          <Button size="small" type="primary" ghost icon={<EditOutlined />} onClick={() => openEdit(item)}>
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

  return (
    <div>
      {error && (
        <Alert
          type="error"
          showIcon
          closable
          message={error}
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Card
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm mới
          </Button>
        }
      >
        <Table<ZnsConfigItem>
          rowKey="id"
          columns={columns}
          dataSource={configs}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có mẫu tin nhắn nào"
                style={{ padding: '24px 0' }}
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                  Thêm mới
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>
    </div>
  )
}

export default ZnsConfigs