# Topic 19: Next.js

---

## Q1: SSR vs SSG vs ISR vs CSR — Chọn rendering strategy nào?

### Trả lời Basic

| Strategy | Render khi nào | Dữ liệu | Dùng khi |
|---|---|---|---|
| **CSR** | Browser, sau khi load | Fetch client-side | Dashboard, user-specific page |
| **SSG** | Build time | Static | Blog, docs, marketing page |
| **SSR** | Mỗi request trên server | Fresh mỗi request | SEO cần data realtime |
| **ISR** | Build time + revalidate theo thời gian | Cache + refresh định kỳ | E-commerce product page |

---

### Trả lời Nâng cao

**Ví dụ thực tế — trang sản phẩm e-commerce:**

- **Thông tin sản phẩm** (tên, mô tả, ảnh): ISR — revalidate mỗi 60 giây, không cần fresh mỗi request
- **Giá, tồn kho**: SSR — cần fresh mỗi lần để tránh hiển thị sai
- **Review của user**: CSR — load sau, không ảnh hưởng SEO critical content

**Next.js App Router (từ v13+):**

```javascript
// SSG — mặc định với Server Component
export default async function Page() {
  const data = await fetch('https://api.example.com/data'); // cache: 'force-cache'
}

// SSR — opt-out cache
const data = await fetch('...', { cache: 'no-store' });

// ISR — revalidate
const data = await fetch('...', { next: { revalidate: 60 } });
```

---

### Câu hỏi tình huống

**Trang landing page marketing cần SEO tốt, data thay đổi vài lần/ngày. Bạn chọn strategy nào?**

Gợi ý trả lời:
- **ISR** — build static lần đầu, revalidate mỗi vài giờ
- Không dùng SSR vì data không thay đổi mỗi request → lãng phí compute
- Không dùng SSG thuần vì cần update mà không muốn redeploy toàn bộ

---

### Câu hỏi Trick

**Trick:** ISR revalidate sau 60 giây — có nghĩa là request đúng lúc 60 giây sẽ thấy data mới không?

→ Không. ISR dùng **stale-while-revalidate**:
1. Request đến sau 60s → trả về **page cũ ngay** (không delay user)
2. Trigger rebuild page ở background
3. Request **tiếp theo** mới thấy data mới

→ Có thể có độ trễ tối đa 2× revalidate time cho đến khi user thấy data mới

---

## Q2: App Router vs Pages Router

### Trả lời Basic

| | Pages Router | App Router (v13+) |
|---|---|---|
| **Folder** | `pages/` | `app/` |
| **Default component** | Client Component | Server Component |
| **Data fetching** | `getServerSideProps`, `getStaticProps` | `fetch()` trong async component |
| **Layout** | `_app.tsx` | `layout.tsx` (nested) |
| **Streaming** | Không | Có (Suspense) |
| **Status** | Stable, legacy | Recommended |

---

### Trả lời Nâng cao

**Server Component vs Client Component:**

```javascript
// Server Component — mặc định trong app/
// Chạy trên server, không có useState, useEffect, event handler
async function ProductList() {
  const products = await db.query('SELECT * FROM products'); // Trực tiếp query DB
  return <ul>{products.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}

// Client Component — phải opt-in
'use client';
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

**Lợi ích Server Component:**
- Không gửi component code xuống client → bundle nhỏ hơn
- Có thể trực tiếp access DB, filesystem
- Sensitive data (API keys, DB query) không leak xuống browser

---

### Câu hỏi tình huống

**Component cần vừa fetch data từ DB, vừa có interactive button. Bạn thiết kế thế nào?**

Gợi ý trả lời:
- Tách thành 2 component: Server Component fetch data, Client Component handle interaction
- Server Component render và truyền data xuống Client Component qua props
- Không làm toàn bộ page thành Client Component chỉ vì cần 1 button

---

### Câu hỏi Trick

**Trick:** Context API có dùng được trong Server Component không?

→ Không — Context (và tất cả React hooks) chỉ chạy ở client. Server Component không có lifecycle, không có state.
→ Nếu cần share data giữa Server Components trong cùng request: dùng `cache()` từ React hoặc truyền qua props.

---

## Q3: Middleware và Route Handlers

### Trả lời Basic

| | Middleware | Route Handler |
|---|---|---|
| **File** | `middleware.ts` (root) | `app/api/.../route.ts` |
| **Chạy khi** | Trước mọi request match | Khi hit endpoint cụ thể |
| **Dùng cho** | Auth check, redirect, rewrite, A/B test | API endpoint |
| **Runtime** | Edge runtime (mặc định) | Node.js hoặc Edge |

---

### Trả lời Nâng cao

**Middleware — auth guard pattern:**

```javascript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token');

  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/protected/:path*'],
};
```

**Route Handler — thay thế API Routes của Pages Router:**

```javascript
// app/api/users/route.ts
export async function GET(request: Request) {
  const users = await db.findAll();
  return Response.json(users);
}

