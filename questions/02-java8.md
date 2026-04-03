# Java 8+

---

## Q1: `Stream` vs `For Loop` — Khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | For Loop | Stream |
|---|---|---|
| Paradigm | Imperative (how) | Declarative (what) |
| Parallel | Tự xử lý | `parallelStream()` built-in |
| Lazy evaluation | Không | Có (chỉ xử lý khi có terminal op) |
| Debug | Dễ (breakpoint từng bước) | Khó hơn |
| Break sớm | `break`/`continue` | `findFirst()`, `takeWhile()` |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **For loop** — như làm theo công thức từng bước: đập trứng → khuấy → đổ vào chảo. Kiểm soát hoàn toàn từng bước.
>
> **Stream** — như máy pha cà phê: bỏ nguyên liệu vào, bấm nút, nhận kết quả. Không cần biết bên trong làm gì, chỉ cần khai báo muốn gì.

```java
// Lọc học sinh đậu, lấy tên, sắp xếp A-Z
students.stream()
    .filter(s -> s.getDiem() >= 5)
    .map(Student::getTen)
    .sorted()
    .collect(toList());
```

**Keyword để nhớ**: For loop = **kiểm soát từng bước**, Stream = **pipeline rõ ý định**.

**Câu hỏi tình huống**

> Bạn cần tìm **phần tử đầu tiên** trong list 1 triệu phần tử thỏa điều kiện. Dùng for loop hay Stream? Tại sao?

*Trả lời*: Stream với `findFirst()` — nhờ **lazy evaluation**, Stream dừng ngay khi tìm thấy phần tử đầu tiên, không xử lý toàn bộ list. For loop cũng làm được với `break`, nhưng Stream biểu đạt ý định rõ hơn.

**Câu hỏi Trick**

**Trick 1**: `parallelStream()` có phải lúc nào cũng nhanh hơn `stream()` không?

*Trả lời*: Không. `parallelStream()` dùng **ForkJoinPool chung** của JVM. Nếu task có I/O (DB call, HTTP request), thread bị block → làm chậm cả application. Chỉ hiệu quả khi task **CPU-bound, stateless, không side effect**, và collection đủ lớn để bù overhead của việc chia task.

**Bẫy tiếp**: Nếu dùng `parallelStream()` với `forEach()` để ghi vào một `ArrayList`, vấn đề gì xảy ra?

*Trả lời*: Race condition — `ArrayList` không thread-safe. Kết quả bị mất hoặc corrupt. Phải dùng `collect(toList())` thay vì `forEach` + add vào list bên ngoài.

---

**Trick 2**: Stream có thể tái sử dụng (reuse) sau khi đã gọi terminal operation không?

*Trả lời*: Không — Stream chỉ dùng được **một lần**. Sau khi gọi terminal operation (`collect`, `forEach`, `count`...), stream bị đóng. Gọi lại sẽ throw `IllegalStateException`. Phải tạo stream mới từ source.

---

## Q2: `Optional` — Dùng đúng vs sai

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | Đúng | Sai |
|---|---|---|
| Mục đích | Return type của method có thể không có giá trị | Field của class, parameter của method |
| Thay thế | Null check rõ ràng | Không thay thế được hoàn toàn null |
| Serialize | Không nên serialize | Không dùng làm JSON field |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **Optional** — như hộp quà có thể rỗng. Thay vì mở hộp và bị ngạc nhiên (NullPointerException), bạn kiểm tra hộp có quà không trước khi mở.

**Câu hỏi tình huống**

> Đồng nghiệp viết code như này. Bạn thấy vấn đề gì?

```java
Optional<User> user = userRepo.findById(id);
if (user.isPresent()) {
    return user.get().getName();
} else {
    return "Unknown";
}
```

*Trả lời*: Code đúng nhưng không dùng Optional idiomatically — bản chất vẫn là null check. Nên viết:

```java
return userRepo.findById(id)
    .map(User::getName)
    .orElse("Unknown");
```

**Câu hỏi Trick**

**Trick 1**: `Optional.get()` có thể throw exception không?

*Trả lời*: Có — throw `NoSuchElementException` nếu Optional rỗng. Gọi `get()` mà không check `isPresent()` trước thì không khác gì dùng null. Nên dùng `orElse()`, `orElseGet()`, `orElseThrow()` thay thế.

---

