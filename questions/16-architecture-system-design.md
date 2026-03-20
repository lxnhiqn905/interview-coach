# Architecture & System Design

---

## Q1: Message Queue — Khi nào nên dùng?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | Gọi trực tiếp (Sync) | Message Queue (Async) |
|---|---|---|
| Giao tiếp | Request → Response ngay | Gửi message → xử lý sau |
| Coupling | Tight (biết nhau) | Loose (không biết nhau) |
| Nếu receiver down | Caller bị lỗi ngay | Message nằm trong queue, xử lý khi recover |
| Throughput | Bị giới hạn bởi receiver | Receiver xử lý theo tốc độ của nó |
| Tracing | Dễ | Khó hơn (async flow) |
| Dùng khi | Cần kết quả ngay | Không cần kết quả ngay, cần decouple |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **Gọi trực tiếp** — như gọi điện thoại. Cả 2 phải available cùng lúc. Bên kia không bắt máy thì thất bại.
>
> **Message Queue** — như nhắn tin. Bạn gửi đi, bên kia đọc khi rảnh. Bên kia tắt máy thì tin nhắn vẫn chờ đó.

**Keyword để nhớ**: Queue = **decouple + buffer + async**. Dùng khi producer và consumer cần chạy **độc lập** với nhau.

**Câu hỏi tình huống**

> Hệ thống e-commerce: sau khi user đặt hàng, cần xảy ra 5 việc: trừ tồn kho, gửi email xác nhận, thông báo warehouse, cập nhật analytics, gửi SMS. Bạn thiết kế thế nào?

*Trả lời*: Tách thành 2 nhóm:

```
HTTP Request → OrderService.placeOrder()
                ├── [Sync] InventoryService.reserve()  ← phải thành công mới confirm order
                └── [Queue] OrderCreatedEvent
                        ├── EmailWorker      → gửi email (chậm được)
                        ├── WarehouseWorker  → thông báo kho (chậm được)
                        ├── AnalyticsWorker  → update metrics (chậm được)
                        └── SmsWorker        → gửi SMS (chậm được)
```

Chỉ `InventoryService` cần sync vì quyết định order có được tạo không. 4 việc còn lại không ảnh hưởng đến response trả về user → đẩy vào queue, xử lý bất đồng bộ. Nếu email service down, order vẫn tạo được, email gửi sau khi service recover.

**Câu hỏi Trick**

**Trick 1**: Queue bị đầy (backpressure) thì xử lý thế nào?

*Trả lời*: Có 4 cách:
- **Drop message**: Bỏ message mới — chấp nhận được với analytics, không chấp nhận với order
- **Block producer**: Producer chờ đến khi queue có chỗ — đơn giản nhưng có thể timeout
- **Scale consumer**: Thêm consumer xử lý nhanh hơn — cần auto-scaling
- **Dead Letter Queue (DLQ)**: Message không xử lý được sau N lần retry → đẩy vào DLQ để investigate

---

**Trick 2**: Kafka vs RabbitMQ — khác nhau thế nào? Chọn cái nào?

*Trả lời*:

| | Kafka | RabbitMQ |
|---|---|---|
| Model | Log-based, consumer đọc offset | Queue, message bị xóa sau khi ack |
| Replay | Có — đọc lại message cũ | Không |
| Throughput | Rất cao (millions/s) | Thấp hơn |
| Routing | Đơn giản (topic/partition) | Phức tạp (exchange, binding) |
| Dùng khi | Event sourcing, audit log, stream processing | Task queue, RPC, complex routing |

---

## Q2: Service Discovery — Khi nào cần?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | Hardcode IP | Service Discovery |
|---|---|---|
| Config | IP/port cố định trong config | Dynamic — tìm service lúc runtime |
| Scale | Phải update config mỗi khi thêm instance | Tự động biết instance mới |
| Instance down | Vẫn gọi đến instance chết | Tự loại bỏ instance không healthy |
| Dùng khi | Monolith, ít service, static infra | Microservices, auto-scaling, cloud |

**2 pattern chính**:

