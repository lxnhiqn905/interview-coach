# Topic 03: Module Design & Relationships

## Q1: Coupling vs Cohesion — Hai thước đo chất lượng module

**Nguyên tắc:** Hướng tới **Low Coupling, High Cohesion** — đây là goal cốt lõi của mọi module design.

### Trả lời Basic

**Cohesion** = Mức độ các thành phần trong 1 module thuộc về nhau.
**Coupling** = Mức độ phụ thuộc giữa các module với nhau.

```
Goal: HIGH Cohesion + LOW Coupling

HIGH Cohesion = module làm 1 việc rõ ràng, mọi method/field đều liên quan nhau
LOW Coupling  = module ít phụ thuộc vào module khác, dễ thay đổi độc lập
```

**Minh họa:**
```java
// ❌ LOW Cohesion — UserService làm quá nhiều việc không liên quan
public class UserService {
  void createUser() { ... }
  void sendEmail() { ... }      // Email concern
  void generatePDF() { ... }   // PDF concern
  void updateInventory() { ... } // Inventory concern
}

// ❌ HIGH Coupling — OrderService cứng nhắc dùng MySQLDB
public class OrderService {
  private MySQLDatabase db = new MySQLDatabase(); // hard dependency
  private SmtpEmailSender emailSender = new SmtpEmailSender(); // hard dependency
}

// ✅ HIGH Cohesion + LOW Coupling
public class OrderService {
  // Chỉ order logic, inject abstraction
  public OrderService(OrderRepository repo, EventPublisher events) { ... }
}
```

**Coupling types (từ tight đến loose):**

| Loại | Mô tả | Ví dụ |
|---|---|---|
| **Content** | Module sửa internal của module khác | `order.items.list.add(...)` direct |
| **Common** | Chia sẻ global state | Static global variable |
| **Control** | Truyền flag để điều khiển flow | `processOrder(order, true)` |
| **Stamp** | Pass toàn bộ struct dù chỉ cần 1 field | `createInvoice(User user)` khi chỉ cần `userId` |
| **Data** | Truyền đúng data cần | `createInvoice(Long userId)` |
| **Message** | Communicate qua events/messages | Kafka events, Spring ApplicationEvent |

### Trả lời Nâng cao

> **Law of Demeter** là một hệ quả cụ thể của Low Coupling — xem Q2.

**Cohesion types (từ thấp đến cao):**

| Type | Mô tả |
|---|---|
| **Coincidental** | Random methods cùng file, không liên quan |
| **Logical** | Nhóm theo loại (I/O operations, string utils) |
| **Temporal** | Chạy cùng lúc (init(), open(), connect() gọi chung khi startup) |
| **Procedural** | Theo bước quy trình (validate → save → notify) |
| **Communicational** | Cùng dùng 1 data (all methods work on `Order` object) |
| **Sequential** | Output của method này là input của method kia |
| **Functional** | ✅ BEST: tất cả contribute vào 1 well-defined task |

**Metrics đo coupling:**
- **Fan-in**: số module phụ thuộc vào module này → cao = nhiều dependent = ổn định hơn
- **Fan-out**: số module mà module này phụ thuộc vào → cao = nhiều dependency = brittle
- Rule: stable core = high fan-in, low fan-out

### Câu hỏi tình huống

**Khi sửa class `A`, bạn phải sửa class `B`, `C`, `D` theo. Đây là triệu chứng gì và fix thế nào?**

→ Triệu chứng của HIGH Coupling — "shotgun surgery" (1 change → nhiều nơi phải sửa).
→ Investigate: A depend on B, C, D trực tiếp hay qua interface?
→ Fix: Introduce abstraction (interface), hoặc dùng events để decouple.
→ Goal: sửa A → chỉ phải test A (+ integration test).

### Câu hỏi Trick

**Trick:** "Microservices đương nhiên là low coupling — đúng không?"

→ **Không tự động**. Microservices có thể tightly coupled qua synchronous API calls (distributed monolith).
→ Nếu Service A gọi B, B gọi C, C gọi D chain đồng bộ → coupling cao, chỉ là distributed.
→ Low coupling trong microservices = async messaging, event-driven, services có thể deploy độc lập.

---

## Q2: Law of Demeter — Đừng nói chuyện với người lạ

**Nguyên tắc:** Một object chỉ nên giao tiếp với những "người bạn gần" — đừng với tay qua nhiều lớp object để lấy dữ liệu hay gọi hành vi.
> Trích dẫn Ian Holland: "Each unit should only talk to its immediate friends; don't talk to strangers."

### Trả lời Basic

