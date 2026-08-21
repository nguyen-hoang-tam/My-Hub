import { useEffect, useState } from 'react'
import { App, Button, Card, Form, Input, Select, Space, Table, Tag, Typography } from 'antd'
import { ReloadOutlined, UserAddOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { request } from '../api/client'
import type { UserRole } from '../auth'

interface AdminUser {
  email: string
  name: string
  role: UserRole
  createdAt: number
}

interface AdminUsersProps {
  currentEmail: string
}

function AdminUsers({ currentEmail }: AdminUsersProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [listLoading, setListLoading] = useState(true)

  const loadUsers = async () => {
    setListLoading(true)
    try {
      setUsers(await request<AdminUser[]>('/api/admin/users'))
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không tải được danh sách user')
    } finally {
      setListLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const data = await request<AdminUser[]>('/api/admin/users')
        if (!active) return
        setUsers(data)
      } catch (error) {
        if (active)
          message.error(error instanceof Error ? error.message : 'Không tải được danh sách user')
      } finally {
        if (active) setListLoading(false)
      }
    })()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onFinish = async (values: {
    name: string
    email: string
    password: string
    role: UserRole
  }) => {
    setLoading(true)
    try {
      await request('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(values),
      })
      message.success(`Đã tạo tài khoản ${values.email}`)
      form.resetFields()
      await loadUsers()
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Lỗi tạo tài khoản')
    } finally {
      setLoading(false)
    }
  }

  const columns: ColumnsType<AdminUser> = [
    { title: 'Tên', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: UserRole) => (
        <Tag color={role === 'admin' ? 'gold' : 'blue'}>
          {role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
        </Tag>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (value: number) => new Date(value).toLocaleDateString('vi-VN'),
    },
    {
      title: '',
      key: 'current',
      width: 90,
      render: (_, record) =>
        record.email === currentEmail ? <Tag color="green">Bạn</Tag> : null,
    },
  ]

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title={
          <Space>
            <UserAddOutlined />
            Tạo tài khoản mới
          </Space>
        }
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          Chỉ Quản trị viên mới có quyền tạo tài khoản cho người khác.
        </Typography.Paragraph>
        <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 480 }}>
          <Form.Item
            label="Họ và tên"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
          >
            <Input placeholder="Nguyễn Văn A" />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input placeholder="user@company.com" />
          </Form.Item>
          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu' },
              { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' },
            ]}
          >
            <Input.Password placeholder="••••••••" />
          </Form.Item>
          <Form.Item label="Vai trò" name="role" initialValue="user">
            <Select
              options={[
                { value: 'user', label: 'Thành viên' },
                { value: 'admin', label: 'Quản trị viên' },
              ]}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={loading}>
              Tạo tài khoản
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title="Danh sách tài khoản"
        extra={
          <Button icon={<ReloadOutlined />} onClick={loadUsers} loading={listLoading}>
            Làm mới
          </Button>
        }
      >
        <Table
          rowKey="email"
          columns={columns}
          dataSource={users}
          loading={listLoading}
          pagination={false}
        />
      </Card>
    </Space>
  )
}

export default AdminUsers
