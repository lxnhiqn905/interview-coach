# Topic 01: Generic Principles

## Q1: KISS — Keep It Simple, Stupid

**Nguyên tắc:** Đơn giản hóa mọi thứ. Code tốt là code người khác đọc hiểu ngay, không cần giải thích.

### Trả lời Basic

**KISS = "Don't be clever, be clear."**

Hầu hết bug xuất phát từ code phức tạp hơn mức cần thiết. Simple code:
- Dễ đọc → dễ review
- Dễ test → ít bug
- Dễ sửa → thay đổi nhanh hơn

**Ví dụ vi phạm KISS:**
```java
// ❌ Clever nhưng khó hiểu
int result = (a ^ b) < 0 ? -1 : (a == b ? 0 : 1);

// ✅ Simple và rõ ràng
int compareResult;
if (a < b) compareResult = -1;
else if (a == b) compareResult = 0;
else compareResult = 1;
```

**Ví dụ với method:**
```java
// ❌ Over-engineered: generic, flexible, nhưng ai hiểu nó làm gì?
public <T extends Comparable<T>> Optional<T> findOptimalElement(
    Stream<T> elements, Predicate<T> filter, Comparator<T> comparator) {
  return elements.filter(filter).min(comparator);
}

// ✅ Giải quyết đúng bài toán hiện tại
public Optional<User> findYoungestActiveUser(List<User> users) {
  return users.stream()
    .filter(User::isActive)
    .min(Comparator.comparing(User::getAge));
}
```

### Trả lời Nâng cao

> **KISS không có nghĩa là "code ít dòng".** Một dòng code clever có thể vi phạm KISS nhiều hơn 10 dòng rõ ràng.

**KISS áp dụng ở nhiều cấp độ:**

| Cấp độ | Vi phạm KISS | Giải pháp |
|---|---|---|
| **Method** | Logic 5 tầng if-else | Extract methods nhỏ, descriptive names |
| **Class** | Class làm 5 việc | Tách class, SRP |
| **Architecture** | Microservices cho 1 team, 1 app | Monolith trước, split khi thực sự cần |
| **Database** | Schema normalized 6NF | Denormalize ở chỗ cần performance |

**Complexity có 2 loại:**
- **Essential complexity**: Phức tạp do bài toán thực sự phức tạp (bắt buộc)
- **Accidental complexity**: Phức tạp do code xấu, over-engineering (cần loại bỏ)

### Câu hỏi tình huống

**Tech lead review PR và nói "code này clever quá, đơn giản hóa đi". Bạn phản ứng thế nào?**

→ Đây không phải chỉ trích cá nhân — là feedback về maintainability.
→ Câu hỏi cần hỏi bản thân: "Nếu tôi không nhìn code này 3 tháng, tôi có hiểu ngay không?"
→ "Clever code" thường xuất phát từ muốn show skill — nhưng senior dev thực sự show skill qua **clarity**.

### Câu hỏi Trick

**Trick:** "KISS nói code phải simple. Vậy tại sao design patterns lại phức tạp vậy?"

→ KISS và design patterns không mâu thuẫn. Design patterns **giải quyết** accidental complexity, không tạo ra nó.
→ Pattern chỉ nên dùng khi **bài toán thực sự cần** — dùng pattern không cần thiết mới vi phạm KISS.
→ Ví dụ: Factory Pattern phức tạp hơn `new Object()`, nhưng khi có 10 loại object khác nhau, Factory đơn giản hóa code gọi.

---

## Q2: YAGNI — You Aren't Gonna Need It

**Nguyên tắc:** Chỉ build những gì được yêu cầu **ngay bây giờ**, không build cho tương lai giả định.

### Trả lời Basic

**YAGNI xuất phát từ Extreme Programming (XP):** "Always implement things when you actually need them, never when you just foresee that you need them."

**Tại sao YAGNI quan trọng?**
1. Requirements thay đổi — feature "sẽ cần" thường không bao giờ được dùng
2. Code không dùng = technical debt cần maintain
3. Speculative code thường được implement sai (không có real use case)

