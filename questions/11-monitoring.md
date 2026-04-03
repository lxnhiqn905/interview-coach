# Monitoring & Logging

---

## Q1: Metrics vs Logs vs Traces — 3 Pillars of Observability

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | Metrics | Logs | Traces |
|---|---|---|---|
| Dạng dữ liệu | Time-series numbers | Text events | Request journey (spans) |
| Tool phổ biến | Prometheus, Grafana | ELK, CloudWatch Logs | Jaeger, Zipkin, AWS X-Ray |
| Dùng cho | "Có vấn đề không?" | "Vấn đề là gì?" | "Xảy ra ở đâu?" |
| Retention | Lâu dài (aggregated) | Có thể lớn, tốn storage | Sampling thường dùng |
| Cost | Thấp | Trung bình | Cao nếu 100% sampling |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> *Ví dụ*: Xe hơi bị vấn đề.
> - **Metrics** — đồng hồ nhiệt độ báo đỏ ("có vấn đề")
> - **Logs** — hộp đen ghi lại mọi sự kiện ("vấn đề là quạt tắt lúc 10:32")
> - **Traces** — camera hành trình record toàn bộ hành trình ("vấn đề bắt đầu từ km 50, qua km 70 thì tệ hơn")

**Câu hỏi tình huống**

> Alert: API latency tăng từ 200ms lên 2s lúc 3AM. Bạn debug theo thứ tự nào?

*Trả lời*:
1. **Metrics** (Grafana): Latency tăng từ lúc nào? Service nào bị? CPU/Memory/DB connection pool có spike không?
2. **Logs** (ELK): Error logs trong timeframe đó? Có timeout, slow query, exception nào không?
3. **Traces** (Jaeger): Request chậm spend time ở đâu trong microservices chain? DB call? External API?

Thường tìm ra: DB query không có index chạy full scan do data grow đủ lớn qua đêm.

**Câu hỏi Trick**

**Trick 1**: Prometheus scrape metrics theo cơ chế nào? Push hay Pull?

*Trả lời*: **Pull** — Prometheus chủ động scrape endpoint `/metrics` của app theo interval. Khác với nhiều tool dùng Push (app gửi metric đến server). Pull có lợi thế: dễ detect service down (không có response từ target), không cần agent gửi data, centralized control. Nhược điểm: khó scrape service có firewall hoặc short-lived jobs → dùng **Pushgateway** cho trường hợp này.

---

**Trick 2**: Log level `ERROR` vs `WARN` vs `INFO` — nguyên tắc dùng thế nào?

*Trả lời*:
- **ERROR**: Lỗi cần con người xử lý ngay, ảnh hưởng user. Mỗi ERROR log nên có alert
- **WARN**: Bất thường nhưng app vẫn handle được. Cần review định kỳ
- **INFO**: Business events quan trọng (user login, order created). Đủ để reconstruct flow
- **DEBUG**: Chi tiết kỹ thuật, chỉ bật khi troubleshoot, không bật trên production thường xuyên

Anti-pattern thường gặp: log `ERROR` cho mọi exception kể cả expected (user not found → 404) → alert bão, mất signal thật.

---

## Q2: Alerting — Khi nào nên alert?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| Alert type | Dựa trên | Ví dụ |
|---|---|---|
| Threshold | Metric vượt ngưỡng | CPU > 80% trong 5 phút |
| Anomaly | Khác bình thường | Traffic giảm 50% so với cùng giờ hôm qua |
| SLO-based | Vi phạm SLO | Error rate > 1% (SLO = 99% success) |
| Dead man's switch | Không nhận tín hiệu | Không nhận heartbeat trong 5 phút |

**Câu hỏi tình huống**

> Team bị alert fatigue — quá nhiều alert, engineer bắt đầu ignore. Bạn cải thiện thế nào?

*Trả lời*:
1. **Alert phải actionable**: Mỗi alert phải có runbook — "khi alert này bắn thì làm gì"
2. **Giảm noise**: Tăng threshold, thêm duration (CPU > 80% trong 10 phút, không phải 1 phút)
3. **SLO-based alerting**: Alert khi sắp vi phạm SLO, không alert mọi spike nhỏ
4. **Route đúng**: P1 (production down) → PagerDuty + call. P3 (warning) → Slack channel
5. **Review định kỳ**: Alert nào không được act on trong 3 tháng → xóa hoặc hạ severity

**Câu hỏi Trick**

**Trick 1**: Sự khác nhau giữa SLA, SLO, SLI?

*Trả lời*:
- **SLI** (Indicator): Metric đo thực tế — "error rate hiện tại là 0.1%"
- **SLO** (Objective): Target nội bộ — "error rate phải < 1%"
- **SLA** (Agreement): Cam kết với khách hàng — "nếu error rate > 1% trong 1 tháng, khách hàng được refund"

