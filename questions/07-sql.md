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
