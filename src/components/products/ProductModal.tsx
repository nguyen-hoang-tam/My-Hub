import { useEffect } from 'react'
import { Form, Input, InputNumber, Modal, Space } from 'antd'
import type { Product } from '../../api/products'

export type ProductFormValues = {
  name: string
  price?: number
  description?: string
  quantity?: number
}

type ProductModalProps = {
  open: boolean
  editing: Product | null
  saving: boolean
  onOk: (values: ProductFormValues) => void
  onCancel: () => void
}

function ProductModal({ open, editing, saving, onOk, onCancel }: ProductModalProps) {
  const [form] = Form.useForm<ProductFormValues>()

  useEffect(() => {
    if (!open) return
    if (editing) {
      form.setFieldsValue({
        name: editing.name,
        price: editing.price,
        description: editing.description,
        quantity: editing.quantity,
      })
    } else {
      form.resetFields()
    }
  }, [open, editing, form])

  async function handleOk() {
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    onOk(values)
  }

  return (
    <Modal
      open={open}
      title={editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
      okText={editing ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
      cancelText="Hủy"
      confirmLoading={saving}
      onOk={handleOk}
      onCancel={onCancel}
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
  )
}

export default ProductModal