**Ví dụ vi phạm YAGNI:**
```java
// ❌ "Sau này có thể cần multi-currency"
public class PriceCalculator {
  private CurrencyConverter converter;    // chưa cần
  private TaxCalculator taxCalc;          // chưa cần
  private DiscountEngine discountEngine;  // chưa cần
  private AuditLogger auditLogger;        // chưa cần

  public double calculate(double price, String currency, String country) {
    // ... 200 dòng cho bài toán chỉ cần: price * quantity
  }
}

// ✅ Build đúng những gì cần
public double calculateTotal(double unitPrice, int quantity) {
  return unitPrice * quantity;
}
```

### Trả lời Nâng cao

> **YAGNI không có nghĩa là "không thiết kế"** — là "đừng implement trước khi cần".

**YAGNI vs tư duy forward-thinking:**

| | YAGNI đúng | Vi phạm YAGNI |
|---|---|---|
| **Thiết kế** | Design interface tốt, nhưng chỉ có 1 implementation | Code abstract layer cho "future implementations" chưa tồn tại |
| **Database** | Schema đủ dùng cho hiện tại | Thêm columns "dự phòng" vào bảng |
| **API** | Endpoint trả đúng fields cần | Trả toàn bộ object "phòng khi client cần" |
| **Config** | Feature flag cho feature đang dev | Feature flag cho feature chưa bắt đầu |

**Cost of YAGNI violation:**
```
Implement speculative feature: 2 days
Maintain nó qua 5 sprints: 2 hours/sprint × 5 = 10 hours
Refactor/delete khi requirements thay đổi: 4 hours
Total wasted: ~20+ hours cho feature không ai dùng
```

### Câu hỏi tình huống

**Junior dev nói: "Tôi add thêm `userId` field vào response, phòng khi frontend cần sau." Bạn review thế nào?**

→ Đây là YAGNI violation dạng nhẹ nhưng phổ biến.
→ Vấn đề: (1) Expose thêm data = security risk, (2) Frontend sẽ dùng nó mà không hỏi, (3) Sau khó remove vì breaking change.
→ Rule: **Add when asked, not when anticipated.**

### Câu hỏi Trick

**Trick:** "YAGNI nói không build trước. Nhưng infrastructure như CI/CD, monitoring — nên setup từ đầu hay đợi cần?"

→ Infrastructure/tooling là **exception** của YAGNI. Lý do: setup trễ tốn hơn nhiều (retrofitting).
→ YAGNI áp dụng cho **business logic**, không phải foundational practices.
→ Rule of thumb: Setup CI/CD, logging, basic monitoring từ ngày 1. Nhưng đừng build feature analytics chưa có user.

---

## Q3: DRY — Don't Repeat Yourself

**Nguyên tắc:** "Every piece of knowledge must have a single, unambiguous, authoritative representation within a system."

### Trả lời Basic

**DRY không chỉ là "đừng copy-paste code"** — là đừng duplicate **knowledge** (business logic, data, config).

**Ví dụ copy-paste DRY violation:**
```java
// ❌ Cùng validation logic ở 3 nơi
public void createUser(String email) {
  if (!email.contains("@") || email.length() < 5) throw new IllegalArgumentException("Invalid email");
  // ...
}
public void updateEmail(String email) {
  if (!email.contains("@") || email.length() < 5) throw new IllegalArgumentException("Invalid email");
  // ...
}

// ✅ Một nơi duy nhất
private void validateEmail(String email) {
  if (!email.contains("@") || email.length() < 5) throw new IllegalArgumentException("Invalid email");
}
```

**DRY ở cấp độ data:**
```java
// ❌ Tax rate hardcode ở nhiều nơi
double tax = price * 0.1;  // file A
double vat = amount * 0.1; // file B
double fee = base * 0.1;   // file C

// ✅
static final double TAX_RATE = 0.1;
```

### Trả lời Nâng cao

> **WET = "Write Everything Twice" / "We Enjoy Typing"** — anti-pattern của DRY.

**DRY violations phổ biến trong thực tế:**

