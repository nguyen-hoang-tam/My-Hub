export const TEMPLATE_PARAMS: Array<{ key: string; label: string }> = [
  { key: 'ky', label: 'Kỳ' },
  { key: 'thang', label: 'Tháng' },
  { key: 'customer', label: 'Khách hàng' },
  { key: 'cid', label: 'Mã KH' },
  { key: 'address', label: 'Địa chỉ' },
  { key: 'total', label: 'Tổng tiền' },
]

export const DATA_FIELDS: Array<{ value: string; label: string }> = [
  { value: 'ky', label: 'Kỳ thanh toán' },
  { value: 'thang', label: 'Tháng' },
  { value: 'customer', label: 'Tên khách hàng' },
  { value: 'cid', label: 'Mã khách hàng' },
  { value: 'address', label: 'Địa chỉ giao' },
  { value: 'amount', label: 'Số tiền thanh toán' },
  { value: 'total', label: 'Tổng tiền' },
  { value: 'phone', label: 'Số điện thoại' },
  { value: 'order_id', label: 'Mã đơn hàng' },
]

export const DATA_FIELD_SAMPLES: Record<string, string> = {
  ky: '1',
  thang: '4/2026',
  customer: 'Nguyễn Văn A',
  cid: 'PE010299485',
  address: 'VNG Campus, TP.HCM',
  amount: '100',
  total: '250000',
  phone: '84987654321',
  order_id: 'DH-1001',
}

export const TRIGGERS: Array<{ key: string; label: string }> = [
  { key: 'order_created', label: 'Gửi khi đơn hàng được tạo' },
  { key: 'admin_confirm', label: 'Gửi khi Admin xác nhận đơn' },
  { key: 'shipper_pickup', label: 'Gửi khi shipper nhận hàng' },
  { key: 'order_completed', label: 'Gửi khi đơn hàng hoàn thành' },
  { key: 'delivery_failed', label: 'Gửi khi giao hàng thất bại' },
]

export const STATUS_META: Record<string, { label: string; color: string }> = {
  ENABLE: { label: 'Đã duyệt', color: 'success' },
  WAIT: { label: 'Chờ duyệt', color: 'warning' },
  REJECT: { label: 'Từ chối', color: 'error' },
  DISABLE: { label: 'Tắt', color: 'default' },
}

export const TYPE_META: Record<string, { label: string; color: string }> = {
  Table: { label: 'Table', color: 'blue' },
  Paragraph: { label: 'Paragraph', color: 'green' },
  OTP: { label: 'OTP', color: 'purple' },
  Rating: { label: 'Rating', color: 'orange' },
}

export function statusMeta(status: string) {
  return STATUS_META[status] ?? { label: status || '—', color: 'default' }
}

export function typeMeta(type: string) {
  return TYPE_META[type] ?? { label: type || '—', color: 'default' }
}