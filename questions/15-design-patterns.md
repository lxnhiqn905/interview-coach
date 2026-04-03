# Design Patterns

---

## Q1: Singleton vs Static Class — Khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | Singleton | Static Class |
|---|---|---|
| Instance | Có 1 instance duy nhất | Không có instance |
| Interface | Implement được | Không implement được |
| Kế thừa | Có thể extend | Không |
| Inject/Mock | Được | Không |
| State | Có thể có | Chỉ static state |
| Lazy init | Có thể | Không |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **Singleton** — như Giám đốc công ty. Chỉ có 1 người, có thể được giới thiệu ("inject") cho các phòng ban, có thể thay thế bằng quyền Giám đốc khi cần (mock).
>
> **Static class** — như bảng quy tắc treo tường. Ai cũng xem được, không ai "sở hữu" nó, không thể thay thế hay giả lập.

**Keyword để nhớ**: Singleton = **1 instance, có thể inject**. Static = **utility thuần túy, không state**.

**Câu hỏi tình huống**

> Bạn cần `DatabaseConnectionPool` dùng chung toàn app. Dùng Singleton hay Static class?

*Trả lời*: **Singleton** — vì:
- Connection pool cần lifecycle (khởi tạo, đóng khi shutdown)
- Cần implement interface để mock trong test
- Cần lazy initialization (tạo khi lần đầu dùng, không phải khi app start)

Static class không có lifecycle, không mock được → không phù hợp.

**Câu hỏi Trick**

**Trick 1**: Singleton trong môi trường multi-thread — vấn đề gì có thể xảy ra?

*Trả lời*: Race condition khi khởi tạo — 2 thread cùng check `instance == null`, cùng tạo mới → có 2 instance. Fix bằng **Double-Checked Locking**:

```
getInstance():
    Nếu instance null:          ← check lần 1 không lock (nhanh)
        synchronized:
            Nếu instance null:  ← check lần 2 trong lock (chắc chắn)
                tạo instance
    return instance
```

**Bẫy tiếp**: `volatile` keyword có cần thiết không?

*Trả lời*: Có — không có `volatile`, CPU có thể reorder instruction, thread khác thấy instance "không null" nhưng object chưa được khởi tạo xong (partially constructed object).

---

**Trick 2**: Singleton có vi phạm Single Responsibility Principle không?

*Trả lời*: Có — Singleton vừa lo **business logic** vừa lo **quản lý lifecycle của chính nó** (đảm bảo chỉ có 1 instance). 2 lý do thay đổi = vi phạm SRP. Trong thực tế với Spring, framework quản lý lifecycle (`@Bean`, `@Component`) — bạn chỉ viết business logic, không cần tự implement Singleton.

---

## Q2: Factory Method vs Abstract Factory — Khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | Factory Method | Abstract Factory |
|---|---|---|
| Tạo | 1 loại object | Họ nhiều object liên quan |
| Mở rộng | Thêm subclass | Thêm Factory mới |
| Phức tạp | Thấp hơn | Cao hơn |
| Dùng khi | 1 product, nhiều variant | Nhiều product phải đồng bộ nhau |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **Factory Method** — như xưởng bánh chỉ làm bánh mì. Có thể làm bánh mì trắng, bánh mì đen, bánh mì ngũ cốc — nhưng vẫn chỉ là bánh mì.
>
> **Abstract Factory** — như showroom nội thất. Bạn chọn style "hiện đại" thì ghế, bàn, đèn đều theo style hiện đại. Bạn chọn "cổ điển" thì tất cả đồng bộ cổ điển. Không thể trộn ghế hiện đại với bàn cổ điển.

**Keyword để nhớ**: Factory Method = **1 product, nhiều variant**. Abstract Factory = **nhiều product phải đồng bộ với nhau**.

**Câu hỏi tình huống**

> App cần hỗ trợ cả MySQL và PostgreSQL. Mỗi loại DB có `Connection`, `Query`, `Transaction` riêng và phải đồng bộ nhau (không dùng MySQL Connection với PostgreSQL Transaction). Dùng Factory nào?

*Trả lời*: **Abstract Factory** — tạo `MySqlFactory` và `PostgresFactory`, mỗi factory tạo ra bộ `Connection + Query + Transaction` đồng bộ:

```
MySqlFactory.createConnection()   → MySqlConnection
MySqlFactory.createTransaction()  → MySqlTransaction

PostgresFactory.createConnection() → PostgresConnection
PostgresFactory.createTransaction() → PostgresTransaction
```

