# Topic 02: SOLID Principles

## Q1: SRP — Single Responsibility Principle

**Nguyên tắc:** Mỗi class chỉ nên có một lý do duy nhất để thay đổi — đừng để nhiều stakeholder khác nhau cùng "sở hữu" một class.
> Trích dẫn Robert C. Martin: "A class should have only one reason to change."

### Trả lời Basic

**Một class = một responsibility = một lý do để thay đổi.**

> Đừng hiểu SRP là "class chỉ làm 1 việc". Hãy hiểu là "class chỉ có 1 actor/stakeholder quan tâm đến nó".

**Ví dụ vi phạm SRP:**
```java
// ❌ UserService có 3 reasons to change:
// 1. Business logic thay đổi (product team)
// 2. Email format thay đổi (marketing team)
// 3. Report format thay đổi (finance team)
public class UserService {
  public User createUser(String name, String email) { ... }  // Business logic
  public void sendWelcomeEmail(User user) { ... }            // Email concern
  public String generateReport(List<User> users) { ... }    // Reporting concern
}

// ✅ Mỗi class có 1 reason to change
public class UserService {
  public User createUser(String name, String email) { ... }
}
public class EmailService {
  public void sendWelcomeEmail(User user) { ... }
}
public class UserReportService {
  public String generateReport(List<User> users) { ... }
}
```

### Trả lời Nâng cao

> **SRP không có nghĩa là class nhỏ** — là class **cohesive**. Một class 500 dòng có thể có single responsibility nếu tất cả methods phục vụ cùng một concern.

**"Reason to change" = actor:**

| Actor | Class họ own |
|---|---|
| Product team | `OrderService`, `ProductCatalog` |
| Ops/DevOps | `HealthCheckService`, `MetricsCollector` |
| Finance team | `InvoiceGenerator`, `TaxCalculator` |
| Marketing | `EmailTemplateEngine`, `CampaignService` |

**Signs của SRP violation:**
- Class có nhiều private helpers không liên quan nhau
- Class import nhiều loại dependencies (DB + Email + File + HTTP)
- Khi hỏi "class này làm gì?" mà cần nói "và... và... và..."

### Câu hỏi tình huống

**God class `OrderManager` có 2000 dòng, làm tất cả từ tạo order đến gửi email đến generate PDF. Bạn refactor thế nào?**

→ Đừng refactor 1 lần (too risky). Strangler Fig pattern:
1. Identify các "concerns" trong class
2. Extract từng concern ra class riêng, giữ delegate trong class cũ
3. Test sau mỗi bước
4. Dần dần remove class cũ
→ Viết test **trước** khi refactor — đây là safety net.

### Câu hỏi Trick

**Trick:** "Nếu SRP nói mỗi class 1 responsibility, tại sao Spring `@Service` thường có nhiều method?"

→ Methods trong service cùng serve 1 domain entity/aggregate = 1 responsibility.
→ `UserService.createUser()`, `UserService.updateProfile()`, `UserService.deactivate()` — tất cả là **user lifecycle management** = 1 responsibility.
→ Vi phạm SRP khi `UserService` cũng có `sendEmail()` hay `generateInvoice()`.

---

## Q2: OCP — Open/Closed Principle

**Nguyên tắc:** Có thể mở rộng hành vi của class mà không cần sửa code đang chạy — thêm tính năng mới bằng cách thêm code mới, không sửa code cũ.
> Trích dẫn Bertrand Meyer: "Software entities should be open for extension, but closed for modification."

### Trả lời Basic

**Open for extension**: Có thể thêm behavior mới.
**Closed for modification**: Không cần sửa existing code để thêm behavior mới.

**Ví dụ vi phạm OCP:**
```java
// ❌ Mỗi lần thêm payment method → phải sửa PaymentProcessor
public class PaymentProcessor {
  public void process(Payment payment) {
    if (payment.getType().equals("CREDIT_CARD")) {
      processCreditCard(payment);
    } else if (payment.getType().equals("PAYPAL")) {
      processPayPal(payment);
    } else if (payment.getType().equals("CRYPTO")) { // mới thêm → phải sửa class này
      processCrypto(payment);
    }
  }
}

// ✅ Thêm payment method mới → chỉ cần thêm class mới, không sửa PaymentProcessor
public interface PaymentStrategy {
  void process(Payment payment);
}

public class CreditCardStrategy implements PaymentStrategy { ... }
public class PayPalStrategy implements PaymentStrategy { ... }
public class CryptoStrategy implements PaymentStrategy { ... } // thêm mới, không sửa gì cũ

public class PaymentProcessor {
  public void process(Payment payment, PaymentStrategy strategy) {
    strategy.process(payment);
  }
}
```

