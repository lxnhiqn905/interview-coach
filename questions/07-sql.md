# SQL & Database

---

## Q1: Index — Khi nào nên và không nên đánh Index?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | Có Index | Không có Index |
|---|---|---|
| SELECT (WHERE, JOIN) | O(log n) | O(n) full scan |
| INSERT/UPDATE/DELETE | Chậm hơn (cập nhật index) | Nhanh hơn |
| Disk space | Tốn thêm | Không |
| Nên dùng | Column thường query, JOIN, ORDER BY | Column ít query, bảng nhỏ, nhiều write |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **Index** — như mục lục cuốn sách. Tìm trang nhanh hơn (O(log n)), nhưng mỗi lần thêm chương mới phải cập nhật mục lục (tốn thêm thời gian write).
>
> Bảng **ít đọc, nhiều ghi** (như log table) mà đánh index nhiều → write chậm không đáng kể so với lợi ích read.

**Câu hỏi tình huống**

> Query sau đang chạy rất chậm trên bảng 10 triệu rows. Bạn sẽ làm gì?

```sql
SELECT * FROM orders
WHERE status = 'PENDING'
AND created_at > '2024-01-01'
ORDER BY created_at DESC;
```

*Trả lời*:
1. `EXPLAIN ANALYZE` để xem execution plan — có full scan không?
2. Tạo **composite index** `(status, created_at)` — vì query filter cả 2 column
3. Index order quan trọng: equality column (`status`) trước, range column (`created_at`) sau
4. Cân nhắc **partial index** nếu `PENDING` chỉ chiếm tỷ lệ nhỏ:

```sql
CREATE INDEX idx_orders_pending ON orders (created_at DESC)
WHERE status = 'PENDING';
```

**Câu hỏi Trick**

**Trick 1**: Đã có index trên column `email` nhưng query sau vẫn full scan. Tại sao?

```sql
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';
```

*Trả lời*: Function `LOWER()` wrap quanh column làm index **không được sử dụng** — database phải tính `LOWER(email)` cho từng row. Fix bằng **functional index**:

```sql
CREATE INDEX ON users (LOWER(email));
```

Hoặc store email luôn ở lowercase khi insert.

**Bẫy tiếp**: `WHERE email LIKE '%@gmail.com'` có dùng được index không?

*Trả lời*: Không — wildcard ở đầu (`%`) buộc full scan. `LIKE 'user%'` (wildcard ở cuối) thì dùng được index.

---

**Trick 2**: Bảng có index nhưng sau khi xóa 80% data, query vẫn chậm. Tại sao?

*Trả lời*: Index bị **bloated** — cấu trúc index vẫn giữ các node của data đã xóa, gây fragmentation. Fix bằng:
- PostgreSQL: `VACUUM ANALYZE`
- MySQL: `OPTIMIZE TABLE`

Lệnh này rebuild index và cập nhật statistics cho query planner.

---

## Q2: `JOIN` các loại — Khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| JOIN type | Kết quả |
|---|---|
| `INNER JOIN` | Chỉ rows có match ở cả 2 bảng |
| `LEFT JOIN` | Tất cả rows bên trái + match bên phải (NULL nếu không có) |
| `RIGHT JOIN` | Tất cả rows bên phải + match bên trái (NULL nếu không có) |
| `FULL OUTER JOIN` | Tất cả rows của cả 2 bảng |
| `CROSS JOIN` | Tích Descartes — mọi tổ hợp |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **INNER JOIN** — như danh sách học sinh **đã có điểm**. Học sinh chưa thi không xuất hiện.
>
> **LEFT JOIN** — như danh sách **tất cả học sinh** kèm điểm nếu có. Học sinh chưa thi vẫn xuất hiện, cột điểm là NULL.

**Câu hỏi tình huống**

> Bạn cần lấy **tất cả sản phẩm** và số lượng đơn hàng tương ứng. Sản phẩm chưa có đơn nào vẫn phải hiển thị (với count = 0). Dùng JOIN nào?

```sql
SELECT p.name, COUNT(o.id) as order_count
FROM products p
LEFT JOIN orders o ON o.product_id = p.id
GROUP BY p.id, p.name;
```

*Trả lời*: `LEFT JOIN` — nếu dùng `INNER JOIN`, sản phẩm chưa có đơn hàng sẽ bị loại khỏi kết quả.

