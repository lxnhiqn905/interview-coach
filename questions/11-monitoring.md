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
