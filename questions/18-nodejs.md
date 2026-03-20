# Topic 18: Node.js

---

## Q1: Event Loop — Cơ chế hoạt động của Node.js

### Trả lời Basic

| Phase | Xử lý | Ví dụ |
|---|---|---|
| **Timers** | `setTimeout`, `setInterval` callback | Delay task |
| **I/O callbacks** | Network, file I/O callbacks | HTTP response |
| **Idle/Prepare** | Internal use | — |
| **Poll** | Chờ I/O mới, chạy I/O callbacks | Blocking nếu queue rỗng |
| **Check** | `setImmediate` callbacks | Sau I/O |
| **Close callbacks** | `socket.on('close')` | Cleanup |

**Thứ tự ưu tiên microtask (giữa các phase):**
```
process.nextTick > Promise.then > setImmediate > setTimeout
```

---

### Trả lời Nâng cao

**Ví dụ thực tế — đọc được thứ tự output:**

```javascript
console.log('1');

setTimeout(() => console.log('2'), 0);

Promise.resolve().then(() => console.log('3'));

process.nextTick(() => console.log('4'));

console.log('5');
```

Output: `1 → 5 → 4 → 3 → 2`

**Giải thích:**
- `1`, `5`: Synchronous, chạy trước
- `4`: `process.nextTick` — microtask ưu tiên cao nhất
- `3`: `Promise.then` — microtask
- `2`: `setTimeout` — macrotask, phase Timers

**Node.js single-thread nhưng không blocking vì:**
- I/O được delegate cho OS (libuv)
- Callback được đưa vào queue khi I/O xong
- Event loop pick up callback và chạy trên main thread

---

### Câu hỏi tình huống

**API Node.js bị chậm khi xử lý file lớn. Bạn chẩn đoán và fix thế nào?**

Gợi ý trả lời:
1. **Chẩn đoán**: Dùng `--prof` flag hoặc `clinic.js` để profile
2. **Nguyên nhân thường gặp**: Đọc toàn bộ file vào memory (`fs.readFileSync`, `fs.readFile`) thay vì stream
3. **Fix**: Dùng `fs.createReadStream` + pipe, không block event loop
4. **CPU-intensive task**: Offload sang `worker_threads` hoặc child process

---

### Câu hỏi Trick

**Trick 1:** `setTimeout(fn, 0)` có chạy ngay lập tức không?

→ Không — minimum delay thực tế là ~1ms, và phải đợi hết synchronous code + microtask trước. `setImmediate` thường nhanh hơn `setTimeout(fn, 0)` trong I/O context.

**Trick 2:** Node.js single-thread, vậy làm sao handle được hàng nghìn concurrent request?

→ Single-thread cho JavaScript execution, nhưng I/O chạy trên thread pool của libuv (mặc định 4 threads). Network I/O dùng OS async syscall (epoll/kqueue), không dùng thread pool → scale tốt cho I/O-bound, kém cho CPU-bound.

---

## Q2: Streams — Xử lý dữ liệu lớn

### Trả lời Basic

| Loại Stream | Mô tả | Ví dụ |
|---|---|---|
| **Readable** | Đọc dữ liệu | `fs.createReadStream`, HTTP request |
| **Writable** | Ghi dữ liệu | `fs.createWriteStream`, HTTP response |
| **Duplex** | Đọc và ghi | TCP socket |
| **Transform** | Đọc, biến đổi, ghi | `zlib.createGzip`, crypto |

**Tại sao dùng Stream:**
- Xử lý file 10GB mà không load hết vào RAM
- Data chạy theo chunks → latency thấp hơn (user nhận data sớm hơn)

---

### Trả lời Nâng cao

**Ví dụ: Upload file → compress → lưu disk:**

```javascript
const fs = require('fs');
const zlib = require('zlib');

fs.createReadStream('input.txt')
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream('input.txt.gz'));
```

**Backpressure — vấn đề khi Readable nhanh hơn Writable:**
- Nếu không handle → buffer tích tụ → memory leak
- `pipe()` tự động handle backpressure
- Khi tự implement: kiểm tra return value của `writable.write()`, nếu `false` thì pause readable, lắng nghe event `drain`

---

### Câu hỏi tình huống

**API cần export 1 triệu record từ DB ra CSV. Cách nào tránh out of memory?**

Gợi ý trả lời:
1. **Không**: Query all → build string → send response
2. **Đúng**: DB cursor/stream → Transform stream (convert row → CSV line) → pipe vào HTTP response
3. Set `Content-Type: text/csv`, `Content-Disposition: attachment` để browser tự download

---

### Câu hỏi Trick

**Trick:** `pipe()` vs `pipeline()` khác nhau gì?