**Một method chỉ được gọi method của:**
1. Object chính nó (`this`)
2. Objects được pass vào method (parameters)
3. Objects được tạo trong method
4. Direct components/fields của object

**Ví dụ vi phạm LoD — "train wreck":**
```java
// ❌ Law of Demeter violation — chain quá dài
String city = customer.getAddress().getCity().getName().toUpperCase();

// Vấn đề: CustomerService phải biết:
// Customer → Address → City → Name
// Nếu thay đổi cấu trúc Address hoặc City → CustomerService phải sửa

// ✅ Đặt method gần với data
public class Customer {
  public String getCityName() { // Customer expose what callers need
    return address.getCity().getName().toUpperCase();
  }
}
// Caller chỉ cần biết Customer
String city = customer.getCityName();
```

**Ví dụ khác:**
```java
// ❌ OrderService biết quá nhiều về User internals
public class OrderService {
  public boolean canPlaceOrder(User user) {
    return user.getAccount().getStatus().equals("ACTIVE") // stranger: Account, Status
      && user.getAccount().getBalance() > 0;              // stranger: Balance
  }
}

// ✅ User encapsulates its own rules
public class User {
  public boolean canPlaceOrder() {
    return account.isActive() && account.hasSufficientBalance();
  }
}
```

### Trả lời Nâng cao

> **LoD không phải "never chain calls"** — Data Transfer Objects (DTO), Builder, fluent API đều chain mà không vi phạm LoD khi **không có behavior/logic hidden in chain**.

**LoD applies to behavior chains, không phải data chains:**
```java
// ✅ Không vi phạm LoD — fluent API, building data
Order order = Order.builder()
  .product(product)
  .quantity(3)
  .discount(0.1)
  .build();

// ✅ Stream pipeline — functional, không có hidden state
users.stream()
  .filter(User::isActive)
  .map(User::getEmail)
  .collect(toList());

// ❌ Vi phạm — navigating object graph để reach behavior
order.getCustomer().getAccount().deduct(amount);
// Fix: order.chargeCustomer(amount) — Order knows how to handle this
```

### Câu hỏi tình huống

**Code review thấy: `invoice.getOrder().getCustomer().sendReminder()`. Bạn comment gì?**

→ LoD violation — 3 hops qua object graph để reach behavior.
→ Invoice không cần biết Customer tồn tại.
→ Fix: `invoice.sendReminderToCustomer()` — Invoice biết cách xử lý, delegate internally.
→ Hoặc: Event-driven — Invoice publish event `InvoiceOverdue`, Customer handler send reminder.

### Câu hỏi Trick

**Trick:** "LoD bảo không chain calls. Nhưng `System.out.println()` đã là `System.out.println()` rồi — có vi phạm không?"

→ **Không vi phạm** — `System.out` là public static field, essentially a singleton.
→ LoD vi phạm khi bạn navigate qua object's internal structure để reach private/internal state.
→ Distinction: `System.out` là designed API. `customer.getAddress().getCity()` là navigation qua internals.

---

## Q3: Composition vs Inheritance — Khi nào dùng cái nào?

**Nguyên tắc:** Ưu tiên kết hợp các object lại với nhau (HAS-A) thay vì kế thừa (IS-A) — linh hoạt hơn, ít phụ thuộc hơn, dễ thay đổi hơn.
> Trích dẫn Gang of Four: "Favor composition over inheritance."

### Trả lời Basic

**Inheritance (IS-A):** Class con kế thừa từ class cha.
**Composition (HAS-A):** Class chứa instance của class khác.

| Tiêu chí | Inheritance | Composition |
|---|---|---|
| **Relationship** | IS-A (Lion IS-A Animal) | HAS-A (Car HAS-A Engine) |
| **Coupling** | Tight — subclass phụ thuộc parent implementation | Loose — chỉ depend on interface |
| **Flexibility** | Cứng — phải kế thừa toàn bộ parent | Linh hoạt — mix nhiều behaviors |
| **Reuse** | Reuse qua kế thừa | Reuse qua delegation |
| **Testing** | Khó — cần parent hoạt động đúng | Dễ — mock composed objects |
| **Change impact** | Sửa parent → ảnh hưởng tất cả subclass | Thay đổi localized |

**Ví dụ:**
```java
// ❌ Inheritance — fragile
public class Stack<T> extends ArrayList<T> { // Vi phạm LSP!
  public void push(T item) { add(item); }
  public T pop() { return remove(size() - 1); }
}
// Stack.add(index, element) từ ArrayList phá vỡ Stack contract

// ✅ Composition — Stack HAS-A list
public class Stack<T> {
  private final List<T> items = new ArrayList<>();
  public void push(T item) { items.add(item); }
  public T pop() { return items.remove(items.size() - 1); }
  // Only expose Stack behavior, not ArrayList internals
}
```

