export function TemplatePreview({
  templateName,
  data,
}: {
  templateName: string
  data: Record<string, string>
}) {
  return (
    <div className="zns-preview">
      <div className="zns-preview-avatar">Z</div>
      <div className="zns-preview-bubble">
        <div className="zns-preview-title">{templateName || 'Tên template'}</div>
        <div className="zns-preview-row">
          <span>Kỳ</span>
          <b>{data.ky || '{{ky}}'}</b>
        </div>
        <div className="zns-preview-row">
          <span>Tháng</span>
          <b>{data.thang || '{{thang}}'}</b>
        </div>
        <div className="zns-preview-row">
          <span>Khách hàng</span>
          <b>{data.customer || '{{customer}}'}</b>
        </div>
        <div className="zns-preview-row">
          <span>Mã KH</span>
          <b>{data.cid || '{{cid}}'}</b>
        </div>
        <div className="zns-preview-row">
          <span>Địa chỉ</span>
          <b>{data.address || '{{address}}'}</b>
        </div>
        <div className="zns-preview-total">Tổng: {data.total || '{{total}}'} VND</div>
      </div>
    </div>
  )
}