# Networking

---

## Q1: DNS — Quá trình resolve domain diễn ra thế nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| Thành phần | Vai trò |
|---|---|
| DNS Resolver | Cache ở ISP/local, điểm tiếp nhận đầu tiên |
| Root Name Server | Biết TLD server (`.com`, `.vn`...) |
| TLD Name Server | Biết authoritative server của domain |
| Authoritative Name Server | Biết IP thật của domain |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> Giải quyết DNS như hỏi đường:
> 1. Hỏi **bảo vệ tòa nhà** (DNS Resolver) — nếu anh ta nhớ → trả lời ngay (cache)
> 2. Không nhớ → anh ta hỏi **tổng đài trung ương** (Root) — "`.com` ở đâu?"
> 3. Tổng đài chỉ **phòng quản lý `.com`** (TLD)
> 4. Phòng `.com` chỉ đến **văn phòng `example.com`** (Authoritative)
> 5. Văn phòng đưa ra địa chỉ thật (IP)

**Câu hỏi tình huống**

> Bạn deploy app lên server mới với IP mới. Cập nhật DNS record rồi nhưng một số user vẫn vào IP cũ. Tại sao?

*Trả lời*: **DNS propagation** — DNS record có TTL (Time To Live). Resolver đã cache bản ghi cũ, phải đợi TTL expire mới query lại. Fix khi cần chuyển nhanh: giảm TTL xuống thấp (60s) **trước khi** đổi IP, không phải sau. Sau khi propagate xong thì tăng TTL lại.

**Câu hỏi Trick**

**Trick 1**: Sự khác nhau giữa A record, CNAME record, và Alias record?

*Trả lời*:
- **A record**: Map domain → IP address trực tiếp
- **CNAME**: Map domain → domain khác (canonical name). Không dùng được ở root domain (`example.com`) vì RFC không cho phép
- **Alias (AWS Route 53)**: Như CNAME nhưng dùng được ở root domain, resolve trực tiếp về IP, không tốn thêm DNS lookup

---

**Trick 2**: Kubernetes DNS hoạt động thế nào? Service `my-service` trong namespace `production` có thể reach bằng hostname nào?

*Trả lời*: Kubernetes chạy CoreDNS. Format: `<service>.<namespace>.svc.cluster.local`
- Trong cùng namespace: `my-service`
- Khác namespace: `my-service.production`
- Full: `my-service.production.svc.cluster.local`

---

## Q2: Load Balancing — Các thuật toán và khi nào dùng?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| Algorithm | Cách hoạt động | Dùng khi |
|---|---|---|
| Round Robin | Lần lượt từng server | Request tương đương nhau |
| Least Connections | Server ít kết nối nhất | Request có thời gian xử lý khác nhau |
| IP Hash | Hash IP client → server cố định | Cần sticky session |
| Weighted | Round Robin với trọng số | Server có capacity khác nhau |
| Random | Ngẫu nhiên | Simple, stateless |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **Round Robin** — như chia bài đều cho mọi người. Hoạt động tốt nếu mỗi ván bài mất cùng thời gian.
>
> **Least Connections** — như xếp hàng vào quầy thanh toán ít người nhất. Hợp lý hơn khi có người xử lý nhanh, có người chậm.

**Câu hỏi tình huống**

> App của bạn có stateful session (không dùng JWT, dùng server-side session). Khi scale lên 3 pod, user bị logout ngẫu nhiên. Nguyên nhân và cách fix?

*Trả lời*: Load balancer route request đến pod khác → pod đó không có session → user bị logout. Fix theo thứ tự ưu tiên:
1. **Tốt nhất**: Migrate sang stateless auth (JWT)
2. **Tốt**: Centralize session store (Redis) — mọi pod đọc cùng một nơi
3. **Chấp nhận được**: Sticky session (IP Hash) — nhưng mất load balancing khi pod chết

**Câu hỏi Trick**

**Trick 1**: Layer 4 Load Balancer vs Layer 7 Load Balancer — khác nhau thế nào?

*Trả lời*:
- **L4 (NLB)**: Route dựa trên IP/TCP/UDP. Nhanh hơn, không inspect HTTP content. Dùng cho: non-HTTP traffic, cần latency cực thấp
- **L7 (ALB)**: Route dựa trên HTTP content (URL path, headers, cookies). Chậm hơn L4 một chút nhưng linh hoạt hơn nhiều. Dùng cho: HTTP microservices, cần content-based routing

---

**Trick 2**: Health check ở Load Balancer và Health check ở Kubernetes Probe — có thay thế nhau không?

*Trả lời*: Không — chúng hoạt động ở tầng khác nhau:
- **LB Health Check**: Quyết định có gửi traffic đến pod/instance không (external)
- **K8s Readiness Probe**: Quyết định có đưa pod vào Service endpoints không (internal cluster)
- **K8s Liveness Probe**: Quyết định có restart container không

Cần cả hai: K8s probe quản lý pod lifecycle, LB health check xác nhận upstream healthy trước khi route traffic.

---

## Q3: SSL/TLS — Termination ở đâu?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | SSL Termination tại LB | SSL Passthrough | End-to-End SSL |
|---|---|---|---|
| Decrypt tại | Load Balancer | App server | App server |
| Internal traffic | HTTP (không mã hóa) | HTTPS | HTTPS |
| Performance | LB xử lý SSL overhead | App server chịu tải | App server chịu tải |
| Certificate quản lý | Tập trung tại LB | Phân tán | Phân tán |

**Câu hỏi tình huống**

> Security team yêu cầu mã hóa **toàn bộ traffic**, kể cả trong internal network. Bạn chọn approach nào?

*Trả lời*: **End-to-End SSL** (mTLS trong internal) — terminate SSL tại app server, không tại LB. Trong Kubernetes, dùng **service mesh** (Istio/Linkerd) để tự động mTLS giữa các service mà không cần sửa app code.

**Câu hỏi Trick**

**Trick 1**: Certificate hết hạn lúc 3AM, production bị down. Làm thế nào phòng ngừa?

*Trả lời*:
1. **AWS Certificate Manager (ACM)**: Auto-renew, không bao giờ expire nếu domain validation còn hoạt động
2. **Let's Encrypt + cert-manager** (Kubernetes): Auto-renew 30 ngày trước khi hết hạn
3. **Alert**: Monitor expiry date, alert khi còn 30 ngày, 7 ngày
4. **Never manual**: Không manage certificate thủ công trên production

---

**Trick 2**: `HTTP` vs `HTTPS` — ngoài mã hóa, còn khác gì?

*Trả lời*:
- **Authentication**: HTTPS xác nhận bạn đang nói chuyện đúng server (certificate), HTTP không
- **Integrity**: HTTPS đảm bảo data không bị tamper trên đường truyền (MITM attack)
- **SEO**: Google ưu tiên HTTPS
- **HTTP/2**: Chỉ hoạt động trên HTTPS trong hầu hết browser → performance tốt hơn (multiplexing, header compression)
