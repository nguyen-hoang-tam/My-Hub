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