**Câu hỏi Trick**

**Trick 1**: Query dùng nhiều JOIN bị chậm. Ngoài index, bạn còn làm gì?

*Trả lời*:
1. **Reduce columns**: `SELECT *` → chỉ select column cần thiết
2. **Filter sớm**: WHERE điều kiện trên bảng lớn trước khi JOIN
3. **Subquery vs JOIN**: Đôi khi subquery nhanh hơn do optimizer xử lý tốt hơn
4. **Denormalize**: Với read-heavy system, lưu sẵn dữ liệu tổng hợp thay vì JOIN mỗi lần

---

**Trick 2**: N+1 query problem là gì? Xảy ra thế nào trong Spring Data JPA?

*Trả lời*: Thay vì 1 query lấy tất cả data, app chạy 1 query lấy list + N query lấy từng item.

```java
// N+1 problem — 1 query lấy orders, N query lấy customer của từng order
List<Order> orders = orderRepo.findAll();
orders.forEach(o -> System.out.println(o.getCustomer().getName())); // lazy load mỗi lần
```

Fix bằng `JOIN FETCH` hoặc `@EntityGraph`:

```java
@Query("SELECT o FROM Order o JOIN FETCH o.customer")
List<Order> findAllWithCustomer();
```

---

## Q3: Viết SQL — Top N per Group (Window Function)

**Đề bài:**

Cho bảng `orders`:

```
orders
------
id          INT
customer_id INT
amount      DECIMAL
created_at  DATE
```

**Yêu cầu**: Lấy **2 đơn hàng có giá trị cao nhất** của **mỗi khách hàng**.

---

### Trả lời Basic

Dùng subquery + `GROUP BY` — chỉ lấy được top 1 (max):

```sql
SELECT customer_id, MAX(amount) AS max_amount
FROM orders
GROUP BY customer_id;
```

→ Chỉ giải được top 1, không scale được sang top N.

---

### Trả lời Nâng cao

Dùng **Window Function** `ROW_NUMBER()`:

```sql
SELECT customer_id, id, amount, created_at
FROM (
  SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY customer_id
      ORDER BY amount DESC
    ) AS rn
  FROM orders
) ranked
WHERE rn <= 2;
```

**Giải thích:**
- `PARTITION BY customer_id` — chia kết quả thành nhóm theo từng khách hàng
- `ORDER BY amount DESC` — sắp xếp trong từng nhóm theo amount
- `ROW_NUMBER()` — đánh số thứ tự 1, 2, 3... trong mỗi nhóm
- `WHERE rn <= 2` — chỉ lấy 2 đơn đầu của mỗi nhóm

**Phân biệt `ROW_NUMBER` vs `RANK` vs `DENSE_RANK`:**

| Function | Khi có 2 amount bằng nhau |
|---|---|
| `ROW_NUMBER` | 1, 2, 3 — số thứ tự duy nhất, tùy ý thứ tự tie |
| `RANK` | 1, 1, 3 — bỏ qua số 2 |
| `DENSE_RANK` | 1, 1, 2 — không bỏ số |

→ Nếu muốn "top 2 amount cao nhất, tie cùng vào" → dùng `DENSE_RANK`.

---

### Câu hỏi Trick

**Trick:** Có thể dùng `WHERE` trực tiếp trên Window Function không?

```sql
-- Sai — không chạy được
SELECT *, ROW_NUMBER() OVER (...) AS rn
FROM orders
WHERE rn <= 2;
```

→ Không — Window Function được tính **sau** `WHERE`, nên không filter được trong cùng query level. Phải wrap trong subquery hoặc CTE:

```sql
WITH ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY amount DESC) AS rn
  FROM orders
)
SELECT * FROM ranked WHERE rn <= 2;
```

---

## Q4: Viết SQL — Tìm và xử lý Duplicate

**Đề bài:**

Cho bảng `users`:

```
users
-----
id      INT (PK)
email   VARCHAR
name    VARCHAR
```

Bảng bị import sai, có nhiều row trùng `email`. **Yêu cầu**: Tìm các email bị trùng, giữ lại row có `id` nhỏ nhất, xóa các row còn lại.

---

### Trả lời Basic

Tìm email bị trùng:

