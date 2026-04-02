# CI/CD

---

## Q1: `Blue-Green` vs `Canary Deployment` — Khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | Blue-Green | Canary |
|---|---|---|
| Traffic switch | 100% ngay lập tức | Dần dần (5% → 50% → 100%) |
| Rollback | Instant (switch back) | Instant (route 0% về canary) |
| Infrastructure | 2x cost | Nhỏ hơn |
| Risk | Cao hơn (all-or-nothing) | Thấp hơn |
| Test production | Không | Có (subset real users) |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **Blue-Green** — như chuyển nhà. Chuẩn bị nhà mới đầy đủ, rồi chuyển toàn bộ đồ đạc trong một ngày. Nếu nhà mới có vấn đề thì chuyển lại nhà cũ ngay.
>
> **Canary** — như thử menu mới ở nhà hàng. Cho 10% khách order thử trước. Feedback tốt thì mở rộng, không tốt thì rút lại, 90% khách không bị ảnh hưởng.

**Keyword để nhớ**: Blue-Green = **an toàn, rollback nhanh**, Canary = **test trên production thật với ít user**.

**Câu hỏi tình huống**

> Bạn release tính năng thanh toán mới kèm database schema migration (thêm column). Dùng Blue-Green hay Canary? DB migration xử lý thế nào?

*Trả lời*: DB migration cần **expand/contract pattern** cho cả hai strategy:
1. Deploy migration **backward-compatible** (add nullable column) — old và new code đều chạy được
2. Deploy new code (Blue-Green hoặc Canary)
3. Sau khi 100% traffic về new → cleanup backward-compat code

Nếu migration là **breaking change** (rename/drop column) mà dùng Canary — 2 version code chạy song song cùng lúc → app cũ bị lỗi ngay.

**Câu hỏi Trick**

**Trick 1**: Blue-Green deployment xong, phát hiện bug ở version mới. Rollback bằng cách nào?

*Trả lời*: Chuyển load balancer route 100% traffic về **Blue** (version cũ) — thường chỉ mất vài giây. Đây là ưu điểm lớn nhất của Blue-Green. Nhưng nếu đã có **database migration** thì rollback phức tạp hơn — phải đảm bảo version cũ vẫn tương thích với schema mới.

---

**Trick 2**: Canary deployment — làm sao đảm bảo **cùng một user** luôn vào đúng một version, không bị chuyển qua lại?

*Trả lời*: Dùng **sticky session** hoặc route dựa trên **user ID/cookie** thay vì random. Nếu user bị chuyển qua lại giữa 2 version, trải nghiệm không nhất quán — đặc biệt nguy hiểm nếu 2 version có data format khác nhau.

---

## Q2: CI vs CD — Phân biệt và pipeline tốt trông như thế nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | CI (Continuous Integration) | CD (Continuous Delivery/Deployment) |
|---|---|---|
| Mục tiêu | Merge code thường xuyên, phát hiện lỗi sớm | Deploy lên môi trường tự động |
| Trigger | Mỗi push/PR | Sau CI pass |
| Output | Build artifact, test results | Deployed application |
| Delivery vs Deployment | — | Delivery: manual approve; Deployment: fully auto |

**Câu hỏi tình huống**

> Pipeline của bạn mất 45 phút mỗi lần chạy. Developer không muốn chờ. Bạn optimize thế nào?

*Trả lời*:
1. **Parallel jobs** — unit test, integration test, security scan chạy song song
2. **Cache dependencies** — Maven/Gradle cache, Docker layer cache
3. **Fail fast** — unit test trước, integration test sau (unit test nhanh hơn nhiều)
4. **Test splitting** — chia test suite chạy song song trên nhiều runner
5. **Incremental build** — chỉ build/test module bị thay đổi (monorepo)

**Câu hỏi Trick**

**Trick 1**: Secrets trong CI/CD pipeline quản lý thế nào? Không nên làm gì?

*Trả lời*:
- **Không** hardcode secret trong Jenkinsfile/yaml
- **Không** echo secret ra log (dù một phần)
- **Dùng**: GitHub Actions Secrets, Jenkins Credentials, Vault integration
- **Best practice**: Short-lived credentials, rotate regularly, least privilege

---

**Trick 2**: Làm thế nào để rollback nhanh khi deployment bị lỗi trên production?