Caller chỉ biết `DatabaseFactory` interface — muốn switch DB thì đổi factory, không sửa gì khác.

**Câu hỏi Trick**

**Trick 1**: Factory Pattern và **Dependency Injection** — có thể thay thế nhau không?

*Trả lời*: Không hoàn toàn — chúng giải quyết vấn đề khác nhau:
- **Factory**: Tập trung logic **tạo** object — khi cần object mới mỗi lần gọi, hoặc cần logic phức tạp để quyết định tạo cái gì
- **DI**: Inject dependency từ ngoài vào — thường là singleton, framework quản lý lifecycle

Trong Spring, thường dùng DI cho singleton beans, Factory cho object tạo nhiều lần (per-request, per-user).

---

**Trick 2**: Simple Factory không phải Design Pattern chính thức — tại sao vẫn dùng phổ biến?

*Trả lời*: Vì đơn giản và đủ dùng cho phần lớn trường hợp. Simple Factory chỉ vi phạm OCP (phải sửa Factory khi thêm loại mới), nhưng với hệ thống nhỏ hoặc ít thay đổi thì đánh đổi đó chấp nhận được. Không nên áp dụng pattern phức tạp hơn khi chưa cần.

---

## Q3: Strategy vs Template Method — Khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | Strategy | Template Method |
|---|---|---|
| Cơ chế | Composition (inject từ ngoài) | Inheritance (kế thừa) |
| Thay đổi | Runtime (đổi strategy lúc chạy) | Compile time (đã fix khi tạo subclass) |
| Khung thuật toán | Không có | Cố định trong parent |
| Linh hoạt | Cao hơn | Thấp hơn |
| Dùng khi | Cần đổi toàn bộ thuật toán | Giữ khung, chỉ đổi từng bước |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **Template Method** — như công thức nấu phở. Các bước cố định: hầm xương → nêm gia vị → cho bánh phở → thêm topping. Bước "thêm topping" mỗi nơi làm khác nhau (tái, chín, gà...) nhưng thứ tự không đổi.
>
> **Strategy** — như chọn phương tiện đi làm. Hôm nay đi xe máy, mai đi xe bus, mốt đi taxi — toàn bộ cách đi thay đổi hoàn toàn, không phải chỉ 1 bước.

**Keyword để nhớ**: Template Method = **giữ khung, đổi bước**. Strategy = **đổi cả thuật toán**.

**Câu hỏi tình huống**

> Hệ thống xuất báo cáo: luôn theo thứ tự — lấy data → xử lý → format → export. Nhưng mỗi loại báo cáo (PDF, Excel, CSV) format và export khác nhau. Dùng cái nào?

*Trả lời*: **Template Method** — khung 4 bước cố định, chỉ override bước "format" và "export":

```
BaoCao (abstract):
    xuatBaoCao():          ← final, không override được
        layData()          ← chung
        xuLy()             ← chung
        format()           ← abstract, mỗi loại tự implement
        export()           ← abstract, mỗi loại tự implement

BaoCaoPDF extends BaoCao:
    format() { ... }
    export() { ... }
```

Nếu thứ tự các bước cũng có thể thay đổi → dùng Strategy.

**Câu hỏi Trick**

**Trick 1**: Template Method dùng kế thừa — có vấn đề gì không?

*Trả lời*: **Inheritance is tight coupling** — subclass phụ thuộc chặt vào parent. Thay đổi parent có thể break subclass mà không hay. Nguyên tắc "Composition over Inheritance" khuyên ưu tiên Strategy (composition) hơn Template Method (inheritance) khi có thể.

---

**Trick 2**: Strategy Pattern lưu state giữa các lần gọi được không?

*Trả lời*: Được — Strategy là object bình thường, có thể có field. Nhưng nếu Strategy có state thì cần cẩn thận khi dùng chung giữa nhiều caller (thread safety). Tốt nhất nên làm Strategy **stateless** — mọi data cần thiết truyền qua parameter.

---

