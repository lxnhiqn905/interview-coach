# Algorithms & Data Structures

---

## Q1: Merge Two Sorted Arrays

**Đề bài**

> Cho 2 mảng đã được sắp xếp `arr1[]` size n và `arr2[]` size m. Merge thành 1 mảng đã sắp xếp size (n+m).
>
> Input: `arr1[] = {1, 3, 4, 5}`, `arr2[] = {2, 4, 8}`
> Output: `arr3[] = {1, 2, 3, 4, 4, 5, 8}`

---

**Trả lời Basic**

**Cách 1 — 2 vòng lặp** (Brute force):

```
Vòng 1: copy toàn bộ arr1 và arr2 vào arr3
Vòng 2: sort arr3
```

```
arr3 = [1, 3, 4, 5, 2, 4, 8]
sort  → [1, 2, 3, 4, 4, 5, 8]  ✓
```

- **Time**: O((n+m) log(n+m)) — do sort
- **Space**: O(n+m)

**Cách 2 — 1 vòng lặp** (Two Pointer — tối ưu hơn):

Dùng 2 con trỏ `i`, `j` — mỗi bước so sánh phần tử hiện tại của 2 mảng, lấy cái nhỏ hơn bỏ vào kết quả:

```
i=0, j=0
arr1[i]=1, arr2[j]=2  → lấy 1, i++
arr1[i]=3, arr2[j]=2  → lấy 2, j++
arr1[i]=3, arr2[j]=4  → lấy 3, i++
arr1[i]=4, arr2[j]=4  → lấy 4 (arr1), i++
arr1[i]=5, arr2[j]=4  → lấy 4 (arr2), j++
arr1[i]=5, arr2[j]=8  → lấy 5, i++
arr2 còn lại [8]      → copy nốt vào
Kết quả: [1, 2, 3, 4, 4, 5, 8]  ✓
```

- **Time**: O(n+m) — duyệt mỗi phần tử đúng 1 lần
- **Space**: O(n+m)

---

**Câu hỏi tình huống — 1 hay 2 vòng lặp?**

> Interviewer hỏi: "Bạn cần mấy vòng lặp?"

*Trả lời*:
- **2 vòng**: Copy hết rồi sort — O((n+m) log(n+m)), đơn giản nhưng không tận dụng việc 2 mảng đã sorted sẵn
- **1 vòng**: Two Pointer — O(n+m), tận dụng thứ tự có sẵn, không cần sort lại

Câu trả lời mong đợi là **1 vòng** — đây là điểm phân biệt junior và mid-level.

---

**Trả lời Nâng cao**

> *Ví dụ*: Như merge 2 bộ bài đã sắp xếp — cầm 2 tập bài, nhìn lá trên cùng của mỗi tập, lấy lá nhỏ hơn bỏ vào tập mới, lặp lại cho đến hết.

Đây chính là bước **merge** trong **Merge Sort** — O(n log n), sort ổn định và hiệu quả nhất cho linked list.

**Tối ưu khi n >> m**: Nếu `arr1` có 1 triệu phần tử, `arr2` chỉ có 10 phần tử → dùng **binary search** để tìm vị trí insert từng phần tử của `arr2` vào `arr1`:
- Time: O(m * log n) — tốt hơn O(n+m) khi m rất nhỏ so với n

---

**Câu hỏi Trick**

**Trick 1**: Merge in-place (không dùng mảng phụ) được không?

*Trả lời*: Được — nhưng phải duyệt từ **cuối về đầu**. Lý do: nếu duyệt từ đầu, khi ghi phần tử vào arr1 sẽ ghi đè phần tử chưa xử lý. Duyệt từ cuối thì vùng đã ghi không bao giờ đụng vùng chưa đọc.

```
arr1 = [1, 3, 5, _, _]  (có 2 slot trống cuối)
arr2 = [2, 4]

Duyệt từ cuối:
arr1[4]=max(5,4)=5, arr1[3]=max(5,4 wait... i=2,j=1)
→ so arr1[2]=5 vs arr2[1]=4 → đặt 5 vào arr1[4]
→ so arr1[2]=3 wait arr1[1]=3 vs arr2[1]=4 → đặt 4 vào arr1[3]
...
```

---

**Trick 2**: 2 mảng có phần tử trùng nhau — output có giữ duplicate không?