| | Client-Side Discovery | Server-Side Discovery |
|---|---|---|
| Ai tìm service? | Client tự query registry | Load Balancer tìm thay |
| Ví dụ | Netflix Eureka + Ribbon | AWS ALB + ECS, Kubernetes Service |
| Client phức tạp | Hơn | Đơn giản hơn |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> *Không có Service Discovery* — như giao hàng theo địa chỉ cố định. Nhà chuyển đi (instance thay đổi IP) thì giao thất bại.
>
> *Có Service Discovery* — như giao hàng qua số điện thoại. Gọi trước hỏi địa chỉ hiện tại, dù nhà chuyển đi cũng tìm được.

**Câu hỏi tình huống**

> Hệ thống có `OrderService` cần gọi `PaymentService`. `PaymentService` chạy 3 instance trên Kubernetes, IP thay đổi mỗi khi restart. Thiết kế thế nào?

*Trả lời*: Dùng **Kubernetes Service** (Server-Side Discovery):

```
OrderService → gọi "payment-service:8080"  ← DNS name cố định
                    ↓
              Kubernetes Service           ← load balance
                    ↓
         ┌──────────┴──────────┐
    payment-pod-1        payment-pod-2     ← IP thay đổi không ảnh hưởng
```

`OrderService` không bao giờ biết IP thật — chỉ biết service name. Kubernetes tự lo việc tìm pod healthy và load balance.

**Câu hỏi Trick**

**Trick 1**: Service đã đăng ký vào registry nhưng thực ra đang chết (zombie service). Xử lý thế nào?

*Trả lời*: **Health check + TTL**. Registry định kỳ ping service, nếu không response thì deregister. Hoặc service tự gửi heartbeat, nếu heartbeat timeout thì registry tự xóa. Kubernetes dùng Readiness Probe để quyết định pod nào được nhận traffic.

---

**Trick 2**: Service Mesh (Istio/Linkerd) và Service Discovery khác nhau thế nào?

*Trả lời*: Service Discovery chỉ giải quyết "tìm service ở đâu". Service Mesh giải quyết toàn bộ communication layer: discovery + load balancing + mTLS + circuit breaker + retry + observability — tất cả ở tầng infrastructure, không cần viết trong app code.

---

## Q3: REST vs gRPC vs GraphQL vs WebSocket — Khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | REST | gRPC | GraphQL | WebSocket |
|---|---|---|---|---|
| Protocol | HTTP/1.1 | HTTP/2 | HTTP | TCP |
| Format | JSON | Protobuf (binary) | JSON | Binary/Text |
| Performance | Trung bình | Cao (binary, multiplexing) | Trung bình | Cao (realtime) |
| Schema | Không bắt buộc | Bắt buộc (.proto) | Bắt buộc (SDL) | Không |
| Streaming | Không | Có (bidirectional) | Subscription | Có |
| Browser support | Tốt | Cần grpc-web | Tốt | Tốt |
| Dùng khi | Public API, CRUD | Internal microservices | Flexible query, mobile | Realtime |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **REST** — như menu nhà hàng cố định. Gọi món nào ra món đó, không thêm bớt được. Đơn giản, ai cũng hiểu.
>
> **gRPC** — như đường hầm riêng giữa 2 văn phòng. Nhanh, typed, nhưng chỉ dùng nội bộ, người ngoài không vào được dễ.
>
> **GraphQL** — như buffet. Lấy đúng thứ mình cần, không thừa không thiếu. Nhưng bếp phức tạp hơn.
>
> **WebSocket** — như điện thoại để ngỏ. Nói chuyện 2 chiều liên tục, không cần gọi mỗi lần muốn nói gì.

**Câu hỏi tình huống**

> Bạn thiết kế hệ thống gồm: public API cho mobile app, giao tiếp giữa các microservices, dashboard realtime, và CMS cho phép query data linh hoạt. Chọn protocol nào cho từng phần?

*Trả lời*:

```
Mobile App       ↔ API Gateway   : REST — phổ biến, dễ debug, cache tốt
Microservices    ↔ Microservices : gRPC — nhanh, type-safe, streaming support
Dashboard        ↔ Backend       : WebSocket — push realtime, không poll
CMS              ↔ Backend       : GraphQL — query linh hoạt, tránh over/under-fetch
```

**Câu hỏi Trick**

**Trick 1**: REST API bị **over-fetching** và **under-fetching** là gì? GraphQL giải quyết thế nào?

*Trả lời*:
- **Over-fetching**: API trả về 20 field nhưng client chỉ dùng 3 → tốn bandwidth
- **Under-fetching**: 1 request không đủ data, phải gọi thêm request thứ 2, thứ 3 (N+1 problem)

