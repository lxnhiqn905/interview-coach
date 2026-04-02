# Java Multithreading

---

## Q1: Thread vs Process — Khác nhau thế nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | Process | Thread |
|---|---|---|
| Định nghĩa | Chương trình đang chạy, có memory space riêng | Đơn vị thực thi nhỏ hơn, nằm trong process |
| Memory | Không share với process khác | Share heap với các thread cùng process |
| Tạo mới | Nặng (fork, OS allocate resources) | Nhẹ hơn (cùng address space) |
| Giao tiếp | IPC (pipe, socket, shared memory) | Dùng trực tiếp shared variables |
| Crash | Crash process không ảnh hưởng process khác | Crash thread có thể kill cả process |

**Trả lời Nâng cao**

> Trong JVM, mỗi application là 1 process. Bên trong có nhiều thread: `main` thread, GC thread, thread pool của Spring...
>
> Thread chia sẻ **heap** (objects) nhưng mỗi thread có **stack riêng** (local variables, call stack). Đây là lý do local variables thread-safe còn instance variables thì không.

**Câu hỏi Trick**

> `Thread.sleep()` có release lock không?

*Trả lời*: **Không**. `sleep()` giữ nguyên lock. Muốn release lock trong lúc chờ phải dùng `wait()` — gọi trong `synchronized` block và release lock cho thread khác vào.

---

## Q2: Tạo Thread trong Java — Có những cách nào?

**Trả lời Basic**

3 cách chính:

```java
// Cách 1: extends Thread
class MyThread extends Thread {
    public void run() { System.out.println("Thread chạy"); }
}
new MyThread().start();

// Cách 2: implements Runnable
Thread t = new Thread(() -> System.out.println("Thread chạy"));
t.start();

// Cách 3: ExecutorService (khuyên dùng trong production)
ExecutorService pool = Executors.newFixedThreadPool(4);
pool.submit(() -> System.out.println("Thread chạy"));
pool.shutdown();
```

**Trả lời Nâng cao**

> Trong thực tế **không nên tạo thread thủ công** (`new Thread()`). Lý do:
> - Tốn tài nguyên nếu tạo nhiều
> - Không kiểm soát được số lượng
> - Khó quản lý lifecycle
>
> Dùng **ExecutorService / ThreadPoolExecutor** để tái sử dụng thread, kiểm soát concurrency.

```java
ThreadPoolExecutor executor = new ThreadPoolExecutor(
    2,   // corePoolSize
    10,  // maximumPoolSize
    60L, TimeUnit.SECONDS,
    new LinkedBlockingQueue<>(100)
);
```

**Câu hỏi Trick**

> Gọi `run()` thay vì `start()` thì sao?

*Trả lời*: `run()` thực thi **trên thread hiện tại** (không tạo thread mới). Muốn chạy song song phải gọi `start()` — JVM sẽ tạo thread mới rồi gọi `run()` trong thread đó.

---

## Q3: synchronized là gì? Dùng thế nào?

**Trả lời Basic**

`synchronized` đảm bảo chỉ 1 thread vào critical section tại một thời điểm, tránh race condition.

```java
// Method level
public synchronized void increment() {
    count++;
}

// Block level (granular hơn)
public void increment() {
    synchronized(this) {
        count++;
    }
}

// Static — lock trên Class object
public static synchronized void staticMethod() { ... }
```

**Trả lời Nâng cao**

> `synchronized` dùng **intrinsic lock (monitor)**. Mỗi object Java có 1 lock.
>
> - `synchronized(this)` — lock instance
> - `synchronized(MyClass.class)` — lock class (dùng cho static)
> - Nên dùng **private final Object lock** thay vì lock `this` để tránh bên ngoài lock cùng object:

```java
private final Object lock = new Object();

public void transfer(int amount) {
    synchronized(lock) {
        balance -= amount;
    }
}
```

**Câu hỏi tình huống**