### Trả lời Nâng cao

> **Khi nào inheritance thực sự đúng?** Khi có "true IS-A" relationship và subclass cần **tất cả** behavior của parent — không override để throw exception.

**Decision framework:**

```
Hỏi: "Does SubClass IS-A BaseClass in ALL situations?"
  → Yes + không có LSP violation → Inheritance có thể ok
  → No / Maybe → Use Composition

Hỏi: "Cần extend behavior hay override behavior?"
  → Extend (add methods) → Inheritance có thể ok
  → Override (change behavior) → Composition (Strategy pattern)

Hỏi: "Có thể cần mix behaviors từ nhiều nguồn không?"
  → Yes → Composition (Java không có multiple inheritance)
  → No → Either works
```

**Composition cho behavior reuse — Strategy Pattern:**
```java
// Thay vì: PremiumUser extends User extends BaseEntity (deep hierarchy)
// Dùng: User HAS-A behaviors

public class User {
  private final PricingStrategy pricing;  // Standard or Premium pricing
  private final NotificationStrategy notifications; // Email or SMS or Push

  public double calculatePrice(Order order) {
    return pricing.calculate(order); // delegate
  }
}
// Change behavior at runtime, không cần subclass
User premiumUser = new User(new PremiumPricing(), new MultiChannelNotification());
```

### Câu hỏi tình huống

**Team có `BaseController` với 10 utility methods mà tất cả controllers extend. Vấn đề gì và cách fix?**

→ "Utility inheritance" — extend để reuse code, không phải vì IS-A relationship.
→ Vấn đề: controller bị ràng buộc với BaseController, khó test, khó change.
→ Fix: Extract utility methods thành `@Component` helper class, inject qua constructor.
→ Kinh nghiệm: `extends` chỉ nên là framework base classes (`AbstractController` của Spring) với clear contract.

### Câu hỏi Trick

**Trick:** "Java không có multiple inheritance class, nhưng có multiple inheritance interface. Có phải vì thế Composition luôn tốt hơn?"

→ Composition linh hoạt hơn vì có thể "inherit" behavior từ nhiều nguồn.
→ Java interfaces cho phép multiple: `implements Flyable, Swimmable, Runnable`.
→ Nhưng Composition tốt hơn **interface inheritance** khi cần carry state. Interface default methods tạo multiple inheritance vấn đề (diamond problem).
→ Practical rule: Interfaces cho contracts (polymorphism), Composition cho implementation reuse.

---

## Q4: Inversion of Control (IoC) & Dependency Injection (DI)

**Nguyên tắc:** Framework gọi code của bạn, không phải bạn gọi framework — quyền điều khiển luồng chạy được đảo ngược từ application sang framework/container.
> Trích dẫn Hollywood Principle: "Don't call us, we'll call you."

### Trả lời Basic

**IoC** = framework control flow thay vì application code.
**DI** = một cách implement IoC bằng cách inject dependencies từ bên ngoài.

**Không có IoC:**
```java
// ❌ Application code control toàn bộ lifecycle
public class OrderService {
  private final OrderRepository repo;
  
  public OrderService() {
    // Hard-coded dependency creation
    this.repo = new MySQLOrderRepository(
      new DatabaseConnection("localhost", 5432, "orders_db")
    );
  }
}

// Caller:
OrderService service = new OrderService(); // tạo cả dependency tree
```

**Với IoC (Spring DI):**
```java
// ✅ Spring IoC Container quản lý lifecycle, inject dependencies
@Service
public class OrderService {
  private final OrderRepository repo;
  
  public OrderService(OrderRepository repo) { // dependency injected
    this.repo = repo;
  }
}

// Spring tự tạo, wire, inject — caller không cần biết
@Autowired OrderService orderService; // Spring cung cấp
```

**Lợi ích:**
| | Không có DI | Với DI |
|---|---|---|
| **Thay DB** | Sửa constructor của nhiều class | Thay `@Bean` configuration |
| **Test** | Phải mock internals | Inject mock qua constructor |
| **Lifecycle** | Manual | Managed (singleton, prototype, request scope) |
| **Circular deps** | Compile/runtime error khó debug | Spring phát hiện và báo sớm |

### Trả lời Nâng cao

> **IoC Container là "object factory + registry + lifecycle manager"** — không chỉ là "tự động new object".