GraphQL client khai báo **chính xác** field cần → server trả về đúng field đó, không thừa không thiếu. 1 query có thể lấy data từ nhiều nguồn liên quan.

---

**Trick 2**: gRPC không dùng được trực tiếp từ browser. Tại sao? Giải pháp?

*Trả lời*: Browser không kiểm soát được HTTP/2 framing ở tầng thấp — gRPC dùng HTTP/2 trailer (header gửi sau response body) mà browser không support. Giải pháp: **gRPC-Web** — proxy (Envoy) đứng giữa, convert gRPC-Web (browser) → gRPC (server). Hoặc expose REST/GraphQL ra ngoài, dùng gRPC chỉ internal.

---

## Q4: Instance (Always-on) vs Serverless — Khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | Instance (EC2/ECS/EKS) | Serverless (Lambda/Cloud Functions) |
|---|---|---|
| Billing | Trả theo giờ dù idle | Trả theo số lần invoke + duration |
| Startup | Không có cold start | Cold start 100ms-1s |
| Scale | Manual hoặc auto-scaling | Tự động, virtually unlimited |
| State | Có thể giữ state | Stateless |
| Runtime giới hạn | Không | Có (Lambda max 15 phút) |
| Ops effort | Cao (patch, scale, monitor) | Thấp |
| Dùng khi | Traffic ổn định, latency nhạy cảm | Traffic không đều, event-driven |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **Instance** — như thuê văn phòng cả năm. Dù có khách hay không vẫn trả tiền, nhưng luôn sẵn sàng, không cần chờ mở cửa.
>
> **Serverless** — như thuê phòng họp theo giờ. Chỉ trả khi dùng, nhưng lần đầu vào phòng mất vài phút setup (cold start).

**Keyword để nhớ**: Instance = **luôn chạy, latency ổn định, traffic đều**. Serverless = **pay-per-use, event-driven, traffic thất thường**.

**Câu hỏi tình huống**

> Bạn có 3 workload: API chính của app (1000 req/s đều đặn), job resize ảnh khi user upload (burst, không đều), và report chạy lúc 2AM mỗi ngày. Chọn gì cho từng loại?

*Trả lời*:

```
API chính (1000 req/s đều)     → ECS/EKS (instance)
    → Traffic ổn định, cold start không chấp nhận được

Resize ảnh (burst khi upload)  → Lambda
    → Chỉ chạy khi có event, scale tự động từ 0 → n ngay lập tức

Report 2AM hàng ngày           → Lambda hoặc ECS Scheduled Task
    → Chạy 1 lần/ngày, không cần server chạy 24/7
```

**Câu hỏi Trick**

**Trick 1**: Lambda cold start ảnh hưởng đến latency. Có cách nào giảm không?

*Trả lời*:
- **Provisioned Concurrency**: Giữ N instance luôn warm — không cold start nhưng trả tiền liên tục
- **Warm-up ping**: Cron job ping Lambda mỗi 5 phút để giữ warm — không chắc chắn
- **Giảm package size**: Cold start tỉ lệ với size của deployment package
- **Chọn runtime phù hợp**: Node.js/Python cold start nhanh hơn Java/C# vì JVM khởi động chậm

---

**Trick 2**: Lambda max 15 phút. Nếu job cần chạy lâu hơn thì sao?

*Trả lời*: Không dùng Lambda cho long-running job. Alternatives:
- **ECS Fargate**: Container chạy bao lâu cũng được, trả theo usage
- **AWS Batch**: Designed cho batch workload, tự quản lý compute
- **Step Functions**: Chia job thành nhiều Lambda step, orchestrate bằng state machine — mỗi step max 15 phút nhưng tổng flow không giới hạn

---

## Q5: Worker vs Scheduler (Cron Job) — Khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | Worker | Scheduler / Cron Job |
|---|---|---|
| Trigger | Event/message từ queue | Thời gian cố định |
| Chạy | Liên tục, lắng nghe queue | Chạy xong rồi dừng |
| Scale | Thêm worker = tăng throughput | Scale phức tạp hơn |
| Retry | Queue tự retry | Phải tự implement |
| Dùng khi | Xử lý event realtime, load không đều | Job định kỳ, không phụ thuộc event |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **Worker** — như nhân viên bưu điện trực cả ngày, thư đến là xử lý ngay. Nhiều thư thì tăng thêm nhân viên.
>
> **Cron Job** — như nhân viên dọn vệ sinh chỉ vào 6AM. Không quan tâm có bao nhiêu rác trong ngày, đến giờ là làm.