**Trick 2**: Sự khác nhau giữa `orElse()` và `orElseGet()` là gì?

*Trả lời*: `orElse(value)` **luôn evaluate** giá trị dù Optional có giá trị hay không. `orElseGet(supplier)` chỉ gọi supplier **khi Optional rỗng** — lazy evaluation. Nếu default value là kết quả của một phép tính tốn kém (DB call, HTTP request), dùng `orElseGet` để tránh lãng phí.

```java
// Luôn gọi fetchDefault() dù user có tồn tại
.orElse(fetchDefaultUser())

// Chỉ gọi fetchDefault() khi không tìm thấy user
.orElseGet(() -> fetchDefaultUser())
```

---

## Q3: Lambda và Functional Interface — Dùng đúng

**Trả lời Basic** *(Phân biệt đặc điểm)*

| Functional Interface | Method | Dùng khi |
|---|---|---|
| `Predicate<T>` | `test(T)` → boolean | Filter, kiểm tra điều kiện |
| `Function<T,R>` | `apply(T)` → R | Transform, map |
| `Consumer<T>` | `accept(T)` → void | Side effect (print, save) |
| `Supplier<T>` | `get()` → T | Lazy creation, factory |
| `BiFunction<T,U,R>` | `apply(T,U)` → R | 2 input, 1 output |

**Trả lời Nâng cao**

```java
// Predicate — filter
Predicate<String> isLong = s -> s.length() > 5;
Predicate<String> startsWithA = s -> s.startsWith("A");

// Combine predicates
list.stream().filter(isLong.and(startsWithA)).collect(toList());

// Function — transform
Function<String, Integer> toLength = String::length;
Function<Integer, String> toStr = i -> "Length: " + i;

// Compose: f.andThen(g) = g(f(x))
Function<String, String> combined = toLength.andThen(toStr);
combined.apply("hello"); // "Length: 5"
```

**Câu hỏi Trick**

> `@FunctionalInterface` annotation có bắt buộc không?

*Trả lời*: Không — nhưng **nên dùng**. Annotation này yêu cầu compiler kiểm tra interface chỉ có đúng 1 abstract method. Nếu vô tình thêm method thứ 2, sẽ bị compile error thay vì lambda bị break silently.

---

## Q4: Method Reference — 4 loại và khi nào dùng

**Trả lời Basic**

| Loại | Syntax | Tương đương lambda |
|---|---|---|
| Static method | `ClassName::staticMethod` | `x -> ClassName.staticMethod(x)` |
| Instance method (object cụ thể) | `instance::method` | `x -> instance.method(x)` |
| Instance method (type) | `ClassName::instanceMethod` | `x -> x.method()` |
| Constructor | `ClassName::new` | `x -> new ClassName(x)` |

**Trả lời Nâng cao**

```java
List<String> names = List.of("Alice", "Bob", "Charlie");

// Static method reference
names.stream().map(String::valueOf).collect(toList());

// Instance method trên type — method gọi trên chính element
names.stream().map(String::toUpperCase).collect(toList()); // x -> x.toUpperCase()

// Instance method trên object cụ thể
PrintStream printer = System.out;
names.forEach(printer::println); // x -> printer.println(x)

// Constructor reference
names.stream().map(StringBuilder::new).collect(toList()); // x -> new StringBuilder(x)
```

**Câu hỏi Trick**

> `System.out::println` là loại method reference nào?

*Trả lời*: **Instance method reference trên object cụ thể** (`System.out` là instance của `PrintStream`). Tương đương `x -> System.out.println(x)`.

---

## Q5: Date/Time API (Java 8) — LocalDate, LocalDateTime, ZonedDateTime

**Trả lời Basic**

| Class | Dùng khi |
|---|---|
| `LocalDate` | Chỉ cần ngày (birthday, due date) |
| `LocalTime` | Chỉ cần giờ (business hours) |
| `LocalDateTime` | Ngày + giờ, không cần timezone |
| `ZonedDateTime` | Cần timezone (event scheduling, log) |
| `Instant` | Machine timestamp (UTC epoch) |
| `Duration` | Khoảng thời gian tính theo giây/nano |
| `Period` | Khoảng thời gian tính theo ngày/tháng/năm |

**Trả lời Nâng cao**