### Trả lời Nâng cao

> **OCP thường được achieve qua Strategy, Template Method, hoặc plugin architecture.** Không phải mọi thứ đều cần OCP — áp dụng ở những điểm thường xuyên thay đổi.

**Khi OCP thực sự quan trọng:**
- Code xử lý nhiều loại (`payment type`, `notification channel`, `export format`)
- Plugin system / extensible framework
- Business rules thường xuyên thay đổi

**Extension points phổ biến trong Java/Spring:**
```java
// 1. Strategy Pattern (hành vi)
@Component("creditCard") class CreditCardPayment implements PaymentStrategy {}
@Component("paypal") class PayPalPayment implements PaymentStrategy {}

// 2. Spring @Conditional (config extension)
@Bean
@ConditionalOnProperty("feature.new-checkout")
public CheckoutService newCheckoutService() { ... }

// 3. Event-driven (behavior extension không cần modify publisher)
applicationEventPublisher.publishEvent(new OrderCreatedEvent(order));
// Mỗi handler là extension point độc lập
```

### Câu hỏi tình huống

**Mỗi sprint team lại phải sửa `NotificationService` để thêm kênh mới (email, SMS, Slack, Teams). Làm thế nào apply OCP?**

→ Tạo `NotificationChannel` interface với method `send(Notification n)`.
→ Mỗi kênh là một implementation: `EmailChannel`, `SmsChannel`, `SlackChannel`.
→ `NotificationService` nhận `List<NotificationChannel>` qua DI.
→ Sprint tiếp theo thêm kênh mới: tạo class mới, không sửa `NotificationService`.

### Câu hỏi Trick

**Trick:** "OCP nói closed for modification. Nhưng fix bug có vi phạm OCP không?"

→ **Không** — OCP áp dụng cho **feature extensions**, không phải bug fixes.
→ OCP nghĩa là "không nên phải sửa existing code để thêm **new behavior**".
→ Fix bug = correct existing behavior = hợp lệ để modify.
→ Tuy nhiên: nếu bug fix cần sửa nhiều nơi → đó là dấu hiệu thiếu abstraction.

---

## Q3: LSP — Liskov Substitution Principle

**Nguyên tắc:** Subclass phải hoạt động đúng ở mọi nơi mà parent class được dùng — không được phá vỡ kỳ vọng của người gọi.
> Trích dẫn Barbara Liskov: "Objects of a subtype must be substitutable for objects of their supertype without altering program correctness."

### Trả lời Basic

**Nếu S là subtype của T, thì object của T có thể được replace bằng S mà không làm hỏng chương trình.**

Đơn giản hơn: **Subclass phải honor contract của parent class.**

**Ví dụ vi phạm LSP — Rectangle/Square paradox:**
```java
// ❌ Square IS-A Rectangle trong geometry, nhưng vi phạm LSP
public class Rectangle {
  protected int width, height;
  public void setWidth(int w) { this.width = w; }
  public void setHeight(int h) { this.height = h; }
  public int area() { return width * height; }
}

public class Square extends Rectangle {
  @Override
  public void setWidth(int w) { this.width = this.height = w; } // phá vỡ Rectangle contract!
}

// Code này hoạt động với Rectangle, fail với Square
void testRectangle(Rectangle r) {
  r.setWidth(5);
  r.setHeight(4);
  assert r.area() == 20; // FAIL nếu r là Square (area = 25, không phải 20)
}
```

**✅ Fix:**
```java
// Không dùng inheritance — dùng composition hoặc interface
public interface Shape { int area(); }
public class Rectangle implements Shape { ... }
public class Square implements Shape { ... }
```

### Trả lời Nâng cao

> **LSP là về semantic correctness, không chỉ syntactic.** Subclass override method → vẫn phải satisfy preconditions, postconditions, và invariants của parent.