*Trả lời*: Two Pointer cơ bản **giữ tất cả duplicate**. Nếu muốn bỏ duplicate, trước khi thêm phần tử vào kết quả, check xem phần tử cuối cùng đã thêm có giống không.

---

## Q2: Two Sum — Tìm 2 phần tử có tổng bằng target

**Đề bài**

> Cho mảng số nguyên và target. Tìm 2 phần tử có tổng bằng target. Trả về index của chúng.
>
> Input: `nums = [2, 7, 11, 15]`, `target = 9`
> Output: `[0, 1]` (vì `nums[0] + nums[1] = 2 + 7 = 9`)

---

**Trả lời Basic**

**Cách 1 — 2 vòng lặp lồng nhau** (Brute Force):

```
Với mỗi phần tử i:
    Với mỗi phần tử j (j > i):
        Nếu arr[i] + arr[j] == target → trả về (i, j)
```

```
nums = [2, 7, 11, 15], target = 9

i=0 (val=2):
    j=1 (val=7):  2+7=9 → tìm được (0, 1)  ✓
```

- **Time**: O(n²) — mỗi cặp được check 1 lần
- **Space**: O(1)

**Cách 2 — 1 vòng lặp** (dùng bảng tra cứu):

Thay vì tìm partner bằng vòng lặp thứ 2, lưu lại những gì đã thấy và tra cứu ngay:

```
bảng = {}

Duyệt từng phần tử:
    complement = target - arr[i]
    Nếu complement đã có trong bảng → tìm được cặp, dừng
    Nếu chưa → ghi arr[i] và index vào bảng
```

```
nums = [2, 7, 11, 15], target = 9
bảng = {}

i=0 (val=2): complement=9-2=7, bảng có 7 không? Không → ghi {2: 0}
i=1 (val=7): complement=9-7=2, bảng có 2 không? Có, ở index 0 → trả về (0, 1)  ✓
```

> Bảng tra cứu trả lời tức thì O(1) — không cần lặp thêm. Toàn bộ chỉ có **1 vòng lặp duy nhất**.

- **Time**: O(n) — duyệt 1 lần
- **Space**: O(n) — bảng lưu tối đa n phần tử

---

**Câu hỏi tình huống — 1 hay 2 vòng lặp?**

> Interviewer hỏi: "Có cách nào chỉ dùng 1 vòng lặp không?"

*Trả lời*:
- **2 vòng**: Brute force, O(n²) — đơn giản nhưng chậm
- **1 vòng + map**: O(n) time, O(n) space — đánh đổi thêm bộ nhớ để tiết kiệm thời gian
- **1 vòng + no map**: Nếu mảng đã **sort sẵn** → Two Pointer, O(n) time + O(1) space — 1 pointer đầu, 1 pointer cuối, tổng lớn dịch phải về trái, tổng nhỏ dịch trái về phải

---

**Trả lời Nâng cao**

> *Ví dụ*: Ghép cặp khiêu vũ, mỗi cặp phải cao tổng cộng 170cm. Thay vì so từng người một (O(n²)), bạn lập danh sách "cần người cao bao nhiêu" và check danh sách đó khi mỗi người bước vào (O(n)).

**Giới hạn của bảng tra cứu (map)**

Map không có giới hạn cứng — miễn RAM còn đủ. Nhưng nếu array có hàng trăm triệu phần tử, map chiếm vài GB RAM → có thể crash. Khi đó:
- Nếu **array sorted** → Two Pointer, O(1) space, không cần map
- Nếu **không sorted, quá lớn** → chia nhỏ dữ liệu xử lý từng phần

---

**Câu hỏi Trick**

**Trick 1: Tìm tất cả các cặp** — không chỉ 1 cặp đầu tiên

> Input: `nums = [1, 2, 3, 4, 5]`, `target = 6`
> Output: `(1,5), (2,4)`

*Trả lời*: Vẫn 1 vòng lặp + map, nhưng **không dừng** khi tìm thấy cặp đầu tiên:

```
bảng = {}
kết quả = []

Duyệt từng phần tử:
    complement = target - arr[i]
    Nếu bảng có complement → thêm vào kết quả, tiếp tục (không dừng)
    Ghi arr[i] vào bảng
```

