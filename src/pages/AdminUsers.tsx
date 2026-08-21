import { useEffect, useState } from 'react'
import {
  App,
  Avatar,
  Button,
  Card,
  Descriptions,
  Dropdown,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd'
import {
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  PlusOutlined,
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

interface AdminUserDetail extends AdminUser {
  password?: string | null
}

interface AdminUsersProps {
  currentEmail: string
}

function AdminUsers({ currentEmail }: AdminUsersProps) {
  const { message, modal } = App.useApp()
  const [createForm] = Form.useForm<{
    name: string
    email: string
    password: string
    role: UserRole
  }>()
  const [editForm] = Form.useForm<{ name: string; role: UserRole }>()
  const [listLoading, setListLoading] = useState(true)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createSaving, setCreateSaving] = useState(false)
  const [viewing, setViewing] = useState<AdminUser | null>(null)
  const [detail, setDetail] = useState<AdminUserDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const openDetail = (user: AdminUser) => {
    setViewing(user)
    setDetail(null)
    setDetailLoading(true)
    request<AdminUserDetail>(`/api/admin/users?email=${encodeURIComponent(user.email)}`)
      .then(setDetail)
      .catch(() => message.error('Không tải được thông tin chi tiết'))
      .finally(() => setDetailLoading(false))
  }

  const closeDetail = () => {
    setViewing(null)
    setDetail(null)
  }

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

  const openCreate = () => {
    createForm.resetFields()
    setCreateOpen(true)
  }

  const submitCreate = async (values: {
    name: string
    email: string
    password: string
    role: UserRole
  }) => {
    setCreateSaving(true)
    try {
      await request('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(values),
      })
      message.success(`Đã tạo tài khoản ${values.email}`)
      setCreateOpen(false)
      await loadUsers()
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Lỗi tạo tài khoản')
    } finally {
      setCreateSaving(false)
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
          <span onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={!record.disabled}
              onChange={(checked) => toggleDisabled(record, !checked)}
            />
          </span>
        ),
    },
    {
      title: '',
      key: 'action',
      width: 70,
      align: 'center',
      render: (_, record) => (
        <span onClick={(e) => e.stopPropagation()}>
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
        </span>
      ),
    },
  ]

  return (
    <Card
      title="Danh sách tài khoản"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadUsers} loading={listLoading}>
            Làm mới
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm tài khoản
          </Button>
        </Space>
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
        onRow={(record) => ({
          onClick: () => openDetail(record),
          style: { cursor: 'pointer' },
        })}
      />

      <Modal
        title="Thông tin chi tiết tài khoản"
        open={!!viewing}
        onCancel={closeDetail}
        footer={[
          <Button key="close" type="primary" onClick={closeDetail}>
            Đóng
          </Button>,
        ]}
      >
        {detailLoading || !detail ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Spin />
          </div>
        ) : (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Space size={12}>
              <Avatar size={48} style={{ background: '#0047ad', fontSize: 20, fontWeight: 600 }}>
                {detail.name.charAt(0).toUpperCase()}
              </Avatar>
              <div>
                <Typography.Text strong style={{ fontSize: 16 }}>
                  {detail.name}
                </Typography.Text>
                <div>
                  <Tag color={detail.role === 'admin' ? 'gold' : 'blue'} style={{ marginTop: 4 }}>
                    {detail.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
                  </Tag>
                  {detail.disabled && <Tag color="error">Đã khóa</Tag>}
                </div>
              </div>
            </Space>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Email">
                <Typography.Text copyable>{detail.email}</Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="Mật khẩu">
                {detail.password ? (
                  <Typography.Text copyable code>
                    {detail.password}
                  </Typography.Text>
                ) : (
                  <Typography.Text type="secondary">Không khả dụng</Typography.Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">
                {new Date(detail.createdAt).toLocaleDateString('vi-VN')}
              </Descriptions.Item>
            </Descriptions>
          </Space>
        )}
      </Modal>

      <Modal
        title={
          <Space>
            <UserAddOutlined />
            Thêm tài khoản mới
          </Space>
        }
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => createForm.submit()}
        confirmLoading={createSaving}
        okText="Tạo tài khoản"
        cancelText="Hủy"
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          Tài khoản mới có thể đăng nhập ngay sau khi được tạo.
        </Typography.Paragraph>
        <Form
          form={createForm}
          layout="vertical"
          onFinish={submitCreate}
          preserve={false}
          initialValues={{ role: 'user' }}
        >
          <Form.Item
            label="Họ và tên"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
          >
            <Input placeholder="Nguyễn Văn A" autoComplete="off" />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input placeholder="user@company.com" autoComplete="off" />
          </Form.Item>
          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu' },
              { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' },
            ]}
          >
            <Input.Password placeholder="••••••••" autoComplete="new-password" />
          </Form.Item>
          <Form.Item label="Vai trò" name="role" initialValue="user">
            <Select
              options={[
                { value: 'user', label: 'Thành viên' },
                { value: 'admin', label: 'Quản trị viên' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

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
        <Form form={editForm} layout="vertical" onFinish={saveEdit} preserve={false}>
          <Form.Item
            label="Họ và tên"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
          >
            <Input placeholder="Nguyễn Văn A" autoComplete="off" />
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
    </Card>
  )
}

export default AdminUsers