```java
// Immutable — mọi operation trả về object mới
LocalDate today = LocalDate.now();
LocalDate nextWeek = today.plusDays(7);  // today không đổi

// Parse / format
LocalDate date = LocalDate.parse("2024-01-15");
String formatted = date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

// Timezone — luôn dùng ZonedDateTime khi lưu/hiển thị
ZonedDateTime vietnamTime = ZonedDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
ZonedDateTime utcTime = vietnamTime.withZoneSameInstant(ZoneOffset.UTC);

// Khoảng cách
long days = ChronoUnit.DAYS.between(LocalDate.of(2024, 1, 1), today);
```

**Câu hỏi Trick**

> `LocalDateTime` vs `ZonedDateTime` — khi lưu vào DB nên dùng cái nào?

*Trả lời*: **`Instant` hoặc `ZonedDateTime`** — lưu UTC. `LocalDateTime` không có timezone info → khi server đổi timezone hoặc app deploy ở nhiều region, data bị interpret sai. Best practice: lưu UTC trong DB, convert sang local timezone khi hiển thị cho user.

---

## Q6: `var` (Local Variable Type Inference) — Java 10

**Trả lời Basic**

`var` cho phép compiler tự suy ra kiểu dữ liệu của local variable — giảm boilerplate mà không mất type safety.

```java
// Trước Java 10
Map<String, List<Integer>> map = new HashMap<String, List<Integer>>();

// Với var
var map = new HashMap<String, List<Integer>>();

// Iterator
for (var entry : map.entrySet()) {
    System.out.println(entry.getKey() + ": " + entry.getValue());
}
```

**Trả lời Nâng cao**

> `var` là **compile-time feature** — không phải dynamic typing như Python/JavaScript. Bytecode vẫn có kiểu cụ thể, compiler chỉ giúp bạn không phải viết lại.

**Khi KHÔNG dùng var:**
```java
// Sai — không rõ type là gì
var result = service.process(data);

// Đúng — khi type rõ ràng từ right-hand side
var users = new ArrayList<User>();
var count = 0;
```

**Câu hỏi Trick**

> `var` có dùng được cho field, parameter, return type không?

*Trả lời*: Không — `var` chỉ dùng được cho **local variable**. Không dùng được cho class fields, method parameters, return types, lambda parameters (trừ một số trường hợp trong Java 11+). Lý do: compiler cần đủ context tại điểm khai báo để suy ra type.

---

## Q7: Stream Collectors — collect() nâng cao

**Trả lời Basic**

```java
// Nhóm theo field
Map<String, List<User>> byCity = users.stream()
    .collect(Collectors.groupingBy(User::getCity));

// Đếm theo nhóm
Map<String, Long> countByCity = users.stream()
    .collect(Collectors.groupingBy(User::getCity, Collectors.counting()));

// Partition (2 nhóm: true/false)
Map<Boolean, List<User>> partitioned = users.stream()
    .collect(Collectors.partitioningBy(u -> u.getAge() >= 18));

// Join string
String names = users.stream()
    .map(User::getName)
    .collect(Collectors.joining(", ", "[", "]")); // [Alice, Bob, Charlie]
```

**Câu hỏi Trick**

> `toList()` (Java 16+) vs `collect(Collectors.toList())` — khác nhau gì?

*Trả lời*: `toList()` trả về **unmodifiable list**, `Collectors.toList()` trả về mutable list (thường là `ArrayList`). Từ Java 10 có `Collectors.toUnmodifiableList()`. Nếu cần add/remove sau khi collect, dùng `Collectors.toList()` hoặc `Collectors.toCollection(ArrayList::new)`.

---

## Q8: Record (Java 16) và Sealed Class (Java 17) — Dùng khi nào?

**Trả lời Basic**

**Record** — immutable data carrier, auto-generate `equals`, `hashCode`, `toString`, getters:

```java
// Thay vì class với 20 dòng boilerplate
public record Point(int x, int y) {}

Point p = new Point(3, 4);
p.x();      // getter
p.equals(new Point(3, 4));  // true
```

**Sealed Class** — giới hạn class nào được kế thừa:

```java
sealed interface Shape permits Circle, Rectangle, Triangle {}

record Circle(double radius) implements Shape {}
record Rectangle(double width, double height) implements Shape {}
```

**Trả lời Nâng cao**

> Kết hợp Sealed + Record + Pattern Matching tạo ra algebraic data types:

