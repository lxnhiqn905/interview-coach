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

---

## Q4: Ingress là gì? Ingress vs Service NodePort/LoadBalancer

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | NodePort | LoadBalancer | Ingress |
|---|---|---|---|
| Layer | L4 (TCP) | L4 (TCP) | L7 (HTTP/HTTPS) |
| Routing | Port-based | IP-based | Host/Path-based |
| Cloud cost | Không cần LB | 1 LB per Service | 1 LB cho nhiều Service |
| TLS termination | Không | Có thể | Có (tại Ingress) |
| Use case | Dev/testing | Single service expose | Multi-service, routing rules |

**Trả lời Nâng cao**

> Ingress là **L7 reverse proxy** chạy trong cluster. Nó nhận traffic từ 1 LoadBalancer duy nhất rồi route vào đúng Service dựa trên **host** hoặc **path**.
>
> Không có Ingress → 10 service cần 10 LoadBalancer → chi phí cao. Với Ingress → 1 LoadBalancer duy nhất, route theo rule.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /users
        pathType: Prefix
        backend:
          service:
            name: user-service
            port:
              number: 80
      - path: /orders
        pathType: Prefix
        backend:
          service:
            name: order-service
            port:
              number: 80
```

**Câu hỏi tình huống**

> Bạn có 5 microservices, mỗi cái expose HTTP. Khách hàng truy cập qua domain `api.example.com`. Làm thế nào thiết kế traffic routing?

*Trả lời*: Dùng **1 Ingress** với path-based routing (`/users` → user-service, `/orders` → order-service...) hoặc host-based routing nếu mỗi service có subdomain riêng. Deploy **nginx-ingress-controller** hoặc **traefik**, chỉ cần 1 cloud LoadBalancer trỏ vào Ingress.

**Câu hỏi Trick**

> Ingress resource tạo xong nhưng không hoạt động. Kiểm tra gì đầu tiên?

*Trả lời*: Kiểm tra **Ingress Controller đã được deploy chưa** — Ingress resource chỉ là config, phải có controller (nginx, traefik, HAProxy...) để xử lý. Tiếp theo check `kubectl describe ingress` để xem events, và kiểm tra annotation đúng với controller đang dùng.

---

## Q5: Ingress TLS — Cấu hình HTTPS như thế nào?

**Trả lời Basic**

TLS termination tại Ingress: client kết nối HTTPS đến Ingress, Ingress decrypt rồi forward HTTP vào các Service bên trong.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.example.com
    secretName: api-tls-secret   # Secret chứa cert + private key
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 80
```

**Trả lời Nâng cao**

> Trong production dùng **cert-manager** để tự động cấp và renew certificate từ Let's Encrypt:

```yaml
# ClusterIssuer
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

> cert-manager tự động tạo Secret `api-tls-secret` chứa certificate, renew trước khi hết hạn 30 ngày.

**Câu hỏi Trick**

> TLS termination tại Ingress — traffic từ Ingress đến Service có được mã hóa không?

*Trả lời*: **Không** — đây là **TLS termination**, Ingress decrypt rồi gửi HTTP plaintext vào cluster. Trong môi trường zero-trust hoặc compliance requirements, cần **TLS passthrough** (Ingress không decrypt, forward thẳng TCP đến service) hoặc **mTLS** (mutual TLS) giữa các service thông qua service mesh như Istio.

---

## Q6: Kubernetes Gateway API — Ingress có gì chưa đủ?

**Trả lời Basic**

| | Ingress | Gateway API |
|---|---|---|
| API maturity | Stable (nhưng limited) | GA từ K8s 1.28 |
| Tách biệt role | Không — dev và infra dùng chung | Có — `GatewayClass` (infra), `Gateway` (ops), `HTTPRoute` (dev) |
| Traffic splitting | Không native | Có (canary, A/B testing) |
| Header matching | Qua annotation (controller-specific) | Native trong spec |
| TCP/UDP routing | Không | Có (`TCPRoute`, `UDPRoute`) |

**Trả lời Nâng cao**

> Gateway API giải quyết 3 vấn đề lớn của Ingress:
>
> 1. **Annotation hell** — mỗi Ingress controller dùng annotation khác nhau, không portable
> 2. **Không tách role** — dev và cluster admin phải sửa cùng resource
> 3. **Chỉ support HTTP** — không có cách chuẩn cho TCP, gRPC, WebSocket

```yaml
# GatewayClass — do cluster admin quản lý
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: nginx
spec:
  controllerName: k8s.nginx.org/nginx-gateway-controller

