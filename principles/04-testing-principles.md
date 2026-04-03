# Topic 04: Testing Principles

## Q1: FIRST — Tiêu chí của một test tốt

**Nguyên tắc:** Test tốt phải thỏa mãn 5 tiêu chí: **F**ast, **I**solated, **R**epeatable, **S**elf-validating, **T**imely.

### Trả lời Basic

| Tiêu chí | Nghĩa | Vi phạm ví dụ | Fix |
|---|---|---|---|
| **Fast** | Chạy trong milliseconds | Test gọi real DB, sleep(1000) | Mock dependencies, in-memory DB |
| **Isolated** | Không phụ thuộc test khác | Test B fail vì Test A thay đổi global state | Reset state, no shared mutable state |
| **Repeatable** | Kết quả giống nhau mọi lần, mọi môi trường | Test dùng `new Date()`, random, network | Mock thời gian, seed random |
| **Self-validating** | Tự pass/fail không cần con người đọc output | `System.out.println` thay vì `assert` | Dùng assertions |
| **Timely** | Viết gần lúc code (TDD: trước) | Viết test sau khi code đã stable 6 tháng | TDD hoặc viết test trong cùng PR |

**Ví dụ vi phạm từng tiêu chí:**
```java
// ❌ Not Fast + Not Isolated + Not Repeatable
@Test
void testCreateUser() {
  Thread.sleep(2000); // Wait for some async thing
  User user = realUserService.createUser("test@email.com"); // Real DB
  // Fails if another test created "test@email.com" first → Not Isolated
  // Fails on Friday 13th → Not Repeatable (nếu có birthday logic)
  System.out.println("User: " + user); // Not Self-validating
  // Written 6 months after code → Not Timely
}

// ✅ FIRST compliant
@Test
void createUser_withValidEmail_returnsUserWithId() {
  // Fast: mock repository
  when(userRepository.save(any())).thenReturn(new User(1L, "test@email.com"));
  
  User result = userService.createUser("test@email.com");
  
  // Self-validating: assertion fails automatically
  assertThat(result.getId()).isNotNull();
  assertThat(result.getEmail()).isEqualTo("test@email.com");
}
```

### Trả lời Nâng cao

> **Fast test suite = fast feedback loop = higher productivity.** Google có rule: unit test phải chạy < 1ms. Nếu toàn bộ unit test suite > 1 phút → devs ngại chạy → bugs slip through.

**Test pyramid về speed:**
```
E2E Tests      (slow: seconds - minutes) → chạy ít, CI only
Integration    (medium: 100ms - 1s)      → chạy moderate
Unit Tests     (fast: <1ms - 10ms)       → chạy nhiều, every save
```

**Isolation techniques:**
```java
// @BeforeEach — reset state before each test
@BeforeEach
void setUp() {
  MockitoAnnotations.openMocks(this);
  userRepository.deleteAll(); // clean state nếu dùng in-memory DB
}

// Clock abstraction để test time-dependent logic
public class ExpiryService {
  private final Clock clock; // inject Clock, not use System.currentTimeMillis()
  
  public boolean isExpired(LocalDate expiry) {
    return expiry.isBefore(LocalDate.now(clock));
  }
}

// Test với fixed clock
Clock fixedClock = Clock.fixed(Instant.parse("2024-01-15T00:00:00Z"), ZoneOffset.UTC);
ExpiryService service = new ExpiryService(fixedClock);
assertTrue(service.isExpired(LocalDate.of(2024, 1, 14)));
```

### Câu hỏi tình huống

**Test suite có 500 tests, chạy 15 phút. Devs không chạy locally, chỉ chờ CI. Làm sao cải thiện?**

→ Profile: `mvn test -Dsurefire.reportsDirectory` + xem test nào chậm nhất.
→ Tách slow integration test ra profile riêng: `mvn test -P unit` chạy nhanh.
→ Parallelize: `@Execution(ExecutionMode.CONCURRENT)` JUnit 5.
→ Replace slow tests: test gọi real HTTP → mock HTTP client.
→ Goal: unit test suite < 30 giây, integration test suite < 5 phút.

### Câu hỏi Trick

**Trick:** "Test Isolated có nghĩa là mỗi test phải chạy một mình, không dùng class khác?"

→ **Không** — Isolated nghĩa là test không phụ thuộc **state** từ test khác.
→ Test có thể dùng nhiều class thật (đó là integration test — vẫn ok).
→ Vấn đề là: Test A tạo data, Test B assume data đó tồn tại — fail nếu chạy riêng.
→ Isolated = test có thể chạy **theo bất kỳ thứ tự nào** và cho kết quả giống nhau.

---

## Q2: Arrange, Act, Assert (AAA) — Cấu trúc test chuẩn