```
nums = [1, 2, 3, 4, 5], target = 6

i=0, val=1: complement=5, chưa có → ghi {1:0}
i=1, val=2: complement=4, chưa có → ghi {1:0, 2:1}
i=2, val=3: complement=3, chưa có → ghi {1:0, 2:1, 3:2}
i=3, val=4: complement=2, có ở index 1 → kết quả = [(1,3)]
i=4, val=5: complement=1, có ở index 0 → kết quả = [(1,3), (0,4)]

→ 2 cặp: (2+4) và (1+5)  ✓
```

---

**Trick 2: Duplicate trong mảng** — đếm theo giá trị hay index?

> Input: `nums = [1, 1, 2, 4, 5]`, `target = 6`
> Cặp `(1, 5)` có đếm 2 lần không?

*Trả lời*: Phụ thuộc đề bài — **phải hỏi lại interviewer**:
- Đếm theo **giá trị** → `(1,5)` là 1 cặp dù có 2 số 1
- Đếm theo **index** → `(0,4)` và `(1,4)` là 2 cặp khác nhau

Biết đặt câu hỏi clarify là điểm cộng lớn trong phỏng vấn.

---

**Trick 3**: Three Sum — tìm 3 phần tử có tổng = 0. Approach?

*Trả lời*: Sort mảng, fix phần tử đầu tiên, dùng **Two Pointer** cho 2 phần tử còn lại. Time: O(n²). Tổng quát: mỗi lần fix thêm 1 phần tử, complexity tăng thêm O(n).

---

## Q3: Tìm phần tử xuất hiện nhiều nhất (Majority Element)

**Đề bài**

> Cho mảng n phần tử, tìm phần tử xuất hiện hơn n/2 lần. Đảm bảo luôn tồn tại.
>
> Input: `[3, 2, 3]` → Output: `3`
> Input: `[2, 2, 1, 1, 1, 2, 2]` → Output: `2`

---

**Trả lời Basic**

**Cách 1 — 2 vòng lặp** (Brute Force):

```
Với mỗi phần tử x:
    Đếm số lần x xuất hiện trong mảng
    Nếu count > n/2 → trả về x
```

- **Time**: O(n²), **Space**: O(1)

**Cách 2 — 1 vòng lặp** (dùng bảng đếm):

```
Duyệt từng phần tử, tăng bộ đếm tương ứng trong bảng
Sau khi duyệt xong → tìm phần tử có bộ đếm > n/2
```

```
[2, 2, 1, 1, 1, 2, 2]

Bảng đếm: {2: 4, 1: 3}
n/2 = 3 → phần tử 2 có count=4 > 3  ✓
```

- **Time**: O(n), **Space**: O(n) — bảng đếm

---

**Câu hỏi tình huống — 1 hay 2 vòng lặp?**

> Interviewer hỏi: "Có thể giải với O(1) space không?"

*Trả lời*: Có — **Boyer-Moore Voting**, chỉ 1 vòng, O(1) space:

```
candidate = phần tử đầu tiên
count = 1

Duyệt từ phần tử thứ 2:
    Nếu count == 0 → đổi candidate sang phần tử hiện tại
    Nếu phần tử == candidate → count tăng 1
    Nếu phần tử != candidate → count giảm 1

Kết quả: candidate là majority element
```

```
[2, 2, 1, 1, 1, 2, 2]

candidate=2, count=1
→ 2: count=2
→ 1: count=1
→ 1: count=0
→ 1: count=0, đổi candidate=1, count=1
→ 2: count=0
→ 2: count=0, đổi candidate=2, count=1

candidate = 2  ✓
```

> *Ví dụ*: Bầu cử — mỗi phiếu khác phe "triệt tiêu" nhau. Phe đông hơn n/2 luôn còn sót lại cuối cùng.

---

**Câu hỏi Trick**

**Trick 1**: Boyer-Moore có hoạt động nếu majority element **không tồn tại** không?

*Trả lời*: Không — algorithm giả định majority element luôn tồn tại. Nếu không chắc, cần 1 vòng thứ 2 để verify: đếm lại số lần `candidate` xuất hiện, nếu > n/2 thì đúng, ngược lại không có majority element.

---

**Trick 2**: Tìm phần tử xuất hiện hơn n/3 lần. Có thể có bao nhiêu phần tử thỏa mãn?

*Trả lời*: Tối đa **2 phần tử** (vì 3 × (n/3) = n, không thể có 3 phần tử cùng vượt n/3). Mở rộng Boyer-Moore với 2 candidate thay vì 1, logic tương tự.