**Keyword để nhớ**: Worker = **reactive, event-driven, scale tốt**. Cron = **proactive, time-based, predictable**.

**Câu hỏi tình huống**

> Hệ thống cần: xử lý payment khi user checkout, gửi email daily digest lúc 8AM, sync data từ external API mỗi 15 phút, và gửi notification ngay khi có sự kiện. Phân loại từng loại?

*Trả lời*:

```
Payment khi checkout          → Worker (consume từ payment queue)
    → Phải xử lý ngay, load không đều, cần retry khi fail

Email daily digest 8AM        → Cron Job
    → Thời gian cố định, không phụ thuộc event

Sync external API mỗi 15 phút → Cron Job (hoặc Scheduled Task)
    → Periodic polling, không có event trigger

Notification realtime         → Worker (consume từ notification queue)
    → Event-driven, cần xử lý ngay khi có sự kiện
```

**Câu hỏi Trick**

**Trick 1**: Cron Job chạy trên nhiều instance (cluster) bị duplicate — cùng 1 job chạy nhiều lần. Xử lý thế nào?

*Trả lời*:
- **Distributed Lock**: Trước khi chạy, acquire lock (Redis, ZooKeeper). Instance nào lấy được lock thì chạy, instance khác skip
- **Leader Election**: Chỉ 1 instance là leader, chỉ leader mới chạy cron. Nếu leader down thì bầu leader mới
- **Database flag**: Trước khi chạy, insert row vào DB với unique constraint (job_name + scheduled_time). Ai insert được thì chạy

Trong Spring Boot: `@SchedulerLock` (ShedLock library) làm điều này tự động với distributed lock qua DB.

---

**Trick 2**: Worker đang xử lý message thì bị kill (OOM, deploy mới). Message có bị mất không?

*Trả lời*: Phụ thuộc vào **ack strategy**:
- **Auto-ack** (ack ngay khi nhận): Message bị mất nếu worker chết trước khi xử lý xong
- **Manual ack** (ack sau khi xử lý xong): Message quay lại queue nếu worker chết → được retry bởi worker khác

Best practice: **manual ack + idempotent processing** — xử lý xong mới ack, và đảm bảo xử lý cùng message 2 lần không gây lỗi.

---

## Q6: Crawler vs Webhook — Khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | Crawler (Polling) | Webhook (Push) |
|---|---|---|
| Cơ chế | Chủ động hỏi định kỳ | Bên kia chủ động gửi khi có sự kiện |
| Latency | Cao (phụ thuộc interval) | Thấp (gần realtime) |
| Tài nguyên | Tốn (hỏi dù không có gì mới) | Tiết kiệm |
| Kiểm soát | Cao (tự quyết định khi nào hỏi) | Thấp (phụ thuộc bên kia) |
| Phức tạp | Đơn giản | Cần expose endpoint, handle security |
| Dùng khi | Bên kia không support webhook, cần resilient | Bên kia support webhook, cần realtime |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **Crawler** — như cứ 30 phút lại gọi điện hỏi bạn "có tin mới không?". Chắc chắn không bỏ lỡ, nhưng tốn công cả 2 bên, 29 phút kia hỏi vô ích.
>
> **Webhook** — như nhờ bạn "có tin mới thì nhắn tao". Không tốn công poll, nhưng nếu bạn quên nhắn (service down) thì mất tin.

**Câu hỏi tình huống**

> Hệ thống cần lấy trạng thái payment từ cổng thanh toán (VNPay, Momo). Họ có cả 2 option: webhook và API query. Bạn implement thế nào?

*Trả lời*: **Dùng cả 2** — đây là best practice trong thực tế:

```
1. Webhook (primary):
   Cổng TT → POST /webhook/payment → xử lý ngay
   → Nhanh, realtime, tiết kiệm tài nguyên

2. Cron Job query (fallback):
   Mỗi 5 phút: query các order PENDING > 10 phút
   → Catch những order webhook bị miss (network issue, downtime)

Kết quả: Nhanh như webhook, reliable như polling
```

