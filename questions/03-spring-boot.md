# Spring Boot / Microservices

---

## Q1: `@Component` vs `@Service` vs `@Repository` — Phân biệt

**Trả lời Basic** *(Phân biệt đặc điểm)*

| Annotation | Layer | Behavior thêm |
|---|---|---|
| `@Component` | Generic | Không |
| `@Service` | Business logic | Không (chỉ semantic) |
| `@Repository` | Data access | Auto translate SQL exception → `DataAccessException` |

Cả ba đều là specialization của `@Component` — Spring scan và tạo bean. Khác nhau về **ngữ nghĩa** và **behavior thêm**.

**Trả lời Nâng cao** *(Tình huống thực tế)*

> Như các phòng ban trong công ty: đều là nhân viên (`@Component`), nhưng phòng kỹ thuật (`@Service`), phòng kho (`@Repository`) có trách nhiệm rõ ràng. Phòng kho còn có thêm quy trình riêng khi xảy ra sự cố (translate exception).

**Câu hỏi tình huống**

> Bạn dùng `@Component` cho DAO class thay vì `@Repository`. Khi DB throw `SQLException`, behavior có khác không?

*Trả lời*: Có. `@Repository` kích hoạt `PersistenceExceptionTranslationPostProcessor` — tự động wrap `SQLException` thành Spring's `DataAccessException`. Dùng `@Component` thì raw exception bị leak ra ngoài, caller phải handle JDBC-specific exception — vi phạm abstraction.

**Câu hỏi Trick**

**Trick 1**: Nếu có 2 bean cùng type, Spring inject bean nào?

*Trả lời*: Throw `NoUniqueBeanDefinitionException`. Fix bằng `@Primary` (đánh dấu bean ưu tiên) hoặc `@Qualifier("beanName")` (chỉ định rõ tên bean cần inject).

---

**Trick 2**: `@Autowired` trên field vs constructor — khác nhau thế nào?

*Trả lời*: **Constructor injection** được khuyến nghị vì: dependency rõ ràng, dễ test (truyền mock qua constructor), immutable (có thể dùng `final`), phát hiện circular dependency sớm hơn (fail at startup). Field injection ẩn dependency, khó test, không dùng `final` được.

---

## Q2: `@Transactional` — Propagation khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| Propagation | Hành vi |
|---|---|
| `REQUIRED` (default) | Dùng transaction có sẵn, tạo mới nếu chưa có |
| `REQUIRES_NEW` | Luôn tạo transaction mới, suspend cái cũ |
| `NESTED` | Transaction con trong transaction cha, rollback độc lập |
| `SUPPORTS` | Dùng transaction nếu có, không có cũng không sao |
| `NEVER` | Throw exception nếu đang có transaction |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **REQUIRED** — như đi chung xe với đồng nghiệp. Nếu đồng nghiệp đã có xe thì đi cùng, chưa có thì tự thuê. Cùng lên cùng xuống.
>
> **REQUIRES_NEW** — như tự thuê xe riêng dù đồng nghiệp đã có xe. Đi độc lập, về độc lập, không ảnh hưởng nhau.
>
> **NESTED** — như xe con trong xe mẹ (xe bus). Xe con hỏng thì sửa xe con, không ảnh hưởng xe bus tiếp tục chạy.

**Câu hỏi tình huống**

> `OrderService.placeOrder()` gọi `AuditService.logAction()`. Nếu `placeOrder` fail và rollback, bạn vẫn **muốn audit log được lưu**. Dùng propagation gì?

*Trả lời*: `@Transactional(propagation = REQUIRES_NEW)` trên `logAction()`. Transaction audit chạy độc lập — dù `placeOrder` rollback, audit vẫn commit. Dùng `REQUIRED` (default) thì audit cũng bị rollback theo.

**Câu hỏi Trick**

**Trick 1**: Gọi `@Transactional` method từ **cùng class** thì transaction có hoạt động không?

*Trả lời*: Không — đây là bẫy kinh điển của Spring AOP. `@Transactional` hoạt động qua proxy, khi gọi method trong cùng class thì bypass proxy → transaction không được tạo. Fix bằng cách inject chính bean đó vào, hoặc chuyển method ra class khác.

```java
// Sai — gọi nội bộ, bypass proxy
public void methodA() {
    methodB(); // @Transactional trên methodB không có tác dụng
}

// Đúng — gọi qua proxy
@Autowired
private MyService self;

public void methodA() {
    self.methodB(); // Qua proxy, transaction hoạt động
}
```

**Bẫy tiếp**: `@Transactional` trên `private` method có hoạt động không?

*Trả lời*: Không — Spring AOP không thể proxy `private` method. Annotation bị ignore hoàn toàn, không có warning hay error.

---

**Trick 2**: `@Transactional` mặc định chỉ rollback khi nào?

*Trả lời*: Chỉ rollback với **`RuntimeException` và `Error`** — không rollback với `Checked Exception`. Nếu muốn rollback với checked exception phải khai báo rõ:

```java
@Transactional(rollbackFor = Exception.class)
```

---

## Q3: Monolith vs Microservices — Khi nào migrate?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | Monolith | Microservices |
|---|---|---|
| Deploy | Một lần toàn bộ | Độc lập từng service |
| Scale | Scale toàn bộ app | Scale từng service riêng |
| Complexity | Thấp (một codebase) | Cao (network, distributed) |
| Team size | Phù hợp team nhỏ | Phù hợp team lớn |
| Debug | Dễ (local trace) | Khó hơn (distributed tracing) |

**Câu hỏi tình huống**

> Startup có một monolith Java Spring Boot, team 5 người, 10k users. CTO muốn migrate sang microservices "vì đó là best practice". Bạn tư vấn thế nào?

*Trả lời*: **Không nên migrate vội** vì:
- Distributed systems tăng complexity (network calls, data consistency, tracing)
- Team nhỏ tốn effort ops thay vì ship feature
- 10k users monolith vẫn scale tốt với vertical scaling

Chỉ migrate khi: team lớn (Conway's Law), các domain cần scale **độc lập** khác nhau, deploy cycle bị blocked lẫn nhau. Approach tốt hơn: **Strangler Fig Pattern** — tách dần từng bounded context ra.

**Câu hỏi Trick**

**Trick 1**: Microservices giao tiếp với nhau bằng cách nào? Sync vs Async khi nào dùng?

*Trả lời*:
- **Sync (REST/gRPC)**: Dùng khi cần kết quả ngay, ví dụ check tồn kho trước khi đặt hàng
- **Async (Kafka/RabbitMQ)**: Dùng khi không cần kết quả ngay, ví dụ gửi email sau khi đặt hàng thành công

Async giảm coupling, tăng resilience — service A không bị ảnh hưởng nếu service B chậm.

---

**Trick 2**: Distributed transaction trong microservices xử lý thế nào?

*Trả lời*: Không dùng 2PC (Two-Phase Commit) — phức tạp và làm giảm availability. Thay bằng **Saga Pattern**:
- **Choreography**: Mỗi service emit event, service khác lắng nghe và phản ứng
- **Orchestration**: Một orchestrator điều phối các bước, rollback bằng compensating transactions