---

## Q4: Phát hiện Cycle trong Linked List

**Đề bài**

> Cho một linked list, kiểm tra xem có cycle không.
>
> Input: `1 → 2 → 3 → 4 → 2` (node 4 trỏ về node 2)
> Output: `true`

---

**Trả lời Basic**

**Cách 1 — 1 vòng lặp** (dùng tập đã thăm):

```
Duyệt từng node:
    Nếu node này đã thấy trước đó → có cycle
    Nếu chưa → ghi nhớ node này, đi tiếp
    Nếu đến null → không có cycle
```

```
1 → 2 → 3 → 4 → 2 (cycle)

thăm: {1}
thăm: {1, 2}
thăm: {1, 2, 3}
thăm: {1, 2, 3, 4}
đến 2: đã thấy → có cycle  ✓
```

- **Time**: O(n), **Space**: O(n) — lưu tất cả node đã thăm

---

**Câu hỏi tình huống — có cách nào không cần lưu lại node đã thăm?**

> Interviewer hỏi: "O(n) space có thể tối ưu xuống O(1) không?"

*Trả lời*: Có — **Floyd's Tortoise & Hare** (rùa và thỏ), vẫn 1 vòng lặp:

```
slow đi 1 bước mỗi lần
fast đi 2 bước mỗi lần

Nếu có cycle → fast sẽ "đuổi kịp" slow (gặp nhau)
Nếu không có cycle → fast đến null trước
```

```
1 → 2 → 3 → 4 → 2 (cycle)

Bước 1: slow=2, fast=3
Bước 2: slow=3, fast=2  (fast đi qua 4→2)
Bước 3: slow=4, fast=4  → gặp nhau → có cycle  ✓
```

> *Ví dụ*: Đường đua vòng tròn — người chạy nhanh gấp đôi người chậm, nếu có vòng họ **phải gặp nhau**. Nếu đường thẳng, người nhanh về đích trước, không bao giờ gặp.

- **Time**: O(n), **Space**: O(1)

---

**Câu hỏi Trick**

**Trick 1**: Ngoài detect cycle, làm sao **tìm điểm bắt đầu** của cycle?

*Trả lời*: Sau khi slow và fast gặp nhau, đặt 1 pointer về `head`. Di chuyển cả 2 pointer từng bước 1. Điểm chúng gặp lại = entry point của cycle. Đây là tính chất toán học của Floyd's algorithm.

---

**Trick 2**: Tại sao fast đi 2 bước mà không phải 3 hoặc 4?

*Trả lời*: Đi 2 bước đảm bảo slow và fast **chắc chắn gặp nhau** khi có cycle, không bị skip qua nhau. Đi số bước lẻ khác vẫn detect được nhưng proof phức tạp hơn và có thể có edge case.

---

## Q5: Binary Search và các biến thể

**Đề bài**

> Cho mảng đã sort và target. Tìm index của target. Nếu không có trả về -1.
>
> Input: `nums = [1, 3, 5, 7, 9]`, `target = 7`
> Output: `3`

---

**Trả lời Basic**

**Cách 1 — 1 vòng lặp** (Linear Search):

```
Duyệt từ đầu đến cuối, so từng phần tử với target
```

- **Time**: O(n) — không tận dụng mảng đã sort

**Cách 2 — 1 vòng lặp** (Binary Search — tận dụng sorted):

```
left = 0, right = n-1

Lặp khi left <= right:
    mid = (left + right) / 2
    Nếu arr[mid] == target → tìm thấy, trả về mid
    Nếu arr[mid] < target  → target ở nửa phải → left = mid + 1
    Nếu arr[mid] > target  → target ở nửa trái → right = mid - 1

Không tìm thấy → trả về -1
```

```
nums = [1, 3, 5, 7, 9], target = 7

left=0, right=4, mid=2 → arr[2]=5 < 7 → left=3
left=3, right=4, mid=3 → arr[3]=7 == 7 → trả về 3  ✓
```

- **Time**: O(log n) — mỗi bước loại bỏ nửa mảng
- **Space**: O(1)

---

**Câu hỏi tình huống — 1 hay 2 vòng lặp?**

> Interviewer hỏi: "Tại sao Binary Search nhanh hơn Linear Search dù cùng dùng 1 vòng lặp?"

