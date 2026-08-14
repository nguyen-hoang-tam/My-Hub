import { useEffect, useMemo, useState } from 'react'
import {
  App as AntApp,
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { CloudSyncOutlined, DatabaseOutlined, EyeOutlined, SettingOutlined } from '@ant-design/icons'
import { znsApi, type ZaloTemplate } from './api'
import { statusMeta, typeMeta } from './zns'
import { TemplatePreview } from './ZnsPreview'
import { formatDate } from './format'
import './ZnsConfig.css'

function ZnsTemplates({ onConfigure }: { onConfigure: (template: ZaloTemplate) => void }) {
  const { message } = AntApp.useApp()

  const [templates, setTemplates] = useState<ZaloTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<string | undefined>()

  const [syncing, setSyncing] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)
  const [accessToken, setAccessToken] = useState('')

  const [viewing, setViewing] = useState<ZaloTemplate | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    znsApi
      .getTemplates(controller.signal)
      .then((data) => {
        setError(null)
        setTemplates(data)
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : 'Không thể tải danh sách template')
        }
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  async function handleSync() {
    if (!accessToken.trim()) {
      message.warning('Nhập Access Token để đồng bộ')
      return
    }
    setSyncing(true)
    try {
      const result = await znsApi.syncTemplates(accessToken.trim())
      if (result.ok) {
        setTemplates((result.data as ZaloTemplate[]) ?? [])
        setSyncOpen(false)
        setAccessToken('')
        message.success('Đã đồng bộ template từ Zalo')
      } else {
        message.error(`Zalo trả lỗi (${result.status}): ${JSON.stringify(result.data)}`)
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Đồng bộ thất bại')
    } finally {
      setSyncing(false)
    }
  }

  async function handleSeed() {
    setSeeding(true)
    try {
      const result = await znsApi.seedTemplates()
      setTemplates((result.data as ZaloTemplate[]) ?? [])
      setError(null)
      message.success('Đã nạp template mẫu')
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Nạp template mẫu thất bại')
    } finally {
      setSeeding(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return templates.filter((t) => {
      if (q && !t.name.toLowerCase().includes(q) && !t.templateId.toLowerCase().includes(q)) return false
      if (typeFilter && t.type !== typeFilter) return false
      if (statusFilter && t.status !== statusFilter) return false
      return true
    })
  }, [templates, search, typeFilter, statusFilter])

  const columns: ColumnsType<ZaloTemplate> = [
    {
      title: 'STT',
      key: 'stt',
      width: 64,
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Tên template',
      dataIndex: 'name',
      key: 'name',
      render: (_, item) => (
        <div>
          <div className="cell-name">{item.name}</div>
          <div className="cell-desc">ID: {item.templateId}</div>
        </div>
      ),
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (value: string) => {
        const meta = typeMeta(value)
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (value: string) => {
        const meta = statusMeta(value)
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: 'Ngày đăng ký',
      dataIndex: 'registeredAt',
      key: 'registeredAt',
      width: 140,
      render: (value: number) => <span className="cell-date">{formatDate(value)}</span>,
    },
    {
      title: 'Hành động',
      key: 'actions',
      align: 'right',
      width: 140,
      render: (_, item) =>
        item.status === 'ENABLE' ? (
          <Button type="primary" size="small" icon={<SettingOutlined />} onClick={() => onConfigure(item)}>
            Cấu hình
          </Button>
        ) : (
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setViewing(item)}
            disabled={item.status === 'REJECT'}
            title={item.status === 'REJECT' ? 'Template bị từ chối bởi Zalo' : undefined}
          >
            {item.status === 'REJECT' ? 'Xem lý do' : 'Xem'}
          </Button>
        ),
    },
  ]

  return (
    <div>
      <Card
        title={
          <Space direction="vertical" size={0}>
            <span>Cấu hình ZNS</span>
            <Typography.Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
              Quản lý template Zalo và cấu hình gửi thông báo
            </Typography.Text>
          </Space>
        }
        extra={
          <Button type="primary" icon={<CloudSyncOutlined />} loading={syncing} onClick={() => setSyncOpen(true)}>
            Đồng bộ
          </Button>
        }
      >
        <Space wrap style={{ marginBottom: 16 }} size={12}>
          <Input.Search
            placeholder="Tìm kiếm template..."
            allowClear
            style={{ width: 280 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            placeholder="Lọc loại ▼"
            allowClear
            style={{ width: 160 }}
            value={typeFilter}
            onChange={setTypeFilter}
            options={['Table', 'Paragraph', 'OTP', 'Rating'].map((t) => ({
              value: t,
              label: typeMeta(t).label,
            }))}
          />
          <Select
            placeholder="Trạng thái ▼"
            allowClear
            style={{ width: 160 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={['ENABLE', 'WAIT', 'REJECT', 'DISABLE'].map((s) => ({
              value: s,
              label: statusMeta(s).label,
            }))}
          />
        </Space>

        {error && (
          <Typography.Text type="danger" style={{ display: 'block', marginBottom: 12 }}>
            {error}
          </Typography.Text>
        )}

        <Table<ZaloTemplate>
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có template nào"
                style={{ padding: '24px 0' }}
              >
                <Space>
                  <Button type="primary" icon={<CloudSyncOutlined />} onClick={() => setSyncOpen(true)}>
                    Đồng bộ từ Zalo
                  </Button>
                  <Button icon={<DatabaseOutlined />} loading={seeding} onClick={handleSeed}>
                    Nạp template mẫu
                  </Button>
                </Space>
              </Empty>
            ),
          }}
        />
      </Card>

      <Modal
        open={syncOpen}
        title="Đồng bộ template từ Zalo"
        okText={syncing ? 'Đang đồng bộ...' : 'Đồng bộ'}
        okButtonProps={{ loading: syncing }}
        onOk={handleSync}
        onCancel={() => setSyncOpen(false)}
      >
        <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
          Nhập Access Token của tài khoản Zalo OA để lấy danh sách template mới nhất từ Zalo.
        </Typography.Paragraph>
        <Input.Password
          placeholder="Nhập Access Token"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
        />
      </Modal>

      <Modal
        open={viewing !== null}
        title={viewing?.name ?? 'Thông tin template'}
        footer={
          <Button type="primary" onClick={() => setViewing(null)}>
            Đóng
          </Button>
        }
        onCancel={() => setViewing(null)}
        width={720}
      >
        {viewing && (
          <div>
            <div className="detail-grid" style={{ marginBottom: 16 }}>
              <div>
                <div className="detail-label">Template ID</div>
                <div className="detail-value">{viewing.templateId}</div>
              </div>
              <div>
                <div className="detail-label">Trạng thái</div>
                <div className="detail-value">
                  <Tag color={statusMeta(viewing.status).color}>{statusMeta(viewing.status).label}</Tag>
                </div>
              </div>
              <div>
                <div className="detail-label">Loại</div>
                <div className="detail-value">
                  <Tag color={typeMeta(viewing.type).color}>{typeMeta(viewing.type).label}</Tag>
                </div>
              </div>
              <div>
                <div className="detail-label">Mục đích</div>
                <div className="detail-value">{viewing.purpose || '—'}</div>
              </div>
            </div>
            <Typography.Text strong>Xem trước nội dung:</Typography.Text>
            <div style={{ marginTop: 8 }}>
              <TemplatePreview templateName={viewing.name} data={{}} />
            </div>
            {viewing.status === 'REJECT' && (
              <Typography.Text type="danger" style={{ display: 'block', marginTop: 12 }}>
                Template này đã bị Zalo từ chối. Vui lòng liên hệ Zalo để biết lý do và đăng ký lại.
              </Typography.Text>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ZnsTemplates