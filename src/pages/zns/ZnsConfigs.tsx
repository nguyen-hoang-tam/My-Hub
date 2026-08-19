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
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { znsApi, type ZnsConfigInput, type ZnsConfigItem } from '../../api/zns'
import {
  CATEGORY_OPTIONS,
  PARTNER_OPTIONS,
  PUSHSALE_VARS,
  TYPE_OPTIONS,
  extractVariables,
} from '../../constants/zns'
import { formatDate } from '../../utils/format'
import ZnsConfigScreen from './ZnsConfigScreen'

const styles = `
  .zns-preview-panel {
    position: sticky;
    top: 96px;
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 12px;
    padding: 20px;
  }

  .zns-highlight-preview {
    background: #fff;
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    padding: 12px;
    margin-top: 8px;
    font-size: 13px;
    line-height: 1.7;
    white-space: pre-wrap;
  }

  .zns-msg-bubble {
    background: #fff;
    border-radius: 10px;
    padding: 12px 14px;
    margin-top: 8px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
    font-size: 13px;
    line-height: 1.7;
    white-space: pre-wrap;
  }

  .vars-ref {
    margin-top: 8px;
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
  }

  .vars-ref-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 12px;
    border-top: 1px solid #f0f0f0;
    font-size: 13px;
  }

  .vars-ref-row:first-child {
    border-top: none;
  }

  .vars-ref-row code {
    background: #fff1f0;
    color: #e02424;
    border: 1px solid #ffccc7;
    border-radius: 6px;
    padding: 2px 8px;
    font-size: 12px;
  }

  .vars-ref-label {
    color: rgba(0, 0, 0, 0.65);
  }

  .cell-id {
    font-weight: 600;
    color: #1677ff;
    font-family: monospace;
  }

  :root[data-theme='dark'] .zns-preview-panel {
    background: #1f1f1f;
    border-color: #303030;
  }

  :root[data-theme='dark'] .zns-highlight-preview,
  :root[data-theme='dark'] .zns-msg-bubble,
  :root[data-theme='dark'] .vars-ref {
    background: #131b24;
    border-color: #303030;
  }

  :root[data-theme='dark'] .vars-ref-row {
    border-color: #303030;
  }

  :root[data-theme='dark'] .vars-ref-row code {
    background: rgba(255, 0, 0, 0.12);
    color: #ff7875;
    border-color: rgba(255, 0, 0, 0.35);
  }

  :root[data-theme='dark'] .vars-ref-label {
    color: rgba(255, 255, 255, 0.65);
  }
`

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
  const [using, setUsing] = useState<ZnsConfigItem | null>(null)
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
      accessToken: '',
      phone: '',
      mapping: {},
      events: [],
      ready: false,
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

  if (using) {
    return (
      <ZnsConfigScreen
        config={using}
        onBack={() => setUsing(null)}
        onSaved={() => {
          setUsing(null)
          reload()
        }}
      />
    )
  }

  if (editorOpen) {
    const isEdit = editing !== null
    const variables = (variablesValue ?? '')
      .split(',')
      .map((v: string) => v.trim())
      .filter(Boolean)
    return (
      <>
        <style>{styles}</style>
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
      </>
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
      title: 'Trạng thái',
      key: 'status',
      width: 140,
      render: (_, item) =>
        item.ready ? (
          <Tag color="success" icon={<PlayCircleOutlined />}>
            Sẵn sàng
          </Tag>
        ) : (
          <Tag>Chưa cấu hình</Tag>
        ),
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
      width: 230,
      render: (_, item) => (
        <Space>
          <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={() => setUsing(item)}>
            Sử dụng
          </Button>
          <Button size="small" ghost icon={<EditOutlined />} onClick={() => openEdit(item)}>
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
    <>
      <style>{styles}</style>
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
    </>
  )
}

export default ZnsConfigs