| Loại | Ví dụ | Hậu quả |
|---|---|---|
| **Logic trùng lặp** | Validation ở Controller + Service + DB | Sửa 1 nơi, quên 2 nơi → bug |
| **Constants hardcode** | Magic numbers scattered | Cần đổi phải grep toàn repo |
| **Schema mismatch** | DB schema vs DTO vs API doc không sync | Client nhận sai data |
| **Test data trùng** | Mỗi test tự tạo user mặc định riêng | Đổi User model phải sửa 50 test |

**DRY trong microservices — careful:**
```
# ❌ Shared library quá nhiều: tight coupling giữa services
service-a → shared-lib v1.2
service-b → shared-lib v1.2
service-c → shared-lib v1.2
# Update shared-lib → phải deploy tất cả

# ✅ Accept một số duplication ở ranh giới service
# Mỗi service có domain model riêng, sync qua events
```

### Câu hỏi tình huống

**Bạn thấy code validation email ở 5 nơi trong codebase. Bạn refactor ngay hay để ticket và plan?**

→ Áp dụng **Boy Scout Rule**: nếu bạn đang sửa file đó, refactor luôn.
→ Nếu không liên quan sprint hiện tại: tạo ticket với mức độ ưu tiên Medium, đừng refactor giữa sprint.
→ **Không refactor mà không có test cover** trước — DRY violation còn tốt hơn refactor gây regression.

### Câu hỏi Trick

**Trick:** "DRY nói đừng duplicate. Vậy tại sao test code thường có nhiều đoạn setup giống nhau?"

→ Test code là **exception** của DRY đôi khi. Lý do: test clarity > test DRY-ness.
→ `@BeforeEach` setup shared, nhưng mỗi test nên readable **độc lập** — đọc test không cần trace setup phức tạp.
→ Rule: Duplicate test data ok. Duplicate test logic (assertion helpers) thì extract.

---

## Q4: Boy Scout Rule — Luôn để lại code sạch hơn

**Nguyên tắc:** "Leave the campground cleaner than you found it." — Robert C. Martin (Uncle Bob)

### Trả lời Basic

Mỗi lần bạn chạm vào code, hãy để nó **tốt hơn một chút** so với lúc bạn mở file. Không cần refactor lớn — chỉ cần cải thiện nhỏ.

**Những việc nhỏ theo Boy Scout Rule:**
```java
// Thấy magic number → extract constant
- double interest = amount * 0.035;
+ static final double ANNUAL_INTEREST_RATE = 0.035;
+ double interest = amount * ANNUAL_INTEREST_RATE;

// Thấy method name mơ hồ → rename
- processData()
+ calculateMonthlyInterest()

// Thấy comment giải thích code → viết lại code cho self-explanatory
- // check if user is eligible for premium
- if (user.orders > 10 && user.totalSpent > 1000000)
+ if (user.isEligibleForPremium())

// Thấy dead code → xóa
- // TODO: refactor this (từ 2019)
- // old_method() - deprecated
```

### Trả lời Nâng cao

> **Boy Scout Rule là văn hóa, không phải rule kỹ thuật.** Nó chỉ work khi cả team áp dụng.

**Tại sao codebase xuống cấp theo thời gian:**
1. Mỗi người "đụng và chạy" — thêm feature, không clean up
2. Không ai "sở hữu" code → không ai có trách nhiệm clean
3. Technical debt accumulate → refactor càng ngày càng sợ

**Boy Scout Rule trong practice:**
- PR không chỉ có feature change — còn có cleanup nhỏ liên quan
- Rename variable khi bạn đọc và thấy confusing
- Delete commented-out code khi bạn mở file
- Không cần tạo ticket riêng cho micro-improvements

**Giới hạn của Boy Scout Rule:**
- **Đừng** refactor quá scope của task → PR khổng lồ, khó review
- **Đừng** "improve" code mà không hiểu why it was written that way
- **Đừng** refactor không có test cover

### Câu hỏi tình huống

**Bạn mở file để fix bug và thấy 200 dòng code spaghetti, không có test. Bạn làm gì?**