## Q4: Observer vs Event-Driven — Khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | Observer Pattern | Event-Driven (Message Queue) |
|---|---|---|
| Phạm vi | Trong 1 process | Giữa nhiều service/process |
| Coupling | Loose (qua interface) | Very loose (qua message) |
| Giao tiếp | Sync hoặc async | Async |
| Retry khi fail | Không tự động | Có (queue giữ message) |
| Tool | Spring Events, RxJava | Kafka, RabbitMQ, AWS SQS |
| Dùng khi | Trong app, ít subscriber | Microservices, cần reliability |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **Observer** — như loa phát thanh trong trường. Hiệu trưởng thông báo, tất cả lớp nghe. Nhưng nếu 1 lớp đang ngủ (service down) thì mất thông báo đó.
>
> **Message Queue** — như hòm thư. Hiệu trưởng bỏ thư vào hòm, từng lớp lấy ra đọc khi rảnh. Lớp đang ngủ thức dậy vẫn còn thư → không mất message.

**Keyword để nhớ**: Observer = **realtime, trong process**. Message Queue = **reliable, giữa service**.

**Câu hỏi tình huống**

> `UserService` sau khi tạo user cần: gửi email (có thể chậm), ghi audit log (phải đảm bảo), cập nhật cache (phải nhanh). Thiết kế thế nào?

*Trả lời*: Dùng kết hợp:
- **Cache update**: Sync Observer — phải xảy ra ngay, trong cùng transaction
- **Audit log**: Async Observer hoặc message queue — phải đảm bảo ghi được, retry nếu fail
- **Email**: Message queue (Kafka/SQS) — chậm được, không ảnh hưởng luồng chính, retry nếu email service down

**Câu hỏi Trick**

**Trick 1**: Observer đồng bộ (sync) trong Spring có vấn đề gì với transaction?

*Trả lời*: Nếu `saveUser()` đang trong transaction và publish event sync, subscriber chạy ngay trong cùng transaction đó. Nếu subscriber fail → rollback cả `saveUser()`. Dùng `@TransactionalEventListener(phase = AFTER_COMMIT)` để subscriber chỉ chạy **sau khi** transaction commit thành công — tránh rollback oan.

---

**Trick 2**: Làm thế nào đảm bảo message không bị mất và không bị xử lý 2 lần?

*Trả lời*:
- **Không mất**: Producer confirm message đã vào queue, consumer ack sau khi xử lý xong (không auto-ack)
- **Không duplicate**: **Idempotent consumer** — xử lý cùng 1 message 2 lần cho kết quả như nhau. Dùng message ID để check đã xử lý chưa. Trong thực tế "at-least-once delivery" phổ biến hơn "exactly-once" vì đơn giản hơn nhiều.

---

## Q5: Decorator vs Inheritance — Khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | Decorator | Inheritance |
|---|---|---|
| Cơ chế | Wrap object | Extend class |
| Thêm behavior | Runtime | Compile time |
| Kết hợp | Nhiều decorator stack lên nhau | Phải tạo class cho mỗi combo |
| Coupling | Lỏng | Chặt |
| Dùng khi | Thêm behavior tùy chọn, có thể kết hợp | Behavior cố định, IS-A rõ ràng |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> *Ví dụ*: Order cà phê. Cà phê đen = base. Thêm sữa = +15k. Thêm đường = +5k. Thêm whipping = +20k.
>
> **Inheritance**: Phải tạo class `CaPheSua`, `CaPheDuong`, `CaPheSuaDuong`, `CaPheSuaDuongWhipping`... — n topping thì 2ⁿ class.
>
> **Decorator**: `Whipping(Duong(Sua(CaPheĐen())))` — stack decorator lên nhau, mỗi lớp thêm behavior và giá, không cần tạo class mới.

**Keyword để nhớ**: Decorator = **thêm behavior động, có thể kết hợp tự do**. Inheritance = **behavior cố định từ thiết kế**.

**Câu hỏi tình huống**

> `UserRepository` cần thêm: logging mỗi query, caching kết quả, retry khi fail. Những feature này optional và có thể kết hợp tùy môi trường (prod dùng cả 3, test chỉ dùng logging). Dùng Decorator hay Inheritance?

*Trả lời*: **Decorator**:

```
UserRepository (interface)
    ↑
BaseUserRepository        ← logic thật
    ↑
LoggingUserRepository     ← wrap, thêm logging
    ↑
CachingUserRepository     ← wrap, thêm cache
    ↑
RetryUserRepository       ← wrap, thêm retry

Production: Retry(Caching(Logging(Base)))
Test:       Logging(Base)
```

Mỗi decorator độc lập, test riêng được, kết hợp tự do.

**Câu hỏi Trick**

**Trick 1**: Java I/O dùng Decorator Pattern. Nhận ra chỗ nào?

