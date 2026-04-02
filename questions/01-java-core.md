# Java Core

---

## Q1: Abstract Class vs Interface — Khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | Abstract Class | Interface |
|---|---|---|
| Kế thừa | Chỉ `extends` 1 class | `implements` nhiều interface |
| Constructor | Có | Không |
| Fields | Có state (instance variables) | Chỉ `public static final` |
| Method | Có thể có body (non-abstract) | Default từ Java 8, còn lại abstract |
| Access modifier | Bất kỳ | `public` |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **Abstract class** — dùng khi các object **cùng bản chất (IS-A)**, có code/state thực sự để share.
>
> *Ví dụ*: Chó và Mèo đều **là** Động Vật, đều `thở()` cùng một cách → đặt vào abstract class `DongVat` để tránh duplicate code.
>
> **Interface** — dùng khi muốn gắn **khả năng (CAN-DO)** lên object, không cần cùng bản chất.
>
> *Ví dụ*: Chó và Vịt đều **có thể** bơi, nhưng không cùng loài → `implements CoTheBoi`.

**Keyword để nhớ**: Abstract Class = **IS-A + share code**, Interface = **CAN-DO**.

> **Lưu ý tránh nhầm**: Không phải "hành vi giống nhau thì dùng Abstract Class". Tam giác và Hình Tròn đều có `tinhDienTich()` nhưng logic hoàn toàn khác nhau, không có gì để share → vẫn dùng **Interface**.

**Câu hỏi tình huống**

> Bạn cần model một hệ thống hình học. Một `HinhTamGiac` vừa là một **Hinh** (có `tinhDienTich()`), vừa có **MauSac** (có `layMau()`), vừa có thể **VeLen** màn hình (có `ve()`). Bạn thiết kế thế nào?

*Trả lời*: Dùng 3 interface riêng — `IHinh`, `IMauSac`, `IVeLen` — vì `HinhTamGiac` cần đa kế thừa hành vi không liên quan đến nhau. Nếu dùng abstract class, ta chỉ được kế thừa 1, buộc phải chọn một trong ba, mất đi tính linh hoạt.

```java
class HinhTamGiac implements IHinh, IMauSac, IVeLen { ... }
```

**Câu hỏi Trick**

**Trick 1**: Class con muốn thêm logic vào method đã có sẵn của abstract class, không muốn viết lại từ đầu. Làm thế nào?

*Trả lời*: Override method đó và gọi `super.methodName()` để giữ lại logic cũ, rồi thêm logic mới.

```java
class BaoCaoDoanhThu extends BaoCao {
    @Override
    void xuLyDuLieu() {
        super.xuLyDuLieu();  // Giữ logic cũ
        lamTronSo();          // Thêm mới
    }
}
```

> *Ví dụ*: Abstract class là công thức nấu phở gốc của bà ngoại. Con cháu muốn nấu phở nhưng thêm ớt — không nấu lại từ đầu, chỉ làm theo công thức bà (`super`), rồi cho thêm ớt vào sau.

**Bẫy tiếp**: Nếu method đó bị đánh dấu `final` thì `super` có gọi được không?

*Trả lời*: Vẫn gọi được `super.method()` — `final` chỉ ngăn **override**, không ngăn gọi. Nhưng class con không thể thay đổi gì thêm vì không override được.

---

**Trick 2**: Abstract class có thể implement Interface không?

*Trả lời*: Có — và **không cần implement hết tất cả method**, để lại cho subclass implement tiếp.

```java
interface CoTheBoi {
    void boi();
    void nhai();
}

abstract class DongVat implements CoTheBoi {
    @Override
    public void boi() {
        System.out.println("Bơi kiểu mặc định");
    }
    // nhai() chưa implement — subclass bắt buộc phải implement
}

class Cho extends DongVat {
    @Override
    public void nhai() {
        System.out.println("Chó nhai xương");
    }
    // boi() kế thừa từ DongVat, không cần override
}
```

**Bẫy tiếp**: Nếu `Cho` cũng không implement `nhai()` thì sao?

*Trả lời*: Compile error — hoặc `Cho` phải tự implement `nhai()`, hoặc `Cho` cũng phải là `abstract class`.

---

