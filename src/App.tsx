import { useEffect, useState } from 'react'
import {
  Alert,
  App as AntApp,
  Avatar,
  Button,
  ConfigProvider,
  Form,
  Input,
  InputNumber,
  Layout,
  Menu,
  Modal,
  Space,
  Table,
  theme,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  AppstoreOutlined,
  BarChartOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  TagOutlined,
} from '@ant-design/icons'
import { api, type Product, type ProductInput } from './api'
import './App.css'

type ProductFormValues = {
  name: string
  price?: number
  description?: string
  quantity?: number
}

const NAV_ITEMS = [
  { key: 'dashboard', icon: <AppstoreOutlined />, label: 'Tổng quan' },
  { key: 'products', icon: <ShoppingCartOutlined />, label: 'Sản phẩm' },
  { key: 'categories', icon: <TagOutlined />, label: 'Danh mục' },
  { key: 'orders', icon: <BarChartOutlined />, label: 'Đơn hàng' },
  { key: 'reports', icon: <BarChartOutlined />, label: 'Báo cáo' },
  { key: 'settings', icon: <SettingOutlined />, label: 'Cài đặt' },
]

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPrice(price: number): string {
  return price.toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
  })
}

function AppContent() {
  const { message, modal } = AntApp.useApp()
  const [form] = Form.useForm<ProductFormValues>()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    api
      .listProducts(controller.signal)
      .then((data) => {
        setError(null)
        setProducts(data)
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : 'Không thể tải sản phẩm')
        }
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  function openAdd() {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  function openEdit(product: Product) {
    setEditing(product)
    form.setFieldsValue({
      name: product.name,
      price: product.price,
      description: product.description,
      quantity: product.quantity,
    })
    setModalOpen(true)
  }

  async function handleSubmit() {
    const values = await form.validateFields().catch(() => null)
    if (!values) return

    const body: ProductInput = {
      name: values.name.trim(),
      price: values.price ?? 0,
      description: values.description ?? '',
      quantity: values.quantity ?? 0,
    }

    setSaving(true)
    try {
      if (editing) {
        const updated = await api.updateProduct(editing.id, body)
        setProducts((prev) => prev.map((p) => (p.id === editing.id ? updated : p)))
        message.success('Đã cập nhật sản phẩm')
      } else {
        const product = await api.createProduct(body)
        setProducts((prev) => [product, ...prev])
        message.success('Đã thêm sản phẩm')
      }
      setModalOpen(false)
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Không thể lưu sản phẩm')
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete(product: Product) {
    modal.confirm({
      title: 'Xóa sản phẩm',
      content: `Bạn có chắc muốn xóa "${product.name}"?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        setDeletingId(product.id)
        try {
          await api.deleteProduct(product.id)
          setProducts((prev) => prev.filter((p) => p.id !== product.id))
          message.success('Đã xóa sản phẩm')
        } catch (e) {
          message.error(e instanceof Error ? e.message : 'Không thể xóa sản phẩm')
        } finally {
          setDeletingId(null)
        }
      },
    })
  }

  const filtered = products.filter((p) => {
    const q = query.trim().toLowerCase()
    return q === ''
      ? true
      : p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
  })

  const totalValue = products.reduce((sum, p) => sum + p.price * p.quantity, 0)

  const columns: ColumnsType<Product> = [
    {
      title: 'Sản phẩm',
      dataIndex: 'name',
      key: 'name',
      render: (_, product) => (
        <div>
          <div className="cell-name">{product.name}</div>
          {product.description && <div className="cell-desc">{product.description}</div>}
        </div>
      ),
    },
    {
      title: 'Giá',
      dataIndex: 'price',
      key: 'price',
      align: 'right',
      render: (value: number) => formatPrice(value),
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right',
    },
    {
      title: 'Giá trị',
      key: 'value',
      align: 'right',
      render: (_, product) => (
        <span className="cell-total">{formatPrice(product.price * product.quantity)}</span>
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
      width: 200,
      render: (_, product) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(product)}>
            Sửa
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            loading={deletingId === product.id}
            onClick={() => confirmDelete(product)}
          >
            Xóa
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <Layout className="layout">
      <Layout.Sider className="sidebar" width={240} theme="light">
        <div className="sidebar-brand">
          <span className="brand-badge">P</span>
          <span className="brand-name">Quản lý kho</span>
        </div>
        <Menu
          className="sidebar-menu"
          mode="inline"
          selectedKeys={['products']}
          items={NAV_ITEMS}
        />
        <div className="sidebar-footer">
          <Avatar size={36} className="user-avatar">
            N
          </Avatar>
          <div>
            <div className="user-name">Người dùng</div>
            <div className="user-role">Quản trị viên</div>
          </div>
        </div>
      </Layout.Sider>

      <Layout>
        <Layout.Header className="topbar">
          <div className="topbar-title">
            <Typography.Title level={4} style={{ margin: 0 }}>
              Sản phẩm
            </Typography.Title>
            <Typography.Text type="secondary">
              {products.length} sản phẩm · Tổng giá trị {formatPrice(totalValue)}
            </Typography.Text>
          </div>
          <Space wrap>
            <Input
              className="search-input"
              prefix={<SearchOutlined />}
              placeholder="Tìm kiếm sản phẩm..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              allowClear
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
              Thêm sản phẩm
            </Button>
          </Space>
        </Layout.Header>

        <Layout.Content className="content">
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

          <Table<Product>
            className="data-table"
            rowKey="id"
            columns={columns}
            dataSource={filtered}
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (t) => `${t} sản phẩm` }}
            scroll={{ x: 'max-content' }}
            locale={{
              emptyText: query.trim() ? 'Không tìm thấy sản phẩm nào' : 'Chưa có sản phẩm nào',
            }}
          />
        </Layout.Content>
      </Layout>

      <Modal
        open={modalOpen}
        title={editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
        okText={editing ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
        cancelText="Hủy"
        confirmLoading={saving}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
        maskClosable={!saving}
      >
        <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Tên sản phẩm"
            rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập tên sản phẩm' }]}
          >
            <Input placeholder="Nhập tên sản phẩm" autoFocus />
          </Form.Item>
          <Space size={16} style={{ display: 'flex' }}>
            <Form.Item name="price" label="Giá (VND)" style={{ flex: 1 }}>
              <InputNumber min={0} placeholder="0" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="quantity" label="Số lượng" style={{ flex: 1 }}>
              <InputNumber min={0} placeholder="0" style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Mô tả sản phẩm..." />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  )
}

export default function App() {
  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
      <AntApp>
        <AppContent />
      </AntApp>
    </ConfigProvider>
  )
}