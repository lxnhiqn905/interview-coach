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

---

## Q5: Caching Strategy trong Next.js App Router

### Trả lời Basic

Next.js có 4 tầng cache:

| Cache | Lưu gì | Invalidate khi |
|---|---|---|
| **Request Memoization** | `fetch()` dedupe trong cùng render | Mỗi request mới |
| **Data Cache** | `fetch()` response | `revalidate`, `cache: 'no-store'` |
| **Full Route Cache** | Static page HTML | Redeploy, `revalidatePath()` |
| **Router Cache** | Client-side page navigation | 30s (dynamic) / 5min (static) |

### Trả lời Nâng cao

```javascript
// On-demand revalidation — invalidate sau khi data thay đổi
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(request: Request) {
  const { path, tag } = await request.json();

  if (tag) revalidateTag(tag);         // Invalidate theo tag
  if (path) revalidatePath(path);      // Invalidate theo path

  return Response.json({ revalidated: true });
}

// Fetch với tag để revalidate sau
const data = await fetch('/api/products', {
  next: { tags: ['products'] }
});

// Khi có update: gọi revalidateTag('products')
```

### Câu hỏi Trick

**Trick:** `revalidatePath('/')` có revalidate tất cả page không?

→ Không — chỉ revalidate đúng path `/`. Để revalidate tất cả page liên quan đến một data type, dùng **tag-based revalidation** (`revalidateTag`) — tag nhiều fetch call cùng tag, invalidate 1 lần là xong.

---

## Q6: Authentication trong Next.js — NextAuth.js

### Trả lời Basic

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
    CredentialsProvider({
      async authorize(credentials) {
        const user = await verifyCredentials(credentials);
        return user ?? null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = user.role; // Add custom claim
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role;
      return session;
    }
  }
});

export { handler as GET, handler as POST };
```

### Trả lời Nâng cao

**Bảo vệ route bằng Middleware:**

```typescript
// middleware.ts
import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      if (req.nextUrl.pathname.startsWith('/admin')) {
        return token?.role === 'ADMIN';
      }
      return !!token;
    },
  },
});

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
```

### Câu hỏi Trick

**Trick:** Session token được lưu ở đâu? Cookie hay localStorage?

→ NextAuth mặc định dùng **HttpOnly cookie** (không thể đọc bằng JavaScript) → bảo vệ khỏi XSS. `localStorage` không nên lưu token vì XSS có thể steal. JWT session encode toàn bộ user data vào cookie, database session chỉ lưu session ID trong cookie.

---

## Q7: Next.js Deployment — Vercel vs Self-hosted

### Trả lời Basic

| | Vercel | Self-hosted (Docker/K8s) |
|---|---|---|
| Setup | Zero config, push = deploy | Cần config server |
| Edge Network | Có (160+ PoP) | Tự setup CDN |
| ISR | Native support | Cần config cache server |
| Cost | Tính theo usage | Predictable (server cost) |
| Control | Hạn chế | Toàn quyền |
| Vendor lock-in | Có (một số feature) | Không |

### Trả lời Nâng cao

**Self-hosted với Docker:**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

> `output: 'standalone'` trong `next.config.js` tạo self-contained bundle với minimal node_modules.

### Câu hỏi Trick

**Trick:** ISR hoạt động thế nào khi self-host nhiều instance?

→ Vấn đề: mỗi instance có cache riêng → inconsistent. Fix: Dùng **shared cache handler** (Redis) thay vì filesystem cache. Next.js hỗ trợ custom cache handler qua `cacheHandler` config. Trên Vercel điều này được handle tự động.

---

## Q8: State Management với Server Components

### Trả lời Basic

| Approach | Dùng khi |
|---|---|
| URL Search Params | Shareable state (filters, pagination) |
| Server Component props | Data từ server xuống |
| `useState` / Zustand | Client-only UI state |
| React Query / SWR | Client-side data fetching với cache |
| Cookies | Cross-request state (auth, preferences) |

### Trả lời Nâng cao

```typescript
// URL state — shareable, bookmarkable
// app/products/page.tsx (Server Component)
export default async function ProductsPage({
  searchParams
}: {
  searchParams: { category?: string; page?: string }
}) {
  const products = await getProducts({
    category: searchParams.category,
    page: Number(searchParams.page) || 1,
  });

  return (
    <>
      <FilterBar />       {/* Client Component, update URL */}
      <ProductGrid products={products} />  {/* Server Component */}
    </>
  );
}
```

**Tránh lift state lên client không cần thiết:**
```
// Sai: Toàn bộ page là Client Component chỉ vì cần filter state
'use client'
export default function ProductsPage() { ... }