*Trả lời*:
```
new BufferedReader(
    new InputStreamReader(
        new FileInputStream("file.txt")))
```
`FileInputStream` = base. `InputStreamReader` = decorator thêm character encoding. `BufferedReader` = decorator thêm buffering. Stack decorator lên nhau, mỗi lớp thêm 1 tính năng.

---

**Trick 2**: Decorator và **Proxy Pattern** trông rất giống nhau. Khác nhau ở điểm gì?

*Trả lời*: Cùng cơ chế wrap, khác **mục đích**:
- **Decorator**: Thêm behavior mới cho object — mục đích là **enhance**
- **Proxy**: Kiểm soát truy cập vào object — mục đích là **control** (lazy load, access control, logging, caching)

> *Ví dụ*: Spring AOP `@Transactional`, `@Cacheable` là Proxy — không thêm business behavior, chỉ kiểm soát cách method được gọi.

---

## Q6: Builder Pattern — Khi nào dùng?

**Trả lời Basic** *(Builder Pattern là gì)*

Builder tách **quá trình xây dựng** object phức tạp khỏi **representation** của nó, cho phép tạo các loại object khác nhau bằng cùng 1 quá trình.

Dùng khi object có:
- Nhiều field, nhiều field optional
- Thứ tự set field không quan trọng
- Cần immutable object sau khi tạo xong

**Trả lời Nâng cao** *(Tình huống thực tế)*

> *Ví dụ*: Đặt hamburger. Bắt buộc: bánh mì, thịt. Tùy chọn: phô mai, dưa leo, cà chua, sốt. Không phải ai cũng muốn tất cả — Builder cho phép chọn từng thứ mà không cần constructor 10 tham số.

**Vấn đề Builder giải quyết — Telescoping Constructor**:

```
// Không dùng Builder — constructor hell
new User("Nam", "nam@email.com", null, null, null, true, false)
// Tham số thứ 5 là gì? Phải xem lại class

// Dùng Builder — tự documenting
new User.Builder("Nam", "nam@email.com")
    .phone("0901234567")
    .verified(true)
    .build()
```

**Câu hỏi tình huống**

> `UserData` có 10 field, chỉ 2 field bắt buộc. Nếu dùng constructor thì có bao nhiêu constructor cần tạo?

*Trả lời*: Tệ nhất cần 2⁸ = 256 constructor cho mọi tổ hợp 8 field optional. Thực tế không ai làm vậy — dùng Builder để set từng field cần, không set field không cần, gọi `build()` để validate và tạo object.

**Câu hỏi Trick**

**Trick 1**: Builder và **Object.setter** khác nhau thế nào?

*Trả lời*: Setter tạo object mutable — ai cũng set được bất kỳ lúc nào sau khi tạo, gây khó track state. Builder tạo object **immutable** — sau khi `build()` xong không ai thay đổi được, thread-safe tự nhiên, dễ reason về trạng thái của object.

---

**Trick 2**: Lombok `@Builder` annotation làm gì? Có trade-off không?

*Trả lời*: Tự generate Builder class lúc compile — không cần viết tay, tiết kiệm boilerplate. Trade-off: require field không được enforce tự động (phải dùng `@Builder.Default` hoặc `@NonNull`), và nếu thêm field mới vào class thì Builder tự update nhưng code gọi Builder không bị lỗi compile dù thiếu field mới — có thể tạo object thiếu data mà không hay.

---

## Q7: Adapter Pattern — Tích hợp hệ thống không tương thích

**Trả lời Basic** *(Phân biệt đặc điểm)*

> **Adapter** là cầu nối giữa 2 interface không tương thích — như cục chuyển đổi phích cắm giữa các nước.

```java
// Interface hệ thống mới
interface PaymentGateway {
    PaymentResult charge(String customerId, BigDecimal amount, String currency);
}

// Legacy library với interface khác (không thể sửa)
class StripeClient {
    StripeCharge createCharge(StripeChargeParams params) { ... }
}

// Adapter — wrap Stripe để khớp với interface mới
class StripePaymentAdapter implements PaymentGateway {
    private final StripeClient stripeClient;

    @Override
    public PaymentResult charge(String customerId, BigDecimal amount, String currency) {
        StripeChargeParams params = StripeChargeParams.builder()
            .customer(customerId)
            .amount(amount.multiply(BigDecimal.valueOf(100)).longValue()) // Stripe dùng cents
            .currency(currency)
            .build();
        StripeCharge charge = stripeClient.createCharge(params);
        return new PaymentResult(charge.getId(), charge.getStatus());
    }
}
```

**Câu hỏi tình huống**

