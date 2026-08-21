import { useState } from 'react'
import { Avatar, Button, Card, Drawer, Dropdown, Empty, Grid, Layout, Menu, Typography } from 'antd'
import {
  AppstoreOutlined,
  BarChartOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  ShoppingCartOutlined,
  SunOutlined,
  TagOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { clearAuth, roleLabel, type User } from '../../auth'
import { useTheme } from '../../theme-context'
import Dashboard from '../../pages/Dashboard'
import AdminUsers from '../../pages/AdminUsers'

const layoutStyles = `
  .layout {
    min-height: 100svh;
  }

  .sidebar {
    position: sticky;
    top: 0;
    height: 100svh;
    border-right: 1px solid #0047ad;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #0047ad !important;
  }

  .sidebar .ant-menu {
    background: transparent !important;
    color: rgba(255, 255, 255, 0.85);
  }

  .sidebar .ant-menu-item,
  .sidebar .ant-menu-submenu-title {
    color: rgba(255, 255, 255, 0.85) !important;
  }

  .sidebar .ant-menu-item:hover,
  .sidebar .ant-menu-submenu-title:hover {
    color: #fff !important;
    background: transparent !important;
  }

  .sidebar .ant-menu-item:hover .anticon,
  .sidebar .ant-menu-item:hover .ant-menu-item-icon,
  .sidebar .ant-menu-submenu-title:hover .anticon,
  .sidebar .ant-menu-submenu-title:hover .ant-menu-item-icon {
    width: 40px;
    height: 40px;
    min-width: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.12) !important;
    font-size: 18px;
    flex-shrink: 0;
  }

  .sidebar .ant-menu-item-selected {
    background: transparent !important;
    color: #0047ad !important;
  }

  .sidebar .ant-menu-item-selected .anticon,
  .sidebar .ant-menu-item-selected .ant-menu-item-icon {
    width: 40px;
    height: 40px;
    min-width: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: #fff !important;
    color: #1677ff !important;
    font-size: 18px;
    flex-shrink: 0;
  }

  .sidebar .ant-menu-item-selected::after {
    border-inline-end: none !important;
  }

  .sidebar .ant-menu-sub.ant-menu-inline {
    background: rgba(0, 0, 0, 0.08) !important;
  }

  .sidebar .ant-menu-inline-collapsed > .ant-menu-item,
  .sidebar .ant-menu-inline-collapsed > .ant-menu-submenu > .ant-menu-submenu-title {
    padding-inline: 0 !important;
    justify-content: center;
  }

  .ant-menu-submenu-popup .ant-menu-vertical {
    background: #0047ad !important;
  }

  .ant-menu-submenu-popup .ant-menu-vertical .ant-menu-item {
    color: rgba(255, 255, 255, 0.85) !important;
  }

  .ant-menu-submenu-popup .ant-menu-vertical .ant-menu-item-selected {
    background: transparent !important;
    color: #0047ad !important;
  }

  .ant-menu-submenu-popup .ant-menu-vertical .ant-menu-item-selected .anticon,
  .ant-menu-submenu-popup .ant-menu-vertical .ant-menu-item-selected .ant-menu-item-icon {
    width: 40px;
    height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: #fff !important;
    color: #1677ff !important;
    font-size: 18px;
  }

  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 18px 20px;
    min-height: 64px;
  }

  .brand-badge {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  .brand-logo {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .brand-name {
    font-size: 16px;
    font-weight: 650;
    color: #fff;
    white-space: nowrap;
  }

  .sidebar-menu {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    border-inline-end: none !important;
  }

  .header-user {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    cursor: pointer;
    border: 1px solid #e8e8e8;
    border-radius: 12px;
    background: #fff;
    transition: all 0.2s;
  }

  .header-user:hover {
    border-color: #d0d0d0;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  }

  [data-theme='dark'] .header-user {
    background: #131b24;
    border-color: #303030;
  }

  [data-theme='dark'] .header-user:hover {
    border-color: #484848;
  }

  .theme-toggle-btn {
    color: rgba(0, 0, 0, 0.65) !important;
  }

  [data-theme='dark'] .theme-toggle-btn {
    color: rgba(255, 255, 255, 0.65) !important;
  }

  .user-avatar {
    background: #0047ad !important;
    color: #fff !important;
    font-weight: 650;
    flex-shrink: 0;
  }

  .user-name {
    font-size: 14px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.88);
    white-space: nowrap;
  }

  .user-role {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
    white-space: nowrap;
  }

  .topbar-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .collapse-btn {
    border: none;
    box-shadow: none;
    padding: 8px;
    border-radius: 8px;
  }

  .theme-toggle-btn {
    color: rgba(0, 0, 0, 0.65) !important;
    border: 1px solid #e8e8e8;
    border-radius: 12px;
    margin-right: 4px;
    background: #fff;
    height: 50px !important;
    width: 50px !important;
    padding: 0 !important;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .theme-toggle-btn:hover {
    color: rgba(0, 0, 0, 0.88) !important;
    border-color: #d0d0d0;
  }

  [data-theme='dark'] .theme-toggle-btn {
    color: rgba(255, 255, 255, 0.65) !important;
    background: #131b24;
    border-color: #303030;
  }

  [data-theme='dark'] .theme-toggle-btn:hover {
    color: rgba(255, 255, 255, 0.88) !important;
    border-color: #484848;
  }

  .topbar {
    background: #fff !important;
    padding: 0 24px !important;
    line-height: normal !important;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    border-bottom: 1px solid #f0f0f0;
    height: auto !important;
    min-height: 64px;
    padding-block: 12px !important;
  }

  .search-input {
    width: 240px;
  }

  .content {
    padding: 24px;
    background: #f5f5f5;
  }

  [data-theme='dark'] .topbar {
    background: #131b24 !important;
    border-bottom-color: rgba(255, 255, 255, 0.12);
  }

  [data-theme='dark'] .content {
    background: #1f2831;
  }

  [data-theme='dark'] .data-table {
    background: #131b24;
  }

  [data-theme='dark'] .cell-name {
    color: rgba(255, 255, 255, 0.88);
  }

  [data-theme='dark'] .cell-desc {
    color: rgba(255, 255, 255, 0.45);
  }

  [data-theme='dark'] .cell-date {
    color: rgba(255, 255, 255, 0.45);
  }

  [data-theme='dark'] .user-name {
    color: rgba(255, 255, 255, 0.88);
  }

  [data-theme='dark'] .user-role {
    color: rgba(255, 255, 255, 0.45);
  }

  .data-table {
    background: #fff;
  }

  .cell-name {
    font-weight: 600;
  }

  .cell-desc {
    color: rgba(0, 0, 0, 0.45);
    font-size: 13px;
    margin-top: 2px;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cell-total {
    color: #1677ff;
    font-weight: 600;
  }

  .cell-date {
    color: rgba(0, 0, 0, 0.45);
    font-size: 13px;
    white-space: nowrap;
  }

  @media (max-width: 768px) {
    .search-input {
      width: 100%;
    }

    .topbar {
      padding: 12px 16px !important;
    }

    .content {
      padding: 16px;
    }
  }

  .drawer-sidebar {
    position: static !important;
    height: 100%;
    min-height: 100%;
    border-right: none;
  }
`

const BASE_NAV_ITEMS = [
  { key: 'dashboard', icon: <AppstoreOutlined />, label: 'Ghi chú ' },
  { key: 'products', icon: <ShoppingCartOutlined />, label: 'Sản phẩm' },
  { key: 'categories', icon: <TagOutlined />, label: 'Danh mục' },
  { key: 'orders', icon: <BarChartOutlined />, label: 'Đơn hàng' },
  { key: 'reports', icon: <BarChartOutlined />, label: 'Báo cáo' },
]

function buildNavItems(isAdmin: boolean) {
  return [
    ...BASE_NAV_ITEMS,
    ...(isAdmin
      ? [{ key: 'admin-users', icon: <TeamOutlined />, label: 'Quản lý người dùng' }]
      : []),
  ]
}

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Ghi chú',
  products: 'Sản phẩm',
  categories: 'Danh mục',
  orders: 'Đơn hàng',
  reports: 'Báo cáo',
  'admin-users': 'Quản lý người dùng',
}