---
# Gateway — do platform team quản lý
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: prod-gateway
  namespace: infra
spec:
  gatewayClassName: nginx
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - name: prod-tls-secret

---
# HTTPRoute — do dev team quản lý, namespace riêng
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: user-route
  namespace: app
spec:
  parentRefs:
  - name: prod-gateway
    namespace: infra
  hostnames:
  - "api.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /users
    backendRefs:
    - name: user-service
      port: 80
```

**Câu hỏi Trick**

> Dự án đang dùng nginx Ingress, có nên migrate sang Gateway API không?

*Trả lời*: **Nên lên kế hoạch migrate** nếu cần traffic splitting, header-based routing, hoặc tách role rõ ràng. Gateway API đã GA và các controller lớn (nginx, Istio, Traefik) đã support. Tuy nhiên không cần migrate gấp nếu Ingress đang hoạt động tốt — Ingress sẽ không bị remove trong tương lai gần.

---

## Q7: Gateway với service yêu cầu SSL — Xử lý thế nào?

**Trả lời Basic**

Có 3 mode TLS trong Gateway API:

| Mode | Mô tả | Dùng khi |
|---|---|---|
| `Terminate` | Gateway decrypt TLS, forward HTTP vào service | Service không support TLS, muốn tập trung quản lý cert |
| `Passthrough` | Gateway forward thẳng TLS đến service, không decrypt | Service tự quản lý cert (mTLS, internal PKI) |
| `mTLS` (qua service mesh) | Client và server đều xác thực nhau | Zero-trust, compliance |

**Trả lời Nâng cao**

> **Tình huống: Service yêu cầu client phải kết nối bằng SSL** (ví dụ database, legacy internal service, hoặc compliance requirement)

**Option 1 — TLS Passthrough** (service tự terminate):

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: prod-gateway
spec:
  gatewayClassName: nginx
  listeners:
  - name: tls-passthrough
    protocol: TLS
    port: 443
    tls:
      mode: Passthrough   # Gateway không decrypt
---
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: db-route
spec:
  parentRefs:
  - name: prod-gateway
  rules:
  - backendRefs:
    - name: postgres-service
      port: 5432   # Service tự handle TLS
```

**Option 2 — TLS Terminate tại Gateway + TLS lại đến service (Re-encrypt)**:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
spec:
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - name: external-tls-cert   # cert cho client bên ngoài

---
# Backend service cũng expose HTTPS
# HTTPRoute trỏ đến port 8443 của service
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
spec:
  rules:
  - backendRefs:
    - name: secure-service
      port: 8443   # service tự có internal TLS cert
