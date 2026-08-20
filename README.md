# My Hub — Ghi chú (Notes)

React + Ant Design + Vite app. Tính năng chính là **Ghi chú / Task**, dữ liệu lưu trên **Cloudflare KV** (an toàn, không mất, dùng được mọi nơi) — không dùng localStorage.

## Tính năng

- **Đăng nhập** — form đăng nhập, lưu user vào localStorage, đăng xuất từ dropdown góc phải header
- **Ghi chú / Task (Dashboard)** — trang mặc định sau khi đăng nhập: quản lý task theo trạng thái (Mới tạo / Đang thực hiện / Tạm dừng / Hoàn thành / Bị hủy), phòng ban (Dev / BA / QC / UXUI), hạn chót, hình ảnh, chế độ xem Bảng / Kanban (kéo thả). CRUD lưu trên Cloudflare KV qua `/api/tasks`
- **Các trang khác (Sản phẩm, Danh mục, Đơn hàng, Báo cáo, Cài đặt ZNS)** — mặc định hiển thị "Chưa có dữ liệu", không ảnh hưởng tới trang ghi chú
- **Dark mode** — bật/tắt trên trang đăng nhập và trong header; lưu ở localStorage (`myhub.theme`)
- **Sidebar** — nền xanh `#0047ad`, thu gọn được, logo `/logo.png`, menu điều hướng

## Backend (Cloudflare Worker + KV)

- Worker `worker/index.ts` route mọi request `/api/*`, gọi `handleTasks()` trong `worker/tasks.ts`
- KV namespace **PRODUCTS** (đã tồn tại) lưu task với prefix `task:`
- Binding khai báo trong `wrangler.jsonc`; type `Env` sinh bởi `npm run cf-typegen` (`worker-configuration.d.ts`)
- Dữ liệu KV có cấu trúc: `task:<id>` → `{ id, title, department, status, deadline, images, createdAt, updatedAt }`

## Scripts

```bash
npm run dev          # chạy dev (Vite + Workerd, http://localhost:5173)
npm run build        # type-check (tsc -b) + build (client + worker)
npm run lint         # eslint
npm run preview      # build rồi preview trên Workers runtime
npm run deploy       # build + wrangler deploy (lên Cloudflare)
npm run cf-typegen   # regenerate worker-configuration.d.ts
```

## Cấu trúc project

```
├── wrangler.jsonc                # cấu hình Worker + KV binding (PRODUCTS)
├── worker/                       # Cloudflare Worker (API)
│   ├── index.ts                  # entry, route /api/*
│   ├── storage.ts                # helpers: makeId, jsonError, listJson
│   └── tasks.ts                  # Task CRUD trên KV (prefix task:)
└── src/                          # React app
    ├── main.tsx                  # entry (global styles, CSS variables)
    ├── App.tsx                   # providers (ThemeProvider, ConfigProvider, AntApp), auth flow
    ├── auth.ts                   # User type + load/save/clear user (localStorage)
    ├── theme.tsx                 # ThemeProvider (light/dark mode)
    ├── theme-context.ts          # ThemeContext + useTheme
    ├── api/
    │   ├── client.ts             # fetch helper chung
    │   └── tasks.ts              # taskApi (getAll/create/update/delete)
    ├── components/
    │   ├── auth/
    │   │   └── Login.tsx         # form đăng nhập
    │   └── layout/
    │       └── AppLayout.tsx     # sidebar thu gọn, topbar, account dropdown, dark mode, layout styles
    └── pages/
        └── Dashboard.tsx         # tính năng ghi chú: bảng/kanban, CRUD qua API
```

## Migrate dữ liệu cũ từ localStorage

Sau khi deploy, mở Console (F12) trên trang web và chạy một lần:

```js
const oldTasks = JSON.parse(localStorage.getItem('myhub.tasks') || '[]');
let success = 0;
for (const t of oldTasks) {
  try {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: t.title,
        department: t.department || 'Dev',
        status: t.status || 'new',
        deadline: t.deadline || null,
        images: t.images || [],
      }),
    });
    success++;
  } catch (err) {
    console.error('Lỗi migrate task:', t.title, err);
  }
}
console.log(`Đã migrate ${success}/${oldTasks.length} task`);
localStorage.removeItem('myhub.tasks');
localStorage.removeItem('myhub.deletedTasks');
localStorage.removeItem('myhub.tasks.view');
location.reload();
```

## Quy ước styling

Không dùng file `.css` riêng. Style được nhúng trực tiếp trong file `.tsx` qua template-string constant render bằng thẻ `<style>` (VD: `const styles = \`...\`` + `<style>{styles}</style>`). Các class dùng chung (table, cells, search) nằm trong `AppLayout.tsx`.

Dark mode dùng attribute `data-theme` trên `<html>` (set bởi `ThemeProvider`). Component dùng selector `[data-theme='dark']` để override màu nền light cho khớp theme dark của antd.