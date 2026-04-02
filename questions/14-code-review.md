# Code Review — SOLID & Clean Code

---

## Q1: Nhìn vào đoạn code này, bạn thấy vấn đề gì?

**Đề bài**

```java
public class UserManager {
    private String username;
    private String email;
    private String password;
    private Database database;

    public void saveUser() {
        String connectionString = "jdbc:mysql://localhost:3306/mydb";
        String dbUser = "admin";
        String dbPassword = "password123";

        database.connect(connectionString, dbUser, dbPassword);
        database.executeQuery("INSERT INTO users VALUES ('"
            + username + "', '" + email + "', '" + password + "')");
        database.disconnect();
    }

    public void deleteUser() {
        String connectionString = "jdbc:mysql://localhost:3306/mydb";
        String dbUser = "admin";
        String dbPassword = "password123";

        database.connect(connectionString, dbUser, dbPassword);
        database.executeQuery("DELETE FROM users WHERE username = '" + username + "'");
        database.disconnect();
    }
}
```

---

**Trả lời Basic** *(Liệt kê vấn đề)*

Có **4 vấn đề** rõ ràng:

1. **Hardcode credentials** — `"admin"`, `"password123"` nằm thẳng trong code → bất kỳ ai đọc code đều thấy password DB
2. **SQL Injection** — string concat trực tiếp vào query → attacker truyền `'; DROP TABLE users; --` là xóa sạch DB
3. **DRY violation** — logic kết nối DB bị lặp y hệt ở `saveUser()` và `deleteUser()` → sửa 1 chỗ phải nhớ sửa chỗ kia
4. **SRP violation** — `UserManager` vừa quản lý dữ liệu user, vừa lo kết nối DB → 2 lý do để thay đổi class này

---

**Trả lời Nâng cao** *(Giải thích từng vấn đề)*

**Hardcode credentials**
> Như viết mật khẩu két sắt lên bảng trắng văn phòng. Ai vào cũng thấy — developer, intern, người review PR.

Fix: đọc từ biến môi trường hoặc secret manager, không bao giờ commit credential vào code.

**SQL Injection**
> Như nhân viên ngân hàng đọc to tên khách hàng và số tài khoản lên micro phát thanh nội bộ — ai nghe thấy cũng dùng được.

Fix: dùng parameterized query — truyền giá trị như tham số, không nối chuỗi trực tiếp.

