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

---

## Q4: Spring Security — Authentication và Authorization

**Trả lời Basic**

| Khái niệm | Ý nghĩa |
|---|---|
| **Authentication** | Xác định "bạn là ai?" (login) |
| **Authorization** | Xác định "bạn được làm gì?" (permission) |
| **SecurityContext** | Lưu thông tin user hiện tại theo thread |
| **Filter Chain** | Chuỗi filter xử lý security trước khi vào controller |

**Trả lời Nâng cao**

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())           // Disable nếu dùng JWT (stateless)
            .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
```

**Câu hỏi Trick**

> Method Security (`@PreAuthorize`) vs URL Security — khác nhau thế nào? Dùng cả hai cùng lúc có được không?

*Trả lời*: URL Security bảo vệ ở tầng HTTP request. Method Security bảo vệ ở tầng service method (kể cả khi gọi từ internal code). **Nên dùng cả hai**: URL security như vòng ngoài, method security như vòng trong. Bật method security bằng `@EnableMethodSecurity`.

---

## Q5: Spring Cache — `@Cacheable`, `@CacheEvict`

**Trả lời Basic**

```java
@Service
public class ProductService {

    @Cacheable(value = "products", key = "#id")
    public Product findById(Long id) {
        return productRepo.findById(id).orElseThrow(); // Chỉ gọi khi cache miss
    }

    @CacheEvict(value = "products", key = "#product.id")
    public Product update(Product product) {
        return productRepo.save(product); // Xóa cache sau khi update
    }

    @CachePut(value = "products", key = "#result.id")
    public Product create(Product product) {
        return productRepo.save(product); // Update cache với giá trị mới
    }
}
```

**Trả lời Nâng cao**

> Spring Cache abstraction hỗ trợ nhiều backend: **ConcurrentHashMap** (mặc định, in-memory), **Redis** (distributed), **Caffeine** (high-performance in-memory).

```yaml
spring:
  cache:
    type: redis
  redis:
    host: localhost
    port: 6379
```

**Câu hỏi Trick**

> `@Cacheable` gọi từ cùng class thì cache có hoạt động không?

*Trả lời*: **Không** — giống `@Transactional`, Spring Cache dùng AOP proxy. Gọi nội bộ bypass proxy → cache không được kiểm tra. Fix tương tự: inject self hoặc chuyển ra class khác.

---

## Q6: Spring Boot Actuator — Monitoring và Management

**Trả lời Basic**

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: when-authorized
```

| Endpoint | Thông tin |
|---|---|
| `/actuator/health` | Health status của app và dependencies |
| `/actuator/metrics` | JVM, HTTP, DB metrics |
| `/actuator/prometheus` | Metrics format cho Prometheus scrape |
| `/actuator/info` | App version, build info |
| `/actuator/env` | Environment properties (sensitive!) |
| `/actuator/loggers` | Đổi log level runtime |

**Câu hỏi Trick**

> Actuator `/actuator/env` có thể expose secret không? Cách bảo vệ?

*Trả lời*: Có — hiển thị tất cả environment properties, có thể lộ DB password nếu không cẩn thận. Bảo vệ:
1. Chỉ expose endpoint cần thiết (không expose `env`, `beans` trên production)
2. Đặt Actuator trên port riêng (`management.server.port=8081`) và block từ public
3. Dùng Spring Security để protect actuator endpoints

---

## Q7: Circuit Breaker với Resilience4j

**Trả lời Basic**

Circuit Breaker ngăn cascade failure khi một service phụ thuộc bị lỗi.

| State | Hành vi |
|---|---|
| **Closed** | Request đi qua bình thường |
| **Open** | Block request, trả về fallback ngay (không gọi service lỗi) |
| **Half-Open** | Thử vài request, nếu pass → Closed, nếu fail → Open |

```java
@CircuitBreaker(name = "paymentService", fallbackMethod = "paymentFallback")
public PaymentResult processPayment(PaymentRequest request) {
    return paymentClient.process(request); // Gọi external service
}

public PaymentResult paymentFallback(PaymentRequest request, Exception ex) {
    // Fallback khi circuit open
    return PaymentResult.pending("Payment queued for retry");
}
```

**Trả lời Nâng cao**

```yaml
resilience4j:
  circuitbreaker:
    instances:
      paymentService:
        failure-rate-threshold: 50        # >50% fail → Open
        wait-duration-in-open-state: 30s  # Chờ 30s trước khi thử Half-Open
        permitted-number-of-calls-in-half-open-state: 5
        sliding-window-size: 10
```

**Câu hỏi Trick**

> Circuit Breaker vs Retry — dùng cái nào trước?

*Trả lời*: **Retry trước, Circuit Breaker bên ngoài**. Thứ tự: `CircuitBreaker(Retry(request))`. Retry xử lý transient failure (network blip). Nếu retry nhiều lần vẫn fail → Circuit Breaker open, ngăn tiếp tục gây tải lên service đang lỗi.

---

## Q8: Spring Events — Giao tiếp nội bộ trong ứng dụng

**Trả lời Basic**

Spring Events cho phép các component giao tiếp **loose coupling** thông qua event, không cần inject trực tiếp.

```java
// Event
public record UserRegisteredEvent(String userId, String email) {}

// Publisher
@Service
public class UserService {
    private final ApplicationEventPublisher publisher;

    public User register(RegisterRequest req) {
        User user = userRepo.save(new User(req));
        publisher.publishEvent(new UserRegisteredEvent(user.getId(), user.getEmail()));
        return user;
    }
}

// Listener
@Component
public class EmailNotificationListener {
    @EventListener
    @Async  // Xử lý async, không block register flow
    public void onUserRegistered(UserRegisteredEvent event) {
        emailService.sendWelcome(event.email());
    }
}
```

**Câu hỏi tình huống**

> `UserService` cần notify 5 component khác (Email, Audit, Analytics, Notification, Recommendation) sau khi user register. Inject 5 service vào UserService hay dùng Event?

*Trả lời*: **Dùng Event** — UserService không cần biết ai quan tâm đến sự kiện này. Thêm/bớt listener không sửa UserService. Nếu inject 5 service: UserService bị phụ thuộc vào 5 component không liên quan đến core business logic, test khó vì phải mock nhiều hơn.

**Câu hỏi Trick**

> `@EventListener` vs `@TransactionalEventListener` — khác nhau thế nào?

*Trả lời*: `@EventListener` fire ngay khi event publish (có thể trong cùng transaction). `@TransactionalEventListener` chờ transaction commit xong mới fire — đảm bảo data đã được lưu trước khi listener chạy. Dùng `@TransactionalEventListener` khi listener cần đọc data vừa save (ví dụ gửi email sau khi user record đã commit).