```sql
SELECT email, COUNT(*) AS cnt
FROM users
GROUP BY email
HAVING COUNT(*) > 1;
```

---

### Trả lời Nâng cao

**Bước 1 — Xem trước sẽ xóa những row nào:**

```sql
SELECT id, email
FROM users
WHERE id NOT IN (
  SELECT MIN(id)
  FROM users
  GROUP BY email
);
```

**Bước 2 — Xóa duplicate:**

```sql
DELETE FROM users
WHERE id NOT IN (
  SELECT MIN(id)
  FROM users
  GROUP BY email
);
```

**Hoặc dùng CTE (rõ ràng hơn):**

```sql
WITH duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY email ORDER BY id) AS rn
  FROM users
)
DELETE FROM users
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
```

---

### Câu hỏi Trick

**Trick:** MySQL không cho phép `DELETE` với subquery tham chiếu chính bảng đó. Cách fix?

```sql
-- Lỗi trên MySQL: "You can't specify target table for update in FROM clause"
DELETE FROM users
WHERE id NOT IN (SELECT MIN(id) FROM users GROUP BY email);
```

→ Fix bằng cách wrap thêm một subquery nữa (MySQL trick):

```sql
DELETE FROM users
WHERE id NOT IN (
  SELECT id FROM (
    SELECT MIN(id) AS id FROM users GROUP BY email
  ) AS keep
);
```

→ Hoặc dùng `JOIN` thay vì `IN`:

```sql
DELETE u1
FROM users u1
JOIN users u2 ON u1.email = u2.email AND u1.id > u2.id;
```

---

## Q5: Viết SQL — Conditional Aggregation (Pivot)

**Đề bài:**

Cho bảng `orders`:

```
orders
------
id          INT
customer_id INT
status      VARCHAR  -- 'PENDING', 'COMPLETED', 'CANCELLED'
amount      DECIMAL
```

**Yêu cầu**: Tạo báo cáo mỗi khách hàng có bao nhiêu đơn theo từng status, kết quả dạng:

```
customer_id | pending_count | completed_count | cancelled_count | total_amount
```

---

### Trả lời Basic

Query riêng từng status rồi JOIN lại — nhiều query, verbose:

```sql
SELECT p.customer_id,
       p.cnt AS pending_count,
       c.cnt AS completed_count
FROM
  (SELECT customer_id, COUNT(*) cnt FROM orders WHERE status = 'PENDING' GROUP BY customer_id) p
  JOIN
  (SELECT customer_id, COUNT(*) cnt FROM orders WHERE status = 'COMPLETED' GROUP BY customer_id) c
  ON p.customer_id = c.customer_id;
```

→ Cồng kềnh, thiếu khách hàng không có đơn ở 1 status nào đó.

---

### Trả lời Nâng cao

Dùng **`CASE WHEN` trong aggregate** — 1 query duy nhất:

```sql
SELECT
  customer_id,
  COUNT(CASE WHEN status = 'PENDING'   THEN 1 END) AS pending_count,
  COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS completed_count,
  COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) AS cancelled_count,
  SUM(CASE WHEN status = 'COMPLETED'   THEN amount ELSE 0 END) AS total_completed_amount,
  SUM(amount) AS total_amount
FROM orders
GROUP BY customer_id;
```

**Hoặc dùng `FILTER` (PostgreSQL):**

```sql
SELECT
  customer_id,
  COUNT(*) FILTER (WHERE status = 'PENDING')    AS pending_count,
  COUNT(*) FILTER (WHERE status = 'COMPLETED')  AS completed_count,
  COUNT(*) FILTER (WHERE status = 'CANCELLED')  AS cancelled_count
FROM orders
GROUP BY customer_id;
```

---

### Câu hỏi Trick

**Trick:** `COUNT(CASE WHEN ... THEN 1 END)` vs `SUM(CASE WHEN ... THEN 1 ELSE 0 END)` — khác nhau không?

→ Khác nhau khi có NULL:
- `COUNT(...)` bỏ qua NULL → khi CASE không match, trả về NULL, `COUNT` không đếm ✅
- `SUM(... ELSE 0)` cộng tất cả kể cả 0 → kết quả như nhau nhưng ý nghĩa khác

→ Dùng `COUNT(CASE WHEN ... THEN 1 END)` (không có ELSE) là idiomatic và đúng ý hơn.