// Đúng: Tách filter thành Client Component nhỏ, page vẫn là Server Component
```

### Câu hỏi Trick

**Trick:** Zustand store có dùng được trong Server Component không?

→ Không — Server Component không có browser APIs, không có state, không có lifecycle. Zustand (và mọi client-side state management) chỉ dùng trong Client Component. Chia rõ: **server state** = fetch trong Server Component, **client UI state** = useState/Zustand trong Client Component.

---

## Q9: `use client` vs `use server` — Hiểu đúng boundary

**Trả lời Basic** *(So sánh quyết định)*

| | Server Component (default) | Client Component (`use client`) |
|---|---|---|
| Render | Server | Browser |
| Bundle | Không gửi JS xuống client | Gửi code xuống client |
| useState/useEffect | Không dùng được | Dùng được |
| DB access | Trực tiếp | Phải qua API |
| Event handlers | Không | Có (onClick, onChange) |
| SEO | Tốt (HTML đầy đủ) | Tốt với SSR |
| Dùng khi | Data fetching, static UI | Interactive, real-time |

**Quyết định nhanh:**
```
Fetch data từ DB/API                 → Server Component
Interactive (form, button, dropdown) → Client Component
State management (useState)          → Client Component
Animation, browser API (localStorage) → Client Component
SEO-critical content                  → Server Component
Sensitive data (DB credentials)       → Server Component (không leak sang client)
```

**Trả lời Nâng cao**

> **Component tree composition — Server chứa Client, không ngược lại:**

```tsx
// ✅ Server Component chứa Client Component — OK
// app/page.tsx (Server)
export default async function Page() {
  const data = await db.query(...)  // Server-only
  return (
    <div>
      <h1>{data.title}</h1>
      <LikeButton id={data.id} />  {/* Client Component */}
    </div>
  )
}

// ❌ Client Component import Server Component — KHÔNG thể
// 'use client'
// import ServerOnlyComponent from './ServerComponent'  // Error!
// Server Component trong Client boundary sẽ bị convert sang Client

// ✅ Đúng cách: truyền Server Component làm children props
// 'use client'
export default function Layout({ children }) {  // children có thể là Server Component
  return <div>{children}</div>
}
```

**Câu hỏi Trick**

> `'use client'` ở top file — có nghĩa là toàn bộ subtree là Client Component?

*Trả lời*: **Có** — `'use client'` đánh dấu boundary. Tất cả component import từ file đó trở xuống đều là Client Component. Để tối ưu bundle size: đặt `'use client'` càng sâu càng tốt (leaf component), tránh đặt ở layout/page level làm cả cây thành Client.

---

## Q10: Data Fetching Patterns — Waterfall vs Parallel vs Streaming

**Trả lời Basic** *(So sánh)*

| Pattern | Cơ chế | Thời gian | Dùng khi |
|---|---|---|---|
| **Sequential (Waterfall)** | Fetch 1 xong → fetch 2 | Tổng thời gian cộng lại | Data phụ thuộc nhau |
| **Parallel** | Fetch tất cả cùng lúc | Thời gian của fetch chậm nhất | Data độc lập nhau |
| **Streaming (Suspense)** | Render dần, phần nào xong hiện phần đó | User thấy content sớm nhất | UX quan trọng, data đến dần |

**Trả lời Nâng cao**

```tsx
// ❌ Waterfall — 2 fetch tuần tự: 200ms + 300ms = 500ms
async function UserProfile({ userId }) {
  const user = await getUser(userId)       // 200ms
  const posts = await getPosts(userId)     // 300ms sau khi user xong
  return <div>{user.name}: {posts.length} posts</div>
}

// ✅ Parallel — max(200ms, 300ms) = 300ms
async function UserProfile({ userId }) {
  const [user, posts] = await Promise.all([
    getUser(userId),     // Chạy song song
    getPosts(userId),    // Chạy song song
  ])
  return <div>{user.name}: {posts.length} posts</div>
}

// ✅ Streaming — user thấy layout ngay, data hiện dần
export default function Page({ userId }) {
  return (
    <div>
      <UserInfo userId={userId} />  {/* Fast: 100ms */}
      <Suspense fallback={<PostsSkeleton />}>
        <SlowPosts userId={userId} />  {/* Slow: 500ms — stream khi xong */}
      </Suspense>
    </div>
  )
}
```

**Câu hỏi Trick**

> `Promise.all` vs `Promise.allSettled` trong Next.js data fetching — khi nào dùng cái nào?

*Trả lời*:
- `Promise.all`: Nếu 1 fetch fail → toàn bộ page error. Dùng khi tất cả data là **critical** (không có trang nếu thiếu 1 cái)
- `Promise.allSettled`: Tất cả fetch chạy, lấy kết quả dù pass hay fail. Dùng khi một số data là **optional** (page vẫn hiện được dù thiếu 1 phần). Ví dụ: user info là critical, recommendation sidebar là optional — dùng `allSettled` và show fallback UI nếu recommendation fail.