const NO_DATA_PAGES = new Set(['products', 'categories', 'orders', 'reports'])

function AppLayout({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [activeKey, setActiveKey] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { mode, toggle } = useTheme()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.lg
  const isAdmin = user.role === 'admin'
  const navItems = buildNavItems(isAdmin)

  function handleNavigate(key: string) {
    setActiveKey(key)
    if (isMobile) setDrawerOpen(false)
  }

  const accountMenu = {
    items: [{ key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất' }],
    onClick: () => {
      clearAuth()
      onLogout()
    },
  }

  const sidebarMenu = (
    <>
      <div className="sidebar-brand">
        <span className="brand-badge">
          <img className="brand-logo" src="/logo.png" alt="logo" />
        </span>
        {!collapsed && <span className="brand-name">My Hub</span>}
      </div>
      <Menu
        className="sidebar-menu"
        mode="inline"
        inlineCollapsed={!isMobile ? collapsed : false}
        selectedKeys={[activeKey]}
        items={navItems}
        onClick={({ key }) => handleNavigate(key)}
      />
    </>
  )

  return (
    <>
      <style>{layoutStyles}</style>
      <Layout className="layout">
        {isMobile ? (
          <Drawer
            placement="left"
            width={240}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            closable={false}
            styles={{ body: { padding: 0, background: '#0047ad' } }}
          >
            <div className="sidebar drawer-sidebar">{sidebarMenu}</div>
          </Drawer>
        ) : (
          <Layout.Sider
            className="sidebar"
            width={240}
            collapsedWidth={80}
            collapsible
            collapsed={collapsed}
            trigger={null}
          >
            {sidebarMenu}
          </Layout.Sider>
        )}

        <Layout>
          <Layout.Header className="topbar">
            <div className="topbar-left">
              {isMobile && (
                <Button
                  className="collapse-btn"
                  type="text"
                  icon={<MenuOutlined />}
                  onClick={() => setDrawerOpen(true)}
                />
              )}
              {!isMobile && (
                <Button
                  className="collapse-btn"
                  type="text"
                  icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                  onClick={() => setCollapsed((c) => !c)}
                />
              )}
              {!isMobile && (
                <div className="topbar-title">
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    {PAGE_TITLES[activeKey] ?? navItems.find((i) => i.key === activeKey)?.label ?? ''}
                  </Typography.Title>
                  <Typography.Text type="secondary">
                    {activeKey === 'dashboard'
                      ? 'Quản lý task và công việc'
                      : NO_DATA_PAGES.has(activeKey)
                        ? 'Chưa có dữ liệu'
                        : ''}
                  </Typography.Text>
                </div>
              )}
            </div>
            <div className="topbar-right">
              <Button
                className="theme-toggle-btn"
                type="text"
                icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
                onClick={toggle}
              />
              <Dropdown menu={accountMenu} placement="bottomRight" trigger={['click']}>
                <div className="header-user">
                  <Avatar size={36} className="user-avatar">
                    {user.avatar}
                  </Avatar>
                  <div>
                    <div className="user-name">{user.name}</div>
                    <div className="user-role">{roleLabel(user.role)}</div>
                  </div>
                </div>
              </Dropdown>
            </div>
          </Layout.Header>

          <Layout.Content className="content">
            {activeKey === 'dashboard' ? (
              <Dashboard />
            ) : activeKey === 'admin-users' ? (
              isAdmin ? (
                <AdminUsers currentEmail={user.email} />
              ) : (
                <Card style={{ marginTop: 16 }}>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Bạn không có quyền truy cập trang này"
                    style={{ padding: '48px 0' }}
                  />
                </Card>
              )
            ) : NO_DATA_PAGES.has(activeKey) ? (
              <Card style={{ marginTop: 16 }}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Chưa có dữ liệu"
                  style={{ padding: '48px 0' }}
                />
              </Card>
            ) : (
              <Card style={{ marginTop: 16 }}>
                <Empty description="Trang này đang được xây dựng" />
              </Card>
            )}
          </Layout.Content>
        </Layout>
      </Layout>
    </>
  )
}

export default AppLayout
