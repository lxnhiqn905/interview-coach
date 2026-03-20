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