→ `pipe()` không tự cleanup khi có lỗi — nếu stream bị lỗi, các stream còn lại không tự destroy → memory leak
→ `pipeline()` (từ Node 10+) tự động cleanup tất cả streams khi có lỗi, và có callback khi done. Dùng `pipeline()` trong production.

---

## Q3: Cluster vs Worker Threads — Scale Node.js

### Trả lời Basic

| | Cluster | Worker Threads |
|---|---|---|
| **Mục đích** | Scale across CPU cores | CPU-intensive task |
| **Memory** | Separate process, không share | Share memory (SharedArrayBuffer) |
| **Isolation** | Cao — crash 1 worker không ảnh hưởng master | Thấp hơn |
| **Dùng khi** | HTTP server muốn dùng hết CPU | Image processing, crypto, heavy compute |
| **IPC** | Message passing qua IPC | Message passing + SharedArrayBuffer |

---

### Trả lời Nâng cao

**Cluster — N process, mỗi process là 1 Node.js instance:**

```javascript
const cluster = require('cluster');
const os = require('os');

if (cluster.isPrimary) {
  for (let i = 0; i < os.cpus().length; i++) {
    cluster.fork();
  }
} else {
  // Mỗi worker chạy HTTP server độc lập
  require('./server');
}
```

**Worker Threads — dùng cho CPU-bound trong cùng process:**

```javascript
const { Worker, isMainThread, parentPort } = require('worker_threads');

if (isMainThread) {
  const worker = new Worker(__filename);
  worker.on('message', result => console.log(result));
} else {
  // Heavy computation ở đây, không block main thread
  const result = heavyCompute();
  parentPort.postMessage(result);
}
```

---

### Câu hỏi tình huống

**Node.js API bị block khi có request tính toán nặng (resize image). Bạn fix thế nào?**

Gợi ý trả lời:
1. **Vấn đề**: CPU-bound task block event loop → tất cả request khác bị delay
2. **Fix ngắn hạn**: Offload sang Worker Thread, trả về Promise cho main thread
3. **Fix tốt hơn**: Queue task (Bull/BullMQ) + separate worker process xử lý async
4. **Hoặc**: Dùng service chuyên biệt (Lambda, microservice) cho image processing

---

### Câu hỏi Trick

**Trick:** `child_process` vs `worker_threads` khác nhau gì?

→ `child_process`: Spawn process hoàn toàn mới (có thể là bất kỳ executable nào, kể cả Python, bash). Overhead lớn hơn, không share memory.
→ `worker_threads`: Thread trong cùng process Node.js, share memory qua `SharedArrayBuffer`. Overhead nhỏ hơn, nhưng chỉ chạy JavaScript.

---

## Q4: Error Handling và Async patterns

### Trả lời Basic

| Pattern | Vấn đề | Giải pháp |
|---|---|---|
| Callback | Callback hell, error bị nuốt | → Promise |
| Promise | `.catch()` bị quên | → async/await + try/catch |
| async/await | Unhandled rejection | `process.on('unhandledRejection')` |
| EventEmitter | Error event không được listen | App crash nếu không có `error` listener |

---

### Trả lời Nâng cao

**Unhandled Promise Rejection — bẫy phổ biến:**

```javascript
// Nguy hiểm — nếu fetchData() reject, không có gì catch
async function handler(req, res) {
  const data = await fetchData(); // Nếu throw → unhandled rejection
  res.json(data);
}

// Đúng
async function handler(req, res) {
  try {
    const data = await fetchData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
```

**Global error handler trong Express:**

```javascript
// Phải có 4 params để Express nhận ra là error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  // Graceful shutdown
  process.exit(1);
});
```

---

### Câu hỏi tình huống

**Node.js app bỗng nhiên crash với "unhandledRejection". Bạn debug thế nào?**

Gợi ý trả lời:
1. Log stack trace đầy đủ từ `reason` trong `unhandledRejection` handler
2. Dùng `--trace-warnings` flag để xem origin của Promise
3. Dùng APM (Datadog, New Relic) hoặc Sentry để capture production errors với context
4. Tìm chỗ `async` function được gọi mà không có `await` hoặc `.catch()`

---

### Câu hỏi Trick

**Trick:** `Promise.all` vs `Promise.allSettled` khác nhau gì?

→ `Promise.all`: Nếu 1 promise reject → toàn bộ reject ngay, các promise khác vẫn chạy nhưng result bị bỏ
→ `Promise.allSettled`: Đợi tất cả xong, trả về array với status của từng promise (fulfilled/rejected)
→ Dùng `allSettled` khi muốn biết kết quả của tất cả, kể cả cái bị lỗi (ví dụ: gửi notification cho 100 user, muốn biết cái nào fail)
