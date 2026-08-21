import { useEffect, useRef, useState } from 'react'
import {
  App,
  Alert,
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
  Spin,
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
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  UndoOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { taskApi, type Department, type Task } from '../api/tasks'
import { migrateLegacyTasks } from '../migrate'

type Status = 'new' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'

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

function Dashboard() {
  const { message } = App.useApp()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form] = Form.useForm<{
    title: string
    departments: Department[]
    status: Status
    deadline: dayjs.Dayjs | null
  }>()
  const statusValue = Form.useWatch('status', form)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<ModalMode>('create')
  const [current, setCurrent] = useState<Task | null>(null)
  const [saving, setSaving] = useState(false)
  const [images, setImages] = useState<string[]>([])
  // Ref đồng bộ với images để handleSave luôn dùng giá trị mới nhất
  // (tránh stale closure khi FileReader đọc ảnh xong sau khi bấm Lưu)
  const imagesRef = useRef<string[]>([])
  // Các ảnh đang được đọc dở; handleSave phải chờ hết trước khi gửi
  const pendingUploadsRef = useRef<Promise<void>[]>([])
  const [view, setView] = useState<ViewMode>('kanban')
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      await migrateLegacyTasks()
      try {
        const data = await taskApi.getAll()
        if (!active) return
        setTasks(data)
        setError(null)
      } catch (e) {
        if (!active) return
        setError(e instanceof Error ? e.message : 'Không thể tải task')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const refresh = () => {
    taskApi
      .getAll()
      .then((data) => {
        setTasks(data)
        setError(null)
      })
      .catch((e) =>
        message.error('Không thể tải task: ' + (e instanceof Error ? e.message : e)),
      )
  }

  const setImagesSync = (next: string[]) => {
    imagesRef.current = next
    setImages(next)
  }

  // Phòng hờ: dữ liệu cũ có thể chưa được normalize thành mảng
  const taskDepartments = (task: Task): Department[] =>
    Array.isArray(task.departments)
      ? task.departments
      : []

  const openCreate = () => {
    setMode('create')
    setCurrent(null)
    setImagesSync([])
    form.resetFields()
    setOpen(true)
  }

  const openView = (task: Task) => {
    setMode('view')
    setCurrent(task)
    setImagesSync(task.images ?? [])
    form.setFieldsValue({
      title: task.title,
      departments: taskDepartments(task),
      status: task.status,
      deadline: task.deadline ? dayjs(task.deadline) : null,
    })
    setOpen(true)
  }

  // Nhân bản: mở form tạo mới với sẵn dữ liệu của task gốc để sửa rồi lưu
  const openCopy = (task: Task) => {
    setMode('create')
    setCurrent(null)
    setImagesSync([...(task.images ?? [])])
    form.setFieldsValue({
      title: task.title,
      departments: taskDepartments(task),
      status: task.status,
      deadline: task.deadline ? dayjs(task.deadline) : null,
    })
    setOpen(true)
  }

  // Tag phòng ban
  const deptTags = (task: Task) => (
    <>
      {taskDepartments(task).map((d) => (
        <Tag key={d} color={DEPT_META[d].color}>
          {d}
        </Tag>
      ))}
    </>
  )

  const handleSave = async () => {
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    // Chờ các ảnh đang đọc dở để đảm bảo lưu đủ danh sách ảnh
    if (pendingUploadsRef.current.length > 0) {
      await Promise.all(pendingUploadsRef.current)
      pendingUploadsRef.current = []
    }
    const deadline = values.deadline ? values.deadline.format('YYYY-MM-DD') : null
    const finalImages = imagesRef.current
    setSaving(true)
    try {
      if (mode === 'create') {
        const created = await taskApi.create({
          title: values.title,
          departments: values.departments,
          status: values.status,
          deadline,
          images: finalImages,
        })
        setTasks((prev) => [created, ...prev])
        message.success('Đã tạo task')
      } else if (mode === 'edit' && current) {
        const updated = await taskApi.update(current.id, {
          title: values.title,
          departments: values.departments,
          status: values.status,
          deadline,
          images: finalImages,
        })
        // Dùng ngay response của PUT thay vì GET lại (KV có thể trả dữ liệu cũ)
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
        message.success('Đã cập nhật task')
      }
      setOpen(false)
      setError(null)
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Không thể lưu task')
    } finally {
      setSaving(false)
    }
  }

  const removeTask = (task: Task) => {
    taskApi
      .delete(task.id)
      .then(() => {
        message.success('Đã xóa task')
        refresh()
      })
      .catch((e) =>
        message.error('Xóa thất bại: ' + (e instanceof Error ? e.message : e)),
      )
  }

  const setTaskStatus = (task: Task, status: Status) => {
    taskApi
      .update(task.id, { status })
      .then((updated) => {
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
        message.success(`Đã chuyển task sang "${STATUS_META[status].label}"`)
      })
      .catch((e) =>
        message.error('Cập nhật thất bại: ' + (e instanceof Error ? e.message : e)),
      )
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
      dataIndex: 'departments',
      key: 'departments',
      width: 150,
      render: (_: unknown, record: Task) => (
        <Space size={4} wrap>
          {deptTags(record)}
        </Space>
      ),
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
      width: 120,
      render: (_: unknown, record: Task) => (
        <Space size={0} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Nhân bản task">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => openCopy(record)}
            />
          </Tooltip>
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
          <div  style = {{gap: '8px'}}className="task-header-tools">
            <Segmented
              block={isMobile}
              value={view}
              onChange={(v) => setView(v as ViewMode)}
              options={VIEW_OPTIONS}
            />
            <div className="task-header-actions">
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
        .kanban-board { display: flex; gap: 16px; overflow-x: auto; align-items: stretch; padding-bottom: 8px; height: calc(100svh - 250px); min-height: 420px; }
        .kanban-column { flex: 1 1 0; min-width: 280px; background: rgba(0,0,0,0.03); border: 1px solid #f0f0f0; border-radius: 12px; padding: 12px; transition: border-color 0.2s, background 0.2s; display: flex; flex-direction: column; min-height: 0; }
        .kanban-column.drag-over { border-color: #1677ff; background: rgba(22,119,255,0.06); }
        :root[data-theme='dark'] .kanban-column { background: rgba(255,255,255,0.04); border-color: #303030; }
        :root[data-theme='dark'] .kanban-column.drag-over { border-color: #1677ff; background: rgba(22,119,255,0.15); }
        .kanban-column-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-shrink: 0; }
        .kanban-column-body { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding: 2px; scrollbar-width: thin; }
        .kanban-column-body::-webkit-scrollbar { width: 6px; }
        .kanban-column-body::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.18); border-radius: 3px; }
        :root[data-theme='dark'] .kanban-column-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.22); }
        .kanban-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
        .kanban-count { margin-inline-end: 0; }
        .kanban-card { cursor: grab; }
        .kanban-card:active { cursor: grabbing; }
        .kanban-card.dragging { opacity: 0.4; }
        .kanban-card-title { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
        .kanban-card-title > .ant-typography { flex: 1; min-width: 0; overflow-wrap: anywhere; }
        .kanban-card-actions { opacity: 0; transition: opacity 0.2s; flex-shrink: 0; margin: -4px -6px -4px 0; }
        .kanban-card:hover .kanban-card-actions,
        .kanban-card:focus-within .kanban-card-actions { opacity: 1; }
        @media (hover: none) {
          .kanban-card-actions { opacity: 1; }
        }
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
      {error && (
        <Alert
          type="error"
          showIcon
          closable
          message={error}
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}
      {loading ? (
        <Spin style={{ display: 'block', textAlign: 'center', padding: '48px 0' }} />
      ) : tasks.length === 0 ? (
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
              <div className="kanban-column-body">
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
                      <div className="kanban-card-title">
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
                        <div className="kanban-card-actions">
                          <Tooltip title="Nhân bản task">
                            <Button
                              type="text"
                              size="small"
                              icon={<CopyOutlined />}
                              onClick={(e) => {
                                e.stopPropagation()
                                openCopy(task)
                              }}
                            />
                          </Tooltip>
                        </div>
                      </div>
                      <div
                        style={{
                          marginTop: 10,
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 6,
                        }}
                      >
                        {deptTags(task)}
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
                {deptTags(task)}
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
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={(e) => {
                    e.stopPropagation()
                    openCopy(task)
                  }}
                >
                  Copy
                </Button>
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
              <Button
                icon={<CopyOutlined />}
                onClick={() => {
                  if (current) openCopy(current)
                }}
              >
                Nhân bản
              </Button>
              <Button type="primary" icon={<EditOutlined />} onClick={() => setMode('edit')}>
                Sửa
              </Button>
            </Space>
          ) : (
            <Space>
              <Button onClick={() => setOpen(false)}>Hủy</Button>
              <Button type="primary" loading={saving} onClick={handleSave}>
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
                  name="departments"
                  label="Phòng ban"
                  rules={[{ required: true, message: 'Vui lòng chọn phòng ban' }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Chọn phòng ban"
                    options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
                    tagRender={(props) => {
                      const { value, closable, onClose } = props
                      const d = value as Department
                      return (
                        <Tag
                          color={DEPT_META[d]?.color}
                          closable={closable}
                          onClose={onClose}
                          style={{ marginInlineEnd: 4 }}
                        >
                          {d}
                        </Tag>
                      )
                    }}
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
                          setImagesSync(imagesRef.current.filter((_, i) => i !== index))
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
                      const pending = new Promise<void>((resolve) => {
                        const reader = new FileReader()
                        reader.onload = () => {
                          setImagesSync([...imagesRef.current, reader.result as string])
                          resolve()
                        }
                        reader.onerror = () => resolve()
                        reader.readAsDataURL(file)
                      })
                      pendingUploadsRef.current.push(pending)
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
    </Card>
  )
}

export default Dashboard