*Trả lời*: Có nhiều cách tùy strategy:
- **Feature flag**: Tắt feature mà không cần redeploy
- **Blue-Green**: Switch traffic về version cũ ngay lập tức
- **Helm rollback**: `helm rollback <release> <revision>` — rollback về revision trước
- **GitOps (ArgoCD)**: Revert git commit → ArgoCD tự động sync lại state cũ

---

## Q3: GitHub Actions vs Jenkins — Khi nào dùng cái nào?

**Trả lời Basic**

| | GitHub Actions | Jenkins |
|---|---|---|
| Setup | Zero setup, built-in GitHub | Tự cài và maintain server |
| Cost | Free (public repo), giới hạn phút (private) | Self-hosted, tốn infra |
| Ecosystem | GitHub Marketplace (5000+ actions) | Plugin ecosystem lớn |
| Flexibility | Giới hạn runner types | Full control, custom env |
| Secret management | GitHub Secrets | Credentials Store |
| On-premise | Không (trừ self-hosted runner) | Có |

**Trả lời Nâng cao**

> **Chọn GitHub Actions khi**: Repo trên GitHub, team nhỏ-vừa, không cần on-premise, muốn zero-ops.
>
> **Chọn Jenkins khi**: Cần chạy trong private network (compliance, air-gapped), cần custom build environment, đang có Jenkins ecosystem sẵn.

**Câu hỏi Trick**

> GitHub Actions self-hosted runner khác gì GitHub-hosted runner?

*Trả lời*: Self-hosted runner chạy trên máy của bạn — có thể access private network, custom tools pre-installed, không tính phút. GitHub-hosted runner là VM tạm do GitHub quản lý, sạch mỗi job, nhưng tính vào quota phút.

---

## Q4: GitOps và ArgoCD — Nguyên lý hoạt động

**Trả lời Basic**

> **GitOps**: Git là **source of truth** cho infrastructure và app config. Mọi thay đổi phải qua Git (PR, review, audit trail).

| | Push-based (truyền thống) | Pull-based (GitOps) |
|---|---|---|
| Ai apply | CI/CD pipeline push vào cluster | Agent trong cluster pull từ Git |
| Credentials | CI/CD cần cluster credentials | Cluster không expose ra ngoài |
| Drift detection | Không tự detect | Agent liên tục reconcile |
| Rollback | Chạy lại pipeline | `git revert` → auto sync |

**Trả lời Nâng cao**

```yaml
# ArgoCD Application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  source:
    repoURL: https://github.com/org/k8s-manifests
    targetRevision: main
    path: apps/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true      # Xóa resource không còn trong Git
      selfHeal: true   # Auto fix nếu ai sửa trực tiếp trên cluster
```

**Câu hỏi Trick**

> Ai đó `kubectl apply` trực tiếp lên cluster (bypass Git). ArgoCD xử lý thế nào?

*Trả lời*: Với `selfHeal: true`, ArgoCD phát hiện **drift** và rollback về state trong Git trong vòng vài phút. Đây là một trong những lợi ích lớn nhất của GitOps — cluster luôn khớp với Git.

---

## Q5: Feature Flag — Ship code mà không release feature

**Trả lời Basic**

Feature flag cho phép deploy code lên production nhưng **tắt feature** với người dùng thật — bật/tắt mà không cần redeploy.

```java
// Kiểm tra flag runtime
if (featureFlags.isEnabled("new-checkout-flow", userId)) {
    return newCheckoutService.process(order);
} else {
    return legacyCheckoutService.process(order);
}
```

**Trả lời Nâng cao**

> **Các use case**:
> - **Trunk-based development**: Dev merge code chưa hoàn thiện vào main, feature bị tắt
> - **A/B testing**: Bật cho 50% user để so sánh conversion
> - **Canary release**: Bật dần từ 1% → 10% → 100%
> - **Kill switch**: Tắt ngay feature đang gây vấn đề mà không deploy

**Tool**: LaunchDarkly, Unleash, Flagsmith, hoặc tự implement với Redis.

**Câu hỏi Trick**

> Feature flag để quá lâu trong code có vấn đề gì?

*Trả lời*: **Flag debt** — code đầy if/else, khó đọc, khó test (phải test cả 2 path). Quy tắc: feature flag có **expiry date**, sau khi fully rollout phải xóa flag và legacy code. Không xóa = technical debt.

---

