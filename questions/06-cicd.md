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
