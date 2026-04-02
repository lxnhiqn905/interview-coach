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

---

## Q4: TCP vs UDP — Khi nào dùng cái nào?

**Trả lời Basic**

| | TCP | UDP |
|---|---|---|
| Connection | 3-way handshake | Connectionless |
| Delivery | Đảm bảo (retransmit nếu mất) | Không đảm bảo |
| Order | Đảm bảo thứ tự | Không đảm bảo |
| Speed | Chậm hơn (overhead) | Nhanh hơn |
| Use case | HTTP, SSH, Database | DNS, Video stream, Gaming |

**Trả lời Nâng cao**

> **TCP 3-way handshake**: SYN → SYN-ACK → ACK. Đây là overhead mỗi khi tạo connection mới → lý do HTTP/1.1 dùng persistent connection, HTTP/2 multiplexing.
>
> **UDP** — dùng khi **tốc độ quan trọng hơn độ chính xác**:
> - Video call: mất 1 frame không sao, nhưng delay thì khó chịu
> - DNS: Query nhỏ, retry nhanh nếu mất
> - Gaming: Latency quan trọng hơn, app tự handle packet loss

**Câu hỏi Trick**

> HTTP/3 dùng TCP hay UDP?

*Trả lời*: **UDP** — qua QUIC protocol. QUIC implement lại reliability và ordering ở application layer nhưng giảm được latency so với TCP vì tránh được head-of-line blocking. Đây là bước tiến lớn: lấy reliability của TCP nhưng performance gần UDP.

---

## Q5: HTTP/1.1 vs HTTP/2 vs HTTP/3 — Khác nhau thế nào?

**Trả lời Basic**

| | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| Protocol | TCP | TCP | UDP (QUIC) |
| Multiplexing | Không (1 request/connection) | Có | Có |
| Header | Text, lặp lại | Binary, HPACK compression | Binary, QPACK |
| Server push | Không | Có | Có |
| TLS | Optional | Required (de facto) | Required |
| Head-of-line blocking | Có | TCP level | Không (per-stream) |

**Trả lời Nâng cao**

> **HTTP/1.1 bottleneck**: Browser mở 6 TCP connection song song để workaround. Mỗi request phải đợi response trước mới gửi request tiếp (trong cùng connection).
>
> **HTTP/2 multiplexing**: Nhiều request/response trên cùng 1 TCP connection song song. Nhưng vẫn bị **TCP head-of-line blocking** — nếu 1 packet bị mất, tất cả stream phải đợi.
>
> **HTTP/3/QUIC**: Mỗi stream độc lập — packet loss của stream A không ảnh hưởng stream B.

**Câu hỏi Trick**

> Tại sao HTTP/2 Server Push ít được dùng trong thực tế?

*Trả lời*: Server không biết client đã có resource trong cache hay chưa → có thể push resource đã được cache → lãng phí bandwidth. `103 Early Hints` và `<link rel="preload">` giải quyết tốt hơn mà không có side effect này.

---

## Q6: WebSocket — Real-time Communication

**Trả lời Basic**

> WebSocket cung cấp **full-duplex, persistent connection** giữa client và server — cả hai bên có thể gửi message bất kỳ lúc nào.

| | HTTP (Polling) | Long Polling | WebSocket |
|---|---|---|---|
| Kết nối | Mới mỗi request | Giữ đến khi có data | Persistent |
| Latency | Cao | Trung bình | Thấp |
| Overhead | Cao (header mỗi request) | Trung bình | Thấp (sau handshake) |
| Use case | Regular API | Notification | Chat, live data, game |

**Trả lời Nâng cao**

```java
// Spring WebSocket
@MessageMapping("/chat")
@SendTo("/topic/messages")
public ChatMessage handleMessage(ChatMessage message) {
    return message; // Broadcast đến tất cả subscriber
}
```

**Câu hỏi tình huống**

> App WebSocket scale lên nhiều server instance. User A connect server 1, gửi message cho User B connect server 2. Làm thế nào message đến được?

