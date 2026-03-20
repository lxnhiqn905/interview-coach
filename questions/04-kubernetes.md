# Kubernetes

---

## Q1: `Deployment` vs `StatefulSet` — Khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | Deployment | StatefulSet |
|---|---|---|
| Pod identity | Random (`pod-xxxxx`) | Cố định (`pod-0`, `pod-1`) |
| Storage | Shared hoặc ephemeral | Persistent, mỗi pod riêng |
| Scaling order | Bất kỳ thứ tự | Ordered (`0→1→2`) |
| DNS | Không ổn định | Stable DNS per pod |
| Use case | Stateless app | Stateful app |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **Deployment** — như thuê nhân viên thời vụ. Ai cũng làm được, thay thế thoải mái, không cần nhớ người cũ là ai.
>
> **StatefulSet** — như team bác sĩ chuyên khoa. Dr.0 là tim mạch, Dr.1 là thần kinh. Bệnh nhân cần đúng bác sĩ, không thể hoán đổi ngẫu nhiên.

**Keyword để nhớ**: Deployment = **stateless, ai cũng như ai**, StatefulSet = **có danh tính, có dữ liệu riêng**.

**Câu hỏi tình huống**

> Bạn deploy PostgreSQL trên Kubernetes. Dùng `Deployment` hay `StatefulSet`? Nếu dùng `Deployment`, vấn đề gì xảy ra khi pod restart?

*Trả lời*: Dùng **StatefulSet**. Với Deployment, khi pod restart hostname thay đổi làm replica configuration broken, PVC có thể mount nhầm hoặc mất data. StatefulSet đảm bảo `postgres-0` luôn bind đúng PVC và có DNS ổn định cho các replica kết nối đúng primary.

**Câu hỏi Trick**

**Trick 1**: Xóa một pod trong `StatefulSet` thì pod mới có giữ lại data không?

*Trả lời*: Có — vì StatefulSet bind pod với PVC theo tên cố định. Pod `mysql-0` bị xóa, khi tạo lại vẫn là `mysql-0` và mount lại đúng PVC cũ. Data không mất.

**Bẫy tiếp**: Xóa cả `StatefulSet` thì PVC có bị xóa theo không?

*Trả lời*: Không — PVC tồn tại độc lập. Đây là cơ chế bảo vệ để tránh mất data ngoài ý muốn. Phải xóa PVC thủ công.

---

**Trick 2**: `StatefulSet` scale down từ 3 xuống 1 replica, pod nào bị xóa trước?

*Trả lời*: Pod có index **cao nhất trước** — `pod-2` trước, rồi `pod-1`, cuối cùng giữ lại `pod-0`. Đây là ordered termination để đảm bảo pod có index thấp (thường là primary/leader) tồn tại lâu nhất.

---

## Q2: `Liveness Probe` vs `Readiness Probe` — Khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | Liveness Probe | Readiness Probe | Startup Probe |
|---|---|---|---|
| Fail action | Restart container | Remove khỏi Service endpoints | Disable liveness/readiness cho đến khi pass |
| Mục đích | App còn sống không? | App sẵn sàng nhận traffic chưa? | App đang khởi động? |
| Dùng khi | App bị deadlock/hung | App đang warm-up, load config | App khởi động chậm |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **Liveness** — như bác sĩ kiểm tra tim đập. Không đập → phải "khởi động lại" (restart).
>
> **Readiness** — như cửa hàng bật đèn OPEN. Tim vẫn đập nhưng chưa mở cửa được (đang load data, warming cache) → không nhận khách (traffic).
>
> **Startup** — như nhân viên mới đang training. Trong thời gian training không để khách vào, cũng không đánh giá hiệu suất.

**Câu hỏi tình huống**

> Spring Boot app mất 60s để chạy Liquibase migration khi start. Nếu chỉ cấu hình Liveness probe với `initialDelaySeconds: 10`, điều gì xảy ra?

*Trả lời*: Kubernetes kill và restart container liên tục vì probe fail trong 60s đầu → **CrashLoopBackOff**. Fix đúng: dùng **Startup Probe** với `failureThreshold` đủ lớn để bảo vệ liveness probe khi app đang init.

```yaml
startupProbe:
  httpGet:
    path: /actuator/health
    port: 8080
  failureThreshold: 30    # 30 * 10s = 300s để khởi động
  periodSeconds: 10
```

**Câu hỏi Trick**

**Trick 1**: App bị deadlock — tất cả thread bị block nhưng process vẫn chạy. Probe nào phát hiện được?

*Trả lời*: **Liveness probe** — nhưng chỉ nếu endpoint `/health` cũng bị block do deadlock. Nếu health endpoint dùng thread riêng, probe vẫn pass dù app thực sự bị deadlock. Cần implement health check thực sự kiểm tra trạng thái bên trong (thread pool, connection pool).

---

**Trick 2**: Readiness probe fail thì pod có bị restart không?

*Trả lời*: Không — chỉ bị **remove khỏi Service endpoints**, không nhận traffic mới. Pod vẫn chạy, container không restart. Khi readiness probe pass lại, pod tự động được thêm vào endpoints và nhận traffic trở lại.

---

## Q3: `ConfigMap` vs `Secret` — Phân biệt và best practices

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | ConfigMap | Secret |
|---|---|---|
| Dữ liệu | Plaintext | Base64 encoded |
| Mục đích | Config thông thường | Sensitive data |
| Encryption at rest | Không (mặc định) | Có thể bật |
| RBAC | Chung với namespace | Có thể tách riêng |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **ConfigMap** — như bảng thông báo công khai trong văn phòng. Ai cũng đọc được.
>
> **Secret** — như két sắt trong phòng giám đốc. Chỉ người có chìa khóa mới mở được.
>
> **Lưu ý**: Base64 không phải encryption — decode trong 1 giây. Secret an toàn hơn ConfigMap nhờ **RBAC và encryption at rest**, không phải nhờ base64.

**Câu hỏi tình huống**

> Junior dev lưu database password vào ConfigMap vì "nó cũng chỉ là config". Bạn giải thích vấn đề và đề xuất giải pháp tốt hơn không?

*Trả lời*:
- ConfigMap plaintext, ai có `kubectl get configmap` đều đọc được → không dùng cho sensitive data
- Secret tốt hơn nhưng vẫn chưa đủ nếu không encrypt etcd

Best practices thực tế:
1. **AWS Secrets Manager / HashiCorp Vault** + External Secrets Operator
2. Enable **Encryption at Rest** cho etcd
3. **Least privilege RBAC** — app chỉ đọc được Secret của namespace mình

**Câu hỏi Trick**

**Trick 1**: Mount Secret vào pod bằng cách nào? Volume hay env var — cách nào an toàn hơn?

*Trả lời*: **Volume** an toàn hơn — Secret được mount dưới dạng file, có thể update dynamically mà không cần restart pod. Env var bị expose qua `/proc/PID/environ`, có thể bị leak qua crash dump hoặc log.

---

**Trick 2**: Secret có bị log ra không nếu app bị crash?

*Trả lời*: Có thể — nếu app đọc Secret vào biến và log biến đó ra (vô tình hoặc cố ý). Cần dùng framework hỗ trợ masking sensitive values trong log (Spring Boot Actuator, Log4j pattern), và code review để tránh log credential.
