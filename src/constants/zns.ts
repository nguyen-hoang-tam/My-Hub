export const PUSHSALE_VARS: Array<{ pushsale: string; zalo: string; label: string }> = [
  { pushsale: 'customer_name', zalo: '{quy_khach}', label: 'Tên khách hàng' },
  { pushsale: 'order_code', zalo: '{ma_don_hang}', label: 'Mã đơn hàng' },
  { pushsale: 'phone', zalo: '{khach_hang_phone}', label: 'Số điện thoại của khách hàng' },
  { pushsale: 'order_date', zalo: '{ngay_dat_hang}', label: 'Ngày đặt hàng của khách hàng' },
  { pushsale: 'product_name', zalo: '{san_pham}', label: 'Tên sản phẩm' },
  { pushsale: 'quantity', zalo: '{so_luong}', label: 'Số lượng hàng của đơn' },
]

export const PARTNER_OPTIONS = ['Tin nhắn Esms', 'Viettel SMS', 'Zalo ZNS']

export const TYPE_OPTIONS = ['Zalo', 'Email', 'SMS']

export const CATEGORY_OPTIONS = [
  'Tác nghiệp và giao hàng',
  'Chăm sóc khách hàng',
  'Khuyến mãi',
  'Xác thực tài khoản',
]

export function extractVariables(text: string): string[] {
  const matches = text.match(/\{([a-zA-Z0-9_]+)\}/g) ?? []
  return [...new Set(matches.map((m) => m.slice(1, -1)))]
}

export const DATA_FIELDS: Array<{ value: string; label: string }> = [
  { value: 'customer_name', label: 'Tên khách hàng' },
  { value: 'order_code', label: 'Mã đơn hàng' },
  { value: 'phone', label: 'Số điện thoại khách hàng' },
  { value: 'order_date', label: 'Ngày đặt hàng' },
  { value: 'product_name', label: 'Tên sản phẩm' },
  { value: 'quantity', label: 'Số lượng hàng của đơn' },
  { value: 'address', label: 'Địa chỉ giao' },
  { value: 'amount', label: 'Số tiền thanh toán' },
  { value: 'total', label: 'Tổng tiền' },
]

export const DATA_FIELD_SAMPLES: Record<string, string> = {
  customer_name: 'Nguyễn Văn A',
  order_code: 'DH-1001',
  phone: '84987654321',
  order_date: '14/08/2026',
  product_name: 'Áo thun',
  quantity: '2',
  address: 'VNG Campus, TP.HCM',
  amount: '150000',
  total: '300000',
}

export const TRIGGERS: Array<{ key: string; label: string }> = [
  { key: 'order_created', label: 'Gửi khi đơn hàng được tạo' },
  { key: 'admin_confirm', label: 'Gửi khi Admin xác nhận đơn' },
  { key: 'shipper_pickup', label: 'Gửi khi shipper nhận hàng' },
  { key: 'order_completed', label: 'Gửi khi đơn hàng hoàn thành' },
  { key: 'delivery_failed', label: 'Gửi khi giao hàng thất bại' },
]