**Nguyên tắc:** Mỗi test có 3 phần rõ ràng: Setup → Execute → Verify.

### Trả lời Basic

```java
@Test
void withdraw_withSufficientBalance_reducesBalance() {
  // ARRANGE — setup preconditions
  BankAccount account = new BankAccount("ACC001", 1_000_000);
  
  // ACT — execute the unit under test
  account.withdraw(300_000);
  
  // ASSERT — verify expected outcome
  assertThat(account.getBalance()).isEqualTo(700_000);
}
```

**Tại sao AAA quan trọng:**
- **Readability**: Ai đọc test biết ngay: "test này chuẩn bị gì, làm gì, expect gì"
- **Single concern**: 1 test = 1 behavior = 1 Act block
- **Debugging**: Khi test fail → biết ngay fail ở phase nào

**Naming convention kết hợp với AAA:**
```java
// Pattern: methodName_condition_expectedResult
void withdraw_withInsufficientBalance_throwsException()
void createUser_withDuplicateEmail_returnsConflictError()
void calculateDiscount_forGoldMember_returns20Percent()
```

### Trả lời Nâng cao

> **Given/When/Then** = BDD style = AAA với tên khác. Cucumber, Spock dùng GWT. JUnit dùng AAA. Cùng concept.

```java
// AAA (JUnit)
@Test
void orderTotal_withDiscount_isCorrect() {
  // Arrange
  Order order = new Order(List.of(new Item("Book", 100_000)));
  DiscountService discountService = new DiscountService();
  
  // Act
  double total = discountService.calculateTotal(order, 0.1);
  
  // Assert
  assertThat(total).isEqualTo(90_000);
}

// GWT (Spock - Groovy, hoặc comment style)
@Test
void orderTotal_withDiscount_isCorrect() {
  // Given
  Order order = new Order(List.of(new Item("Book", 100_000)));
  
  // When
  double total = discountService.calculateTotal(order, 0.1);
  
  // Then
  assertThat(total).isEqualTo(90_000);
}
```

**AAA violations và fix:**
```java
// ❌ Multiple Acts — test 2 behaviors cùng lúc
@Test
void testUserLifecycle() {
  User user = userService.create("test@email.com"); // Act 1
  assertThat(user.isActive()).isTrue();
  
  userService.deactivate(user.getId()); // Act 2
  assertThat(user.isActive()).isFalse();
}

// ✅ Tách thành 2 tests
@Test void createUser_isActiveByDefault() { ... }
@Test void deactivateUser_setsActiveToFalse() { ... }
```

### Câu hỏi tình huống

**Test method dài 100 dòng, có nhiều Assert blocks. Làm sao clean up?**

→ Nguyên tắc: 1 test = 1 behavior.
→ Nhìn số lượng Act blocks → đó là số tests bạn cần.
→ Shared Arrange code → `@BeforeEach` hoặc helper method.
→ Nhiều Assert cho cùng 1 behavior → ok, nhưng dùng `SoftAssertions` để không stop ở first failure.

```java
// SoftAssertions — collect all failures
@Test
void createUser_returnsCompleteUserObject() {
  User user = userService.create(new CreateUserRequest("John", "john@email.com"));
  
  SoftAssertions softly = new SoftAssertions();
  softly.assertThat(user.getId()).isNotNull();
  softly.assertThat(user.getName()).isEqualTo("John");
  softly.assertThat(user.getEmail()).isEqualTo("john@email.com");
  softly.assertThat(user.isActive()).isTrue();
  softly.assertAll(); // report all failures, not just first
}
```

### Câu hỏi Trick

**Trick:** "Assert thấy test pass mà không có Arrange và Act — test đó có giá trị không?"

→ **Không** — đây là "tautology test" hay "vacuous test".
```java
// ❌ Tautology — luôn pass, không test gì
@Test
void testNothing() {
  String s = "hello";
  assertThat(s).isNotNull(); // s never null vì bạn vừa assign
}
```
→ Passing tests không có nghĩa là tested behavior. Coverage 100% với tautology tests = useless.
→ Mutation testing (PIT) phát hiện weak tests: thay đổi production code → test vẫn pass → test kém.

---

## Q3: Unit vs Integration vs E2E — Test Pyramid

**So sánh:** 3 loại test có trade-offs khác nhau về speed, confidence, và cost.

### Trả lời Basic

| Loại | Test gì | Tốc độ | Confidence | Cost | Số lượng |
|---|---|---|---|---|---|
| **Unit** | Một class/function độc lập | Nhanh nhất (<10ms) | Thấp | Thấp | Nhiều nhất (70%) |
| **Integration** | Nhiều component cùng nhau | Trung bình (100ms-1s) | Trung bình | Trung bình | Vừa (20%) |
| **E2E** | Toàn bộ flow từ UI đến DB | Chậm nhất (1s-1min) | Cao nhất | Cao nhất | Ít nhất (10%) |