*Trả lời*: Số lần lặp khác nhau. Linear duyệt tối đa n lần. Binary mỗi lần loại bỏ nửa còn lại → tối đa log₂(n) lần. Ví dụ n=1 triệu: Linear cần 1.000.000 bước, Binary chỉ cần 20 bước.

---

**Trả lời Nâng cao**

> *Ví dụ*: Lật từ điển tìm từ "mango" — mở giữa sách, thấy chữ "p" → lật sang nửa trái, thấy "j" → lật sang nửa phải... Mỗi lần loại bỏ nửa còn lại.

**Biến thể — tìm lần xuất hiện đầu tiên** (khi có duplicate):

```
Khi tìm thấy target tại mid → chưa dừng
Lưu mid vào result, tiếp tục tìm bên trái (right = mid - 1)
Cho đến khi không còn gì để tìm
```

---

**Câu hỏi Trick**

**Trick 1**: `mid = (left + right) / 2` có bug gì không?

*Trả lời*: **Overflow** — nếu `left` và `right` đều rất lớn, tổng của chúng vượt giới hạn số nguyên thành số âm → mid sai. Fix: `mid = left + (right - left) / 2`.

---

**Trick 2**: Binary Search chỉ dùng được với mảng sorted. Áp dụng vào bài toán không phải tìm kiếm thế nào?

*Trả lời*: **Binary search on answer** — thay vì search trên mảng, search trên **khoảng giá trị của đáp án**. Cần 2 điều kiện: xác định được min/max của đáp án, và có hàm check "giá trị này có thỏa mãn không?" chạy được trong O(n). Ví dụ: "Tìm tốc độ tàu tối thiểu để giao hàng trong D ngày" → binary search trên tốc độ.

---

## Q6: Tìm số bị thiếu (Missing Number)

**Đề bài**

> Cho mảng n phần tử chứa các số từ `0` đến `n`, nhưng thiếu đúng 1 số. Tìm số đó.
>
> Input: `[3, 0, 1]` → Output: `2`
> Input: `[9, 6, 4, 2, 3, 5, 7, 0, 1]` → Output: `8`

---

**Trả lời Basic** *(Sum Formula — vòng lặp)*

Tổng từ 0 đến n = `n*(n+1)/2`. Lấy tổng lý thuyết trừ tổng thực tế = số bị thiếu.

**Cách 1 — 2 vòng lặp** (tường minh, dễ hiểu):

```
Vòng 1: tính tổng lý thuyết 0+1+2+...+n
Vòng 2: tính tổng thực tế bằng cách cộng dồn từng phần tử mảng
Kết quả: tổng lý thuyết - tổng thực tế
```

```
n = 3, mảng = [0, 1, 3]

Vòng 1: expected = 0+1+2+3 = 6
Vòng 2: actual   = 0+1+3   = 4
Kết quả: 6 - 4 = 2  ✓
```

**Cách 2 — 1 vòng lặp** (tối ưu hơn):

Thay vì tính 2 tổng riêng rồi mới trừ, cộng/trừ xen kẽ luôn trong 1 vòng:

```
result = n  (bắt đầu bằng n)

Mỗi bước i:
    result += i        (cộng index vào)
    result -= arr[i]   (trừ giá trị thực ra)
```

```
n = 3, mảng = [0, 1, 3]

result = 3
i=0:  result = 3 + 0 - 0 = 3
i=1:  result = 3 + 1 - 1 = 3
i=2:  result = 3 + 2 - 3 = 2  ✓
```

> Về bản chất cả 2 cách đều là `(0+1+2+3) - (0+1+3)`, chỉ khác nhau ở cách tổ chức tính toán.

- **Time**: O(n), **Space**: O(1)

---

**Câu hỏi tình huống — 1 hay 2 vòng lặp?**

> Interviewer hỏi: "Bạn cần mấy vòng lặp để giải bài này?"

*Trả lời*:
- **2 vòng**: Dùng công thức `n*(n+1)/2` tính trước, rồi 1 vòng cộng dồn mảng → code rõ ràng, dễ đọc
- **1 vòng**: Cộng/trừ xen kẽ trong cùng 1 vòng → ít dòng code hơn, cùng độ phức tạp O(n)
- **0 vòng**: Nếu dùng built-in sum → `n*(n+1)/2 - sum(arr)` — nhưng bên trong vẫn là O(n)

