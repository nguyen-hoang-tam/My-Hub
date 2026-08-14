import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined } from '@ant-design/icons'
import { znsApi, type ZnsHistoryItem } from './api'
import { formatDate } from './format'
import './ZnsConfig.css'

function ZnsHistory() {
  const [logs, setLogs] = useState<ZnsHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>()

  const [detail, setDetail] = useState<ZnsHistoryItem | null>(null)

  useEffect(() => {
    let active = true
    znsApi
      .listHistory()
      .then((data) => {
        if (!active) return
        setLogs(data)
        setError(null)
      })
      .catch((e) => {
        if (!active) return
        setError(e instanceof Error ? e.message : 'Không thể tải lịch sử gửi')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function reload() {
    setLoading(true)
    try {
      const data = await znsApi.listHistory()
      setLogs(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải lịch sử gửi')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return logs.filter((l) => {
      if (
        q &&
        !l.orderId.toLowerCase().includes(q) &&
        !l.phone.includes(q) &&
        !l.templateName.toLowerCase().includes(q)
      )
        return false
      if (statusFilter && l.status !== statusFilter) return false
      return true
    })
  }, [logs, search, statusFilter])

  const columns: ColumnsType<ZnsHistoryItem> = [
    {
      title: 'Mã đơn',
      dataIndex: 'orderId',
      key: 'orderId',
      width: 140,
      render: (value: string) => <span className="cell-name">{value || '—'}</span>,
    },
    {
      title: 'Người nhận',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
      render: (value: string) => value || '—',
    },
    {
      title: 'Template',
      dataIndex: 'templateName',
      key: 'templateName',
      render: (value: string) => value || '—',
    },
    {
      title: 'Ngày gửi',
      dataIndex: 'sentAt',
      key: 'sentAt',
      width: 170,
      render: (value: number) => <span className="cell-date">{formatDate(value)}</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (value: 'success' | 'failed') =>
        value === 'success' ? (
          <Tag color="success">Thành công</Tag>
        ) : (
          <Tag color="error">Thất bại</Tag>
        ),
    },
    {
      title: 'Chi tiết',
      key: 'actions',
      align: 'right',
      width: 100,
      render: (_, item) => (
        <Button size="small" onClick={() => setDetail(item)}>
          Xem
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Card
        title={
          <Space direction="vertical" size={0}>
            <span>Lịch sử gửi ZNS</span>
            <Typography.Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
              Theo dõi tình trạng gửi tin nhắn ZNS để kiểm tra và xử lý lỗi
            </Typography.Text>
          </Space>
        }
        extra={
          <Button icon={<ReloadOutlined />} loading={loading} onClick={reload}>
            Làm mới
          </Button>
        }
      >
        <Space wrap style={{ marginBottom: 16 }} size={12}>
          <Input.Search
            placeholder="Tìm theo mã đơn, số điện thoại, template..."
            allowClear
            style={{ width: 320 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            placeholder="Lọc trạng thái ▼"
            allowClear
            style={{ width: 160 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'success', label: 'Thành công' },
              { value: 'failed', label: 'Thất bại' },
            ]}
          />
        </Space>

        {error && (
          <Typography.Text type="danger" style={{ display: 'block', marginBottom: 12 }}>
            {error}
          </Typography.Text>
        )}

        <Table<ZnsHistoryItem>
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          locale={{ emptyText: 'Chưa có lần gửi nào' }}
        />
      </Card>

      <Modal
        open={detail !== null}
        title={detail ? `Chi tiết lần gửi ${detail.orderId || ''}`.trim() : 'Chi tiết lần gửi'}
        footer={
          <Button type="primary" onClick={() => setDetail(null)}>
            Đóng
          </Button>
        }
        onCancel={() => setDetail(null)}
        width={760}
      >
        {detail && (
          <div>
            <div className="detail-grid" style={{ marginBottom: 16 }}>
              <div>
                <div className="detail-label">Mã đơn</div>
                <div className="detail-value">{detail.orderId || '—'}</div>
              </div>
              <div>
                <div className="detail-label">Người nhận</div>
                <div className="detail-value">{detail.phone || '—'}</div>
              </div>
              <div>
                <div className="detail-label">Template</div>
                <div className="detail-value">{detail.templateName}</div>
              </div>
              <div>
                <div className="detail-label">Trạng thái</div>
                <div className="detail-value">
                  {detail.status === 'success' ? (
                    <Tag color="success">Thành công</Tag>
                  ) : (
                    <Tag color="error">Thất bại</Tag>
                  )}
                </div>
              </div>
              <div>
                <div className="detail-label">Ngày gửi</div>
                <div className="detail-value">{formatDate(detail.sentAt)}</div>
              </div>
              <div>
                <div className="detail-label">Template ID</div>
                <div className="detail-value">{detail.templateId}</div>
              </div>
            </div>

            {detail.status === 'failed' && detail.error && (
              <div style={{ marginBottom: 12 }}>
                <Typography.Text strong type="danger">
                  Lỗi:
                </Typography.Text>
                <pre className="zns-payload">{detail.error}</pre>
              </div>
            )}

            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Request gửi đến Zalo:
            </Typography.Text>
            <pre className="zns-payload">{JSON.stringify(detail.request, null, 2)}</pre>

            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
              Response từ Zalo:
            </Typography.Text>
            <pre className="zns-payload">{JSON.stringify(detail.response, null, 2)}</pre>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ZnsHistory