> Hai method `deposit()` và `withdraw()` đều `synchronized`. Thread A đang chạy `deposit()`, Thread B gọi `withdraw()` — B có phải chờ không?

*Trả lời*: **Có**, vì cả hai đều lock trên cùng `this` object. Nếu muốn chúng chạy song song, dùng 2 lock riêng biệt hoặc `ReentrantReadWriteLock`.

**Câu hỏi Trick**

> `synchronized` có prevent visibility problem không hay chỉ prevent race condition?

*Trả lời*: **Cả hai**. Khi thread exit synchronized block, JVM flush tất cả changes xuống main memory. Thread khác vào block sẽ đọc giá trị mới nhất. Đây là **happens-before guarantee**.

---

## Q4: volatile là gì? Khi nào dùng?

**Trả lời Basic**

`volatile` đảm bảo mọi thread đọc giá trị **trực tiếp từ main memory**, không dùng CPU cache.

```java
private volatile boolean running = true;

// Thread 1
public void stop() { running = false; }

// Thread 2
public void run() {
    while (running) {  // luôn đọc giá trị mới nhất
        doWork();
    }
}
```

**Trả lời Nâng cao**

> `volatile` giải quyết **visibility problem** nhưng **không giải quyết atomicity**.
>
> - `volatile boolean flag` → OK (đọc/ghi boolean là atomic)
> - `volatile int count; count++` → **KHÔNG OK** vì `count++` là 3 bước: read → increment → write

| | volatile | synchronized |
|---|---|---|
| Visibility | Có | Có |
| Atomicity | Không | Có |
| Performance | Nhanh hơn | Chậm hơn (lock overhead) |
| Dùng khi | Simple flag, status | Compound operations |

**Câu hỏi Trick**

> Có thể dùng `volatile` thay `synchronized` để tối ưu performance không?

*Trả lời*: Chỉ khi operation là **atomic** (đọc/ghi đơn giản, không phải read-modify-write). Nếu có compound operation (`check-then-act`, `count++`), bắt buộc phải dùng `synchronized` hoặc `AtomicInteger`.

---

## Q5: deadlock là gì? Làm thế nào để tránh?

**Trả lời Basic**

Deadlock xảy ra khi 2 thread chờ nhau mãi mãi vì mỗi thread giữ 1 lock và cần lock của thread kia.

```java
// Thread A: lock A → cần lock B
synchronized(lockA) {
    synchronized(lockB) { ... }
}

// Thread B: lock B → cần lock A
synchronized(lockB) {
    synchronized(lockA) { ... }  // DEADLOCK
}
```

**Trả lời Nâng cao**

4 điều kiện để deadlock xảy ra (Coffman conditions):
1. **Mutual exclusion** — resource chỉ 1 thread dùng tại một thời điểm
2. **Hold and wait** — thread giữ lock và chờ thêm lock khác
3. **No preemption** — lock không bị lấy đi bởi thread khác
4. **Circular wait** — A chờ B, B chờ A

**Cách tránh:**

```java
// 1. Lock ordering — luôn acquire lock theo thứ tự cố định
synchronized(Math.min(a,b) == a ? lockA : lockB) {
    synchronized(Math.min(a,b) == a ? lockB : lockA) { ... }
}

// 2. tryLock với timeout
if (lockA.tryLock(1, TimeUnit.SECONDS)) {
    if (lockB.tryLock(1, TimeUnit.SECONDS)) {
        // do work
        lockB.unlock();
    }
    lockA.unlock();
}

// 3. Tránh nested locks khi có thể
```

**Câu hỏi tình huống**

> System đang bị treo, log không thấy lỗi. Làm thế nào detect deadlock?

*Trả lời*: Dùng `jstack <pid>` để dump thread state. JVM tự detect và report `Found one Java-level deadlock`. Trong production dùng APM như Datadog hoặc expose JMX metrics.

---

## Q6: ReentrantLock vs synchronized — Khi nào dùng cái nào?

**Trả lời Basic**