```

**Option 3 — mTLS qua Istio** (enterprise grade):

```yaml
# PeerAuthentication — bắt buộc mTLS giữa các service
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT   # Từ chối non-mTLS traffic hoàn toàn
```

> Với Istio, mỗi pod có **sidecar proxy (Envoy)** tự động handle mTLS — service không cần thay đổi code, cert được quản lý và rotate tự động bởi Istio CA.

**Câu hỏi tình huống**

> Bạn có một legacy internal service bắt buộc phải nhận HTTPS, không thể sửa code. Gateway đang dùng TLS Terminate. Làm thế nào vừa expose HTTPS ra ngoài vừa đảm bảo traffic đến service cũng được mã hóa?

*Trả lời*: Dùng **Re-encrypt** pattern:
1. Gateway nhận HTTPS từ client → terminate cert ngoài
2. Gateway forward HTTPS đến service với cert nội bộ (internal CA)
3. Deploy **cert-manager** để cấp internal cert cho service, mount vào pod
4. HTTPRoute trỏ `backendRefs` vào port HTTPS của service

Nếu cần automation hoàn toàn và scale lớn → migrate sang **Istio mTLS STRICT** mode thay vì manage cert thủ công.

**Câu hỏi Trick**

> TLS Passthrough và TLS Terminate — cái nào cho phép Gateway inspect HTTP headers?

*Trả lời*: **Chỉ Terminate** — vì Gateway decrypt được payload. Passthrough forward encrypted bytes thẳng đến service, Gateway không nhìn thấy nội dung → không thể route theo header, path, hay làm rate limiting ở L7. Đây là trade-off giữa security (passthrough) và observability/routing power (terminate).

---

## Q8: Master Node die thì Cluster như thế nào? Nên cài bao nhiêu Master Node?

**Trả lời Basic**

Master Node (Control Plane) gồm 4 thành phần chính:

| Component | Vai trò | Khi die |
|---|---|---|
| `kube-apiserver` | Cửa ngõ duy nhất của cluster | Không `kubectl` được, không deploy/scale được |
| `etcd` | Database lưu toàn bộ state cluster | Mất etcd = mất toàn bộ state |
| `kube-scheduler` | Giao Pod cho Worker Node | Pod mới không được schedule |
| `kube-controller-manager` | Reconcile loop (ReplicaSet, Node...) | Pod chết không được tự heal |

> **Workload đang chạy vẫn tiếp tục chạy bình thường** — Worker Nodes độc lập, không phụ thuộc Control Plane để serve traffic. Nhưng cluster "mù" hoàn toàn: không thể can thiệp, không tự heal, không deploy mới.

**Trả lời Nâng cao** *(Nên cài bao nhiêu Master Node?)*

> Câu trả lời là **số lẻ: 3 hoặc 5** — do cơ chế **Raft consensus** của etcd.

etcd yêu cầu **quorum** (đa số) để đồng ý một write operation:

| Số Master | Quorum cần | Chịu được mất tối đa |
|---|---|---|
| 1 | 1 | 0 (SPOF) |
| 2 | 2 | 0 (không an toàn hơn 1) |
| **3** | **2** | **1 node** |
| 4 | 3 | 1 node (không tốt hơn 3) |
| **5** | **3** | **2 node** |

> **Tại sao số lẻ?** — Số chẵn không tăng fault tolerance nhưng tăng chi phí. 4 node chịu được mất 1 (quorum = 3), giống hệt 3 node. Dùng 4 node chỉ tốn thêm tiền, không thêm giá trị.

**Khuyến nghị thực tế:**
- **Dev / staging**: 1 Master — chấp nhận downtime, tiết kiệm chi phí
- **Production nhỏ/vừa**: **3 Masters** — đủ HA, chịu mất 1 node
- **Production lớn / mission-critical**: **5 Masters** — chịu mất 2 node đồng thời, dùng khi cluster rất lớn hoặc yêu cầu SLA cao

**Câu hỏi tình huống**

> Cluster đang có 3 Master Nodes. Đột ngột 2 node cùng die (network partition, hardware failure). Điều gì xảy ra?

*Trả lời*: etcd mất quorum (cần 2, chỉ còn 1) → **etcd từ chối mọi write** → `kube-apiserver` không thể commit state mới → cluster bị **read-only**. Workload đang chạy vẫn sống, nhưng không thể deploy, scale, hay tự heal. Recovery cần restore etcd từ snapshot hoặc bring back ít nhất 1 node trong 2 node đã die.

> Đây là lý do production quan trọng nên dùng **5 Masters** — chịu được mất 2 node đồng thời mà cluster vẫn hoạt động bình thường.

**Câu hỏi Trick**

> etcd nên đặt trên Master Node hay máy riêng?

*Trả lời*: Có 2 topology:
- **Stacked etcd** (etcd trên cùng Master Node) — đơn giản, tiết kiệm máy, nhưng nếu Master Node die thì mất cả etcd node
- **External etcd** (etcd cluster riêng biệt) — phức tạp hơn, tốn máy hơn, nhưng Control Plane và etcd scale độc lập, fault domain tách biệt

Production với SLA cao → **External etcd**. Hầu hết production bình thường → **Stacked etcd với 3 Masters** là đủ.

---

## Q9: Service Types — ClusterIP vs NodePort vs LoadBalancer vs Headless

**Trả lời Basic** *(So sánh quyết định)*

| Type | Accessible từ | Dùng khi |
|---|---|---|
| `ClusterIP` (default) | Chỉ trong cluster | Service nội bộ, không expose ra ngoài |
| `NodePort` | Ngoài cluster qua `NodeIP:Port` | Dev/test, không có cloud LB |
| `LoadBalancer` | Internet qua cloud LB | Production, expose ra ngoài |
| `ExternalName` | Alias cho DNS bên ngoài | Trỏ đến external service bằng DNS |
| `Headless` (ClusterIP: None) | Pod IP trực tiếp | StatefulSet, custom discovery |

**Trả lời Nâng cao**

```yaml
# ClusterIP — default, chỉ internal
apiVersion: v1
kind: Service
spec:
  type: ClusterIP          # Chỉ accessible trong cluster
  selector:
    app: backend
  ports:
    - port: 80             # Port của service
      targetPort: 8080     # Port của pod

