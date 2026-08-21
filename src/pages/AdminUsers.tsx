import { useEffect, useState } from 'react'
import {
  App,
  Avatar,
  Button,
  Card,
  Dropdown,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd'
import {
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  ReloadOutlined,
  UserAddOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { request } from '../api/client'
import type { UserRole } from '../auth'

interface AdminUser {
  email: string
  name: string
  role: UserRole
  createdAt: number
  disabled: boolean
}

interface AdminUsersProps {
  currentEmail: string
}

function AdminUsers({ currentEmail }: AdminUsersProps) {
  const { message, modal } = App.useApp()
  const [form] = Form.useForm()
  const [editForm] = Form.useForm<{ name: string; role: UserRole }>()
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [editSaving, setEditSaving] = useState(false)

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

  const toggleDisabled = (user: AdminUser, nextDisabled: boolean) => {
    const doToggle = async () => {
      try {
        await request('/api/admin/users', {
          method: 'PUT',
          body: JSON.stringify({ email: user.email, disabled: nextDisabled }),
        })
        message.success(nextDisabled ? `Đã khóa ${user.email}` : `Đã mở khóa ${user.email}`)
        await loadUsers()
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Cập nhật thất bại')
      }
    }

    if (nextDisabled) {
      modal.confirm({
        title: 'Khóa tài khoản?',
        content: `${user.email} sẽ bị đăng xuất ngay lập tức và không thể đăng nhập lại.`,
        okText: 'Khóa',
        okButtonProps: { danger: true },
        cancelText: 'Hủy',
        onOk: doToggle,
      })
    } else {
      doToggle()
    }
  }

  const openEdit = (user: AdminUser) => {
    setEditing(user)
    editForm.setFieldsValue({ name: user.name, role: user.role })
  }

  const saveEdit = async (values: { name: string; role: UserRole }) => {
    if (!editing) return
    setEditSaving(true)
    try {
      await request('/api/admin/users', {
        method: 'PUT',
        body: JSON.stringify({ email: editing.email, ...values }),
      })
      message.success('Đã cập nhật tài khoản')
      setEditing(null)
      await loadUsers()
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Cập nhật thất bại')
    } finally {
      setEditSaving(false)
    }
  }

  const removeUser = (user: AdminUser) => {
    modal.confirm({
      title: 'Xóa tài khoản?',
      content: `${user.name} (${user.email}) sẽ bị xóa vĩnh viễn và đăng xuất ngay.`,
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await request(`/api/admin/users?email=${encodeURIComponent(user.email)}`, {
            method: 'DELETE',
          })
          message.success(`Đã xóa ${user.email}`)
          await loadUsers()
        } catch (error) {
          message.error(error instanceof Error ? error.message : 'Xóa thất bại')
        }
      },
    })
  }

  const columns: ColumnsType<AdminUser> = [
    {
      title: 'Tên',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Space>
          <Avatar size={32} style={{ background: '#0047ad', fontWeight: 600 }}>
            {name.charAt(0).toUpperCase()}
          </Avatar>
          <span style={{ fontWeight: 600 }}>{name}</span>
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => (
        <Typography.Text type="secondary">{email}</Typography.Text>
      ),
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      width: 150,
      align: 'center',
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
      width: 120,
      align: 'center',
      render: (value: number) => new Date(value).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'disabled',
      key: 'disabled',
      width: 120,
      align: 'center',
      render: (_, record) =>
        record.disabled ? <Tag color="error">Đã khóa</Tag> : <Tag color="success">Hoạt động</Tag>,
    },
    {
      title: 'Khóa/Mở',
      key: 'toggle',
      width: 100,
      align: 'center',
      render: (_, record) =>
        record.email === currentEmail ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Bạn
          </Typography.Text>
        ) : (
          <Switch
            checked={!record.disabled}
            onChange={(checked) => toggleDisabled(record, !checked)}
          />
        ),
    },
    {
      title: '',
      key: 'action',
      width: 70,
      align: 'center',
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              ...(record.email === currentEmail
                ? []
                : [
                    {
                      key: 'delete',
                      icon: <DeleteOutlined />,
                      label: 'Xóa',
                      danger: true,
                    },
                  ]),
              { key: 'edit', icon: <EditOutlined />, label: 'Sửa' },
            ],
            onClick: ({ key }) => {
              if (key === 'edit') openEdit(record)
              if (key === 'delete') removeUser(record)
            },
          }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
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
          size="middle"
          scroll={{ x: 860 }}
        />
      </Card>

      <Modal
        title={`Sửa tài khoản: ${editing?.email ?? ''}`}
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={() => editForm.submit()}
        confirmLoading={editSaving}
        okText="Lưu"
        cancelText="Hủy"
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" onFinish={saveEdit}>
          <Form.Item
            label="Họ và tên"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
          >
            <Input placeholder="Nguyễn Văn A" />
          </Form.Item>
          <Form.Item label="Vai trò" name="role">
            <Select
              options={[
                { value: 'user', label: 'Thành viên' },
                { value: 'admin', label: 'Quản trị viên' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}

export default AdminUsers