SLO thường strict hơn SLA để có buffer trước khi vi phạm SLA.

---

**Trick 2**: Distributed tracing — Trace ID và Span ID là gì? Tại sao cần truyền qua các service?

*Trả lời*:
- **Trace ID**: ID duy nhất cho toàn bộ request journey (từ đầu đến cuối, qua nhiều service)
- **Span ID**: ID cho từng operation trong trace (mỗi service call, DB query là một span)

Phải truyền qua HTTP header (`X-Trace-ID`, `traceparent` theo W3C standard) để các service biết mình đang xử lý request nào. Không có Trace ID, các span rời rạc không ghép lại được thành timeline hoàn chỉnh.

---

## Q3: ELK Stack — Elasticsearch, Logstash, Kibana

**Trả lời Basic**

| Component | Vai trò |
|---|---|
| **Filebeat/Fluentd** | Ship log từ app/container đến Logstash/ES |
| **Logstash** | Parse, transform, enrich log |
| **Elasticsearch** | Index và lưu trữ log, full-text search |
| **Kibana** | Visualize, dashboard, query log |

**Trả lời Nâng cao**

```
App → Filebeat → (Kafka buffer) → Logstash → Elasticsearch → Kibana
```

> Kafka buffer quan trọng khi log volume lớn: nếu Logstash/ES chậm, Filebeat không bị block, log không bị mất.

**Grok pattern — parse unstructured log:**
```
# Log: "2024-01-15 10:30:45 ERROR UserService - DB connection failed"
%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{WORD:service} - %{GREEDYDATA:message}
```

**Câu hỏi Trick**

> Elasticsearch index càng ngày càng lớn → query chậm. Xử lý thế nào?

*Trả lời*: **ILM (Index Lifecycle Management)**:
- **Hot**: Index đang write (1-7 ngày)
- **Warm**: Index chỉ read (7-30 ngày), ít shard hơn
- **Cold**: Lâu dài, ít query
- **Delete**: Tự động xóa sau 90 ngày

---

## Q4: OpenTelemetry — Chuẩn hóa Observability

**Trả lời Basic**

> OpenTelemetry (OTel) là **vendor-neutral standard** để instrument, generate và collect traces, metrics, logs — không bị lock-in vào một vendor cụ thể.

| Trước OTel | Sau OTel |
|---|---|
| Datadog SDK, Jaeger SDK riêng | Một OTel SDK duy nhất |
| Đổi vendor = rewrite instrumentation | Chỉ đổi Exporter |
| Metrics/Traces/Logs tách biệt | Unified signal |

**Trả lời Nâng cao**

```java
// Spring Boot auto-instrumentation — không cần sửa code
// -javaagent:opentelemetry-javaagent.jar
// Tự động instrument: HTTP request, DB query, message queue

// Manual span khi cần
Tracer tracer = openTelemetry.getTracer("my-service");
Span span = tracer.spanBuilder("processOrder").startSpan();
try (Scope scope = span.makeCurrent()) {
    span.setAttribute("order.id", orderId);
    processOrder(orderId);
} catch (Exception e) {
    span.recordException(e);
    span.setStatus(StatusCode.ERROR);
} finally {
    span.end();
}
```

**Câu hỏi Trick**

> OTel Collector là gì? Có bắt buộc không?

*Trả lời*: OTel Collector là proxy nhận telemetry từ app, xử lý (filter, sample, enrich) rồi forward đến backend (Jaeger, Prometheus, Datadog). Không bắt buộc — app có thể export thẳng. Nhưng Collector cho phép **change backend mà không restart app**, centralized sampling, và giảm connection overhead.

---

## Q5: Grafana Dashboard — Xây dựng dashboard hiệu quả

**Trả lời Basic**

> Dashboard tốt = **trả lời ngay** "System đang healthy không?" trong 5 giây.

**4 Golden Signals (Google SRE):**

| Signal | Metric | Prometheus query |
|---|---|---|
| **Latency** | Request duration | `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))` |
| **Traffic** | Request rate | `rate(http_requests_total[5m])` |
| **Errors** | Error rate | `rate(http_requests_total{status=~"5.."}[5m])` |
| **Saturation** | CPU, Memory, Queue depth | `container_cpu_usage_seconds_total` |

**Câu hỏi tình huống**

> Grafana dashboard có 50 panels, mỗi lần load mất 30 giây. Optimize thế nào?

*Trả lời*:
1. **Recording rules**: Pre-compute query nặng thành metric mới trong Prometheus
2. **Giảm time range mặc định**: Từ 24h xuống 1h
3. **Tách dashboard**: Dashboard overview (summary) vs detail per service
4. **Caching**: Grafana cache query result, tăng cache duration cho metric ít thay đổi

**Câu hỏi Trick**

> `rate()` vs `irate()` trong PromQL — khác nhau thế nào?