## Q2: `==` vs `.equals()` — Khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | `==` | `.equals()` |
|---|---|---|
| So sánh | Địa chỉ bộ nhớ (reference) | Giá trị nội dung |
| Dùng được với | Primitive + Object | Object (cần override) |
| Default nếu không override | — | So sánh reference (giống `==`) |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **`==`** — hỏi "Đây có phải **đúng cái ví này** không?" (cùng một vật thể trong tay).
>
> **`.equals()`** — hỏi "Cái ví này có **giống hệt** cái ví kia không?" (cùng thương hiệu, màu, kiểu dáng).

```java
String a = new String("hello");
String b = new String("hello");

a == b        // false — 2 object khác nhau trên heap
a.equals(b)   // true  — nội dung giống nhau
```

> **Bẫy String Pool**: `"hello" == "hello"` có thể trả về `true` vì JVM tái dùng String literal — nhưng đây là implementation detail, không nên dựa vào.

**Câu hỏi tình huống**

> Bạn có `List<String>` chứa JWT token. Bạn gọi `list.contains(userToken)` để kiểm tra token hợp lệ. Method này dùng `==` hay `.equals()` bên trong?

*Trả lời*: `contains()` dùng `.equals()` nên hoạt động đúng. Nhưng nếu tự viết vòng lặp dùng `==` để so sánh token thì authentication có thể fail dù token đúng — đây là security bug nghiêm trọng.

**Câu hỏi Trick**

**Trick 1**: Override `.equals()` mà không override `hashCode()` thì có vấn đề gì?

*Trả lời*: Vi phạm contract của Java — hai object `equals()` nhau **phải** có cùng `hashCode()`. Nếu không, khi bỏ vào `HashMap`/`HashSet`, object sẽ được hash vào bucket khác nhau → `contains()` trả về `false` dù hai object bằng nhau.

```java
Map<User, String> map = new HashMap<>();
User u1 = new User("Nam");
User u2 = new User("Nam");

u1.equals(u2)  // true (đã override)
map.put(u1, "admin");
map.get(u2)    // null — vì hashCode khác nhau!
```

**Bẫy tiếp**: Hai object có `hashCode()` giống nhau thì `equals()` có nhất thiết phải `true` không?

*Trả lời*: Không — nhiều object có thể cùng hashCode (hash collision). Nhưng `equals() = true` thì **bắt buộc** `hashCode()` phải bằng nhau.

---

**Trick 2**: `Integer a = 127` và `Integer b = 127` thì `a == b` là `true` hay `false`?

*Trả lời*: `true` — vì JVM cache `Integer` từ `-128` đến `127` (Integer Cache). Nhưng `Integer a = 128`, `Integer b = 128` thì `a == b` là `false` vì ngoài vùng cache, JVM tạo object mới. Đây là bẫy kinh điển trong phỏng vấn.

---

## Q3: `Checked Exception` vs `Unchecked Exception` — Khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | Checked Exception | Unchecked Exception |
|---|---|---|
| Kế thừa từ | `Exception` | `RuntimeException` |
| Bắt buộc handle | Có (`try-catch` hoặc `throws`) | Không |
| Phát hiện | Compile time | Runtime |
| Ví dụ | `IOException`, `SQLException` | `NullPointerException`, `IllegalArgumentException` |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **Checked** — dùng khi lỗi **có thể xảy ra ngoài tầm kiểm soát** và caller **có thể xử lý** được.
>
> *Ví dụ*: Đọc file — file có thể không tồn tại. Đây là tình huống bình thường, caller nên thông báo cho user hoặc dùng giá trị mặc định.
>
> **Unchecked** — dùng khi lỗi do **lập trình sai (bug)**, không nên recover mà phải fix code.
>
> *Ví dụ*: Truyền `null` vào method không cho phép null — đây là lỗi của người gọi, throw `IllegalArgumentException`.

**Keyword để nhớ**: Checked = **lỗi ngoài tầm kiểm soát, có thể recover**, Unchecked = **bug của lập trình viên**.

**Câu hỏi tình huống**

> Bạn viết service gọi REST API của bên thứ 3. Nếu API timeout, bạn nên throw `Checked` hay `Unchecked`?

*Trả lời*: Phụ thuộc thiết kế. Nếu caller **có thể và nên** retry hoặc fallback → Checked. Trong thực tế với Spring Boot, nhiều team dùng `RuntimeException` để tránh boilerplate, nhưng bọc trong custom exception rõ nghĩa như `ExternalApiException extends RuntimeException`.

**Câu hỏi Trick**

**Trick 1**: `catch (Exception e)` có bắt được `RuntimeException` không?

