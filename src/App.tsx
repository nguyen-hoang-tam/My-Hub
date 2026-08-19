import { useState } from 'react'
import { App as AntApp, ConfigProvider, theme } from 'antd'
import AppLayout from './components/layout/AppLayout'
import Login from './components/auth/Login'
import { getStoredUser, type User } from './auth'
import { ThemeProvider } from './theme'
import { useTheme } from './theme-context'

function AppContent() {
  const { mode } = useTheme()
  const [user, setUser] = useState<User | null>(() => getStoredUser())

  return (
    <ConfigProvider
      theme={{
        algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token:
          mode === 'dark'
            ? { colorBgContainer: '#131b24' }
            : undefined,
      }}
    >
      <AntApp>
        {user ? <AppLayout user={user} onLogout={() => setUser(null)} /> : <Login onSuccess={setUser} />}
      </AntApp>
    </ConfigProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}