Cả hai đều O(n) — sự khác biệt chỉ là **style**, không phải performance.

---

**Trả lời Nâng cao** *(XOR — tránh overflow)*

> *Ví dụ*: Mỗi người trong lớp có cặp đôi, trừ 1 người bị thiếu cặp. XOR từng người với số thứ tự của họ — ai có cặp thì triệt tiêu nhau, người thiếu cặp còn lại một mình.

```
XOR tất cả số từ 0→n:  0 ^ 1 ^ 2 ^ 3
XOR tất cả phần tử:    0 ^ 1 ^ 3

XOR cả 2 lại:
(0^0) ^ (1^1) ^ (3^3) ^ 2 = 0 ^ 0 ^ 0 ^ 2 = 2  ✓
```

- **Time**: O(n), **Space**: O(1)
- **Ưu điểm**: Không bị overflow với n rất lớn

---

**Câu hỏi Trick**

**Trick 1**: Nếu mảng có **2 số bị thiếu** thay vì 1, làm thế nào?

*Trả lời*: Sum formula cho ra `a + b`. XOR cho ra `a ^ b`. Từ `a ^ b`, tìm 1 bit đang khác nhau giữa a và b — dùng bit đó chia mảng thành 2 nhóm, XOR từng nhóm ra từng số riêng.

**Bẫy tiếp**: Nếu có thể có nhiều hơn 2 số bị thiếu?

*Trả lời*: XOR không còn đủ. Dùng **bảng đánh dấu**: bỏ hết phần tử vào set, loop từ 0 đến n check số nào không có trong set. Time O(n), Space O(n).

---

**Trick 2**: Sum formula có thể bị overflow không?

*Trả lời*: Có — nếu n lớn, `n*(n+1)/2` vượt giới hạn số nguyên. Fix bằng cách dùng kiểu số lớn hơn (long/int64), hoặc dùng XOR để tránh hoàn toàn vấn đề overflow.

---

## Q7: Hoán đổi 2 số (Swap)

**Đề bài**

> Hoán đổi giá trị của 2 biến a và b mà không dùng biến thứ 3.
>
> Input: `a = 5, b = 9`
> Output: `a = 9, b = 5`

---

**Trả lời Basic**

**Cách 1 — dùng biến tạm** (dễ hiểu nhất):

```
temp = a
a = b
b = temp
```

```
a=5, b=9

temp = 5
a = 9
b = 5  ✓
```

- **Space**: O(1) — thêm 1 biến tạm

**Cách 2 — dùng phép cộng/trừ** (không cần biến tạm):

```
a = a + b
b = a - b   (lúc này a là tổng, trừ đi b cũ = a cũ)
a = a - b   (trừ đi b mới = b cũ = a cũ)
```

```
a=5, b=9

a = 5+9 = 14
b = 14-9 = 5   ← b giờ = a cũ  ✓
a = 14-5 = 9   ← a giờ = b cũ  ✓
```

---

**Câu hỏi tình huống — trick với số lớn**

> Interviewer hỏi: "Cách dùng phép cộng có vấn đề gì không?"

*Trả lời*: **Overflow** — nếu a và b đều là số rất lớn, `a + b` vượt quá giới hạn số nguyên → kết quả sai.

```
a = 2,000,000,000
b = 2,000,000,000

a = a + b = 4,000,000,000  ← vượt giới hạn int (~2.1 tỷ) → overflow!
b = a - b = ???            ← kết quả sai hoàn toàn
```

---

**Trả lời Nâng cao** *(XOR — không bao giờ overflow)*

XOR không cộng dồn số lớn, chỉ thao tác từng bit → không bao giờ overflow:

```
a = a XOR b
b = a XOR b   (= a cũ XOR b XOR b = a cũ XOR 0 = a cũ)
a = a XOR b   (= a cũ XOR b XOR a cũ = b XOR 0 = b)
```

```
a=5 (101), b=9 (1001)

a = 101 XOR 1001 = 1100  (=12)
b = 1100 XOR 1001 = 0101 (=5)  ← b giờ = a cũ  ✓
a = 1100 XOR 0101 = 1001 (=9)  ← a giờ = b cũ  ✓
```

> *Tóm lại*: Cộng/trừ nhanh và dễ hiểu, nhưng có nguy cơ overflow. XOR an toàn hơn với số lớn, nhưng khó đọc hơn.

