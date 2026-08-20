# My Hub — Ghi chú (Notes)

React + Ant Design + Vite app, hiện tại chỉ tập trung vào tính năng **Ghi chú / Task**. Dữ liệu lưu ở `localStorage`, không cần backend.

## Tính năng

- **Đăng nhập** — form đăng nhập, lưu user vào localStorage, đăng xuất từ dropdown góc phải header
- **Ghi chú / Task (Dashboard)** — trang mặc định sau khi đăng nhập: quản lý task theo trạng thái (Mới tạo / Đang thực hiện / Tạm dừng / Hoàn thành / Bị hủy), phòng ban (Dev / BA / QC / UXUI), hạn chót, hình ảnh, chế độ xem Bảng / Kanban (kéo thả), lịch sử xoá & khôi phục
- **Các trang khác (Sản phẩm, Danh mục, Đơn hàng, Báo cáo, Cài đặt ZNS)** — mặc định hiển thị "Chưa có dữ liệu", không ảnh hưởng tới trang ghi chú
- **Dark mode** — bật/tắt trên trang đăng nhập và trong header; lưu ở localStorage (`myhub.theme`)
- **Sidebar** — nền xanh `#0047ad`, thu gọn được, logo `/logo.png`, menu điều hướng

## Scripts

```bash
npm run dev          # chạy dev (Vite, http://localhost:5173)
npm run build        # type-check (tsc -b) + build
npm run lint         # eslint
npm run preview      # build rồi preview
```

## Cấu trúc project

```
├── src/                         # React app
│   ├── main.tsx                 # entry (global styles, CSS variables)
│   ├── App.tsx                  # providers (ThemeProvider, ConfigProvider, AntApp), auth flow
│   ├── auth.ts                  # User type + load/save/clear user (localStorage)
│   ├── theme.tsx                # ThemeProvider (light/dark mode)
│   ├── theme-context.ts         # ThemeContext + useTheme
│   ├── components/
│   │   ├── auth/
│   │   │   └── Login.tsx        # form đăng nhập
│   │   └── layout/
│   │       └── AppLayout.tsx    # sidebar thu gọn, topbar, account dropdown, dark mode, layout styles
│   └── pages/
│       └── Dashboard.tsx        # tính năng ghi chú: overview + bảng/kanban + lịch sử xoá
```

## Quy ước styling

Không dùng file `.css` riêng. Style được nhúng trực tiếp trong file `.tsx` qua template-string constant render bằng thẻ `<style>` (VD: `const styles = \`...\`` + `<style>{styles}</style>`). Các class dùng chung (table, cells, search) nằm trong `AppLayout.tsx`.

Dark mode dùng attribute `data-theme` trên `<html>` (set bởi `ThemeProvider`). Component dùng selector `[data-theme='dark']` để override màu nền light cho khớp theme dark của antd.