**Spring Bean Scopes:**
```java
@Scope("singleton")  // Default — 1 instance cho toàn app
@Scope("prototype")  // New instance mỗi lần inject
@Scope("request")    // New instance mỗi HTTP request (web)
@Scope("session")    // New instance mỗi HTTP session (web)
```

**Service Locator vs Dependency Injection:**
```java
// ❌ Service Locator — vẫn là anti-pattern dù có IoC flavor
public class OrderService {
  public void createOrder() {
    // Pull dependency khi cần — hidden dependency
    OrderRepository repo = ServiceLocator.get(OrderRepository.class);
  }
}

// ✅ Dependency Injection — explicit dependency
public class OrderService {
  private final OrderRepository repo; // visible, testable
  public OrderService(OrderRepository repo) { this.repo = repo; }
}
```

**Tại sao Service Locator bị anti-pattern:**
- Hidden dependencies — không nhìn constructor biết class cần gì
- Khó test — ServiceLocator phải được setup
- Runtime errors thay vì compile-time

### Câu hỏi tình huống

**Bị circular dependency: A inject B, B inject A. Spring báo lỗi. Fix thế nào?**

→ Circular dependency thường là **design smell** — A và B nên tách.
→ Fix 1: Extract interface/service C mà cả A và B dùng chung.
→ Fix 2: Dùng `@Lazy` trên 1 dependency (defer initialization).
→ Fix 3: Dùng event/message thay vì direct call — A publish event, B handle.
→ Fix sai: `@Autowired` field injection thay constructor (hide vấn đề, không fix).

### Câu hỏi Trick

**Trick:** "Spring `@Autowired` và `new ConcreteClass()` đều cho ra object. Khác nhau là gì?"

→ `new`: bạn control lifecycle, bạn chịu trách nhiệm dependencies.
→ `@Autowired`: Spring control lifecycle (singleton by default), Spring wire dependencies.
→ Practical: `new` dùng trong domain objects (Entity, Value Object). `@Autowired` dùng cho services, repositories, components.
→ Dùng `new` trong Spring bean = bypass IoC = mất benefits của Spring container.

---

## Q5: Command Query Separation (CQS)

**Nguyên tắc:** Mỗi method chỉ làm một trong hai: hoặc thực hiện hành động (thay đổi state), hoặc trả về giá trị — không vừa làm vừa trả.
> Trích dẫn Bertrand Meyer: "A method should either change state or return a value, never both."

### Trả lời Basic

**Command** = thay đổi state, không return value (void).
**Query** = return value, không thay đổi state (side-effect free).

**Vi phạm CQS:**
```java
// ❌ Method vừa trả về user vừa tạo user nếu chưa tồn tại
public User getOrCreateUser(String email) {
  User user = repository.findByEmail(email);
  if (user == null) {
    user = new User(email);
    repository.save(user); // side effect!
  }
  return user; // return value
}

// Caller không biết: gọi method này có tạo user không?
User user = service.getOrCreateUser("test@email.com"); // Unexpected side effect!
```

**✅ Tách thành Command + Query:**
```java
// Query — chỉ read
public Optional<User> findUserByEmail(String email) {
  return repository.findByEmail(email);
}

// Command — chỉ write
public void createUser(String email) {
  repository.save(new User(email));
}

// Caller explicit về intent
Optional<User> user = service.findUserByEmail(email);
if (user.isEmpty()) {
  service.createUser(email);
}
```

### Trả lời Nâng cao

> **CQRS (Command Query Responsibility Segregation)** là CQS ở cấp độ architecture — tách hẳn read model và write model.

**CQS → CQRS:**
```
CQS: Method level separation
CQRS: Architectural level separation

┌─────────────────────────────────┐
│         Command Side            │  Write: Create/Update/Delete
│   Command → Handler → DB        │  Optimized for consistency
└─────────────────────────────────┘
          │ events/sync
┌─────────────────────────────────┐
│          Query Side             │  Read: Fetch/Report/Search
│   Query → Handler → ReadDB      │  Optimized for performance
└─────────────────────────────────┘
```

**Lợi ích của CQS/CQRS:**
```java
// Queries có thể cached freely (no side effects)
@Cacheable("users")
public List<UserDTO> getAllUsers() { ... } // safe to cache

// Commands không cache
public void createUser(CreateUserCommand cmd) { ... } // never cache

// Read model có thể denormalized cho performance
// Write model normalized cho consistency
```

**Khi CQRS phức tạp hơn nó đáng:**
- Simple CRUD app — overkill
- Small team — 2 model để maintain
- Eventually consistent read model — complexity tăng

### Câu hỏi tình huống

**`save()` method return saved entity (với generated ID). Có vi phạm CQS không?**

