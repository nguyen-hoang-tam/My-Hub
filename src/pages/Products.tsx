import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { App as AntApp, Button, Input, Space, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { api, type Product, type ProductInput } from '../api/products'
import { formatDate, formatPrice } from '../utils/format'
import ProductModal, { type ProductFormValues } from '../components/products/ProductModal'

type ProductsProps = {
  products: Product[]
  loading: boolean
  setProducts: Dispatch<SetStateAction<Product[]>>
}

function Products({ products, loading, setProducts }: ProductsProps) {
  const { message, modal } = AntApp.useApp()

  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function openAdd() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(product: Product) {
    setEditing(product)
    setModalOpen(true)
  }

  async function handleSubmit(values: ProductFormValues) {
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

  const columns: ColumnsType<Product> = [
    {
      title: 'Sản phẩm',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name, 'vi'),
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
      sorter: (a, b) => a.price - b.price,
      render: (value: number) => formatPrice(value),
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right',
      sorter: (a, b) => a.quantity - b.quantity,
    },
    {
      title: 'Giá trị',
      key: 'value',
      align: 'right',
      sorter: (a, b) => a.price * a.quantity - b.price * b.quantity,
      render: (_, product) => (
        <span className="cell-total">{formatPrice(product.price * product.quantity)}</span>
      ),
    },
    {
      title: 'Cập nhật',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      sorter: (a, b) => a.updatedAt - b.updatedAt,
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
    <div>
      <Space wrap style={{ marginBottom: 16 }} size={12}>
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

      <Table<Product>
        className="data-table"
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: false,
          showTotal: (t) => `${t} sản phẩm`,
        }}
        scroll={{ x: 'max-content' }}
        locale={{
          emptyText: query.trim() ? 'Không tìm thấy sản phẩm nào' : 'Chưa có sản phẩm nào',
        }}
      />

      <ProductModal
        open={modalOpen}
        editing={editing}
        saving={saving}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  )
}

export default Products
