import { useState } from 'react'
import { Button, Divider, Form, Input, Typography } from 'antd'
import {
  GoogleOutlined,
  LockOutlined,
  MailOutlined,
  MoonOutlined,
  SafetyCertificateOutlined,
  SunOutlined,
} from '@ant-design/icons'
import { storeUser, type User } from '../../auth'
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
    border-radius: 12px;
    background: #fff;
    color: #fff;
    font-size: 22px;
    font-weight: 700;
    border: 1px solid #e6e4df;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }

  .login-brand-logo {
    width: 100%;
    height: 100%;
    object-fit: cover;
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

  .login-sso {
    width: 100%;
    height: 42px;
    font-weight: 600;
  }

  .login-remember {
    color: rgba(0, 0, 0, 0.45);
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
    background: #141414;
    border-color: #303030;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4), 0 16px 48px rgba(0, 0, 0, 0.5);
  }

  :root[data-theme='dark'] .login-brand-name {
    color: #f2f2f5;
  }

  :root[data-theme='dark'] .login-sso {
    color: rgba(255, 255, 255, 0.85);
  }
`

interface LoginProps {
  onSuccess: (user: User) => void
}

function Login({ onSuccess }: LoginProps) {
  const { mode, toggle } = useTheme()
  const [loading, setLoading] = useState(false)
  const [ssoLoading, setSsoLoading] = useState(false)

  const finish = (user: User) => {
    storeUser(user)
    onSuccess(user)
  }

  const handleSubmit = (values: { email: string; password: string }) => {
    setLoading(true)
    const first = values.email.split('@')[0]
    const name = first
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
    setTimeout(() => {
      finish({
        name: name || 'Người dùng',
        email: values.email,
        role: 'Quản trị viên',
        avatar: name.charAt(0).toUpperCase() || 'N',
      })
      setLoading(false)
    }, 600)
  }

  const handleSso = () => {
    setSsoLoading(true)
    setTimeout(() => {
      finish({
        name: 'Người dùng SSO',
        email: 'user@sso.company.com',
        role: 'Quản trị viên',
        avatar: 'S',
        sso: true,
      })
      setSsoLoading(false)
    }, 800)
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

          <Form layout="vertical" onFinish={handleSubmit} requiredMark={false}>
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
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="••••••••" size="large" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 8 }}>
              <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                Đăng nhập
              </Button>
            </Form.Item>
          </Form>

          <Divider plain style={{ fontSize: 12 }}>
            hoặc đăng nhập bằng
          </Divider>

          <Button
            className="login-sso"
            icon={<GoogleOutlined />}
            onClick={handleSso}
            loading={ssoLoading}
          >
            SSO công ty
          </Button>

          <Typography.Paragraph
            className="login-sso login-remember"
            style={{ marginTop: 16, marginBottom: 0, textAlign: 'center' }}
          >
            <SafetyCertificateOutlined style={{ marginRight: 6 }} />
            Bảo mật & đăng nhập một lần (SSO)
          </Typography.Paragraph>
        </div>
      </div>
    </>
  )
}

export default Login