*Trả lời*: Có — vì `RuntimeException extends Exception`. Tuy nhiên đây là anti-pattern: nuốt hết mọi exception, che giấu bug thực sự. Chỉ catch exception cụ thể mà bạn biết cách xử lý.

**Bẫy tiếp**: `catch (Exception e)` có bắt được `Error` không? Ví dụ `OutOfMemoryError`?

*Trả lời*: Không — `Error` không kế thừa `Exception` mà kế thừa thẳng từ `Throwable`. `Error` là lỗi nghiêm trọng của JVM, không nên catch.

---

**Trick 2**: Method trong interface có thể khai báo `throws CheckedException` không?

*Trả lời*: Có. Nhưng class implement interface đó **có thể chọn không throw** — implement có thể khai báo ít exception hơn interface, nhưng không thể throw thêm exception mới ngoài những gì interface đã khai báo.

---

## Q4: `HashMap` vs `LinkedHashMap` vs `TreeMap` — Khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | HashMap | LinkedHashMap | TreeMap |
|---|---|---|---|
| Thứ tự | Không đảm bảo | Insertion order | Sorted (tự nhiên hoặc Comparator) |
| Performance | O(1) get/put | O(1) get/put | O(log n) get/put |
| Null key | Cho phép 1 | Cho phép 1 | Không cho phép |
| Use case | Lookup nhanh | Cache, LRU | Range query, sorted data |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **HashMap** — như ngăn kéo tủ không có nhãn, tra cứu nhanh nhưng không biết thứ tự.
>
> **LinkedHashMap** — như danh sách lịch sử trình duyệt, nhớ thứ tự bạn thêm vào.
>
> **TreeMap** — như danh bạ điện thoại sắp xếp A-Z, luôn có thứ tự nhưng thêm/xóa chậm hơn.

**Câu hỏi tình huống**

> Bạn cần implement tính năng "Top 10 sản phẩm bán chạy nhất" — key là tên sản phẩm, value là số lượng bán. Dùng Map nào?

*Trả lời*: Dùng `HashMap` để đếm nhanh O(1), sau đó sort riêng khi cần hiển thị. Không dùng `TreeMap` vì sort theo key (tên sản phẩm) chứ không sort theo value (số lượng) — `TreeMap` không giải quyết được bài toán này.

**Câu hỏi Trick**

**Trick 1**: `HashMap` có thread-safe không? Nếu nhiều thread cùng ghi thì sao?

*Trả lời*: Không thread-safe. Có thể xảy ra race condition, data corruption, thậm chí infinite loop (Java 7 trở về trước do resize). Dùng `ConcurrentHashMap` cho môi trường multi-thread — không dùng `Collections.synchronizedMap()` vì lock toàn bộ map, kém performance hơn.

**Bẫy tiếp**: `ConcurrentHashMap` có cho phép `null` key không?

*Trả lời*: Không — khác với `HashMap`. Lý do: trong môi trường concurrent, `map.get(key)` trả về `null` không phân biệt được "key không tồn tại" hay "value là null" → gây race condition khó debug.

---

**Trick 2**: `HashMap` lưu trữ theo cơ chế gì khi 2 key có cùng `hashCode()`?

*Trả lời*: Hash collision — các entry có cùng bucket được lưu dưới dạng **LinkedList**. Từ Java 8, nếu bucket có hơn 8 phần tử, tự động chuyển sang **Red-Black Tree** để giữ O(log n) thay vì O(n).

---

## Q5: Generics — Type Erasure và Wildcards

**Trả lời Basic**

| | Raw Type | Generic |
|---|---|---|
| Compile-time check | Không | Có |
| Runtime safety | Cast exception runtime | Phát hiện sớm |
| Ví dụ sai | `List list = new ArrayList(); list.add("a"); int i = (int)list.get(0);` | Compile error ngay |

**Trả lời Nâng cao**

```java
// Wildcard
void printList(List<?> list) { ... }          // Unknown type (read-only)
void addNumbers(List<? extends Number> list)  // Number hoặc subtype (read)
void addToList(List<? super Integer> list)    // Integer hoặc supertype (write)

// PECS: Producer Extends, Consumer Super
void copy(List<? extends T> src, List<? super T> dest) {
    for (T item : src) dest.add(item);
}
```

**Type Erasure**: Generic type bị xóa tại runtime — `List<String>` và `List<Integer>` đều là `List` ở bytecode.

**Câu hỏi Trick**

> `List<Object>` có phải supertype của `List<String>` không?