→ Fix bug trước — đó là mục tiêu chính.
→ Viết test cho behavior hiện tại (kể cả buggy behavior trừ bug đang fix).
→ Refactor nhỏ trong phạm vi file nếu thời gian cho phép.
→ Tạo ticket riêng cho refactor lớn hơn với context: "Found when fixing bug X."
→ **Không** refactor 200 dòng trong cùng PR fix bug.

### Câu hỏi Trick

**Trick:** "Boy Scout Rule nói clean up khi đi qua. Điều gì xảy ra nếu mọi người cleanup theo style riêng?"

→ Đây là vấn đề thực tế — Boy Scout Rule cần **coding standards** đi kèm.
→ Solution: code formatter (Checkstyle, Prettier, Black) + lint rules được enforce tự động.
→ Cleanup theo taste cá nhân mà không có standard → tạo ra noise trong git history và conflict.

---

## Q5: Avoid Premature Optimization

**Nguyên tắc:** "Premature optimization is the root of all evil." — Donald Knuth

### Trả lời Basic

**Đừng optimize trước khi bạn biết đâu là bottleneck.**

Hầu hết performance issue không nằm ở chỗ bạn nghĩ. Và code "được optimize trước" thường:
- Khó đọc hơn
- Khó maintain hơn
- Giải quyết vấn đề không tồn tại

**Quy trình đúng:**
```
1. Make it work (correct code)
2. Make it right (clean code)
3. Make it fast (only if needed, profile first)
```

**Ví dụ premature optimization:**
```java
// ❌ Optimize string concatenation "vì nghe nói StringBuilder nhanh hơn"
// Trong một method gọi 10 lần/ngày:
StringBuilder sb = new StringBuilder();
sb.append("Hello").append(", ").append(name).append("!");
String result = sb.toString();

// ✅ Rõ ràng hơn, đủ fast cho use case này
String result = "Hello, " + name + "!";
```

**Nhưng optimization đúng lúc:**
```java
// ✅ Đây là loop gọi 1 triệu lần — StringBuilder thực sự cần
for (int i = 0; i < 1_000_000; i++) {
  sb.append(items.get(i).toString());
}
```

### Trả lời Nâng cao

> **"Knuth nói tránh premature optimization, không phải tránh optimization."** — Đọc full quote: "We should forget about small efficiencies, say about 97% of the time: premature optimization is the root of all evil. Yet we should not pass up our opportunities in that critical 3%."

**Profile before optimizing:**
```bash
# Java profiling tools
async-profiler    # CPU + memory profiling, production-safe
JProfiler         # GUI profiler
VisualVM          # Free, built into JDK
IntelliJ Profiler # IDE integrated

# Typical bottlenecks (by frequency in real apps):
# 1. N+1 query problem (DB)
# 2. Missing DB indexes
# 3. Unnecessary object creation in loops
# 4. Blocking I/O in async context
# 5. Serialization overhead
```

**Algorithm complexity quan trọng hơn micro-optimization:**
```java
// Đây không phải premature optimization — chọn đúng algorithm từ đầu
// O(n²) với 100,000 items = unacceptable
for (User user : users) {              // n
  for (Order order : allOrders) {      // n
    if (order.userId == user.id) ...   // n²
  }
}

// O(n) — đây không phải optimize, đây là basic correctness
Map<Long, List<Order>> ordersByUser = allOrders.stream()
  .collect(Collectors.groupingBy(Order::getUserId));
```

### Câu hỏi tình huống

**Product phàn nàn API response chậm. Bạn làm gì?**

→ **Bước 1**: Đo, đừng đoán. APM tool (Datadog, New Relic) hoặc logs + tracing.
→ **Bước 2**: Tìm bottleneck — 80% khả năng là DB (slow query, N+1, missing index).
→ **Bước 3**: Fix bottleneck đó — không optimize toàn bộ codebase.
→ **Bước 4**: Measure again — verify improvement.
→ Không nên: viết lại cả service vì nghĩ "kiến trúc đang chậm".