```
       /\
      /  \  E2E (few, slow, confident)
     /----\
    / Integ\  Integration (some, medium)
   /--------\
  /   Unit   \  Unit (many, fast, isolated)
 /____________\
```

**Ví dụ từng loại:**
```java
// Unit Test — mock mọi dependency
@Test
void calculateDiscount_goldMember_20percent() {
  User user = mock(User.class);
  when(user.getTier()).thenReturn("GOLD");
  
  double discount = discountService.calculate(user, 100_000);
  
  assertThat(discount).isEqualTo(20_000);
}

// Integration Test — dùng real database (H2 in-memory)
@SpringBootTest
@Transactional
void createUser_persistsToDatabase() {
  userService.createUser(new CreateUserRequest("John", "john@email.com"));
  
  Optional<User> found = userRepository.findByEmail("john@email.com");
  assertThat(found).isPresent();
}

// E2E Test — real browser, real API
void checkoutFlow_completesSuccessfully() {
  driver.get("http://localhost:3000");
  driver.findElement(By.id("add-to-cart")).click();
  driver.findElement(By.id("checkout")).click();
  // ... full user journey
  assertThat(driver.findElement(By.id("success-message")).isDisplayed()).isTrue();
}
```

### Trả lời Nâng cao

> **Test Trophy (Kent C. Dodds)** là biến thể modern của Test Pyramid, nhấn mạnh Integration Tests hơn.

**Test Trophy:**
```
     /\
    /E2E\    (small)
   /------\
  / Integ  \  (MOST — focus here)
 /----------\
/    Unit    \  (fewer than pyramid)
/____________\
     Static Analysis (TypeScript, linting)
```

**Tại sao integration tests quan trọng:**
- Unit test với mock không phát hiện bug khi mock sai assumption
- Integration test phát hiện integration issues (query sai, mapping error)
- "Write tests. Not too many. Mostly integration." — Guillermo Rauch

**Khi nào mock và khi nào không:**
```java
// Mock khi:
// - External service (email, SMS, payment gateway)
// - Slow operations (HTTP call, heavy computation)
// - Non-deterministic (current time, random)
// - Test behavior, not integration

// Không mock (dùng real):
// - Database với in-memory (H2, embedded MongoDB)
// - Internal services bạn own
// - Khi muốn test actual integration
```

### Câu hỏi tình huống

**Team có 95% unit tests, coverage 90%, nhưng production vẫn có nhiều bug. Vấn đề là gì?**

→ "Testing ice cream cone" — too many unit tests, too few integration/E2E.
→ Unit tests với mocks = test code in isolation, không test how pieces fit together.
→ Bug thường ở integration points: DB queries, API contracts, event format.
→ Action: Add integration tests cho critical paths (order creation, payment, auth).
→ Metric không nên là coverage % — mà là "critical user flows có test không?".

### Câu hỏi Trick

**Trick:** "E2E test confidence cao nhất, tại sao không viết tất cả là E2E?"

→ E2E chậm → slow feedback loop → dev ngại chạy → bugs slip through.
→ E2E flaky (brittle) — network timeout, UI timing, test order dependency.
→ E2E fail = hard to debug (toàn bộ stack, không biết lỗi ở đâu).
→ Cost: maintain E2E test cao nhất — UI thay đổi → test phải update.
→ Rule: E2E chỉ test **happy path của critical user journeys** (checkout, login, core workflow).

---

## Q4: Test Doubles — Mock vs Stub vs Spy vs Fake vs Dummy

**So sánh:** 5 loại "fake objects" trong testing, mỗi loại có mục đích khác nhau.

### Trả lời Basic

| Type | Làm gì | Verify? | Ví dụ |
|---|---|---|---|
| **Dummy** | Object được pass nhưng không dùng | Không | `null`, `new Object()` khi method cần param |
| **Stub** | Return fixed value khi được gọi | Không | `when(repo.find(1L)).thenReturn(user)` |
| **Fake** | Implementation đơn giản, thực sự hoạt động | Không | In-memory repository thay real DB |
| **Spy** | Wrap real object, track calls | Có | `spy(realService)` — verify method được gọi |
| **Mock** | Verify behavior, specify expectations | Có | `verify(emailService).send(any())` |