## Q6: Pipeline Security — SAST, DAST, SCA

**Trả lời Basic**

| Loại | Kiểm tra | Tool |
|---|---|---|
| **SAST** (Static) | Source code, tìm bug/vulnerability trước khi chạy | SonarQube, Semgrep, SpotBugs |
| **SCA** (Composition) | Vulnerability trong dependency (CVE) | Snyk, OWASP Dependency Check, Dependabot |
| **DAST** (Dynamic) | App đang chạy, tấn công như hacker | OWASP ZAP, Burp Suite |
| **Container scan** | CVE trong Docker image | Trivy, Clair |

**Câu hỏi tình huống**

> Log4Shell (CVE-2021-44228) ảnh hưởng hàng nghìn app Java. Làm thế nào detect nhanh app của bạn có bị ảnh hưởng không?

*Trả lời*: **SCA tool** (Snyk, Dependabot) scan `pom.xml`/`build.gradle` — phát hiện log4j version trong minutes. Nếu có CI/CD tích hợp SCA, pipeline sẽ fail ngay khi có dependency có CVE critical. Đây là lý do SCA scan phải có trong mọi pipeline production.

**Câu hỏi Trick**

> SAST bảo "code clean", DAST bảo "có vulnerability". Có thể xảy ra không?

*Trả lời*: Có — SAST phân tích static, không thể detect **runtime configuration issue** hay **business logic vulnerability**. Ví dụ: SAST không thể detect API endpoint trả về data của user khác (IDOR) nếu nhìn từ code thuần túy.

---

## Q7: Artifact Management — Quản lý build artifact

**Trả lời Basic**

> Artifact = output của build (JAR, Docker image, npm package, Helm chart).

| Tool | Loại artifact | Dùng khi |
|---|---|---|
| Nexus / Artifactory | Maven, npm, Docker, Helm | On-premise, multi-format |
| AWS ECR | Docker image | AWS ecosystem |
| GitHub Packages | Docker, npm, Maven | GitHub-centric workflow |
| S3 | Binary, zip | Simple artifact storage |

**Câu hỏi tình huống**

> Deploy production gấp, cần dùng lại artifact từ build 3 ngày trước. Làm thế nào đảm bảo có thể làm được?

*Trả lời*:
1. **Version artifact** với Git commit SHA, không dùng `latest`
2. **Retention policy**: Không xóa artifact production đã deploy trong 30-90 ngày
3. **Immutable tag**: Không cho phép overwrite tag đã push (ECR, Nexus đều có option này)
4. **Link artifact với deployment**: Biết production đang chạy image version nào

**Câu hỏi Trick**

> Tại sao không nên dùng tag `latest` trong production deployment?

*Trả lời*: `latest` không có nghĩa là "latest stable" — chỉ là tag mặc định khi build không chỉ định tag. Nếu ai đó push image mới với `latest`, rolling update trên K8s có thể pull image khác nhau trên từng node → **inconsistent deployment**. Luôn dùng immutable tag (commit SHA, semantic version).

---

## Q8: Environment Promotion — Dev → Staging → Production

**Trả lời Basic**

```
Code push → CI build → artifact
    ↓
Deploy Dev (auto)
    ↓
Deploy Staging (auto sau dev pass)
    ↓
Deploy Production (manual approve)
```

> **Nguyên tắc**: **Cùng một artifact** được promote qua các env. Không build lại cho mỗi env — nếu build lại có thể có kết quả khác nhau (non-deterministic build).

**Trả lời Nâng cao**

> Config thay đổi theo env, không phải code. Dùng:
> - **Environment variables**: inject khi deploy
> - **ConfigMap/Secret (K8s)**: khác nhau theo namespace
> - **Helm values**: `values-dev.yaml`, `values-prod.yaml`

**Câu hỏi tình huống**

> Bug chỉ xuất hiện ở production, không reproduce được ở staging. Nguyên nhân phổ biến?

*Trả lời*:
1. **Data khác nhau** — staging có ít/đơn giản hơn production data
2. **Config khác** — connection pool, timeout, feature flag
3. **Scale khác** — race condition chỉ xảy ra khi có nhiều instance
4. **Dependency version khác** — staging dùng non-prod tier của external service
5. **Build khác nhau** — không promote cùng artifact

Fix: Production-parity staging, same artifact, blue-green để dễ rollback.