→ Technically yes — save vừa command (persist) vừa query (return ID).
→ Practical exception: Generated ID là essential return value — caller cần nó cho workflow tiếp theo.
→ CQS là guideline, không phải law. Pragmatic violation được chấp nhận khi:
  - Return value là result của command (generated ID, operation status)
  - Alternative (separate query) tốn extra round-trip không hợp lý
→ JPA `repository.save()` trả về entity — widely accepted CQS exception.

### Câu hỏi Trick

**Trick:** "Stack.pop() vừa remove element vừa return nó — vi phạm CQS. Stack có bad design không?"

→ Đây là câu hỏi nổi tiếng của Bertrand Meyer.
→ Meyer công nhận đây là exception thực tế — tách pop thành `top()` + `remove()` với concurrent access tạo race condition.
→ CQS phải được cân bằng với **atomicity** requirements. Trong concurrent context, đôi khi "command + return" cần thiết để atomic.
→ Lesson: Understand the principle để biết khi nào vi phạm có lý do, không phải blind follow.

---

## Q6: IoC vs DI vs Service Locator vs Factory — Sự khác biệt

**So sánh:** 4 patterns liên quan đến dependency management, thường bị nhầm lẫn.

### Trả lời Basic

| Pattern | Ai tạo dependency | Ai biết cách tạo | Khi nào dùng |
|---|---|---|---|
| **Manual (`new`)** | Class tự tạo | Class | Value objects, local state |
| **Factory** | Factory class | Factory | Complex creation logic, vary by config |
| **Service Locator** | Class tự lookup | Registry | Legacy code, plugin systems |
| **DI Container** | Container inject | Container + config | Application services, framework-managed beans |
| **IoC (concept)** | External caller/framework | Framework | Tất cả modern framework |

**Tóm tắt ngắn:**
```
new ConcreteClass()       → Bạn tạo, bạn chịu trách nhiệm
Factory.create()          → Factory tạo, bạn quyết định KÍCH HOẠT factory
ServiceLocator.get(Class) → Bạn pull từ registry, hidden dependency
@Autowired / constructor  → Container push vào bạn, explicit dependency
```

### Trả lời Nâng cao

**Factory khi nào vẫn cần dù có DI:**
```java
// Factory cần khi: object cần runtime parameters không biết lúc startup
@Component
public class OrderFactory {
  private final PricingService pricingService; // injected

  public Order createOrder(OrderRequest request, User user) {
    // Runtime data: request, user
    // Injected service: pricingService
    double price = pricingService.calculate(request, user.getTier());
    return new Order(request.getProductId(), price, user.getId());
  }
}
```

**Service Locator anti-pattern — tại sao tránh:**
```java
public class OrderService {
  public void process(Order order) {
    // Hidden dependency — ai đọc class không biết cần PricingService
    PricingService pricing = ServiceLocator.getService(PricingService.class);
    // ...
  }
}
// Test: phải setup ServiceLocator registry
// Debug: theo dõi dependency phức tạp
```

**Khi Service Locator acceptable:**
- Plugin architecture (dynamic loading, unknown at compile time)
- Legacy code integration
- Framework internals (Spring dùng internally, không expose ra app code)

### Câu hỏi tình huống

**App dùng Spring DI, nhưng cần tạo object khác nhau tùy theo user's country (VN → VNDPricing, US → USDPricing). Dùng pattern gì?**

→ Kết hợp: **DI + Factory + Strategy**
```java
@Component
public class PricingFactory {
  private final Map<String, PricingStrategy> strategies; // All strategies injected

  public PricingFactory(List<PricingStrategy> strategyList) {
    strategies = strategyList.stream()
      .collect(toMap(s -> s.getCountryCode(), Function.identity()));
  }

  public PricingStrategy getFor(String countryCode) {
    return strategies.getOrDefault(countryCode, strategies.get("DEFAULT"));
  }
}
```
→ Benefit: Thêm country mới = thêm class implements `PricingStrategy`, không sửa factory.

### Câu hỏi Trick

**Trick:** "Spring ApplicationContext là IoC Container, nhưng nếu inject `ApplicationContext` vào Service để `getBean()`, có phải đang dùng Service Locator không?"

→ **Đúng** — `applicationContext.getBean(MyService.class)` là Service Locator pattern, dù bên trong Spring.
→ Spring không khuyến khích inject ApplicationContext vào business code.
→ Dùng được: trong Framework code, Tests, Dynamic bean lookup với unknown type.
→ **Không dùng**: trong Service/Repository/Domain code — làm mất tính declarative của DI.
