# Rect CRUD — Quản lý kho + ZNS

Ứng dụng quản lý kho (React + Ant Design + Vite) với backend là Cloudflare Worker dùng KV. Tích hợp gửi thông báo Zalo ZNS.

## Scripts

```bash
npm run dev          # chạy dev (Vite + Cloudflare local)
npm run build        # type-check (tsc -b) + build
npm run lint         # eslint
npm run preview      # build rồi preview
npm run deploy       # build + wrangler deploy
npm run cf-typegen   # regenerate worker-configuration.d.ts
```

## Cấu trúc thư mục

```
├── worker/                      # Cloudflare Worker (API)
│   ├── index.ts                 # entry, routing /api/*
│   ├── storage.ts               # helpers dùng chung: listJson, makeId, jsonError
│   ├── products.ts              # CRUD sản phẩm (KV)
│   └── zns/
│       ├── index.ts             # router /api/zns/*
│       ├── types.ts             # ZnsConfigItem, ZnsHistoryItem
│       ├── configs.ts           # CRUD cấu hình ZNS
│       └── send.ts              # gửi Zalo ZNS, lịch sử, sự kiện
└── src/                         # React app
    ├── main.tsx                 # entry (chứa global styles)
    ├── App.tsx                  # providers (ConfigProvider, AntApp)
    ├── api/
    │   ├── client.ts            # fetch helper dùng chung
    │   ├── products.ts          # types + API sản phẩm
    │   └── zns.ts               # types + API ZNS
    ├── components/
    │   ├── layout/
    │   │   └── AppLayout.tsx    # sidebar, topbar, chuyển trang (+ layout styles)
    │   └── products/
    │       └── ProductModal.tsx # modal thêm/sửa sản phẩm
    ├── pages/
    │   ├── Dashboard.tsx        # tổng quan + biểu đồ
    │   ├── Products.tsx         # danh sách sản phẩm (CRUD)
    │   └── zns/
    │       ├── ZnsConfigs.tsx   # danh sách + editor mẫu tin nhắn
    │       ├── ZnsConfigScreen.tsx # cấu hình mapping/sự kiện/gửi thử
    │       └── ZnsHistory.tsx   # lịch sử gửi ZNS
    ├── constants/
    │   └── zns.ts               # options, triggers, biến ZNS
    └── utils/
        └── format.ts            # formatDate, formatPrice
```

## Quy ước style

Không dùng file `.css` riêng. Style được nhúng trực tiếp trong file `.tsx` qua một hằng số template string và render bằng thẻ `<style>` ngay trong component đó (ví dụ `const styles = \`...\`` + `<style>{styles}</style>`). Các class dùng chung (bảng, cell, search) được đặt trong `AppLayout.tsx`.
```