---

## Q6: Viết SQL — Self Join và Hierarchical Data

**Đề bài:**

Cho bảng `employees`:

```
employees
---------
id          INT
name        VARCHAR
manager_id  INT  -- NULL nếu là CEO, trỏ về employees.id
salary      DECIMAL
```

**Yêu cầu 1**: Lấy danh sách nhân viên kèm tên manager của họ.

**Yêu cầu 2**: Tìm nhân viên có lương cao hơn manager của họ.

---

### Trả lời Basic — Yêu cầu 1

```sql
SELECT
  e.name AS employee,
  m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;
```

→ Dùng `LEFT JOIN` để CEO (manager_id = NULL) vẫn xuất hiện trong kết quả.

---

### Trả lời Nâng cao — Yêu cầu 2

```sql
SELECT e.name AS employee, e.salary, m.name AS manager, m.salary AS manager_salary
FROM employees e
JOIN employees m ON e.manager_id = m.id
WHERE e.salary > m.salary;
```

**Yêu cầu 3 — Toàn bộ cây hierarchy (Recursive CTE):**

```sql
WITH RECURSIVE org_chart AS (
  -- Base case: CEO (không có manager)
  SELECT id, name, manager_id, 0 AS level
  FROM employees
  WHERE manager_id IS NULL

  UNION ALL

  -- Recursive case: nhân viên có manager
  SELECT e.id, e.name, e.manager_id, oc.level + 1
  FROM employees e
  JOIN org_chart oc ON e.manager_id = oc.id
)
SELECT level, name FROM org_chart ORDER BY level, name;
```

---

### Câu hỏi Trick

**Trick:** Recursive CTE không có `UNION ALL` mà dùng `UNION` — vấn đề gì?

→ `UNION` deduplicate mỗi bước → với dữ liệu hierarchy sâu, có thể bỏ sót node nếu bị trùng. Hơn nữa `UNION` chậm hơn vì phải sort để dedup.
→ Với Recursive CTE luôn dùng `UNION ALL`.

**Trick 2:** Nếu data có **cycle** (A là manager của B, B là manager của A) — Recursive CTE sẽ vòng lặp vô tận. Fix thế nào?

→ Thêm điều kiện kiểm tra đường đi đã đi qua:
```sql
WITH RECURSIVE org_chart AS (
  SELECT id, name, manager_id, ARRAY[id] AS path
  FROM employees WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, e.name, e.manager_id, oc.path || e.id
  FROM employees e
  JOIN org_chart oc ON e.manager_id = oc.id
  WHERE NOT e.id = ANY(oc.path)  -- Dừng nếu đã đi qua node này
)
```

---

## Q7: Transaction Isolation Levels — Đọc hiểu và chọn đúng

**Trả lời Basic**

| Level | Dirty Read | Non-repeatable Read | Phantom Read |
|---|---|---|---|
| READ UNCOMMITTED | Có thể | Có thể | Có thể |
| READ COMMITTED | Không | Có thể | Có thể |
| REPEATABLE READ | Không | Không | Có thể |
| SERIALIZABLE | Không | Không | Không |

- **Dirty Read**: Đọc data chưa commit của transaction khác
- **Non-repeatable Read**: Cùng query, 2 lần đọc khác nhau trong 1 transaction
- **Phantom Read**: Query trả về số row khác nhau trong 1 transaction

**Trả lời Nâng cao**

> **MySQL InnoDB** mặc định **REPEATABLE READ** (dùng MVCC — snapshot đầu transaction).
>
> **PostgreSQL** mặc định **READ COMMITTED**.

```sql
-- Đặt isolation level
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN;
  SELECT balance FROM accounts WHERE id = 1;
  -- Transaction khác không thể insert/update ảnh hưởng result set này
COMMIT;
```

**Câu hỏi tình huống**

> Banking app: Chuyển tiền từ account A sang B. Cần isolation level nào?

*Trả lời*: **SERIALIZABLE** hoặc **REPEATABLE READ** + explicit locking (`SELECT ... FOR UPDATE`). SERIALIZABLE đảm bảo transaction chạy như thể tuần tự, loại bỏ mọi anomaly. Trong thực tế nhiều bank dùng `SELECT ... FOR UPDATE` để lock row cụ thể, tránh overhead của toàn bộ SERIALIZABLE.