*Trả lời*: `rate()` tính average rate trong window (ổn định, ít noise). `irate()` tính rate giữa 2 sample cuối (responsive hơn, nhưng spiky). Dùng `rate()` cho alerting (tránh false alert), `irate()` cho troubleshooting realtime.

---

## Q6: Incident Response — Quy trình xử lý sự cố

**Trả lời Basic**

```
Alert bắn
  → Acknowledge (nhận alert, ngăn escalate)
  → Triage (mức độ nghiêm trọng, ảnh hưởng gì?)
  → Mitigate (giảm impact ngay — rollback, scale up, disable feature)
  → Investigate (root cause)
  → Fix & Monitor
  → Postmortem
```

**Trả lời Nâng cao**

> **Postmortem không blame** (blameless postmortem):
> - Ghi lại timeline: "Lúc 3:15 alert bắn, 3:20 engineer nhận, 3:45 rollback..."
> - Root cause: thường là **5 Whys**
> - Action items với owner và deadline
> - Chia sẻ với team để học hỏi

**Câu hỏi tình huống**

> Production down 3:00 AM, bạn là on-call engineer. Bước đầu tiên là gì?

*Trả lời*:
1. **Acknowledge alert** trong 5 phút — ngăn escalate
2. **Assess impact**: Bao nhiêu user bị ảnh hưởng? Service nào?
3. **Communicate**: Post update vào incident channel ngay (dù chưa có root cause)
4. **Mitigate trước, investigate sau**: Rollback nếu deploy gần đây, scale up nếu resource issue
5. **Đừng panic fix ngẫu nhiên** — theo runbook

**Câu hỏi Trick**

> MTTR vs MTBF — khác nhau và optimize cái nào quan trọng hơn?

*Trả lời*:
- **MTBF** (Mean Time Between Failures): Thời gian trung bình giữa 2 incident → tăng bằng cách làm system ổn định hơn
- **MTTR** (Mean Time To Recovery): Thời gian trung bình để recover → giảm bằng alerting tốt, runbook rõ, easy rollback

Cả hai đều quan trọng, nhưng **MTTR thường có ROI cao hơn** — incident không thể tránh hoàn toàn, nhưng recover nhanh giảm total downtime đáng kể.

---

## Q7: Cost Monitoring — Kiểm soát chi phí Cloud

**Trả lời Basic**

| Tool | Cloud | Tính năng |
|---|---|---|
| AWS Cost Explorer | AWS | Phân tích chi phí theo service, tag |
| AWS Budgets | AWS | Alert khi vượt ngưỡng |
| Infracost | Multi-cloud | Cost estimate từ Terraform plan |
| Kubecost | Kubernetes | Chi phí per namespace/pod |

**Câu hỏi tình huống**

> AWS bill tháng này tăng 40% không rõ lý do. Debug thế nào?

*Trả lời*:
1. **Cost Explorer**: Filter theo service → tìm service tăng đột biến
2. **Filter theo tag**: Project/Environment tag để narrow down
3. **Check thường gặp**: EC2 instance chạy 24/7 không cần (dev env quên tắt), NAT Gateway data transfer, S3 request tăng đột biến, RDS snapshot quá nhiều

**Câu hỏi Trick**

> Làm thế nào ngăn dev environment tốn quá nhiều tiền ban đêm/weekend?

*Trả lời*: **Scheduled shutdown** — Lambda + EventBridge schedule tắt EC2/RDS dev sau 6PM, bật lại 8AM. Hoặc dùng **Instance Scheduler** (AWS solution). Tiết kiệm được ~60% chi phí dev environment.

---

## Q8: Health Check Patterns — Liveness vs Readiness vs Startup

**Trả lời Basic**

| Pattern | Câu hỏi trả lời | Fail action |
|---|---|---|
| **Liveness** | "App còn sống không?" | Restart container |
| **Readiness** | "App sẵn sàng nhận traffic chưa?" | Remove từ load balancer |
| **Startup** | "App đang khởi động?" | Bảo vệ liveness probe |
| **Deep health** | "App hoạt động đúng không?" | Alert (không restart) |

**Trả lời Nâng cao**

```java
// Spring Boot Actuator — health endpoint
@Component
public class DatabaseHealthIndicator implements HealthIndicator {
    @Override
    public Health health() {
        try {
            // Kiểm tra thật sự, không chỉ ping
            long count = userRepo.count();
            return Health.up()
                .withDetail("users", count)
                .build();
        } catch (Exception e) {
            return Health.down()
                .withException(e)
                .build();
        }
    }
}
```

**Câu hỏi Trick**

> Health endpoint nên check những gì? Có nên check external dependency không?