# Headless — không có ClusterIP, DNS trả về pod IPs trực tiếp
spec:
  clusterIP: None          # Headless
  # → DNS query "my-service" trả về list IP của tất cả pods
  # → Kafka, Cassandra, Elasticsearch dùng cái này để peer discovery
```

**Khi nào dùng cái nào:**
```
Internal API (UserService gọi PaymentService)     → ClusterIP
Dev testing (expose tạm)                          → NodePort
Production public API                             → LoadBalancer (hoặc Ingress + ClusterIP)
Kafka broker, Cassandra node discovery             → Headless
Trỏ đến external DB với DNS name                  → ExternalName
```

**Câu hỏi Trick**

> `LoadBalancer` service tạo ra gì trong AWS?

*Trả lời*: Tạo một **AWS Classic/NLB Load Balancer** tự động — mỗi `LoadBalancer` service = 1 cloud LB riêng = chi phí riêng. 10 service `LoadBalancer` = 10 cloud LB. Đây là lý do dùng **Ingress** (1 LB duy nhất) thay vì nhiều `LoadBalancer` service trong production.

---

## Q10: Resource Requests vs Limits — Tại sao quan trọng và các bẫy ẩn

**Trả lời Basic** *(So sánh)*

| | `requests` | `limits` |
|---|---|---|
| Ý nghĩa | Tài nguyên **đảm bảo** cho pod | Tài nguyên **tối đa** pod được dùng |
| Dùng để | Scheduler quyết định đặt pod vào node nào | Prevent runaway pod |
| Khi vượt CPU limit | CPU bị throttle (chậm) | Không OOM Kill |
| Khi vượt Memory limit | Không áp dụng | Pod bị **OOM Kill** và restart |

**Trả lời Nâng cao**

```yaml
resources:
  requests:
    memory: "256Mi"   # Scheduler chỉ đặt pod vào node có ≥256Mi available
    cpu: "250m"       # 250 millicores = 0.25 CPU core
  limits:
    memory: "512Mi"   # Pod bị kill nếu dùng > 512Mi
    cpu: "500m"       # CPU bị throttle nếu dùng > 500m (KHÔNG bị kill)
```

**Hidden problems:**

**Bẫy 1 — Không set requests:** Scheduler không biết pod cần bao nhiêu → đặt vào node đã đầy → pod bị evict hoặc node OOM.

**Bẫy 2 — CPU limit quá thấp:** App bị CPU throttle → latency tăng bất thường → team nghĩ app bị bug, thực ra là bị throttle. Kiểm tra: `kubectl top pod` + Prometheus `container_cpu_cfs_throttled_seconds_total`.

**Bẫy 3 — requests = limits (Guaranteed QoS):** Pod không bao giờ bị evict khi node pressure, nhưng lãng phí tài nguyên khi pod đang idle. **Burstable QoS** (requests < limits) linh hoạt hơn.

**Câu hỏi tình huống**

> Node memory đầy, K8s cần evict pod. Nó chọn pod nào?

*Trả lời*: Theo **QoS class** từ thấp đến cao:
1. **BestEffort** (không có requests/limits) — bị evict đầu tiên
2. **Burstable** (requests < limits, hoặc chỉ có 1 trong 2) — bị evict nếu dùng vượt requests
3. **Guaranteed** (requests = limits) — bị evict cuối cùng

→ Production pod quan trọng nên set `requests = limits` (Guaranteed) để không bị evict bất ngờ.