**Câu hỏi Trick**

> `READ COMMITTED` có vấn đề gì trong banking?

*Trả lời*: **Non-repeatable read** — cùng transaction đọc balance lần 1 = 1000, trong khi đó transaction khác trừ 500 và commit, đọc lần 2 = 500. Logic "kiểm tra đủ tiền rồi mới trừ" có thể race condition nếu không lock row.

---

## Q8: Query Optimization — EXPLAIN và Index Strategy

**Trả lời Basic**

```sql
-- Xem query execution plan
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 123 AND status = 'pending';
```

| EXPLAIN output | Ý nghĩa |
|---|---|
| `Seq Scan` | Full table scan — cần index |
| `Index Scan` | Dùng index — tốt |
| `Index Only Scan` | Chỉ đọc index, không cần table — rất tốt |
| `rows=10000` | Estimated rows — nếu khác thật nhiều → `ANALYZE` table |
| `cost=0..1000` | Estimated cost (lower is better) |

**Trả lời Nâng cao**

```sql
-- Composite index — thứ tự quan trọng
-- Query: WHERE user_id = ? AND status = ? ORDER BY created_at DESC
CREATE INDEX idx_orders_user_status_date
ON orders (user_id, status, created_at DESC);
-- Leftmost prefix: dùng được cho user_id, user_id+status, user_id+status+created_at
-- KHÔNG dùng được cho status alone hoặc created_at alone

-- Covering index — index chứa đủ column, không cần lookup table
CREATE INDEX idx_orders_covering
ON orders (user_id, status) INCLUDE (total_amount, created_at);
```

**Câu hỏi tình huống**

> Query đang chạy 5 giây. EXPLAIN cho thấy `Seq Scan` trên table 10M rows. Bạn làm gì?

*Trả lời*:
1. Thêm index trên column trong WHERE clause
2. Kiểm tra column có high cardinality không (index vô nghĩa trên `status` chỉ có 3 giá trị nếu data phân tán đều)
3. Check index đã có chưa (`\d orders` trong psql, `SHOW INDEX FROM orders` trong MySQL)
4. `ANALYZE table` để cập nhật statistics — planner có thể chọn sai plan vì statistics cũ
5. Xem xét partial index nếu query thường filter theo condition cụ thể

**Câu hỏi Trick**

> Index có làm INSERT/UPDATE chậm hơn không?

*Trả lời*: Có — mỗi index phải được update khi data thay đổi. Table có 10 index → mỗi INSERT update 10 index structure. **Index là trade-off**: tăng read speed, giảm write speed. Không đánh index cho mọi column — chỉ đánh khi có query thực tế cần và benchmark confirm improvement.

---

## Q9: `WHERE` vs `HAVING` vs Subquery — Bẫy thường gặp nhất

**Trả lời Basic** *(So sánh quyết định)*

| | `WHERE` | `HAVING` | Subquery |
|---|---|---|---|
| Filter | Row trước khi GROUP BY | Group sau khi GROUP BY | Kết quả của query khác |
| Dùng aggregate? | Không (`COUNT`, `SUM`... không được) | Được | Được |
| Performance | Nhanh (filter sớm) | Chậm hơn (phải group trước) | Phụ thuộc |
| Dùng khi | Filter điều kiện đơn giản trên row | Filter dựa trên kết quả aggregate | Cần kết quả từ query khác |

**Trả lời Nâng cao**

```sql
-- SAI: dùng WHERE với aggregate function
SELECT department, COUNT(*) as headcount
FROM employees
WHERE COUNT(*) > 5        -- ERROR: aggregate không dùng được trong WHERE
GROUP BY department;

-- ĐÚNG: dùng HAVING cho aggregate condition
SELECT department, COUNT(*) as headcount
FROM employees
GROUP BY department
HAVING COUNT(*) > 5;      -- Filter sau khi đã group

-- Kết hợp cả hai: WHERE filter row trước, HAVING filter group sau
SELECT department, AVG(salary) as avg_salary
FROM employees
WHERE active = true           -- Chỉ nhân viên còn làm việc (filter row)
GROUP BY department
HAVING AVG(salary) > 50000;  -- Chỉ department có avg salary > 50k (filter group)
```