**DRY (Don't Repeat Yourself)**
> Nếu đổi DB sang PostgreSQL, phải sửa 2 chỗ. Lần sau thêm `updateUser()` thì lại thêm lần thứ 3. Lỗi chỉ xảy ra ở 1 chỗ nhưng dev chỉ fix 1 trong 2 → bug tiềm ẩn.

Fix: tách logic kết nối ra 1 method hoặc 1 class riêng.

**SRP (Single Responsibility Principle)**
> `UserManager` đang làm 2 việc: *quản lý user* và *thao tác database*. Khi đổi DB thì phải sửa class này, khi đổi business logic user cũng phải sửa class này → 2 lý do thay đổi = vi phạm SRP.

Fix: tách ra `UserRepository` chỉ lo DB, `UserManager` chỉ lo business logic.

---

**Câu hỏi tình huống**

> Code này đang chạy trên production. Bạn ưu tiên fix theo thứ tự nào?

*Trả lời*: Ưu tiên theo **mức độ nguy hiểm**:

1. **SQL Injection trước** — có thể bị khai thác ngay, data breach hoặc mất toàn bộ DB
2. **Hardcode credentials** — revoke credentials cũ, chuyển sang secret manager
3. **DRY** — refactor để tránh bug tương lai, không urgent bằng security
4. **SRP** — cải thiện maintainability, làm khi có sprint refactor

---

**Câu hỏi Trick**

**Trick 1**: Password của user đang được lưu thẳng vào DB (`'" + password + "'`). Vấn đề gì?

*Trả lời*: **Plain text password** — nếu DB bị breach, hacker có ngay toàn bộ mật khẩu. Phải hash password trước khi lưu, dùng thuật toán chậm như **bcrypt** hoặc **Argon2** (không dùng MD5/SHA1 vì quá nhanh, dễ brute force).

---

**Trick 2**: Nếu `database.connect()` thành công nhưng `executeQuery()` throw exception, `disconnect()` có được gọi không?

*Trả lời*: Không — vì không có `try/finally`. Connection bị leak, theo thời gian connection pool cạn kiệt → app không connect được DB nữa. Fix: dùng `try/finally` hoặc `try-with-resources` để đảm bảo `disconnect()` luôn được gọi dù có exception hay không.

---

## Q2: SOLID — 5 nguyên tắc, nhận diện vi phạm

**Đề bài**

```java
public abstract class User {
    public abstract void saveUser();
    public abstract void deleteUser();
    public abstract void sendEmail();
    public abstract void generateReport();
}

public class AdminUser extends User {
    @Override
    public void sendEmail() {
        throw new UnsupportedOperationException("Admin cannot send emails");
    }
    // các method khác implement bình thường
}
```

---

**Trả lời Basic** *(5 nguyên tắc SOLID)*

| Nguyên tắc | Viết tắt | Nghĩa ngắn gọn |
|---|---|---|
| Single Responsibility | SRP | 1 class = 1 lý do để thay đổi |
| Open/Closed | OCP | Mở để extend, đóng để modify |
| Liskov Substitution | LSP | Subclass phải thay thế được parent |
| Interface Segregation | ISP | Interface nhỏ, không ép implement thứ không cần |
| Dependency Inversion | DIP | Phụ thuộc vào abstraction, không phụ thuộc vào implementation |

Code trên vi phạm **2 nguyên tắc**:
- **ISP**: `User` ép `AdminUser` implement `sendEmail()` dù Admin không cần
- **LSP**: `AdminUser.sendEmail()` throw exception thay vì hoạt động bình thường → không thể dùng `AdminUser` thay thế `User` an toàn

---

**Trả lời Nâng cao** *(Giải thích bằng ví dụ)*

**ISP vi phạm**
> Như hợp đồng lao động bắt tất cả nhân viên ký cam kết "biết lái xe tải", kể cả kế toán và lập trình viên. Họ không cần skill đó nhưng vẫn phải ký.

Fix: tách thành các interface nhỏ:
```
interface UserSaver     { void saveUser(); }
interface UserDeleter   { void deleteUser(); }
interface EmailSender   { void sendEmail(); }
interface ReportGen     { void generateReport(); }

AdminUser implements UserSaver, UserDeleter, ReportGen
// Không implements EmailSender → không bị ép implement
```

**LSP vi phạm**
> Như lớp con `HinhVuong` kế thừa `HinhChuNhat`. Khi set chiều dài, chiều rộng cũng thay đổi theo → behavior của parent bị phá vỡ. Code dùng `HinhChuNhat` không dùng được `HinhVuong` thay thế.

Fix: `AdminUser` không nên kế thừa method mà nó không support. Dùng interface segregation để chỉ implement những gì thực sự cần.

---

**Câu hỏi tình huống**

> Code đang dùng `User user = new AdminUser()`. Nếu gọi `user.sendEmail()` thì sao?

*Trả lời*: Runtime exception — `UnsupportedOperationException`. Caller không biết trước điều này vì nhìn vào type `User` thấy có `sendEmail()` method. Đây là bẫy nguy hiểm: compile pass, runtime crash. Đúng ra subclass phải **mở rộng** behavior của parent, không được **phá vỡ** behavior.

---

**Câu hỏi Trick**

**Trick 1**: `UserManager` đang khởi tạo `Database` bên trong constructor. Vi phạm nguyên tắc nào?

```java
public UserManager(...) {
    this.database = new Database(); // ← vấn đề ở đây
}
```

*Trả lời*: **DIP (Dependency Inversion)** — `UserManager` đang phụ thuộc trực tiếp vào `Database` (concrete class). Nếu muốn đổi sang PostgreSQL hoặc mock trong test thì phải sửa `UserManager`.

Fix: truyền `DatabaseConnection` (interface) vào constructor — ai muốn dùng DB nào thì truyền implementation tương ứng vào:

```
UserManager(DatabaseConnection db) ← nhận interface
    // test: truyền MockDatabase
    // prod: truyền MySqlDatabase
```

---

**Trick 2**: `validateUser()` hiện tại check username, email, password. Nếu thêm rule mới (ví dụ: username không được có ký tự đặc biệt), phải sửa method này. Vi phạm nguyên tắc nào?

*Trả lời*: **OCP (Open/Closed)** — class phải **đóng** với modification (không sửa code cũ) nhưng **mở** với extension (thêm rule mới mà không đụng code cũ).

Fix: tạo interface `ValidationRule`, mỗi rule là 1 class riêng, `UserValidator` chạy qua danh sách rules:

```
List<ValidationRule> rules = [
    new UsernameRule(),
    new EmailRule(),
    new PasswordRule(),
    new NoSpecialCharRule()  ← thêm mới, không sửa code cũ
]
```

---

## Q3: DRY — Nhận diện và refactor

**Đề bài**

> Trong code gốc, `saveUser()` và `deleteUser()` đều có đoạn kết nối DB giống hệt nhau. Bạn sẽ refactor thế nào?

---

**Trả lời Basic**

Nhận diện duplicate: 3 dòng lặp lại y hệt trong 2 method (và có thể nhiều hơn trong tương lai):

```
String connectionString = "jdbc:mysql://localhost:3306/mydb";
String dbUser = "admin";
String dbPassword = "password123";
database.connect(connectionString, dbUser, dbPassword);
```

Fix đơn giản nhất: tách ra method riêng:

```
private void connectDatabase() {
    database.connect(CONNECTION_STRING, DB_USER, DB_PASSWORD);
}
```

---

**Trả lời Nâng cao**

DRY không chỉ là "không lặp code" — còn là **không lặp kiến thức**. Ví dụ trong code gốc:

- `validateUser()` check email format
- `updateEmail()` cũng check email format → **cùng 1 kiến thức** bị viết 2 lần

Nếu sau này đổi rule email (thêm check domain), phải nhớ sửa cả 2 chỗ. Fix: tách `isEmailValid()` ra 1 method duy nhất, cả 2 chỗ gọi vào.

> *Ví dụ*: Quy tắc tính thuế được viết trong cả code lẫn trong document. Khi luật thuế đổi, phải cập nhật 2 chỗ — lỡ quên 1 chỗ là bug.

---

**Câu hỏi tình huống**

> Sau khi refactor tách DB connection ra riêng, đồng nghiệp review PR nói "over-engineering, chỉ có 2 chỗ dùng thôi". Bạn phản biện thế nào?

*Trả lời*: "Hiện tại có 2 chỗ, nhưng sau này sẽ có `updateUser()`, `findUser()`, `listUsers()`... Nếu không tách ngay, mỗi method mới sẽ copy thêm 1 lần nữa. Và khi đổi DB host, phải tìm sửa ở nhiều chỗ thay vì 1 chỗ — đó là nguồn gốc của bug."

---

**Câu hỏi Trick**

**Trick 1**: Copy-paste code vs DRY violation — có phải lúc nào cũng phải tránh duplicate không?

*Trả lời*: Không — **Rule of Three**: lần đầu viết thẳng, lần 2 chấp nhận duplicate, lần 3 mới refactor. Tách quá sớm khi chỉ có 2 chỗ đôi khi tạo abstraction không cần thiết, khó đọc hơn. Nhưng với code liên quan đến **security hoặc business rule** thì nên tách ngay từ lần 2 vì rủi ro cao nếu 2 chỗ không đồng bộ.

---

**Trick 2**: Corrected.java vẫn còn SQL Injection trong `UserRepository`. Bạn có nhận ra không?

```java
dbConnection.executeQuery("INSERT INTO users VALUES ('"
    + userData.getUsername() + "', ...)");
```

*Trả lời*: Đúng — refactor SOLID xong nhưng quên fix SQL Injection. Đây là lỗi thường gặp khi refactor: tập trung vào structure mà bỏ qua security. **Code review phải check cả 2**: structure/design và security. Checklist review nên có mục riêng cho input validation và parameterized query.

---

## Q4: Strategy Pattern — Thay đổi hành vi mà không sửa code cũ

**Đề bài**

> `validateUser()` trong code gốc check cứng 3 rule: username, email, password. Mỗi lần thêm rule mới phải vào sửa method này. Dùng **Strategy Pattern** để giải quyết thế nào?

---

**Trả lời Basic** *(Strategy Pattern là gì)*

Strategy Pattern cho phép **đổi thuật toán/hành vi lúc runtime** mà không sửa class đang dùng nó.

Gồm 3 phần:
- **Strategy interface**: định nghĩa hành vi chung
- **Concrete Strategy**: các implementation cụ thể
- **Context**: class dùng strategy, không biết bên trong làm gì

```
«interface»              «interface»
ValidationRule           DatabaseConnection
    isValid()                connect()
      ↑                       ↑
UsernameRule          MySqlConnection
EmailRule             PostgresConnection
PasswordRule
```

---

**Trả lời Nâng cao** *(Tình huống thực tế)*

> *Ví dụ*: Ứng dụng bản đồ có thể chỉ đường theo nhiều cách — đi bộ, xe máy, ô tô. Thay vì 1 method khổng lồ có `if (mode == "car")... else if (mode == "bike")...`, mỗi cách đi là 1 Strategy riêng. Muốn thêm "đi tàu" thì thêm class mới, không sửa code cũ.

Trong code `Corrected.java`, đây chính là cách `UserValidator` được thiết kế:

```
List<ValidationRule> rules = new ArrayList<>();
rules.add(new UsernameRule());
rules.add(new EmailRule());
rules.add(new PasswordRule());
// Thêm rule mới: chỉ thêm class, không sửa Validator
rules.add(new NoSpecialCharRule());
```

**Keyword để nhớ**: Strategy = **hành vi có thể hoán đổi**, tách **what** (làm gì) khỏi **how** (làm thế nào).

---

**Câu hỏi tình huống**

> Hệ thống có 2 loại user: `FreeUser` validate đơn giản, `PremiumUser` validate thêm nhiều rule hơn. Dùng Strategy Pattern thiết kế thế nào?

*Trả lời*:

```
FreeUserValidator   → [UsernameRule, EmailRule, PasswordRule]
PremiumUserValidator → [UsernameRule, EmailRule, PasswordRule,
                        PhoneRule, AddressRule, PaymentRule]

UserManager nhận vào 1 Validator bất kỳ
→ không biết và không cần biết loại nào
→ muốn đổi rule thì đổi Validator truyền vào, không sửa UserManager
```

---

**Câu hỏi Trick**

**Trick 1**: Strategy Pattern và if/else khác nhau thế nào? Khi nào nên dùng cái nào?

*Trả lời*:
- **if/else**: Đơn giản, phù hợp khi có ít case và ít thay đổi
- **Strategy**: Phù hợp khi có nhiều behavior, thêm/bớt thường xuyên, hoặc cần test từng behavior độc lập

> Rule of thumb: Nếu thấy `if/else` hoặc `switch` với nhiều nhánh liên quan đến "loại" → xem xét Strategy.

---

**Trick 2**: Strategy Pattern và **Template Method Pattern** khác nhau thế nào?

*Trả lời*:
- **Strategy**: Thay cả thuật toán — inject từ ngoài vào qua interface
- **Template Method**: Giữ khung thuật toán cố định, chỉ cho override từng bước — dùng kế thừa

> *Ví dụ*: Công thức làm bánh (Template Method) — các bước: trộn bột → nướng → trang trí. Bước "trang trí" mỗi loại bánh làm khác nhau nhưng thứ tự không đổi. Strategy thì thay cả công thức làm bánh.

---

## Q5: Factory Pattern — Tạo object mà không cần biết class cụ thể

**Đề bài**

> Trong `Corrected.java`, `Main` đang tạo `MySqlDatabaseConnection` trực tiếp:
>
> ```java
> DatabaseConnection db = new MySqlDatabaseConnection("jdbc:mysql://...", "admin", "pass");
> ```
>
> Nếu sau này cần switch sang PostgreSQL hoặc dùng mock trong test, phải sửa `Main`. Dùng **Factory Pattern** để giải quyết thế nào?

---

**Trả lời Basic** *(Factory Pattern là gì)*

Factory Pattern **tập trung logic tạo object** vào 1 nơi. Caller chỉ nói "tôi cần cái này" mà không biết nó được tạo thế nào.

```
Không có Factory:
    Main → new MySqlDatabaseConnection(...)   ← phụ thuộc cụ thể

Có Factory:
    Main → DatabaseFactory.create()
               → tùy config trả về MySQL hoặc Postgres
```

---

**Trả lời Nâng cao** *(Tình huống thực tế)*

> *Ví dụ*: Gọi taxi qua app — bạn chỉ nói "tôi cần xe từ A đến B". App quyết định gửi xe 4 chỗ hay 7 chỗ, tài xế nào gần nhất. Bạn không cần biết và không nên biết — đó là việc của Factory.

**3 biến thể phổ biến**:

| | Simple Factory | Factory Method | Abstract Factory |
|---|---|---|---|
| Tạo object | 1 method static | Override trong subclass | Tạo cả họ object |
| Mở rộng | Sửa Factory | Thêm subclass mới | Thêm Factory mới |
| Phức tạp | Thấp | Trung bình | Cao |

---

**Câu hỏi tình huống**

> Test `UserRepository` cần dùng DB giả (không connect thật). Dùng Factory giải quyết thế nào?

*Trả lời*:

```
Production:
    DatabaseFactory.create("mysql") → MySqlDatabaseConnection

Test:
    DatabaseFactory.create("mock")  → MockDatabaseConnection
                                       (không connect thật, trả về data cố định)

UserRepository nhận DatabaseConnection interface
→ không biết thật hay mock → test chạy nhanh, không cần DB thật
```

---

**Câu hỏi Trick**

**Trick 1**: Factory Pattern và **Dependency Injection** khác nhau thế nào? Có thể dùng cả 2 cùng nhau không?

*Trả lời*:
- **Factory**: Object tự đi lấy dependency — gọi Factory để tạo
- **DI**: Dependency được truyền từ ngoài vào — không tự đi lấy

Dùng cùng nhau được và thường thấy trong thực tế: **DI Container** (Spring) chính là Factory tự động — bạn khai báo cần gì, framework tạo và inject vào, không cần `new` thủ công.

---

**Trick 2**: Khi nào **không nên** dùng Factory?

*Trả lời*: Khi object đơn giản, chỉ có 1 implementation, không có khả năng thay đổi → Factory thêm tầng abstraction không cần thiết. Ví dụ: tạo `new ArrayList()` không cần Factory. Over-engineering là vấn đề thực tế — thêm pattern chỉ khi giải quyết được vấn đề cụ thể.

---

## Q6: Singleton Pattern — Dùng đúng và dùng sai

**Đề bài**

> `Database` trong code gốc được tạo mới mỗi lần `UserManager` khởi tạo. Nếu có 100 `UserManager`, có 100 `Database` object. Singleton có giải quyết được không?

---

**Trả lời Basic** *(Singleton là gì)*

Singleton đảm bảo **chỉ có đúng 1 instance** của class trong toàn bộ application, cung cấp 1 điểm truy cập global.

```
Lần 1: DatabasePool.getInstance() → tạo mới, lưu lại
Lần 2: DatabasePool.getInstance() → trả về cái đã tạo, không tạo mới
Lần n: DatabasePool.getInstance() → vẫn trả về cái đó
```

---

**Trả lời Nâng cao** *(Tình huống thực tế)*

> *Ví dụ*: Trong văn phòng chỉ có 1 máy in. Ai cũng dùng chung cái đó, không ai mang máy in riêng đến. Singleton là cơ chế đảm bảo "chỉ có 1 máy in duy nhất".

**Dùng đúng cho**:
- **Connection Pool** — pool kết nối DB dùng chung, không tạo mới mỗi request
- **Config/Settings** — đọc config 1 lần, dùng nhiều nơi
- **Logger** — 1 logger cho toàn app

**Dùng sai (anti-pattern) khi**:
- Business logic → khó test, khó mock
- Mutable state dùng chung → race condition trong multi-thread

---

**Câu hỏi tình huống**

> Singleton `DatabasePool` đang được nhiều thread cùng gọi `getInstance()` lần đầu tiên. Vấn đề gì xảy ra?

*Trả lời*: **Race condition** — 2 thread cùng thấy instance là null, cùng tạo mới → có 2 instance. Fix bằng **Double-Checked Locking**:

```
getInstance():
    Nếu instance null:            ← check lần 1 (không lock, nhanh)
        Lock lại
        Nếu instance vẫn null:   ← check lần 2 (trong lock, chắc chắn)
            Tạo instance mới
    Trả về instance
```

---

**Câu hỏi Trick**

**Trick 1**: Singleton khó test vì sao? Làm thế nào để test code có dùng Singleton?

*Trả lời*: Singleton là global state — test này chạy xong để lại state ảnh hưởng test sau. Không inject được mock vào vì caller tự gọi `getInstance()`.

Fix khi cần test: thêm method `resetInstance()` chỉ dùng trong test, hoặc tốt hơn là dùng **Dependency Injection** thay vì Singleton — inject instance qua constructor, test truyền mock vào dễ dàng.

---

**Trick 2**: Singleton và **static class** khác nhau thế nào? Khi nào dùng cái nào?

*Trả lời*:
- **Static class**: Không có instance, không implement interface, không truyền làm tham số được
- **Singleton**: Có instance, có thể implement interface → mock được, inject được, đa hình được

> Nếu cần 1 object dùng chung có thể mock hoặc extend → Singleton. Nếu chỉ là utility function thuần túy không có state → static class.

---

## Q7: Observer Pattern — Thông báo khi có sự kiện

**Đề bài**

> Sau khi `saveUser()` thành công, hệ thống cần: gửi email chào mừng, ghi audit log, và cập nhật analytics. Nếu sau này thêm "gửi SMS", phải sửa `saveUser()`. Dùng **Observer Pattern** giải quyết thế nào?

---

**Trả lời Basic** *(Observer Pattern là gì)*

Observer Pattern cho phép object **tự động thông báo** cho các subscriber khi có sự kiện, mà không cần biết subscriber là ai.

Gồm 2 phần:
- **Publisher (Subject)**: phát sự kiện — `UserService`
- **Subscriber (Observer)**: lắng nghe và phản ứng — `EmailService`, `AuditLogger`, `AnalyticsService`

```
saveUser() thành công
    → publish "UserCreated" event
        → EmailService nhận → gửi email
        → AuditLogger nhận → ghi log
        → AnalyticsService nhận → cập nhật metric
```

---

**Trả lời Nâng cao** *(Tình huống thực tế)*

> *Ví dụ*: Bạn subscribe YouTube channel. Khi channel đăng video mới (publish), YouTube tự thông báo đến tất cả subscriber. Channel không cần biết ai đang xem, không cần gọi từng người — cứ đăng là subscriber tự nhận.

**Lợi ích so với code gốc**:

```
Trước (tight coupling):
saveUser() {
    emailService.sendWelcome()    ← phải biết EmailService
    auditLogger.log()             ← phải biết AuditLogger
    analytics.track()             ← phải biết AnalyticsService
}

Sau (loose coupling):
saveUser() {
    eventBus.publish("UserCreated", user)  ← chỉ biết EventBus
    // ai subscribe thì tự nhận, saveUser không quan tâm
}
```

**Keyword để nhớ**: Observer = **publish/subscribe**, loose coupling, dễ thêm subscriber mới mà không sửa publisher.

---

**Câu hỏi tình huống**

> Trong Spring Boot, cơ chế nào implement Observer Pattern sẵn?

*Trả lời*: **ApplicationEvent + @EventListener**:

```
Publisher: eventPublisher.publishEvent(new UserCreatedEvent(user))
Subscriber: @EventListener void onUserCreated(UserCreatedEvent e) { ... }
```

Thêm subscriber mới chỉ cần thêm `@EventListener` method ở bất kỳ đâu — không sửa publisher. Với Kafka/RabbitMQ là Observer Pattern ở tầng distributed.

---

**Câu hỏi Trick**

**Trick 1**: Nếu subscriber bị lỗi (email service down), có ảnh hưởng đến `saveUser()` không?

*Trả lời*: Phụ thuộc vào cách implement:
- **Synchronous**: Subscriber chạy cùng thread → lỗi subscriber = rollback cả transaction. Nguy hiểm nếu email down mà user không save được
- **Asynchronous** (`@Async` hoặc message queue): Subscriber chạy thread khác → lỗi subscriber không ảnh hưởng luồng chính. User được save, email gửi sau hoặc retry

Với tính năng phụ (email, analytics) nên dùng async để không block luồng chính.

---

**Trick 2**: Observer Pattern và **Event-Driven Architecture** liên quan thế nào?

*Trả lời*: Observer Pattern là **nền tảng lý thuyết**, Event-Driven Architecture là **áp dụng ở quy mô hệ thống**. Kafka, RabbitMQ, AWS SNS/SQS đều là Observer Pattern ở tầng distributed — publisher không biết consumer, consumer subscribe topic/queue mà không ảnh hưởng publisher. Microservices giao tiếp async qua event chính là Observer Pattern ở scale lớn.

---

## Q8: Review Security — Những lỗ hổng hay bị bỏ sót

**Trả lời Basic** *(Checklist khi review)*

| Lỗ hổng | Dấu hiệu trong code |
|---|---|
| **IDOR** | `findById(id)` không kiểm tra ownership |
| **SQL Injection** | String concatenation trong query |
| **Path Traversal** | Dùng user input làm file path |
| **Log Sensitive Data** | Log `password`, `token`, `ssn` |
| **Hardcoded Secret** | String chứa `password=`, `apiKey=` |
| **Mass Assignment** | `user.updateAll(request.body)` |
| **Insecure Deserialization** | Deserialize từ user input không validate |

**Trả lời Nâng cao**

```java
// Bỏ sót IDOR — code nhìn có vẻ ổn
public Order getOrder(Long orderId) {
    return orderRepo.findById(orderId).orElseThrow();
    // ❌ Ai cũng xem được order của người khác nếu đoán được ID
}

// Fix
public Order getOrder(Long orderId, Long currentUserId) {
    Order order = orderRepo.findById(orderId).orElseThrow();
    if (!order.getUserId().equals(currentUserId)) throw new ForbiddenException();
    return order;
}

// Mass Assignment bị bỏ sót
public User updateUser(Long id, Map<String, Object> fields) {
    User user = userRepo.findById(id).orElseThrow();
    user.setAll(fields); // ❌ Attacker có thể set role=ADMIN, isAdmin=true...
    return userRepo.save(user);
}

// Fix — dùng DTO rõ ràng với chỉ field được phép update
public User updateUser(Long id, UpdateUserDto dto) { ... }
```

**Câu hỏi tình huống**

> Bạn review PR của junior dev. Code trông functional và clean, nhưng endpoint `/api/invoice/{id}/download` chỉ kiểm tra user đã login chứ không kiểm tra invoice thuộc về user đó. Developer nói "auth middleware đã check rồi". Bạn xử lý thế nào?

*Trả lời*: Giải thích rõ sự khác nhau giữa **Authentication** (đã login) và **Authorization** (có quyền với resource này). Auth middleware chỉ verify token, không biết resource ownership. Đây là lỗ hổng **IDOR** — bất kỳ user đã login nào đều có thể download invoice của người khác bằng cách thay đổi `id` trong URL. Request changes và suggest pattern đúng. Nếu codebase có nhiều endpoint tương tự, đề xuất review toàn bộ hoặc thêm rule vào code review checklist.

**Câu hỏi Trick**

> Reviewer có nên chạy SAST tool (SonarQube) thay vì review security thủ công không?

*Trả lời*: SAST và manual review **bổ sung cho nhau**, không thay thế nhau. SAST tốt cho: SQL injection (pattern-based), dependency CVE, hardcoded secret. SAST kém cho: **IDOR** (cần hiểu business logic), insecure design, race condition. Manual review bắt được những gì SAST bỏ sót vì cần hiểu context. Best practice: SAST trong CI/CD pipeline, manual security review cho feature liên quan đến auth/authorization.