> Bạn cần tích hợp 3 payment gateway (Stripe, VNPay, MoMo) với interface khác nhau. Thiết kế thế nào?

*Trả lời*: Định nghĩa `PaymentGateway` interface chuẩn của hệ thống, viết Adapter cho từng provider. Code business logic chỉ giao tiếp với `PaymentGateway` — không biết bên dưới là Stripe hay VNPay. Thêm provider mới chỉ cần viết thêm Adapter, không sửa business code.

**Câu hỏi Trick**

> Adapter vs Facade — khác nhau thế nào?

*Trả lời*:
- **Adapter**: Biến đổi interface **không tương thích** thành interface hệ thống đang dùng. 1-to-1 mapping
- **Facade**: Đơn giản hóa **subsystem phức tạp** bằng cách cung cấp interface đơn giản hơn. Ẩn nhiều class/logic phức tạp sau 1 interface đơn giản

---

## Q8: Proxy Pattern — Kiểm soát truy cập vào object

**Trả lời Basic** *(Phân biệt đặc điểm)*

> Proxy là object đại diện cho object thật — intercept request trước/sau khi gửi đến real object.

| Loại Proxy | Mục đích | Ví dụ |
|---|---|---|
| **Virtual Proxy** | Lazy loading | Không tạo object nặng đến khi cần |
| **Protection Proxy** | Access control | Kiểm tra quyền trước khi gọi |
| **Remote Proxy** | Local đại diện cho remote | RPC stub, REST client |
| **Caching Proxy** | Cache kết quả | Tránh gọi DB/API nhiều lần |

**Trả lời Nâng cao**

```java
// Spring AOP là Proxy Pattern
// @Transactional, @Cacheable, @PreAuthorize đều hoạt động qua Proxy

// Dynamic Proxy tự viết
public class LoggingProxy implements UserService {
    private final UserService target;

    @Override
    public User findById(Long id) {
        log.info("findById called with id={}", id);
        long start = System.currentTimeMillis();
        try {
            User result = target.findById(id);
            log.info("findById completed in {}ms", System.currentTimeMillis() - start);
            return result;
        } catch (Exception e) {
            log.error("findById failed", e);
            throw e;
        }
    }
}
```

**Câu hỏi tình huống**

> Cần thêm logging và metrics cho tất cả service method mà không sửa từng method. Spring AOP hay Proxy trực tiếp?

*Trả lời*: **Spring AOP** — AOP là Proxy Pattern automation. Viết `@Around` aspect áp dụng cho tất cả method match pointcut expression. Không cần sửa business code, không cần tạo Proxy class thủ công cho từng service. AOP là cách Spring implement `@Transactional`, `@Cacheable` — cùng nguyên lý.

**Câu hỏi Trick**

> Proxy Pattern và Decorator Pattern — nhìn code giống nhau, khác nhau thế nào?

*Trả lời*:
- **Proxy**: Kiểm soát **truy cập** vào object — client không nên (hoặc không cần) biết có proxy. Mục đích: access control, lazy init, logging
- **Decorator**: Thêm **behavior mới** vào object — thường client biết đang dùng decorator. Mục đích: thêm feature động, tránh subclass explosion

Ranh giới mờ trong thực tế, nhưng **intent khác nhau**: Proxy về access, Decorator về enhancement.

---

## Q9: Creational Patterns — Factory vs Builder vs Prototype — Khi nào dùng cái nào?

**Trả lời Basic** *(So sánh quyết định)*

| Pattern | Giải quyết | Dùng khi |
|---|---|---|
| **Factory Method** | Tạo object mà không biết class cụ thể | Subclass quyết định object nào được tạo |
| **Abstract Factory** | Tạo family of related objects | Cần tạo nhiều object liên quan nhau (UI theme) |
| **Builder** | Tạo object phức tạp từng bước | Object có nhiều optional parameter |
| **Prototype** | Clone object có sẵn | Tạo object mới bằng cách copy đắt hơn tạo mới |
| **Singleton** | Đảm bảo chỉ 1 instance | Shared resource (config, connection pool) |

**Quyết định nhanh:**
```
Object đơn giản, 1-3 param bắt buộc           → Constructor
Object có nhiều optional param                 → Builder
Không biết type cụ thể khi runtime            → Factory
Family of related objects phải compatible      → Abstract Factory
Cần clone object phức tạp                     → Prototype
Shared state, chỉ 1 instance                  → Singleton (cẩn thận)
```

**Trả lời Nâng cao**