### Câu hỏi Trick

**Trick:** "Cache mọi thứ thì app chạy nhanh hơn — có đúng không?"

→ Cache là **optimization có cost**: stale data, cache invalidation complexity, memory usage.
→ "There are only two hard things in Computer Science: cache invalidation and naming things." — Phil Karlton
→ Cache đúng chỗ: expensive computation, rarely-changing data, read-heavy với low-write.
→ Cache sai chỗ: frequently-changing data, highly-personalized data, write-heavy.

---

## Q6: Separation of Concerns (SoC)

**Nguyên tắc:** Chia chương trình thành các phần riêng biệt, mỗi phần giải quyết một vấn đề cụ thể.

### Trả lời Basic

**Concern = một khía cạnh của functionality.** SoC = mỗi module chỉ biết và quan tâm đến concern của nó.

**Ví dụ vi phạm SoC:**
```java
// ❌ Controller làm quá nhiều: routing + business logic + DB + formatting
@GetMapping("/users/{id}/report")
public ResponseEntity<String> getUserReport(@PathVariable Long id) {
  // Direct DB query trong controller
  User user = entityManager.find(User.class, id);
  
  // Business logic trong controller
  List<Order> orders = entityManager.createQuery("SELECT o FROM Order o WHERE o.userId = :id")
    .setParameter("id", id).getResultList();
  double totalSpent = orders.stream().mapToDouble(Order::getAmount).sum();
  String tier = totalSpent > 10_000_000 ? "GOLD" : totalSpent > 1_000_000 ? "SILVER" : "BRONZE";
  
  // Formatting trong controller
  return ResponseEntity.ok("User: " + user.getName() + "\nTier: " + tier + "\nTotal: " + totalSpent);
}
```

**✅ Sau khi áp dụng SoC:**
```java
@RestController
public class UserController {
  @GetMapping("/users/{id}/report")
  public ReportDTO getUserReport(@PathVariable Long id) {
    return reportService.generateUserReport(id);  // Controller chỉ route
  }
}

@Service
public class ReportService {
  public ReportDTO generateUserReport(Long id) {
    User user = userRepository.findById(id);
    List<Order> orders = orderRepository.findByUserId(id);
    return reportMapper.toDTO(user, orders);  // Service chỉ business logic
  }
}
```

### Trả lời Nâng cao

> **SoC là foundation của hầu hết mọi architectural pattern**: MVC, Clean Architecture, Hexagonal, Microservices — tất cả đều là cách áp dụng SoC ở các cấp độ khác nhau.

**SoC ở các cấp độ:**

| Cấp độ | Ví dụ |
|---|---|
| **Function** | Tách function validate() ra khỏi function save() |
| **Class** | Controller / Service / Repository tách biệt |
| **Module/Package** | `domain`, `infrastructure`, `presentation` |
| **Service** | Auth service, Order service, Notification service |
| **Infrastructure** | App code tách khỏi config, migrations |

**Cross-cutting concerns** (logging, auth, caching) — dùng AOP/Interceptors/Middleware thay vì scatter khắp nơi:
```java
// ❌ Log ở khắp nơi
public Order createOrder(...) {
  log.info("Creating order...");  // repeated everywhere
  // logic
  log.info("Order created");
}

// ✅ AOP / Interceptor
@Around("@annotation(Loggable)")
public Object logMethod(ProceedingJoinPoint joinPoint) {
  // Centralized logging
}
```

### Câu hỏi tình huống

**Bạn cần add logging vào 50 API endpoints. Cách nào đúng với SoC?**

→ **Không** thêm log statement vào từng endpoint.
→ **Đúng**: Dùng Spring AOP `@Around` advice hoặc `HandlerInterceptor` — centralize logging concern.
→ Benefit: Thay đổi format log → chỉ sửa 1 chỗ. Tắt log → chỉ sửa 1 chỗ.

### Câu hỏi Trick

**Trick:** "MVC đã áp dụng SoC chưa? Vậy tại sao 'fat controller' vẫn phổ biến?"