---

**Câu hỏi Trick**

**Trick 1**: Nếu `a` và `b` trỏ vào **cùng 1 ô nhớ** (cùng 1 biến), XOR swap có đúng không?

*Trả lời*: Không — kết quả sẽ là `0`:

```
a = a XOR a = 0
b = 0 XOR a = a  (không phải giá trị ban đầu)
a = 0 XOR a = a
```

Cách dùng biến tạm không bị lỗi này. Trong thực tế khi swap 2 phần tử trong mảng, phải check `i != j` trước khi dùng XOR swap.

---

**Trick 2**: Cách nào được dùng trong thực tế?

*Trả lời*: **Biến tạm** — rõ ràng, không có edge case, compiler thường tự tối ưu thành instruction swap của CPU. XOR swap là kỹ thuật thú vị để phỏng vấn nhưng ít dùng trong production vì khó đọc và có edge case.

---

## Q8: Valid Parentheses — Kiểm tra ngoặc hợp lệ

**Đề bài**

> Cho chuỗi chỉ chứa `(`, `)`, `{`, `}`, `[`, `]`. Kiểm tra xem chuỗi có hợp lệ không.
>
> Input: `"()[]{}"` → `true`
> Input: `"(]"` → `false`
> Input: `"([)]"` → `false`

---

**Trả lời Basic**

**Cách 1 — chỉ có 1 loại ngoặc** `()`:

```
count = 0

Duyệt từng ký tự:
    Gặp '(' → count tăng 1
    Gặp ')' → count giảm 1
    Nếu count âm ở bất kỳ điểm nào → invalid (đóng trước khi mở)

Cuối cùng: count == 0 → valid, khác 0 → invalid
```

```
"(())"
( → count=1
( → count=2
) → count=1
) → count=0 → valid  ✓

")("
) → count=-1 → invalid ngay  ✓
```

- **Time**: O(n), **Space**: O(1)

**Cách 2 — nhiều loại ngoặc** (dùng Stack):

```
Duyệt từng ký tự:
    Nếu là ngoặc mở → đẩy vào stack
    Nếu là ngoặc đóng:
        Stack rỗng → invalid (không có ngoặc mở tương ứng)
        Lấy phần tử trên cùng stack ra:
            Nếu không khớp → invalid
            Nếu khớp → tiếp tục

Cuối cùng: stack rỗng → valid
```

```
"([)]"

( → stack: [(]
[ → stack: [(, []
) → lấy ra [, không khớp ] → invalid  ✓

"()[]{}"

( → stack: [(]
) → lấy ra (, khớp → stack: []
[ → stack: [[]
] → lấy ra [, khớp → stack: []
{ → stack: [{]
} → lấy ra {, khớp → stack: []
Stack rỗng → valid  ✓
```

- **Time**: O(n), **Space**: O(n) — stack lưu ngoặc mở chưa đóng

---

**Câu hỏi tình huống — 1 hay 2 vòng lặp?**

> Interviewer hỏi: "Bạn cần mấy vòng để giải?"

*Trả lời*: **1 vòng** là đủ — duyệt từ trái sang phải, quyết định ngay tại mỗi ký tự. Không cần vòng thứ 2 vì stack giúp "nhớ" ngoặc mở chưa có cặp mà không cần duyệt lại.

> Nếu chỉ có 1 loại ngoặc thì còn tốt hơn — không cần stack, chỉ 1 biến đếm.

---

**Trả lời Nâng cao**

> *Ví dụ*: Như xếp đĩa — gặp ngoặc mở thì chồng lên, gặp ngoặc đóng thì lấy đĩa trên cùng ra check có khớp không.

Đây là nền tảng của nhiều bài toán thực tế:
- Validate HTML/XML tags
- Kiểm tra expression syntax trong compiler
- Undo/Redo stack trong editor

---

**Câu hỏi Trick**

**Trick 1**: Chỉ có 1 loại ngoặc `()` — có cần stack không?

*Trả lời*: Không — chỉ cần 1 biến đếm. Stack chỉ cần thiết khi có **nhiều loại ngoặc** cần phân biệt loại nào khớp với loại nào.

---

**Trick 2**: Chuỗi rỗng `""` có phải valid không?

*Trả lời*: Có — không có ngoặc nào sai, stack rỗng ở cuối → valid. Đây là edge case hay bị quên khi test.