```java
double area(Shape shape) {
    return switch (shape) {
        case Circle c    -> Math.PI * c.radius() * c.radius();
        case Rectangle r -> r.width() * r.height();
        case Triangle t  -> 0.5 * t.base() * t.height();
        // Compiler biết đã cover hết cases — không cần default
    };
}
```

**Câu hỏi Trick**

> Record có thể có custom method không? Có thể mutable không?

*Trả lời*: Có thể có **custom method** (instance method, static method, compact constructor). Nhưng fields luôn **final và private** — không thể mutable. Nếu cần "update" một field, phải tạo record mới:
```java
Point moved = new Point(p.x() + 1, p.y()); // p không đổi
```

---

## Q9: Lazy Evaluation trong Stream — Hiểu đúng để tránh bẫy

**Trả lời Basic** *(So sánh)*

| | Intermediate Operation | Terminal Operation |
|---|---|---|
| Ví dụ | `filter`, `map`, `sorted`, `distinct` | `collect`, `forEach`, `count`, `findFirst` |
| Thực thi | **Lazy** — không chạy ngay | **Eager** — kích hoạt toàn bộ pipeline |
| Số lần gọi | Chỉ khi cần (short-circuit possible) | Đúng 1 lần |
| Return | Stream (tiếp tục chain) | Kết quả cuối |

**Trả lời Nâng cao**

```java
// Lazy — filter và map chưa chạy ở đây
Stream<String> stream = names.stream()
    .filter(s -> { System.out.println("filter: " + s); return s.length() > 3; })
    .map(s -> { System.out.println("map: " + s); return s.toUpperCase(); });

System.out.println("Stream created, nothing ran yet");

// Terminal operation → bây giờ mới chạy
Optional<String> first = stream.findFirst();
// Output: "filter: Alice", "map: Alice" — chỉ xử lý đến khi tìm được cái đầu tiên
```

**Short-circuit với `findFirst()`**: List có 1 triệu phần tử, `filter` chỉ pass 1 phần tử đầu → chỉ xử lý đến phần tử đó, không duyệt hết list.

**Câu hỏi Trick**

> Stream pipeline có `sorted()` ở giữa — `findFirst()` có còn lazy không?

*Trả lời*: **Không hoàn toàn** — `sorted()` là **stateful operation**, phải duyệt hết tất cả phần tử trước khi sort, sau đó mới `findFirst()` lấy phần tử đầu. Nếu mục tiêu là lấy phần tử đầu theo điều kiện, tránh đặt `sorted()` trước `filter` khi không cần.

---

## Q10: Comparable vs Comparator — Khi nào dùng cái nào?

**Trả lời Basic** *(So sánh quyết định)*

| | `Comparable<T>` | `Comparator<T>` |
|---|---|---|
| Implement ở | Chính class đó | Class ngoài hoặc lambda |
| Định nghĩa | "Natural order" của object | Ordering tùy chỉnh |
| Method | `compareTo(T other)` | `compare(T o1, T o2)` |
| Dùng | 1 cách sort duy nhất | Nhiều cách sort khác nhau |
| Thay đổi | Phải sửa class gốc | Không cần sửa class gốc |

**Trả lời Nâng cao**

```java
// Comparable — class tự biết so sánh thế nào
public class Employee implements Comparable<Employee> {
    private String name;
    private int salary;

    @Override
    public int compareTo(Employee other) {
        return this.name.compareTo(other.name); // Natural order: theo tên
    }
}

// Comparator — sort theo nhiều cách khác nhau, không sửa class
Comparator<Employee> bySalary = Comparator.comparingInt(Employee::getSalary);
Comparator<Employee> byNameThenSalary = Comparator
    .comparing(Employee::getName)
    .thenComparingInt(Employee::getSalary);

list.sort(bySalary);
list.sort(byNameThenSalary);
```

**Câu hỏi Trick**

> `compareTo()` phải return gì? Trả về `1`, `-1`, `0` hay có thể trả về số bất kỳ?

*Trả lời*: **Số bất kỳ** — chỉ cần: âm (this < other), 0 (bằng nhau), dương (this > other). Bẫy kinh điển là dùng phép trừ làm shortcut: `return this.age - other.age` — nguy hiểm khi có số âm (integer overflow: `-2147483648 - 1 = 2147483647` dương). Dùng `Integer.compare(this.age, other.age)` thay thế.