**Câu hỏi Trick**

**Trick 1**: Webhook bị gọi 2 lần (retry từ bên gửi). Xử lý thế nào?

*Trả lời*: **Idempotency** — mỗi webhook event có unique `event_id`. Trước khi xử lý, check `event_id` đã xử lý chưa (lưu trong DB/Redis). Đã xử lý thì trả 200 OK ngay (không xử lý lại), chưa thì xử lý rồi lưu `event_id`.

```
Nhận webhook:
    Kiểm tra event_id trong DB
    Đã có → trả 200 OK (bỏ qua)
    Chưa có → xử lý → lưu event_id → trả 200 OK
```

---

**Trick 2**: Crawler gặp rate limit từ API bên ngoài. Xử lý thế nào?

*Trả lời*:
- **Exponential backoff**: Lần 1 đợi 1s, lần 2 đợi 2s, lần 3 đợi 4s... tránh hammer API
- **Respect Retry-After header**: API trả về header cho biết đợi bao lâu → dùng đúng thời gian đó
- **Request queue + rate limiter**: Không gọi API trực tiếp, đẩy vào internal queue với rate limiter kiểm soát số request/giây
- **Cache kết quả**: Không poll những gì không thay đổi thường xuyên

---

## Q7: Monolith vs Microservices vs Modular Monolith — Chọn gì khi nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | Monolith | Modular Monolith | Microservices |
|---|---|---|---|
| Deploy | 1 lần toàn bộ | 1 lần toàn bộ | Độc lập từng service |
| Scale | Toàn bộ app | Toàn bộ app | Từng service riêng |
| Team | 1 team | Module team | Nhiều team độc lập |
| Complexity ops | Thấp | Thấp | Cao |
| Latency | Thấp (in-process) | Thấp | Cao hơn (network) |
| Data isolation | Không | Theo module | Mỗi service có DB riêng |
| Phù hợp | Startup, team nhỏ | Team trung bình | Team lớn, scale độc lập |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **Monolith** — như 1 cửa hàng bán tất cả mọi thứ. Đơn giản, nhanh, nhưng khi đông khách (scale) thì toàn bộ cửa hàng phải mở rộng dù chỉ 1 quầy bận.
>
> **Microservices** — như trung tâm thương mại với nhiều cửa hàng độc lập. Quầy giày đông thì chỉ quầy giày mở rộng. Nhưng quản lý phức tạp hơn nhiều.
>
> **Modular Monolith** — như 1 cửa hàng nhưng có các khu vực riêng biệt rõ ràng. Đơn giản để vận hành, nhưng code được tổ chức tốt, sẵn sàng tách ra khi cần.

**Câu hỏi tình huống**

> Startup 5 người, 6 tháng ra MVP. CTO muốn dùng microservices để "scale sau này". Bạn tư vấn thế nào?

*Trả lời*: **Bắt đầu với Modular Monolith**:
- Microservices tốn gấp 3-5 lần effort ops (service mesh, distributed tracing, separate deploy pipelines)
- Team 5 người không đủ bandwidth vừa build feature vừa maintain infrastructure
- **Strangler Fig Pattern**: Bắt đầu monolith, tổ chức code thành module rõ ràng (User module, Order module, Payment module), khi cần scale riêng thì tách module đó ra thành service độc lập

**Câu hỏi Trick**

**Trick 1**: Microservices mỗi service có DB riêng. Nếu cần query data từ nhiều service thì sao?

*Trả lời*: Không JOIN trực tiếp cross-service. Có 3 approach:
- **API Composition**: Service A gọi API Service B, ghép data ở application layer
- **CQRS + Event Sourcing**: Mỗi service publish event, service khác build read model riêng (denormalized)
- **API Gateway aggregation**: Gateway gọi nhiều service, aggregate response trả về client

---

**Trick 2**: "2 Pizza Rule" của Amazon là gì và liên quan thế nào đến microservices?

*Trả lời*: Team không nên lớn hơn số người có thể ăn hết 2 chiếc pizza (6-8 người). Mỗi microservice nên được owned bởi 1 team như vậy — **Conway's Law**: system architecture phản ánh communication structure của organization. Tách service mà không tách team thì vẫn bị coupling về mặt tổ chức.