**Câu hỏi tình huống**

> Query tìm department có hơn 5 nhân viên, nhưng chỉ tính nhân viên đang active. Viết đúng thứ tự WHERE và HAVING?

```sql
-- Đúng
SELECT department, COUNT(*) as active_count
FROM employees
WHERE status = 'active'      -- 1. Filter row trước (loại bỏ inactive)
GROUP BY department           -- 2. Group
HAVING COUNT(*) > 5;         -- 3. Filter group (chỉ dept có > 5 người active)
```

*Nếu đặt ngược:* `HAVING status = 'active'` → lỗi vì `status` không phải aggregate và không nằm trong GROUP BY.

**Câu hỏi Trick**

> `SELECT COUNT(*) WHERE ...` vs `SELECT COUNT(*) HAVING ...` — khi không có GROUP BY?

*Trả lời*: Không có GROUP BY thì toàn bộ result set là 1 group. `HAVING` vẫn hoạt động nhưng kỳ lạ — `HAVING COUNT(*) > 0` là filter 1 group duy nhất đó. Trong thực tế nếu không có GROUP BY, dùng `WHERE` cho điều kiện thông thường, và subquery nếu cần aggregate.

---

## Q10: NULL trong SQL — Những bẫy không ai nói cho bạn biết

**Trả lời Basic** *(Các rule của NULL)*

| Operation | Kết quả | Tại sao |
|---|---|---|
| `NULL = NULL` | `NULL` (không phải `TRUE`) | NULL là "không biết", không biết = không biết → không biết |
| `NULL != NULL` | `NULL` | Tương tự |
| `NULL = 5` | `NULL` | Không biết có bằng 5 không |
| `5 + NULL` | `NULL` | Tính toán với "không biết" → không biết |
| `COUNT(*)` | Đếm tất cả row | Bao gồm cả row có NULL |
| `COUNT(column)` | Đếm row không NULL | Bỏ qua NULL |

**Trả lời Nâng cao**

```sql
-- BẪY 1: So sánh NULL
SELECT * FROM users WHERE email = NULL;    -- Không trả về gì! NULL = NULL là NULL
SELECT * FROM users WHERE email IS NULL;   -- ĐÚNG

-- BẪY 2: NOT IN với NULL
SELECT * FROM orders WHERE user_id NOT IN (1, 2, NULL);
-- Trả về RỖNG vì: NOT IN với NULL → NOT (x=1 OR x=2 OR x=NULL)
-- x=NULL luôn là NULL → toàn bộ expression là NULL → không row nào thỏa
-- FIX:
SELECT * FROM orders WHERE user_id NOT IN (1, 2) AND user_id IS NOT NULL;

-- BẪY 3: COUNT
SELECT COUNT(*), COUNT(email) FROM users;
-- COUNT(*) = 100, COUNT(email) = 95 nếu 5 user chưa có email

-- BẪY 4: DISTINCT với NULL
SELECT DISTINCT manager_id FROM employees;  -- Chỉ giữ 1 NULL dù có nhiều NULL

-- COALESCE — thay NULL bằng giá trị mặc định
SELECT name, COALESCE(phone, 'N/A') as phone FROM users;
```

**Câu hỏi tình huống**

> Query `SELECT * FROM products WHERE category != 'Electronics'` — có trả về product có `category = NULL` không?

*Trả lời*: **Không** — `NULL != 'Electronics'` trả về `NULL`, không phải `TRUE` → WHERE lọc ra. Để bao gồm cả NULL: `WHERE category != 'Electronics' OR category IS NULL`. Đây là bẫy cực kỳ phổ biến khi query không ra đủ data mà không biết tại sao.

**Câu hỏi Trick**

> `COALESCE` vs `ISNULL` vs `NVL` vs `IFNULL` — khác nhau thế nào?

*Trả lời*: Về logic giống nhau — trả về giá trị đầu tiên không NULL. Khác nhau ở **database**:
- `COALESCE(a, b, c)` — **SQL chuẩn**, chấp nhận nhiều argument, tất cả DB
- `ISNULL(a, b)` — **SQL Server** only, chỉ 2 argument
- `NVL(a, b)` — **Oracle** only
- `IFNULL(a, b)` — **MySQL** only

Dùng `COALESCE` nếu muốn portable code.