```java
// Builder — khi có nhiều optional param
// ❌ Telescoping constructor anti-pattern
new Pizza("large", "thin", true, false, true, "cheese", "tomato");
// Ai biết param nào là gì?

// ✅ Builder
Pizza pizza = new Pizza.Builder("large")
    .crust("thin")
    .addTopping("cheese")
    .addTopping("tomato")
    .extraCheese(true)
    .build();

// Abstract Factory — cùng code, khác theme
interface UIFactory {
    Button createButton();
    TextField createTextField();
}

class DarkThemeFactory implements UIFactory { ... }
class LightThemeFactory implements UIFactory { ... }

// Client không biết theme nào đang dùng
UIFactory factory = isDarkMode ? new DarkThemeFactory() : new LightThemeFactory();
Button btn = factory.createButton();  // Đúng theme tự động
```

**Câu hỏi Trick**

> Lombok `@Builder` auto-generate Builder — có cần hiểu Builder Pattern không?

*Trả lời*: **Có** — Lombok tạo ra Builder nhưng vẫn cần hiểu: khi nào dùng Builder (vs constructor), `@Builder` với required field phải dùng `@NonNull` hoặc custom constructor để validate, và `toBuilder()` để clone và modify object immutable. Không hiểu pattern → dùng `@Builder` nhưng bỏ qua validation → object bị tạo với state không hợp lệ.

---

## Q10: Anti-patterns — Những pattern trông đúng nhưng thực ra sai

**Trả lời Basic** *(Anti-patterns phổ biến)*

| Anti-pattern | Biểu hiện | Hậu quả | Fix |
|---|---|---|---|
| **God Object** | 1 class làm mọi thứ (UserManager, AppController) | Khó test, khó maintain | SRP — tách trách nhiệm |
| **Spaghetti Code** | Logic rối rắm, nhiều goto/nested | Không ai hiểu code | Refactor, design pattern |
| **Golden Hammer** | Dùng 1 tool/pattern cho mọi vấn đề | Giải pháp không phù hợp | Chọn đúng tool |
| **Copy-paste Programming** | Duplicate code khắp nơi | Sửa 1 chỗ quên sửa chỗ khác | DRY, Extract Method |
| **Premature Optimization** | Optimize trước khi biết bottleneck | Phức tạp không cần thiết | Profile trước, optimize sau |
| **Magic Numbers** | `if (code == 42)` | Không ai hiểu 42 là gì | Named constant/Enum |

**Trả lời Nâng cao**

> **Singleton anti-pattern** — khi Singleton trở thành God Object:

```java
// ❌ Singleton bị lạm dụng
public class AppContext {
    private static AppContext instance;
    private UserService userService;
    private OrderService orderService;
    private PaymentService paymentService;
    private Config config;
    // ... 20 services khác
    // Singleton chứa toàn bộ app → global state → không testable
}

// ✅ Dùng DI Container (Spring) thay thế
// Spring IoC container manage lifecycle, không cần Singleton thủ công
@Service // Mặc định là Singleton scope trong Spring
public class UserService { ... }
```

**Câu hỏi tình huống**

> Team Junior thêm feature bằng cách copy-paste class `OrderProcessor` thành `ExpressOrderProcessor`, sửa 2 dòng. Bạn review thế nào?

*Trả lời*: Đây là **Copy-paste Programming / code duplication** — khi fix bug trong `OrderProcessor`, phải nhớ sửa cả `ExpressOrderProcessor`. Review comment:
1. Xác định điểm khác nhau giữa 2 class (chỉ 2 dòng)
2. Đề xuất: Dùng **Strategy Pattern** hoặc **Template Method** — base class `OrderProcessor` có flow chung, Express override phần khác biệt
3. Hoặc đơn giản hơn: 1 class `OrderProcessor` với parameter `ProcessingMode` (STANDARD/EXPRESS)

**Câu hỏi Trick**

> "Premature optimization is the root of all evil" — Knuth. Có phải optimization lúc nào cũng sai?

*Trả lời*: Chỉ **premature** optimization mới sai. Optimization đúng lúc:
1. **Profile trước** — biết đâu là bottleneck thực sự (thường không phải chỗ bạn nghĩ)
2. **Optimize sau khi có data** — benchmark trước và sau
3. **Không sacrifice readability** cho micro-optimization vô nghĩa (cái loop 100ms đó chạy 1 lần/giờ, không cần optimize)
4. **Architecture optimization** (chọn đúng data structure, algorithm) thì làm sớm — không phải premature