**Code ví dụ:**
```java
// Dummy — không quan tâm giá trị
void testMethodThatNeedsLogger() {
  Logger dummyLogger = mock(Logger.class); // không setup, không verify
  MyService service = new MyService(dummyLogger);
  service.doSomething(); // dummyLogger không được dùng trong logic này
}

// Stub — return fixed data
@Test
void getUser_returnsUserFromRepository() {
  User stubUser = new User(1L, "John");
  when(userRepository.findById(1L)).thenReturn(Optional.of(stubUser)); // stub
  
  User result = userService.getUser(1L);
  assertThat(result.getName()).isEqualTo("John");
  // Không verify userRepository.findById() được gọi
}

// Mock — verify interaction
@Test
void createUser_sendsWelcomeEmail() {
  when(userRepository.save(any())).thenReturn(savedUser);
  
  userService.createUser(new CreateUserRequest("john@email.com"));
  
  verify(emailService).sendWelcomeEmail("john@email.com"); // verify behavior
}

// Fake — real implementation, simplified
class InMemoryUserRepository implements UserRepository {
  private Map<Long, User> store = new HashMap<>();
  
  @Override
  public User save(User user) { store.put(user.getId(), user); return user; }
  
  @Override
  public Optional<User> findById(Long id) { return Optional.ofNullable(store.get(id)); }
}
// Dùng trong test thay real DB — nhanh, không cần cleanup

// Spy — track real object
@Test
void processOrder_callsInventoryUpdate() {
  InventoryService realInventory = new InventoryService();
  InventoryService spyInventory = spy(realInventory); // wrap real object
  
  orderService.process(order, spyInventory);
  
  verify(spyInventory).updateStock(order.getProductId(), order.getQuantity());
}
```

### Trả lời Nâng cao

> **Trong Mockito, mock() và spy() đều create test doubles, nhưng behavior khác nhau:**

```java
// mock() — tất cả methods return default (null, 0, false)
UserRepository mockRepo = mock(UserRepository.class);
mockRepo.save(user); // returns null by default
mockRepo.findById(1L); // returns null by default

// spy() — gọi real method trừ khi stub
UserService spyService = spy(new UserService(realRepo));
spyService.createUser(request); // gọi REAL createUser()
doReturn(mockUser).when(spyService).validateUser(any()); // stub 1 method
```

**Khi nào dùng gì:**

| Scenario | Test Double |
|---|---|
| Test business logic, không cần dependency behavior | Mock + Stub |
| Test method gọi dependency đúng không | Mock + verify() |
| Test nhiều components cùng nhau, không cần real DB | Fake (InMemory) |
| Test 1 method của real class, mock các method khác | Spy |
| Method cần param nhưng không dùng đến | Dummy |

**Over-mocking là anti-pattern:**
```java
// ❌ Mock quá nhiều — test chỉ test mock setup, không test behavior
@Test
void createOrder_doesSomething() {
  when(productService.getProduct(any())).thenReturn(product);
  when(inventoryService.check(any())).thenReturn(true);
  when(pricingService.calculate(any())).thenReturn(100.0);
  when(discountService.apply(any(), any())).thenReturn(90.0);
  when(orderRepository.save(any())).thenReturn(savedOrder);
  when(eventPublisher.publish(any())).thenReturn(null);
  
  orderService.createOrder(request);
  
  verify(orderRepository).save(any()); // verify chỉ 1 thing sau 20 lines setup?
}
// Nếu mock assumptions sai → test pass, production fail
```

### Câu hỏi tình huống

**Test đang dùng mock database, nhưng query sai (sai column name) → unit test pass, production fail. Fix thế nào?**

→ Đây là lý do cần integration test với real database (H2 in-memory).
→ Unit test với mock DB vẫn có giá trị: test business logic, not queries.
→ Thêm layer: Repository integration test với `@DataJpaTest` (real JPA, H2).

```java
@DataJpaTest // chỉ load JPA layer, in-memory H2
class UserRepositoryTest {
  @Autowired UserRepository userRepository;
  
  @Test
  void findByEmail_returnsUser_whenExists() {
    userRepository.save(new User("John", "john@email.com"));
    
    Optional<User> found = userRepository.findByEmail("john@email.com");
    assertThat(found).isPresent(); // tests REAL query, not mock
  }
}
```

### Câu hỏi Trick

**Trick:** "Mock verify rằng method được gọi. Nhưng nếu implementation thay đổi mà behavior vẫn đúng — test sẽ fail. Đây có phải vấn đề không?"

→ **Có** — đây là "over-specification" hoặc "brittle test".
→ Test nên verify **outcome/behavior**, không phải **implementation detail**.
→ Rule: Verify `mock.method()` chỉ khi calling that method **IS** the behavior bạn muốn test (e.g., email được gửi, event được publish).
→ Không verify internal helper methods, không verify sequence of calls trừ khi sequence is the contract.
→ "Test behavior, not implementation" — testing implementation detail là red flag.