export async function POST(request: Request) {
  const body = await request.json();
  const user = await db.create(body);
  return Response.json(user, { status: 201 });
}
```

---

### Câu hỏi tình huống

**Bạn cần kiểm tra JWT token cho tất cả route bắt đầu bằng `/api/v1/`. Đặt logic ở đâu?**

Gợi ý trả lời:
- Middleware với matcher `/api/v1/:path*` — không phải copy-paste vào từng Route Handler
- Middleware chạy ở Edge → latency rất thấp, phù hợp cho auth check
- Nếu cần Node.js API (vd: crypto phức tạp) → helper function gọi trong mỗi Route Handler

---

### Câu hỏi Trick

**Trick:** Middleware chạy ở Edge Runtime — có dùng được `fs`, `crypto` Node.js không?

→ Không — Edge Runtime là subset của Web APIs, không có Node.js built-ins. Chỉ dùng được: `fetch`, `Request`, `Response`, `URL`, Web Crypto API.
→ Đây là lý do verify JWT trong Middleware phải dùng Web Crypto (`jose` library), không dùng `jsonwebtoken` (dùng Node.js crypto).

---

## Q4: Performance — Image, Font, và Bundle Optimization

### Trả lời Basic

| Tính năng | Vấn đề giải quyết | Cách dùng |
|---|---|---|
| `next/image` | Layout shift, chậm load | Thay `<img>` bằng `<Image>` |
| `next/font` | Font flash, external request | Import font trực tiếp |
| `next/dynamic` | Bundle lớn, load component không cần thiết | Lazy load component |
| Route segment config | Cache control per-route | `export const revalidate = 60` |

---

### Trả lời Nâng cao

**`next/image` làm gì:**
- Tự động resize theo device (srcset)
- Lazy load mặc định (không load nếu chưa vào viewport)
- Convert sang WebP/AVIF tự động
- Tránh Cumulative Layout Shift (CLS) — yêu cầu `width`/`height` hoặc `fill`

**Bundle analysis:**

```bash
# Xem bundle size từng page
ANALYZE=true npm run build
```

**Lazy load component nặng:**

```javascript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <p>Loading chart...</p>,
  ssr: false, // Chỉ render ở client (chart thường cần window)
});
```

---

### Câu hỏi tình huống

**Page có Core Web Vitals kém — LCP cao, CLS cao. Bạn debug và fix thế nào?**

Gợi ý trả lời:
1. **LCP cao** (Largest Contentful Paint): Thường do hero image load chậm → dùng `priority` prop trong `next/image` cho above-fold image, preload font
2. **CLS cao** (Cumulative Layout Shift): Image không có dimension → luôn set `width`/`height`, dùng `aspect-ratio`
3. **Đo lường**: Dùng Lighthouse, WebPageTest, hoặc `@next/bundle-analyzer`
4. **Server timing**: Nếu TTFB cao → xem lại data fetching, thêm cache

---

### Câu hỏi Trick

**Trick:** `<Image>` của Next.js bắt buộc khai báo `width` và `height` — tại sao? Nếu không biết size thì làm thế nào?

→ Để browser biết trước không gian cần reserve → tránh CLS khi image load xong
→ Nếu không biết size (dynamic image): dùng `fill` prop kết hợp với parent có `position: relative` và explicit size

```jsx
<div style={{ position: 'relative', width: '100%', height: '300px' }}>
  <Image src={url} fill style={{ objectFit: 'cover' }} alt="..." />
</div>
```