| | synchronized | ReentrantLock |
|---|---|---|
| Syntax | Keyword đơn giản | Phải gọi `lock()`/`unlock()` |
| Fairness | Không đảm bảo | Có thể dùng `new ReentrantLock(true)` |
| tryLock | Không có | Có, với timeout |
| Interruptible | Không | Có (`lockInterruptibly()`) |
| Multiple conditions | Không (chỉ 1 wait set) | Có (`newCondition()`) |

**Trả lời Nâng cao**

```java
ReentrantLock lock = new ReentrantLock();

public void doWork() {
    lock.lock();
    try {
        // critical section
    } finally {
        lock.unlock();  // PHẢI unlock trong finally
    }
}

// tryLock — không block mãi mãi
if (lock.tryLock(500, TimeUnit.MILLISECONDS)) {
    try { ... }
    finally { lock.unlock(); }
} else {
    // xử lý khi không lấy được lock
}
```

**Câu hỏi Trick**

> Quên gọi `unlock()` thì sao?

*Trả lời*: **Lock bị giữ mãi**, các thread khác block forever → deadlock. Luôn dùng `try/finally` để đảm bảo `unlock()` được gọi dù có exception.

---

## Q7: ExecutorService và ThreadPool — Hoạt động thế nào?

**Trả lời Basic**

ThreadPool duy trì sẵn một số thread, nhận task từ queue và giao cho thread rảnh.

```java
// Fixed pool — số thread cố định
ExecutorService fixed = Executors.newFixedThreadPool(4);

// Cached pool — tạo thread mới nếu cần, reuse nếu rảnh
ExecutorService cached = Executors.newCachedThreadPool();

// Single thread
ExecutorService single = Executors.newSingleThreadExecutor();

// Scheduled
ScheduledExecutorService scheduled = Executors.newScheduledThreadPool(2);
scheduled.scheduleAtFixedRate(task, 0, 5, TimeUnit.SECONDS);
```

**Trả lời Nâng cao**

> `ThreadPoolExecutor` cho phép tùy chỉnh đầy đủ:

```java
new ThreadPoolExecutor(
    2,                          // corePoolSize: thread luôn sống
    10,                         // maximumPoolSize: tối đa khi queue đầy
    60L, TimeUnit.SECONDS,      // keepAliveTime: idle thread sống bao lâu
    new LinkedBlockingQueue<>(100),  // workQueue
    new ThreadPoolExecutor.CallerRunsPolicy()  // RejectedExecutionHandler
);
```

**RejectedExecutionHandler khi queue đầy và pool đạt max:**
- `AbortPolicy` (default): throw `RejectedExecutionException`
- `CallerRunsPolicy`: thread gọi tự chạy task (backpressure)
- `DiscardPolicy`: bỏ task silently
- `DiscardOldestPolicy`: bỏ task cũ nhất trong queue

**Câu hỏi tình huống**

> Dùng `newCachedThreadPool()` rồi bị OOM. Tại sao?

*Trả lời*: `CachedThreadPool` không giới hạn số thread — nếu có 10.000 task đến cùng lúc sẽ tạo 10.000 thread → OOM. Trong production luôn dùng `ThreadPoolExecutor` với `maximumPoolSize` và queue size cụ thể.

---

## Q8: CountDownLatch vs CyclicBarrier vs Semaphore

**Trả lời Basic**

| | CountDownLatch | CyclicBarrier | Semaphore |
|---|---|---|---|
| Mục đích | Chờ N event hoàn thành | N thread chờ nhau tại barrier | Giới hạn số thread truy cập đồng thời |
| Reusable | Không | Có (reset sau mỗi cycle) | Có |
| Dùng khi | Main chờ worker threads | Threads cần sync với nhau | Rate limiting, connection pool |

**Trả lời Nâng cao**