→ MVC là một cách tổ chức SoC, không phải đảm bảo SoC.
→ Fat controller xảy ra khi devs nhầm MVC với "Controller làm tất cả trừ DB".
→ Trong Clean Architecture: Controller chỉ là **input adapter** — không có business logic, không có DB call.
→ Business logic thuộc về **Use Case / Service layer**, không thuộc về framework layer nào.

---

## Q7: KISS vs YAGNI vs DRY — Khi nào dùng cái nào?

**So sánh:** Ba nguyên tắc "anh em" — cùng chống lại complexity, nhưng mỗi cái có góc nhìn khác nhau.

### Trả lời Basic

| Nguyên tắc | Chống lại | Câu hỏi để hỏi | Ví dụ cảnh báo |
|---|---|---|---|
| **KISS** | Unnecessary complexity ngay hiện tại | "Code này có đơn giản hơn được không?" | Method 100 dòng, logic 5 tầng if-else |
| **YAGNI** | Speculative features trong tương lai | "Có ai thực sự cần cái này chưa?" | Add config option cho feature chưa có user |
| **DRY** | Duplication of knowledge | "Điều này có được định nghĩa ở chỗ khác không?" | Cùng validation logic ở 3 service |

**Khi chúng có vẻ mâu thuẫn:**

```java
// DRY muốn extract, nhưng KISS và YAGNI nói "đừng"

// Situation: 2 đoạn code tương tự nhưng context khác nhau
// UserService:
if (email.contains("@") && email.length() >= 5) { ... }

// NotificationService:
if (email.contains("@") && email.length() >= 5) { ... }

// DRY → extract validateEmail() method?
// YAGNI → chỉ có 2 chỗ, extract có thực sự cần?
// KISS → shared utility tạo dependency, có cần không?
```

**Rule of Three:** Chỉ refactor/DRY khi thấy 3 lần trùng lặp, không phải 2.

### Trả lời Nâng cao

> **KISS, YAGNI, DRY không phải absolute rules — là guiding heuristics.** Context quyết định trọng số của từng nguyên tắc.

**Tension matrix:**

| Situation | Ưu tiên |
|---|---|
| **Startup MVP, deadline gần** | YAGNI > KISS > DRY (ship first) |
| **Long-term product, stable team** | DRY > KISS > YAGNI (maintainability) |
| **Library/SDK (external users)** | KISS > DRY > YAGNI (API clarity) |
| **Microservice boundary** | YAGNI + accept some duplication (loose coupling > DRY) |
| **Performance-critical path** | KISS (readable perf code) — YAGNI nếu optimization chưa measured |

**Practical framework:**
1. **Hỏi YAGNI trước**: "Cái này có thực sự cần không?" → Nếu không, stop.
2. **Nếu cần, áp dụng KISS**: "Cách đơn giản nhất để implement là gì?"
3. **Sau khi thấy pattern lặp 3 lần, áp dụng DRY**: "Bây giờ mới nên extract."

### Câu hỏi tình huống

**Junior dev nói: "Em theo DRY nên extract tất cả repeated code vào shared library chung cho 5 microservices." Bạn comment gì?**

→ DRY ở cấp độ microservice cần cẩn thận: shared library tạo **coupling giữa services**.
→ Update shared lib → phải redeploy tất cả services → mất independence của microservices.
→ Trong microservices, đôi khi **duplicate code ở ranh giới service là đúng** — mỗi service có domain model riêng.
→ DRY áp dụng mạnh nhất **trong 1 service/module**, không phải across services.

### Câu hỏi Trick

**Trick:** "3 nguyên tắc KISS, YAGNI, DRY — cái nào quan trọng nhất?"

→ Không có câu trả lời đúng duy nhất — nhưng nếu bắt buộc chọn: **YAGNI là nền tảng**.
→ Lý do: Nếu bạn không build những gì không cần → không có code phức tạp để KISS phải đơn giản hóa, không có code trùng lặp để DRY phải loại bỏ.
→ "The best code is no code at all." — Code không tồn tại không bao giờ cần được maintain.