*Trả lời*: Phân biệt **liveness** và **readiness**:
- Liveness: chỉ check internal state (app có bị deadlock/OOM không) — **đừng check DB**, nếu DB chết thì restart app không giải quyết được gì
- Readiness: check dependencies cần thiết để serve request (DB connection, cache connection)
- External services: thường là "soft dependency" — nên return degraded thay vì down để tránh cascade failure

---

## Q9: Push vs Pull Monitoring — Prometheus vs StatsD vs CloudWatch Agent

**Trả lời Basic** *(So sánh quyết định)*

| | Pull (Prometheus) | Push (StatsD, CloudWatch Agent) |
|---|---|---|
| Cơ chế | Server scrape app định kỳ | App tự gửi metric đến server |
| Service discovery | Built-in (tự tìm target) | App phải biết địa chỉ server |
| Detect app down | Có (target unreachable) | Không (server chỉ nhận, không poll) |
| Firewall/NAT | App phải expose port | App chủ động gửi ra ngoài |
| Short-lived job | Khó (job xong trước khi scrape) | Tốt hơn (gửi ngay khi có) |
| Dùng khi | Long-running service, K8s | Batch job, lambda, không expose port |

**Trả lời Nâng cao**

> **Prometheus Pushgateway** — giải quyết short-lived job:
```
Batch job → push metric → Pushgateway (cache) → Prometheus scrape Pushgateway
```
Nhưng Pushgateway có vấn đề: metric bị stale sau khi job xong nhưng vẫn được scrape → cần tự cleanup. Dùng `push_time_seconds` để detect staleness.

> **CloudWatch Embedded Metric Format (EMF)**: Lambda ghi metric vào log theo format đặc biệt → CloudWatch Logs Agent parse → tạo metric tự động. Không cần Pushgateway, không cần SDK call.

**Câu hỏi Trick**

> Prometheus scrape interval là 15s. App crash lúc 10s sau lần scrape cuối. Alert sẽ fire sau bao lâu?

*Trả lời*: **Tối thiểu 15s + alerting evaluation interval** (thường 1 phút). Nếu `for: 5m` trong alerting rule → alert fire sau 5 phút. Tổng: có thể mất **5-6 phút** để alert. Với hệ thống mission-critical, cần giảm scrape interval hoặc dùng blackbox exporter với synthetic monitoring để detect down nhanh hơn.

---

## Q10: Log Aggregation — Centralized Logging Architecture

**Trả lời Basic** *(So sánh agent)*

| | Filebeat | Fluentd/Fluent Bit | CloudWatch Agent | Vector |
|---|---|---|---|---|
| Footprint | Nhẹ (Go) | Trung bình (Ruby/C) | Trung bình | Rất nhẹ (Rust) |
| Transformation | Ít | Nhiều plugin | Cơ bản | Mạnh |
| Output | Elasticsearch, Logstash | 40+ output | CloudWatch only | Nhiều |
| K8s integration | Tốt | Tốt nhất | Tốt (AWS) | Tốt |
| Dùng khi | ELK stack | Flexible pipeline | AWS ecosystem | High-performance |

**Centralized logging architecture:**

```
Pods/Containers
      ↓ (stdout/stderr)
  Fluent Bit DaemonSet (1 per node, nhẹ)
      ↓ (forward)
  Fluentd Aggregator (transform, buffer, route)
      ↓
  ┌──────────────────────┐
  │ Elasticsearch (search)│
  │ S3 (long-term archive)│
  │ Kafka (stream)        │
  └──────────────────────┘
      ↓
  Kibana/Grafana (visualize)
```

**Câu hỏi tình huống**

> Log volume tăng 10x sau khi thêm DEBUG logging. Elasticsearch bị chậm. Xử lý thế nào mà không mất log quan trọng?

*Trả lời*:
1. **Sampling**: DEBUG log chỉ gửi 10% vào ES, 100% vào S3 (cold storage). ERROR/WARN vẫn 100%
2. **Log level routing**: Fluentd route ERROR → ES (realtime search), DEBUG → S3 (batch query nếu cần)
3. **ES ILM**: Hot → Warm → Cold → Delete theo thời gian. DEBUG delete sau 3 ngày, ERROR giữ 90 ngày
4. **Structured logging**: Giảm log không cần thiết thay vì giảm log level — chỉ log những gì có giá trị

**Câu hỏi Trick**

> App log `user_id=123 action=login ip=1.2.3.4` — đây là structured log hay unstructured?

*Trả lời*: **Unstructured** (dạng key=value trong plain text). **Structured log** thật sự là JSON: `{"user_id": 123, "action": "login", "ip": "1.2.3.4"}`. Khác biệt: Elasticsearch index JSON trực tiếp theo field → query `user_id:123` nhanh. Plain text phải parse bằng Grok pattern → chậm hơn, dễ break khi format thay đổi. Dùng **Logback + logstash-logback-encoder** (Java) hoặc **pino** (Node.js) để tự động output JSON.