**LSP rules (Barbara Liskov's formal definition):**

| Rule | Nghĩa |
|---|---|
| **Precondition** | Subclass không được strengthen preconditions (yêu cầu thêm điều kiện đầu vào) |
| **Postcondition** | Subclass không được weaken postconditions (không đảm bảo output contract) |
| **Invariant** | Subclass phải maintain invariants của parent (state rules) |
| **Exception** | Subclass chỉ throw exceptions mà parent đã declare (hoặc subtypes của chúng) |

**Ví dụ thực tế:**
```java
// Parent: Bird có thể fly()
public abstract class Bird {
  public abstract void fly();
}

// ❌ Penguin IS-A Bird (biologically đúng) nhưng vi phạm LSP
public class Penguin extends Bird {
  @Override
  public void fly() {
    throw new UnsupportedOperationException("Penguins can't fly!");
  }
}
// Code dùng Bird expect fly() hoạt động → crash với Penguin

// ✅ Tách interface
public interface FlyingBird { void fly(); }
public class Eagle implements FlyingBird { ... }
public class Penguin extends Bird { } // không implement FlyingBird
```

### Câu hỏi tình huống

**Code review thấy subclass override method của parent và throw `UnsupportedOperationException`. Bạn comment gì?**

→ Đây là classic LSP violation và code smell.
→ Nếu subclass không thể fulfill contract của parent → **không nên extend parent**.
→ Giải pháp: (1) Tách interface nhỏ hơn (ISP), (2) Dùng composition thay inheritance, (3) Rethink hierarchy.

### Câu hỏi Trick

**Trick:** "`java.util.Stack` extends `java.util.Vector` — đây có vi phạm LSP không?"

→ **Có** — đây là ví dụ nổi tiếng trong JDK.
→ Vector cho phép insert/remove ở bất kỳ index nào. Stack chỉ nên push/pop từ đỉnh.
→ Vì Stack extends Vector, bạn có thể gọi `stack.add(0, element)` → insert vào đáy stack — vi phạm Stack semantic.
→ JDK ghi nhận đây là design mistake, recommend dùng `Deque` (ArrayDeque) thay `Stack`.

---

## Q4: ISP — Interface Segregation Principle

**Nguyên tắc:** Đừng ép client phụ thuộc vào những method họ không dùng — hãy tách interface lớn thành nhiều interface nhỏ, đúng nhu cầu của từng client.
> Trích dẫn Robert C. Martin: "Clients should not be forced to depend on interfaces they do not use."

### Trả lời Basic

**Fat interface = nhiều method mà không phải client nào cũng cần.** ISP nói: tách thành nhiều interface nhỏ, specific hơn.

**Ví dụ vi phạm ISP:**
```java
// ❌ Fat interface — Worker phải implement cả eat() dù Robot không ăn
public interface Worker {
  void work();
  void eat();       // Human workers eat
  void sleep();     // Human workers sleep
  void takeBreak(); // Human workers rest
}

public class Robot implements Worker {
  @Override public void work() { ... }
  @Override public void eat() { throw new UnsupportedOperationException(); }   // forced!
  @Override public void sleep() { throw new UnsupportedOperationException(); } // forced!
  @Override public void takeBreak() { /* do nothing */ }                       // forced!
}

// ✅ Segregated interfaces
public interface Workable { void work(); }
public interface Eatable { void eat(); }
public interface Restable { void sleep(); void takeBreak(); }

public class HumanWorker implements Workable, Eatable, Restable { ... }
public class Robot implements Workable { ... } // chỉ implement cái cần
```

### Trả lời Nâng cao

> **ISP về phía client, không phải về phía implementation.** Tách interface theo **ai sẽ dùng nó** (client perspective), không theo **ai sẽ implement nó**.

**Trong Spring/Java thực tế:**
```java
// ❌ Repository fat interface
public interface UserRepository {
  User findById(Long id);
  List<User> findAll();
  void save(User user);
  void delete(Long id);
  List<User> findByEmailForAudit(String email); // Chỉ AuditService dùng
  List<User> findInactiveForCleanup();           // Chỉ BatchJob dùng
}

// ✅ Segregated
public interface UserQueryRepository { User findById(Long id); List<User> findAll(); }
public interface UserCommandRepository { void save(User user); void delete(Long id); }
public interface UserAuditRepository { List<User> findByEmailForAudit(String email); }
public interface UserMaintenanceRepository { List<User> findInactiveForCleanup(); }

// Mỗi service chỉ inject interface nó cần — CQRS pattern
```

**ISP giúp testing dễ hơn:**
```java
// Fat interface: phải mock 10 methods kể cả không dùng
// Segregated interface: chỉ mock methods thực sự dùng
@Mock UserQueryRepository userQueryRepository; // chỉ 2 methods
```

### Câu hỏi tình huống

**Có `PaymentGateway` interface với 15 methods. Team chỉ dùng `charge()` và `refund()`. Test rất khó vì phải mock 15 methods. Bạn làm gì?**

→ ISP fix đúng vấn đề này: tạo `PaymentCharger` interface với `charge()`, `PaymentRefunder` với `refund()`.
→ Nếu không thể sửa interface (third-party): dùng **Adapter pattern** — wrap gateway trong interface nhỏ hơn.
→ Short-term: `Mockito.mock()` với `lenient()` stubbing cho unneeded methods.

### Câu hỏi Trick

**Trick:** "ISP và SRP khác nhau thế nào? Cả hai đều nói về 'làm ít việc'?"

→ SRP về **implementation** (class chỉ có 1 reason to change).
→ ISP về **interface / contract** (client không phải depend on methods nó không dùng).
→ Có thể vi phạm ISP mà không vi phạm SRP: class nhỏ, single responsibility, nhưng interface của nó quá broad cho một số clients.
→ Giải pháp thường dùng cả hai: SRP tách class, ISP tách interface.

---

## Q5: DIP — Dependency Inversion Principle

**Nguyên tắc:** Module cấp cao không nên phụ thuộc trực tiếp vào module cấp thấp — cả hai nên phụ thuộc vào abstraction (interface), không phải implementation cụ thể.
> Trích dẫn Robert C. Martin: "High-level modules should not depend on low-level modules. Both should depend on abstractions."

### Trả lời Basic

**2 rules của DIP:**
1. High-level modules không depend on low-level modules → cả hai depend on abstractions (interfaces)
2. Abstractions không depend on details → details depend on abstractions

**Ví dụ vi phạm DIP:**
```java
// ❌ OrderService (high-level) directly depend on MySQLOrderRepository (low-level)
public class OrderService {
  private MySQLOrderRepository repository; // concrete class — tightly coupled!

  public OrderService() {
    this.repository = new MySQLOrderRepository(); // hard dependency
  }
  
  public void createOrder(Order order) {
    repository.save(order); // Nếu đổi sang MongoDB → phải sửa OrderService
  }
}

// ✅ Cả hai depend on abstraction (interface)
public interface OrderRepository { void save(Order order); }

public class OrderService {
  private final OrderRepository repository; // depend on abstraction

  public OrderService(OrderRepository repository) { // injected — DI
    this.repository = repository;
  }
}

public class MySQLOrderRepository implements OrderRepository { ... }
public class MongoOrderRepository implements OrderRepository { ... }
// Đổi DB → chỉ thay implementation, không sửa OrderService
```

### Trả lời Nâng cao

> **DIP là nền tảng của Dependency Injection (DI) và IoC containers** (Spring, Guice). DIP là principle, DI là technique để implement DIP.

**Dependency Injection types:**
```java
// 1. Constructor Injection (PREFERRED)
@Service
public class OrderService {
  private final OrderRepository repo;
  
  public OrderService(OrderRepository repo) { this.repo = repo; }
}

// 2. Setter Injection (optional dependencies)
@Autowired
public void setEmailService(EmailService emailService) { ... }

// 3. Field Injection (convenient nhưng không recommend)
@Autowired
private OrderRepository repo; // khó test, không immutable
```

**Tại sao Field Injection không tốt:**
```java
// Test với constructor injection — clean
OrderService service = new OrderService(mockRepository);

// Test với field injection — cần Spring context hoặc reflection
@SpringBootTest // slow
// hoặc
ReflectionTestUtils.setField(service, "repo", mockRepository); // fragile
```

**Dependency flow với DIP:**
```
❌ Without DIP:
  OrderService → MySQLOrderRepository
  (high depends on low)

✅ With DIP:
  OrderService → OrderRepository ← MySQLOrderRepository
  (both depend on abstraction)
```

### Câu hỏi tình huống

**Team mới muốn switch từ JPA sang MongoDB. Nếu DIP được áp dụng đúng, việc này mất bao lâu?**

→ Với DIP đúng: chỉ cần viết `MongoOrderRepository implements OrderRepository` và thay config Spring Bean → có thể xong trong vài giờ.
→ Không có DIP: phải sửa tất cả Service classes, test, config → có thể mất vài ngày.
→ DIP không phải "nice to have" — là investment có ROI rõ ràng khi infrastructure thay đổi.

### Câu hỏi Trick

**Trick:** "DIP nói 'depend on abstractions'. Nhưng nếu app chỉ có 1 implementation (e.g., chỉ dùng MySQL mãi mãi), DIP có cần không?"

→ DIP vẫn có giá trị dù chỉ có 1 implementation — **testability**.
→ Test không nên dùng production DB → cần mock/stub → cần interface.
→ "Program to interfaces, not implementations" không chỉ vì switching — vì isolating.
→ Tuy nhiên: đừng tạo interface khi chỉ có 1 implementation **và** không cần mock. YAGNI applies.

---

## Q6: SOLID — Khi nào thực sự cần vs khi nào là over-engineering?

**So sánh:** 5 principles đều tốt, nhưng không phải lúc nào cũng cần áp dụng tất cả.

### Trả lời Basic

| Principle | Giá trị chính | Dấu hiệu cần áp dụng | Dấu hiệu over-engineering |
|---|---|---|---|
| **SRP** | Cohesion, testability | Class có >3 reasons to change | Tạo class riêng cho mỗi method |
| **OCP** | Extensibility | Hay phải sửa existing code để add feature | Tạo abstraction cho feature chỉ có 1 loại |
| **LSP** | Behavioral correctness | Subclass throw `UnsupportedOperationException` | Làm phức tạp hierarchy để "follow the rule" |
| **ISP** | Client isolation | Fat interface, test mock 10 unused methods | Tạo 10 interface cho class 5 methods |
| **DIP** | Testability, flexibility | Hard-coded `new ConcreteClass()` trong business logic | Interface cho every single class kể cả utility |

**Khi SOLID thực sự cần:**
- Team lớn, nhiều người cùng làm 1 codebase
- Long-term product (>1 năm)
- Code thường xuyên extend/modify
- Cần unit test coverage cao

**Khi SOLID có thể relax:**
- Script nhỏ, one-off tools
- Prototype/POC
- Solo project ngắn hạn
- Domain không phức tạp

### Trả lời Nâng cao

> **SOLID là set of heuristics, not commandments.** Uncle Bob himself nói không phải lúc nào cũng cần áp dụng cứng nhắc.

**Phổ biến nhất trong thực tế:**
1. **SRP** — Almost always useful, ngay cả project nhỏ
2. **DIP** — Cần ngay khi có unit test
3. **OCP** — Áp dụng sau khi đã thấy pattern thay đổi (không speculate)
4. **ISP** — Khi interface lớn và nhiều diverse clients
5. **LSP** — Cần khi dùng inheritance (và đây là lý do nên prefer composition)

**"Duplication is far cheaper than the wrong abstraction." — Sandi Metz**
→ Đừng tạo abstraction sớm. DRY + OCP khi bạn đã biết rõ pattern.

### Câu hỏi tình huống

**Startup cần build MVP trong 1 tháng. Có nên áp dụng full SOLID không?**

→ Minimal SOLID cho MVP:
  - **SRP**: Tách Controller / Service / Repository (không tốn nhiều effort, dễ maintain)
  - **DIP**: Dùng DI (Spring đã làm sẵn)
  - Skip: OCP, ISP, LSP chi tiết — quá early

→ "Make it work, make it right, make it fast" — SOLID thuộc giai đoạn "make it right".
→ Technical debt từ violated SOLID sẽ được pay sau khi biết đúng domain.

### Câu hỏi Trick

**Trick:** "Team mới join, áp dụng SOLID nghiêm ngặt → mỗi feature cần 5-10 file mới (interface + impl + dto + mapper + ...). Productivity giảm. Đây có phải SOLID tốt không?"

→ **Không** — đây là SOLID abuse, thường gọi là "architecture astronaut".
→ Signs: interface chỉ có 1 implementation mà không cần mock, mapper class 200 dòng chỉ copy fields, DTO identical với entity.
→ Rule: Abstraction có giá trị khi **complexity nó ẩn đi > complexity nó thêm vào**.
→ Practical SOLID = biết khi nào nên và khi nào không nên áp dụng.
