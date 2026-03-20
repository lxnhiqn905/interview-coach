# AWS

---

## Q1: `ELB` vs `API Gateway` — Khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | ELB (ALB/NLB) | API Gateway |
|---|---|---|
| Layer | L4 (NLB) / L7 (ALB) | L7 — application level |
| Auth | Không built-in | Built-in (JWT, API Key, IAM) |
| Rate limiting | Không | Có |
| Request transformation | Không | Có |
| WebSocket | ALB hỗ trợ | Có |
| Use case | Internal services, microservices | Public API, 3rd party integration |
| Cost | Theo giờ + LCU | Theo số request |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **ELB** — như bảo vệ tòa nhà chỉ biết phân luồng người vào các tầng. Không kiểm tra giấy tờ, không giới hạn số lần vào.
>
> **API Gateway** — như lễ tân khách sạn 5 sao. Kiểm tra đặt phòng (auth), giới hạn số lần vào (rate limit), hướng dẫn đến đúng phòng (routing), ghi log ai vào lúc mấy giờ.

**Câu hỏi tình huống**

> Bạn expose microservices cho mobile app của công ty (internal) và cho đối tác bên ngoài (external). Dùng chung một API Gateway hay tách riêng?

*Trả lời*: Nên **tách riêng**:
- Internal: ALB trực tiếp — không cần auth overhead, latency thấp hơn, cost thấp hơn
- External: API Gateway — cần auth, rate limiting, monitoring riêng, có thể throttle per partner

Dùng chung một API Gateway thì rate limit/quota của internal app ảnh hưởng lẫn external và ngược lại.

**Câu hỏi Trick**

**Trick 1**: ALB có thể route request dựa trên gì?

*Trả lời*: ALB route được theo: **path** (`/api/users` → service A), **host header** (`api.example.com` → service B), **HTTP method**, **query string**, **HTTP headers**. NLB chỉ route theo IP/port — không hiểu HTTP.

---

**Trick 2**: API Gateway có thể gọi thẳng Lambda mà không qua EC2/ECS. Khi nào đây là anti-pattern?

*Trả lời*: Khi Lambda bị **cold start** ảnh hưởng đến latency SLA. Nếu endpoint cần response < 100ms nhất quán, Lambda cold start (100ms-1s) là vấn đề. Fix: provisioned concurrency (tốn tiền), hoặc dùng ECS/EKS thay vì Lambda cho latency-sensitive endpoints.

---

## Q2: `EKS` vs `ECS` — Khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | EKS | ECS |
|---|---|---|
| Orchestration | Kubernetes (open standard) | AWS proprietary |
| Complexity | Cao | Thấp |
| Portable | Có (chuẩn K8s) | Không (lock-in AWS) |
| Ecosystem | Lớn (Helm, Istio, ArgoCD...) | Nhỏ hơn |
| Control plane cost | EKS cluster fee (~$72/tháng) | Miễn phí (chỉ trả compute) |
| Learning curve | Dốc | Thoải hơn |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **ECS** — như thuê căn hộ dịch vụ AWS. Nhanh, đơn giản, AWS lo hết infrastructure. Nhưng khi muốn chuyển nhà (multi-cloud) thì phải pack lại từ đầu.
>
> **EKS** — như mua nhà. Linh hoạt hơn, di chuyển được, nhưng phải tự lo nhiều thứ hơn (networking, upgrades, add-ons).

**Câu hỏi tình huống**

> Company đang dùng ECS, CTO muốn migrate sang EKS để "tránh vendor lock-in". Lập luận cho và chống?

*Trả lời*:
- **Pro EKS**: Kubernetes portable, skill transferable, ecosystem lớn, multi-cloud ready về mặt lý thuyết
- **Con EKS**: Vẫn dùng AWS-specific services (RDS, S3, ALB) → thực tế vẫn bị lock-in. EKS phức tạp hơn, tốn ops effort hơn. Migration tốn kém
- **Verdict**: Nếu goal thực sự là multi-cloud, cần xem xét toàn bộ stack, không chỉ container orchestration. Với team nhỏ, ECS đơn giản hơn đáng kể

**Câu hỏi Trick**

**Trick 1**: ECS Fargate vs ECS EC2 — khác nhau thế nào?

*Trả lời*:
- **EC2 launch type**: Bạn quản lý EC2 instances (patch, scale, capacity planning)
- **Fargate**: Serverless — AWS quản lý infrastructure, chỉ define CPU/memory per task, trả tiền theo usage

Fargate đơn giản hơn nhưng đắt hơn EC2 (~30-40%). Dùng EC2 khi cần tiết kiệm chi phí hoặc cần GPU/custom instance type.

---

**Trick 2**: IAM Role cho EC2 vs IAM Role cho ECS Task — khác nhau thế nào? Tại sao không dùng EC2 role cho app trong container?

*Trả lời*: EC2 instance role apply cho **toàn bộ instance** — mọi container trên instance đó đều có cùng permission. ECS Task Role apply cho **từng task riêng** — least privilege, mỗi service chỉ có permission cần thiết. Đây là security best practice: không để payment service và logging service có cùng AWS permission.

---

## Q3: RDS vs DynamoDB — Khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | RDS (MySQL/PostgreSQL) | DynamoDB |
|---|---|---|
| Loại | Relational (SQL) | NoSQL (Key-Value/Document) |
| Schema | Cố định | Flexible |
| Query | Phức tạp (JOIN, aggregation) | Đơn giản (key-based) |
| Scale | Vertical + Read replica | Horizontal, virtually unlimited |
| Latency | ms | Single-digit ms |
| Transactions | Full ACID | Limited (DynamoDB Transactions) |
| Cost model | Theo instance size | Theo read/write capacity |

**Câu hỏi tình huống**

> Bạn build hệ thống session storage cho 10 triệu user, cần lookup theo session ID, TTL tự động expire. Dùng RDS hay DynamoDB?

*Trả lời*: **DynamoDB** — vì:
- Lookup theo key (session ID) đơn giản, không cần JOIN
- TTL attribute built-in tự động xóa session hết hạn
- Scale horizontally với 10M user dễ dàng
- Single-digit ms latency phù hợp cho auth flow

**Câu hỏi Trick**

**Trick 1**: DynamoDB hot partition là gì? Xảy ra khi nào?

*Trả lời*: DynamoDB phân data theo partition key. Nếu nhiều request dồn vào **cùng một partition key** (ví dụ: dùng `date` làm partition key, tất cả request hôm nay đều vào một partition) → partition đó bị overload trong khi các partition khác rảnh. Fix bằng cách chọn partition key có **high cardinality** (user ID, UUID) hoặc thêm random suffix.

---

**Trick 2**: RDS Multi-AZ vs Read Replica — khác nhau thế nào?

*Trả lời*:
- **Multi-AZ**: Standby sync replica ở AZ khác, **chỉ dùng cho failover** (không phục vụ read traffic). Failover tự động ~60s
- **Read Replica**: Async replica, **phục vụ read traffic** để giảm tải primary. Có thể promote lên primary nếu cần

Dùng cả hai: Multi-AZ cho HA, Read Replica cho scale read.