*Trả lời*: Dùng **message broker** (Redis Pub/Sub, RabbitMQ) làm trung gian. Server 1 publish message lên broker, Server 2 subscribe và push đến User B. Spring WebSocket hỗ trợ STOMP + Redis/RabbitMQ broker natively.

**Câu hỏi Trick**

> Load Balancer có xử lý WebSocket khác HTTP không?

*Trả lời*: Có — WebSocket cần **sticky session** hoặc **upgrade support**. ALB hỗ trợ WebSocket natively. Nginx cần cấu hình `proxy_http_version 1.1` và `Upgrade`/`Connection` headers. Nếu LB terminate connection sau timeout (mặc định 60s), WebSocket bị ngắt → cần tăng idle timeout hoặc implement client reconnect.

---

## Q7: CDN — Content Delivery Network

**Trả lời Basic**

> CDN caches content tại **edge nodes** gần user → giảm latency, giảm tải origin server.

| | Có CDN | Không CDN |
|---|---|---|
| Latency | Edge gần user (~10ms) | Origin server (~200ms) |
| Bandwidth | Edge serve cached content | Origin chịu toàn bộ |
| Availability | CDN cache vẫn serve khi origin down | Origin down = site down |
| DDoS protection | Absorb tại edge | Origin bị tấn công trực tiếp |

**Trả lời Nâng cao**

> **Cache strategy tại CDN**:
> - `Cache-Control: max-age=31536000, immutable` — static assets có hash (JS/CSS)
> - `Cache-Control: no-cache` — HTML page, cần validate với origin
> - `Cache-Control: s-maxage=300` — CDN cache 5 phút, browser không cache

**Câu hỏi tình huống**

> Deploy version mới của app, CSS file vẫn bị cache cũ tại CDN. Xử lý thế nào?

*Trả lời*: **Cache busting** — thêm content hash vào filename (`main.abc123.css`). CDN và browser coi đây là URL mới → không dùng cache cũ. Bundler (Webpack, Vite) tự động làm điều này. **Không** dùng `?v=123` query string — một số CDN không phân biệt query string.

**Câu hỏi Trick**

> CloudFront vs CloudFlare — khi nào dùng cái nào?

*Trả lời*: **CloudFront** tích hợp sâu với AWS ecosystem (S3, ALB, Lambda@Edge) — phù hợp khi đang trên AWS. **CloudFlare** có network lớn hơn, DDoS protection tốt hơn, thêm nhiều security feature (WAF, Bot protection), và free tier rộng rãi hơn — phù hợp khi cần CDN + security layer mạnh hoặc multi-cloud.

---

## Q8: CORS — Cross-Origin Resource Sharing

**Trả lời Basic**

> CORS là cơ chế browser bảo vệ user: chặn JavaScript tại `domain-a.com` gọi API tại `domain-b.com` trừ khi `domain-b.com` cho phép.

```
Browser          Frontend (app.com)         Backend (api.com)
   |                    |                         |
   |--- GET /data ----→ |                         |
   |                    |--- OPTIONS /data ------→|  (Preflight)
   |                    |←-- Access-Control-Allow-Origin: app.com
   |                    |--- GET /data ----------→|
   |                    |←-- 200 OK --------------|
```

**Trả lời Nâng cao**

```java
// Spring Boot — cấu hình CORS
@Configuration
public class CorsConfig {
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("https://app.example.com")); // Không dùng *
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setAllowCredentials(true); // Nếu dùng cookie

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
```

**Câu hỏi Trick**

> CORS là security feature của browser hay server? Backend có thể tắt CORS không?

*Trả lời*: CORS là **browser policy** — server chỉ gửi header, browser quyết định có cho JavaScript đọc response không. Backend không thể "tắt" CORS trên browser. Nhưng backend có thể allow `*` (mọi origin) hoặc không gửi CORS header (browser block mặc định). **CORS không bảo vệ API** — curl, Postman vẫn gọi được bình thường, chỉ browser bị chặn.