```java
// CountDownLatch: main thread chờ 3 services khởi động xong
CountDownLatch latch = new CountDownLatch(3);

executor.submit(() -> { startServiceA(); latch.countDown(); });
executor.submit(() -> { startServiceB(); latch.countDown(); });
executor.submit(() -> { startServiceC(); latch.countDown(); });

latch.await();  // block đến khi count = 0
System.out.println("Tất cả services đã ready");

// Semaphore: giới hạn 5 concurrent DB connections
Semaphore semaphore = new Semaphore(5);

public void queryDB() {
    semaphore.acquire();
    try {
        // query
    } finally {
        semaphore.release();
    }
}
```

**Câu hỏi Trick**

> `CountDownLatch` đã về 0 rồi, gọi `await()` nữa thì sao?

*Trả lời*: **Không block**, trả về ngay lập tức. Khác với `CyclicBarrier` — có thể reset và dùng lại.

---

## Q9: CompletableFuture — Async programming trong Java

**Trả lời Basic**

`CompletableFuture` cho phép chạy task async và chain các bước xử lý.

```java
// Chạy async, không có return value
CompletableFuture.runAsync(() -> sendEmail());

// Chạy async, có return value
CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
    return fetchUserFromDB(userId);
});

// Chain xử lý
CompletableFuture<String> result = CompletableFuture
    .supplyAsync(() -> fetchUser(id))
    .thenApply(user -> user.getName().toUpperCase())
    .thenApply(name -> "Hello, " + name);

result.join();  // block và lấy kết quả
```

**Trả lời Nâng cao**

```java
// Kết hợp 2 future song song
CompletableFuture<User> userFuture = CompletableFuture.supplyAsync(() -> getUser(id));
CompletableFuture<Order> orderFuture = CompletableFuture.supplyAsync(() -> getOrder(id));

CompletableFuture<String> combined = userFuture.thenCombine(orderFuture,
    (user, order) -> user.getName() + " đã đặt " + order.getItem()
);

// Chờ tất cả hoàn thành
CompletableFuture.allOf(future1, future2, future3).join();

// Lấy cái nào xong trước
CompletableFuture.anyOf(future1, future2).join();

// Xử lý exception
future.exceptionally(ex -> {
    log.error("Error", ex);
    return "default value";
});
```

**Câu hỏi tình huống**

> Cần gọi 3 external API song song, timeout 2 giây, nếu bất kỳ API nào fail thì dùng default value. Làm thế nào?

```java
CompletableFuture<String> api1 = CompletableFuture
    .supplyAsync(() -> callApi1())
    .completeOnTimeout("default1", 2, TimeUnit.SECONDS)
    .exceptionally(e -> "default1");

// tương tự api2, api3...
CompletableFuture.allOf(api1, api2, api3).join();
```

---

## Q10: ThreadLocal — Dùng để làm gì?

**Trả lời Basic**

`ThreadLocal` cung cấp biến **riêng cho mỗi thread** — mỗi thread có bản copy độc lập, không share với nhau.

```java
private static final ThreadLocal<SimpleDateFormat> dateFormat =
    ThreadLocal.withInitial(() -> new SimpleDateFormat("yyyy-MM-dd"));

// Mỗi thread có instance SimpleDateFormat riêng → thread-safe
public String format(Date date) {
    return dateFormat.get().format(date);
}
```

**Trả lời Nâng cao**

> Dùng phổ biến trong Spring để lưu context theo request:
> - `SecurityContextHolder` — lưu authentication info của user
> - `TransactionSynchronizationManager` — lưu transaction context
> - Request ID, MDC (Mapped Diagnostic Context) cho logging

**Câu hỏi Trick**

> Dùng ThreadLocal trong thread pool có vấn đề gì không?

*Trả lời*: **Có** — thread trong pool được tái sử dụng. Nếu thread A xử lý request 1 set `ThreadLocal`, xong rồi thread đó nhận request 2 mà **không clear**, request 2 sẽ thấy data cũ của request 1 (data leak).

**Luôn phải clean up:**
```java
try {
    threadLocal.set(value);
    doWork();
} finally {
    threadLocal.remove();  // BẮT BUỘC
}
```
