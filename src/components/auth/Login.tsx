import { useState } from 'react'
import { App, Button, Form, Input, Typography } from 'antd'
import {
  LockOutlined,
  MailOutlined,
  MoonOutlined,
  SunOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { storeToken, storeUser, type User } from '../../auth'
import { request } from '../../api/client'
import { useTheme } from '../../theme-context'

const loginStyles = `
  .login-page {
    min-height: 100svh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: #fff;
  }

  .login-card {
    width: 100%;
    max-width: 400px;
    background: #fff;
    border: 1px solid #e6e4df;
    border-radius: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 16px 48px rgba(0, 0, 0, 0.12);
    padding: 36px 32px;
  }

  .login-brand {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-bottom: 8px;
  }

  .login-brand-badge {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    overflow: hidden;
  }

  .login-brand-logo {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .login-brand-name {
    font-size: 20px;
    font-weight: 700;
    color: #16141c;
  }

  .login-subtitle {
    text-align: center;
    margin-bottom: 24px;
  }

  .login-theme-toggle {
    position: fixed;
    top: 16px;
    right: 16px;
  }

  :root[data-theme='dark'] .login-page {
    background: #000;
  }

  :root[data-theme='dark'] .login-card {
    background: #131b24;
    border-color: #303030;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4), 0 16px 48px rgba(0, 0, 0, 0.5);
  }

  :root[data-theme='dark'] .login-brand-name {
    color: #f2f2f5;
  }
`

interface LoginProps {
  onSuccess: (user: User) => void
}

type AuthMode = 'login' | 'register'

interface AuthFormValues {
  name?: string
  email: string
  password: string
  confirm?: string
}

interface AuthResponse {
  token: string
  user: {
    email: string
    name: string
    role: User['role']
  }
}

function Login({ onSuccess }: LoginProps) {
  const { message } = App.useApp()
  const { mode, toggle } = useTheme()
  const [form] = Form.useForm<AuthFormValues>()
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [loading, setLoading] = useState(false)

  const finish = (data: AuthResponse) => {
    const user: User = {
      name: data.user.name || 'Người dùng',
      email: data.user.email,
      role: data.user.role,
      avatar: (data.user.name || data.user.email).charAt(0).toUpperCase(),
    }
    storeToken(data.token)
    storeUser(user)
    onSuccess(user)
  }

  const switchMode = (next: AuthMode) => {
    setAuthMode(next)
    form.resetFields()
  }

  const handleSubmit = async (values: AuthFormValues) => {
    setLoading(true)
    try {
      const data = await request<AuthResponse>(
        authMode === 'register' ? '/api/auth/register' : '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify(
            authMode === 'register'
              ? { name: values.name?.trim(), email: values.email, password: values.password }
              : { email: values.email, password: values.password },
          ),
        },
      )
      if (authMode === 'register') message.success('Đăng ký thành công!')
      finish(data)
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Đã có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{loginStyles}</style>
      <div className="login-page">
        <Button
          type="text"
          className="login-theme-toggle"
          icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
          onClick={toggle}
        />
        <div className="login-card">
          <div className="login-brand">
            <span className="login-brand-badge">
              <img className="login-brand-logo" src="/logo.png" alt="logo" />
            </span>
            <span className="login-brand-name">MyHub</span>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            requiredMark={false}
          >
            {authMode === 'register' && (
              <Form.Item
                name="name"
                label="Họ và tên"
                rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Nguyễn Văn A" size="large" />
              </Form.Item>
            )}
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Vui lòng nhập email' },
                { type: 'email', message: 'Email không hợp lệ' },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="you@company.com" size="large" />
            </Form.Item>
            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu' },
                ...(authMode === 'register'
                  ? [{ min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' }]
                  : []),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="••••••••" size="large" />
            </Form.Item>
            {authMode === 'register' && (
              <Form.Item
                name="confirm"
                label="Xác nhận mật khẩu"
                dependencies={['password']}
                rules={[
                  { required: true, message: 'Vui lòng xác nhận mật khẩu' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve()
                      }
                      return Promise.reject(
                        new Error('Mật khẩu nhập lại không khớp'),
                      )
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="••••••••" size="large" />
              </Form.Item>
            )}
            <Form.Item style={{ marginBottom: 8 }}>
              <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                {authMode === 'register' ? 'Đăng ký' : 'Đăng nhập'}
              </Button>
            </Form.Item>
          </Form>

          <Typography.Paragraph style={{ textAlign: 'center', marginBottom: 0 }}>
            {authMode === 'register' ? (
              <>
                Đã có tài khoản?{' '}
                <Typography.Link strong onClick={() => switchMode('login')}>
                  Đăng nhập
                </Typography.Link>
              </>
            ) : (
              <>
                Chưa có tài khoản?{' '}
                <Typography.Link strong onClick={() => switchMode('register')}>
                  Đăng ký ngay
                </Typography.Link>
              </>
            )}
          </Typography.Paragraph>
        </div>
      </div>
    </>
  )
}

export default Login