*Trả lời*: **Không** — đây là bẫy kinh điển. `String` là subtype của `Object`, nhưng `List<String>` **không** là subtype của `List<Object>`. Nếu cho phép, ta có thể add `Integer` vào `List<String>` thông qua reference `List<Object>` → type safety bị phá vỡ. Dùng `List<? extends Object>` (hay `List<?>`) nếu cần.

---

## Q6: Garbage Collection — JVM GC hoạt động thế nào?

**Trả lời Basic**

| Vùng nhớ | Lưu gì | GC |
|---|---|---|
| **Heap** | Object instances | Có (GC chính) |
| **Stack** | Local variables, call frames | Không (tự deallocate khi method return) |
| **Metaspace** | Class metadata | Có (khi class unload) |

**Generational GC:**

| Generation | Lưu gì | GC frequency |
|---|---|---|
| Young (Eden + Survivor) | Object mới tạo | Thường xuyên (Minor GC) |
| Old (Tenured) | Object sống lâu | Ít hơn (Major GC) |

**Trả lời Nâng cao**

> **GC Algorithms:**
> - **G1GC** (default Java 9+): Chia heap thành regions, predictable pause time
> - **ZGC** (Java 15+ production): Low latency (<1ms pause), cho heap lớn
> - **Shenandoah**: Tương tự ZGC, concurrent compaction

**Câu hỏi Trick**

> `System.gc()` có đảm bảo GC chạy ngay không?

*Trả lời*: Không — chỉ là **hint** cho JVM. JVM có thể bỏ qua. Trong production, không bao giờ gọi `System.gc()` — nó có thể trigger Full GC làm stop-the-world pause, ảnh hưởng latency. Để JVM tự quản lý GC.

---

## Q7: String Pool và String Immutability

**Trả lời Basic**

```java
String a = "hello";           // String pool
String b = "hello";           // Tái dùng từ pool
String c = new String("hello"); // Tạo mới trên heap

a == b        // true  — cùng reference trong pool
a == c        // false — c ở heap, không phải pool
a.equals(c)   // true  — cùng nội dung
```

**Tại sao String immutable?**
1. **String Pool**: Nhiều variable chia sẻ cùng object — nếu mutable, thay đổi 1 chỗ ảnh hưởng tất cả
2. **Thread-safe**: Immutable không cần synchronization
3. **Hashcode cacheable**: String dùng làm key trong HashMap, hashcode tính 1 lần và cache

**Câu hỏi Trick**

> `String` concatenation trong loop — vấn đề gì?

*Trả lời*: Mỗi `+` tạo `String` object mới → O(n²) memory. Dùng `StringBuilder` trong loop:

```java
// Sai — tạo N intermediate String objects
String result = "";
for (String s : list) result += s;

// Đúng
StringBuilder sb = new StringBuilder();
for (String s : list) sb.append(s);
String result = sb.toString();
```

---

## Q8: Java Memory Model — happens-before

**Trả lời Basic**

> Java Memory Model (JMM) định nghĩa **khi nào** một thread có thể thấy thay đổi từ thread khác.

**happens-before** đảm bảo: nếu A happens-before B, thì tất cả thay đổi của A **visible** cho B.

| Quy tắc | Ví dụ |
|---|---|
| Program order | Dòng code trước happens-before dòng sau (cùng thread) |
| Monitor lock | `unlock()` happens-before `lock()` tiếp theo |
| `volatile` write | Write happens-before mọi read sau đó |
| Thread start | `thread.start()` happens-before code trong thread |
| Thread join | Code trong thread happens-before `thread.join()` return |

**Trả lời Nâng cao**

> **Vấn đề không có happens-before:**

```java
int x = 0;
boolean ready = false;

// Thread 1
x = 42;
ready = true;  // Compiler/CPU có thể reorder!

// Thread 2
if (ready) {
    System.out.println(x);  // Có thể in ra 0 (không phải 42)!
}
```

> Fix: Khai báo `ready` là `volatile` → tạo happens-before giữa write và read.

**Câu hỏi Trick**

> CPU reorder instruction để optimize — Java có bị ảnh hưởng không?

*Trả lời*: Có — cả compiler lẫn CPU đều có thể reorder. JMM đảm bảo **single-thread correctness** (kết quả giống như code chạy tuần tự) nhưng **không đảm bảo visibility across threads** trừ khi có synchronization. Đây là lý do cần `synchronized`/`volatile`/`Atomic` classes.
