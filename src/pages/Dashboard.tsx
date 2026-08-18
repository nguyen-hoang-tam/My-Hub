import { useEffect, useState } from 'react'
import {
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Grid,
  Image,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
  type TableColumnsType,
} from 'antd'
import {
  AppstoreOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  HistoryOutlined,
  PlusOutlined,
  UndoOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'

type Department = 'Dev' | 'BA' | 'QC' | 'UXUI'
type Status = 'new' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'

interface Task {
  id: string
  title: string
  department: Department
  status: Status
  deadline: string | null
  images: string[]
}

interface DeletedTask extends Task {
  deletedAt: string
}

interface StoredTask {
  id?: string
  title?: string
  department?: Department
  status?: Status
  done?: boolean
  deadline?: string | null
  image?: string | null
  images?: string[]
  deletedAt?: string
}

const DEPARTMENTS: Department[] = ['Dev', 'BA', 'QC', 'UXUI']

const STATUSES: Status[] = ['new', 'in_progress', 'on_hold', 'completed', 'cancelled']

const STATUS_META: Record<
  Status,
  { color: string; accent: string; label: string; description: string }
> = {
  new: {
    color: 'default',
    accent: '#8c8c8c',
    label: 'Mới tạo',
    description:
      'Task vừa được tạo ra, chưa được xem xét, gán cho ai hoặc chưa sẵn sàng để thực hiện.',
  },
  in_progress: {
    color: 'processing',
    accent: '#1677ff',
    label: 'Đang thực hiện',
    description:
      'Task đã được xem xét và gán cho người thực hiện. Công việc đang được triển khai hoặc đã sẵn sàng để bắt đầu.',
  },
  on_hold: {
    color: 'orange',
    accent: '#faad14',
    label: 'Tạm dừng',
    description:
      'Task tạm thời bị trì hoãn vì một lý do nào đó, ví dụ như đang chờ phê duyệt, chờ thông tin bổ sung hoặc phụ thuộc vào một công việc khác.',
  },
  completed: {
    color: 'green',
    accent: '#52c41a',
    label: 'Hoàn thành',
    description:
      'Tất cả công việc cho task đã được thực hiện và xác minh, không cần thêm hành động nào nữa.',
  },
  cancelled: {
    color: 'red',
    accent: '#ff4d4f',
    label: 'Bị hủy / Lỗi',
    description: 'Task không thể hoàn thành (do lỗi) hoặc bị hủy bỏ.',
  },
}

const DEPT_META: Record<Department, { color: string }> = {
  Dev: { color: 'purple' },
  BA: { color: 'cyan' },
  QC: { color: 'green' },
  UXUI: { color: 'magenta' },
}

type ModalMode = 'create' | 'edit' | 'view'
type ViewMode = 'table' | 'kanban'

const STORAGE_KEY = 'myhub.tasks'
const HISTORY_KEY = 'myhub.deletedTasks'
const VIEW_KEY = 'myhub.tasks.view'

const VIEW_OPTIONS = [
  { value: 'table', icon: <UnorderedListOutlined />, label: 'Bảng' },
  { value: 'kanban', icon: <AppstoreOutlined />, label: 'Kanban' },
]

const KANBAN_COLUMNS = STATUSES.map((s) => ({
  key: s,
  status: s,
  title: STATUS_META[s].label,
  accent: STATUS_META[s].accent,
}))

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function migrateStatus(t: StoredTask): Status {
  if (t.status && STATUSES.includes(t.status)) {
    return t.status
  }
  return t.done ? 'completed' : 'new'
}

function normalizeStored(t: StoredTask): Task & { deletedAt?: string } {
  return {
    id: t.id ?? crypto.randomUUID(),
    title: t.title ?? '',
    department: (t.department ?? 'Dev') as Department,
    status: migrateStatus(t),
    deadline: t.deadline ?? null,
    images: t.images && t.images.length > 0 ? t.images : t.image ? [t.image] : [],
    deletedAt: t.deletedAt,
  }
}

function Dashboard() {
  const { message } = App.useApp()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  const [tasks, setTasks] = useState<Task[]>(() =>
    loadStored<StoredTask[]>(STORAGE_KEY, []).map(normalizeStored),
  )
  const [form] = Form.useForm<{
    title: string
    department: Department
    status: Status
    deadline: dayjs.Dayjs | null
  }>()
  const statusValue = Form.useWatch('status', form)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<ModalMode>('create')
  const [current, setCurrent] = useState<Task | null>(null)
  const [deletedTasks, setDeletedTasks] = useState<DeletedTask[]>(() =>
    loadStored<StoredTask[]>(HISTORY_KEY, []).map((t) => normalizeStored(t) as DeletedTask),
  )
  const [historyOpen, setHistoryOpen] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [view, setView] = useState<ViewMode>(() =>
    loadStored<ViewMode>(VIEW_KEY, 'table') === 'kanban' ? 'kanban' : 'table',
  )
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, JSON.stringify(view))
  }, [view])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(deletedTasks))
  }, [deletedTasks])

  const openCreate = () => {
    setMode('create')
    setCurrent(null)
    setImages([])
    form.resetFields()
    setOpen(true)
  }

  const openView = (task: Task) => {
    setMode('view')
    setCurrent(task)
    setImages(task.images ?? [])
    form.setFieldsValue({
      title: task.title,
      department: task.department,
      status: task.status,
      deadline: task.deadline ? dayjs(task.deadline) : null,
    })
    setOpen(true)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    const deadline = values.deadline ? values.deadline.format('YYYY-MM-DD') : null
    if (mode === 'create') {
      const task: Task = { id: crypto.randomUUID(), ...values, deadline, images }
      setTasks((prev) => [...prev, task])
      message.success('Đã tạo task')
    } else if (mode === 'edit' && current) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === current.id ? { ...t, ...values, deadline, images } : t,
        ),
      )
      message.success('Đã cập nhật task')
    }
    setOpen(false)
  }

  const removeTask = (task: Task) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id))
    setDeletedTasks((prev) => [{ ...task, deletedAt: dayjs().toISOString() }, ...prev])
    message.success('Đã xóa task')
  }

  const restoreTask = (deleted: DeletedTask) => {
    const { id, title, department, status, deadline, images } = deleted
    const task: Task = { id, title, department, status, deadline, images }
    setTasks((prev) => [...prev, task])
    setDeletedTasks((prev) => prev.filter((t) => t.id !== deleted.id))
    message.success('Đã khôi phục task')
  }

  const setTaskStatus = (task: Task, status: Status) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)))
    message.success(`Đã chuyển task sang "${STATUS_META[status].label}"`)
  }

  const toggleDone = (task: Task) => {
    setTaskStatus(task, task.status === 'completed' ? 'in_progress' : 'completed')
  }

  const columns: TableColumnsType<Task> = [
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Task) => (
        <Typography.Text
          strong
          delete={record.status === 'completed' || record.status === 'cancelled'}
          type={
            record.status === 'completed' || record.status === 'cancelled' ? 'secondary' : undefined
          }
        >
          {title}
        </Typography.Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: Status) => (
        <Tooltip title={STATUS_META[status].description}>
          <Tag
            color={STATUS_META[status].color}
            icon={
              status === 'completed' ? (
                <CheckOutlined />
              ) : status === 'cancelled' ? (
                <CloseOutlined />
              ) : undefined
            }
          >
            {STATUS_META[status].label}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: 'Phòng ban',
      dataIndex: 'department',
      key: 'department',
      width: 110,
      render: (d: Department) => <Tag color={DEPT_META[d].color}>{d}</Tag>,
    },
    {
      title: 'Hạn chót',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 140,
      render: (deadline: string | null) =>
        deadline ? (
          <Space size={6} className="deadline-cell">
            <CalendarOutlined />
            <Typography.Text type="secondary">{dayjs(deadline).format('DD/MM/YYYY')}</Typography.Text>
          </Space>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 90,
      render: (_: unknown, record: Task) => (
        <Space
          size={0}
          onClick={(e) => e.stopPropagation()}
        >
          <Popconfirm
            title="Xóa task"
            description={`Xóa task "${record.title}"?`}
            okText="Xóa"
            okButtonProps={{ danger: true }}
            cancelText="Hủy"
            onConfirm={() => removeTask(record)}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
    {
      title: 'Done',
      key: 'done-action',
      width: 110,
      align: 'center',
      render: (_: unknown, record: Task) => (
        <Button
          type={record.status === 'completed' ? 'default' : 'primary'}
          icon={record.status === 'completed' ? <UndoOutlined /> : <CheckCircleOutlined />}
          style={
            record.status === 'completed'
              ? undefined
              : { background: '#52c41a', borderColor: '#52c41a' }
          }
          onClick={(e) => {
            e.stopPropagation()
            toggleDone(record)
          }}
        >
          {record.status === 'completed' ? 'Hoàn tác' : 'Done'}
        </Button>
      ),
    },
  ]

  return (
    <Card
      title={
        <div className="task-header">
          <div className="task-stats">
            {STATUSES.map((s) => (
              <Tag
                key={s}
                className="task-stat-tag"
                variant="solid"
                color={STATUS_META[s].accent}
              >
                {STATUS_META[s].label}: {tasks.filter((t) => t.status === s).length}
              </Tag>
            ))}
          </div>
          <div className="task-header-tools">
            <Segmented
              block={isMobile}
              value={view}
              onChange={(v) => setView(v as ViewMode)}
              options={VIEW_OPTIONS}
            />
            <div className="task-header-actions">
              <Button icon={<HistoryOutlined />} onClick={() => setHistoryOpen(true)}>
                Lịch sử xoá
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                Tạo task
              </Button>
            </div>
          </div>
        </div>
      }
    >
      <style>{`.task-row { cursor: pointer; }
        .task-header-tools { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .task-header-actions { display: flex; align-items: center; gap: 8px; }
        .task-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; width: 100%; }
        .task-header .task-stats { flex: 1; min-width: 0; }
        .task-stats { display: flex; flex-wrap: wrap; gap: 8px; flex: 1; min-width: 0; }
        .ant-card-head-title .task-stats { width: 100%; }
        .task-stat-tag { margin-inline-end: 0 !important; color: #fff; font-weight: 600; border-radius: 6px; padding-inline: 12px; height: 32px; display: inline-flex; align-items: center; font-size: 14px; }
        .deadline-cell { color: rgba(0,0,0,0.45); }
        :root[data-theme='dark'] .deadline-cell { color: rgba(255,255,255,0.45); }
        .task-image-preview { border: 1px solid #f0f0f0; border-radius: 8px; overflow: hidden; max-width: 320px; }
        .task-image-preview img { display: block; width: 100%; height: auto; object-fit: cover; }
        :root[data-theme='dark'] .task-image-preview { border-color: #303030; }
        .kanban-board { display: flex; gap: 16px; overflow-x: auto; align-items: flex-start; padding-bottom: 8px; }
        .kanban-column { flex: 1 1 0; min-width: 280px; background: rgba(0,0,0,0.03); border: 1px solid #f0f0f0; border-radius: 12px; padding: 12px; transition: border-color 0.2s, background 0.2s; }
        .kanban-column.drag-over { border-color: #1677ff; background: rgba(22,119,255,0.06); }
        :root[data-theme='dark'] .kanban-column { background: rgba(255,255,255,0.04); border-color: #303030; }
        :root[data-theme='dark'] .kanban-column.drag-over { border-color: #1677ff; background: rgba(22,119,255,0.15); }
        .kanban-column-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .kanban-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
        .kanban-count { margin-inline-end: 0; }
        .kanban-card { cursor: grab; }
        .kanban-card:active { cursor: grabbing; }
        .kanban-card.dragging { opacity: 0.4; }
        .status-description { margin-top: -8px; margin-bottom: 16px; padding: 8px 12px; background: rgba(0,0,0,0.02); border-radius: 8px; }
        :root[data-theme='dark'] .status-description { background: rgba(255,255,255,0.04); }
        .task-view-layout { display: flex; gap: 32px; align-items: stretch; }
        .task-view-fields { flex: 1.25; min-width: 0; }
        .task-view-images { flex: 1; min-width: 0; border-left: 1px solid #f0f0f0; padding-left: 32px; display: flex; flex-direction: column; }
        .task-view-images-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .task-view-image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }
        .task-view-image-item { width: 100%; aspect-ratio: 1 / 1; border-radius: 10px; overflow: hidden; border: 1px solid #f0f0f0; background: rgba(0,0,0,0.03); }
        .task-view-image-item .ant-image { width: 100%; height: 100%; }
        .task-view-image-item .ant-image-img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .task-view-empty-images { flex: 1; display: flex; align-items: center; justify-content: center; border: 1px dashed #d9d9d9; border-radius: 12px; min-height: 180px; background: rgba(0,0,0,0.02); }
        :root[data-theme='dark'] .task-view-images { border-left-color: #303030; }
        :root[data-theme='dark'] .task-view-image-item { border-color: #303030; background: rgba(255,255,255,0.04); }
        :root[data-theme='dark'] .task-view-empty-images { border-color: #303030; background: rgba(255,255,255,0.04); }
        @media (max-width: 768px) {
          .task-view-layout { flex-direction: column; gap: 20px; }
          .task-view-images { border-left: none; padding-left: 0; border-top: 1px solid #f0f0f0; padding-top: 20px; }
          :root[data-theme='dark'] .task-view-images { border-top-color: #303030; }
          .task-header { flex-direction: column; align-items: stretch; }
          .task-header .task-stats { flex: 0 0 auto; width: 100%; }
          .task-header-tools { flex-direction: column; align-items: stretch; gap: 12px; }
          .task-header-actions { justify-content: flex-end; }
          .task-header-actions .ant-btn { flex: 1; }
        }
        @media (min-width: 1200px) {
          .kanban-column { min-width: 220px; }
        }`}</style>
      {tasks.length === 0 ? (
        <Empty
          style={{ padding: '48px 0' }}
          description={
            <Typography.Text type="secondary">
              Chưa có task nào. Hãy tạo task đầu tiên để bắt đầu.
            </Typography.Text>
          }
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Tạo task
          </Button>
        </Empty>
      ) : view === 'kanban' ? (
        <div className="kanban-board">
          {KANBAN_COLUMNS.map((col) => (
            <div
              key={col.key}
              className={`kanban-column${dragOver === col.key ? ' drag-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(col.key)
              }}
              onDragLeave={() => setDragOver((prev) => (prev === col.key ? null : prev))}
              onDrop={() => {
                setDragOver(null)
                if (dragId) {
                  const task = tasks.find((t) => t.id === dragId)
                  if (task && task.status !== col.status) {
                    setTaskStatus(task, col.status)
                  }
                }
                setDragId(null)
              }}
            >
              <div className="kanban-column-header">
                <Space size={8}>
                  <span className="kanban-dot" style={{ background: col.accent }} />
                  <Typography.Text strong>{col.title}</Typography.Text>
                </Space>
                <Tag className="kanban-count">
                  {tasks.filter((t) => t.status === col.status).length}
                </Tag>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tasks
                  .filter((t) => t.status === col.status)
                  .map((task) => (
                    <Card
                      key={task.id}
                      size="small"
                      className={`kanban-card${dragId === task.id ? ' dragging' : ''}`}
                      draggable
                      onDragStart={() => setDragId(task.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => openView(task)}
                    >
                      <Typography.Text
                        strong
                        delete={task.status === 'completed' || task.status === 'cancelled'}
                        type={
                          task.status === 'completed' || task.status === 'cancelled'
                            ? 'secondary'
                            : undefined
                        }
                      >
                        {task.title}
                      </Typography.Text>
                      <div
                        style={{
                          marginTop: 10,
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 6,
                        }}
                      >
                        <Tag color={DEPT_META[task.department].color}>{task.department}</Tag>
                        {task.deadline && (
                          <Tag icon={<CalendarOutlined />}>
                            {dayjs(task.deadline).format('DD/MM/YYYY')}
                          </Tag>
                        )}
                      </div>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : !isMobile ? (
        <Table<Task>
          rowKey="id"
          columns={columns}
          dataSource={tasks}
          pagination={false}
          scroll={{ x: 830 }}
          rowClassName="task-row"
          onRow={(record) => ({
            onClick: () => openView(record),
          })}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tasks.map((task) => (
            <Card
              key={task.id}
              size="small"
              className="task-row"
              onClick={() => openView(task)}
            >
              <div
                style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}
              >
                <Typography.Text
                  strong
                  delete={task.status === 'completed' || task.status === 'cancelled'}
                  type={
                    task.status === 'completed' || task.status === 'cancelled'
                      ? 'secondary'
                      : undefined
                  }
                  style={{ flex: 1 }}
                >
                  {task.title}
                </Typography.Text>
                <Tag
                  color={STATUS_META[task.status].color}
                  icon={
                    task.status === 'completed' ? (
                      <CheckOutlined />
                    ) : task.status === 'cancelled' ? (
                      <CloseOutlined />
                    ) : undefined
                  }
                  style={{ flexShrink: 0, marginInlineEnd: 0 }}
                >
                  {STATUS_META[task.status].label}
                </Tag>
              </div>
              <div
                style={{
                  marginTop: 10,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <Tag color={DEPT_META[task.department].color}>{task.department}</Tag>
                {task.deadline && (
                  <Tag icon={<CalendarOutlined />}>{dayjs(task.deadline).format('DD/MM/YYYY')}</Tag>
                )}
              </div>
              <div
                style={{
                  marginTop: 12,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                }}
              >
                <Popconfirm
                  title="Xóa task"
                  description={`Xóa task "${task.title}"?`}
                  okText="Xóa"
                  okButtonProps={{ danger: true }}
                  cancelText="Hủy"
                  onConfirm={() => removeTask(task)}
                >
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Xóa
                  </Button>
                </Popconfirm>
                <Button
                  type={task.status === 'completed' ? 'default' : 'primary'}
                  size="small"
                  icon={
                    task.status === 'completed' ? <UndoOutlined /> : <CheckCircleOutlined />
                  }
                  style={
                    task.status === 'completed'
                      ? undefined
                      : { background: '#52c41a', borderColor: '#52c41a' }
                  }
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleDone(task)
                  }}
                >
                  {task.status === 'completed' ? 'Hoàn tác' : 'Done'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        title={
          mode === 'create'
            ? 'Tạo task'
            : mode === 'edit'
              ? 'Sửa task'
              : 'Chi tiết task'
        }
        open={open}
        onCancel={() => setOpen(false)}
        destroyOnHidden
        width={900}
        footer={
          mode === 'view' ? (
            <Space>
              <Button onClick={() => setOpen(false)}>Đóng</Button>
              <Button type="primary" icon={<EditOutlined />} onClick={() => setMode('edit')}>
                Sửa
              </Button>
            </Space>
          ) : (
            <Space>
              <Button onClick={() => setOpen(false)}>Hủy</Button>
              <Button type="primary" loading={false} onClick={handleSave}>
                Lưu
              </Button>
            </Space>
          )
        }
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 8 }}
          disabled={mode === 'view'}
        >
            <div className="task-view-layout">
              <div className="task-view-fields">
                <Form.Item
                  name="title"
                  label="Tiêu đề"
                  rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
                >
                  <Input placeholder="Nhập tiêu đề task" maxLength={120} showCount />
                </Form.Item>
                <Form.Item
                  name="department"
                  label="Phòng ban"
                  rules={[{ required: true, message: 'Vui lòng chọn phòng ban' }]}
                >
                  <Select
                    placeholder="Chọn phòng ban"
                    options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
                  />
                </Form.Item>
                <Form.Item
                  name="status"
                  label="Trạng thái"
                  rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
                >
                  <Select
                    placeholder="Chọn trạng thái"
                    options={STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label }))}
                  />
                </Form.Item>
                {statusValue && (
                  <div className="status-description">
                    <Typography.Text type="secondary">
                      {STATUS_META[statusValue as Status].description}
                    </Typography.Text>
                  </div>
                )}
                <Form.Item name="deadline" label="Hạn chót">
                  <DatePicker style={{ width: '100%' }} placeholder="Chọn hạn chót" />
                </Form.Item>
              </div>

              <div className="task-view-images">
                <div className="task-view-images-header">
                  <Typography.Text strong>Hình ảnh</Typography.Text>
                  {mode === 'view' && images.length === 0 && (
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => setMode('edit')}
                    >
                      Thêm ảnh
                    </Button>
                  )}
                </div>
                {mode === 'view' ? (
                  images.length > 0 ? (
                    <Image.PreviewGroup>
                      <div className="task-view-image-grid">
                        {images.map((src, index) => (
                          <div className="task-view-image-item" key={index}>
                            <Image
                              src={src}
                              alt={`task-${index}`}
                              preview={{ mask: false }}
                            />
                          </div>
                        ))}
                      </div>
                    </Image.PreviewGroup>
                  ) : (
                    <div className="task-view-empty-images">
                      <Typography.Text type="secondary">Chưa có hình ảnh</Typography.Text>
                    </div>
                  )
                ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {images.map((src, index) => (
                    <div
                      key={index}
                      style={{ position: 'relative', width: 104, height: 104 }}
                    >
                      <img
                        src={src}
                        alt={`task-${index}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: 8,
                          border: '1px solid #f0f0f0',
                        }}
                      />
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        style={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          color: '#fff',
                          background: 'rgba(0,0,0,0.55)',
                          borderRadius: 6,
                        }}
                        onClick={() =>
                          setImages((prev) => prev.filter((_, i) => i !== index))
                        }
                      />
                    </div>
                  ))}
                  <Upload
                    accept="image/*"
                    listType="picture-card"
                    showUploadList={false}
                    beforeUpload={(file) => {
                      if (file.size > 5 * 1024 * 1024) {
                        message.warning('Ảnh tối đa 5MB')
                        return Upload.LIST_IGNORE
                      }
                      const reader = new FileReader()
                      reader.onload = () =>
                        setImages((prev) => [...prev, reader.result as string])
                      reader.readAsDataURL(file)
                      return false
                    }}
                  >
                    <div>
                      <PlusOutlined />
                      <div style={{ marginTop: 8 }}>Tải ảnh</div>
                    </div>
                  </Upload>
                </div>
                )}
              </div>
            </div>
          </Form>
      </Modal>

      <Modal
        title="Lịch sử xoá"
        open={historyOpen}
        onCancel={() => setHistoryOpen(false)}
        footer={[
          <Button key="close" onClick={() => setHistoryOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={680}
        destroyOnHidden
      >
        {deletedTasks.length === 0 ? (
          <Empty description="Chưa có task nào bị xoá" />
        ) : !isMobile ? (
          <Table<DeletedTask>
            rowKey="id"
            pagination={false}
            size="small"
            scroll={{ x: 640 }}
            columns={[
              {
                title: 'Tiêu đề',
                dataIndex: 'title',
                key: 'title',
                render: (title: string) => <Typography.Text delete>{title}</Typography.Text>,
              },
              {
                title: 'Phòng ban',
                dataIndex: 'department',
                key: 'department',
                width: 90,
                render: (d: Department) => <Tag color={DEPT_META[d].color}>{d}</Tag>,
              },
              {
                title: 'Trạng thái',
                dataIndex: 'status',
                key: 'status',
                width: 130,
                render: (status: Status) => (
                  <Tag color={STATUS_META[status].color}>{STATUS_META[status].label}</Tag>
                ),
              },
              {
                title: 'Thời điểm xoá',
                dataIndex: 'deletedAt',
                key: 'deletedAt',
                width: 150,
                render: (deletedAt: string) => (
                  <Typography.Text type="secondary">
                    {dayjs(deletedAt).format('DD/MM/YYYY HH:mm')}
                  </Typography.Text>
                ),
              },
              {
                title: 'Thao tác',
                key: 'actions',
                width: 110,
                render: (_: unknown, record: DeletedTask) => (
                  <Button size="small" icon={<UndoOutlined />} onClick={() => restoreTask(record)}>
                    Khôi phục
                  </Button>
                ),
              },
            ]}
            dataSource={deletedTasks}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {deletedTasks.map((task) => (
              <Card key={task.id} size="small">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <Typography.Text delete style={{ flex: 1 }}>
                    {task.title}
                  </Typography.Text>
                  <Tag
                    color={STATUS_META[task.status].color}
                    style={{ flexShrink: 0, marginInlineEnd: 0 }}
                  >
                    {STATUS_META[task.status].label}
                  </Tag>
                </div>
                <div
                  style={{
                    marginTop: 10,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <Tag color={DEPT_META[task.department].color}>{task.department}</Tag>
                  <Tag icon={<CalendarOutlined />}>
                    {task.deadline ? dayjs(task.deadline).format('DD/MM/YYYY') : '—'}
                  </Tag>
                </div>
                <div
                  style={{
                    marginTop: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(task.deletedAt).format('DD/MM/YYYY HH:mm')}
                  </Typography.Text>
                  <Button size="small" icon={<UndoOutlined />} onClick={() => restoreTask(task)}>
                    Khôi phục
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Modal>
    </Card>
  )
}

export default Dashboard