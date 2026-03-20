# Security

---

## Q1: JWT vs Session — Khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | JWT | Session |
|---|---|---|
| State | Stateless (token tự chứa info) | Stateful (server lưu session) |
| Scale | Dễ (không cần shared storage) | Khó hơn (cần Redis/DB share) |
| Revoke | Khó (phải đợi expire) | Dễ (xóa session là xong) |
| Size | Lớn hơn (gửi mỗi request) | Nhỏ (chỉ session ID) |
| Sensitive data | Không lưu (chỉ base64, không mã hóa) | Server giữ, client không thấy |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **JWT** — như thẻ nhân viên in sẵn thông tin. Bảo vệ nhìn thẻ là biết bạn là ai, không cần gọi HR kiểm tra. Nhưng nếu thẻ bị mất, không thể thu hồi ngay — phải chờ thẻ hết hạn.
>
> **Session** — như thẻ từ không có thông tin. Bảo vệ phải quẹt thẻ vào hệ thống để biết bạn là ai. Tốn thêm 1 bước nhưng có thể vô hiệu hóa thẻ ngay lập tức.

**Keyword để nhớ**: JWT = **stateless, scale tốt, khó revoke**. Session = **stateful, dễ revoke, cần shared storage**.

**Câu hỏi tình huống**

> User bị phishing, hacker lấy được JWT. Token còn 24h mới expire. Bạn xử lý thế nào?

*Trả lời*:
- **Blacklist approach**: Lưu revoked JWT ID vào Redis với TTL = thời gian còn lại của token. Check mỗi request. (Mất một phần stateless benefit nhưng chấp nhận được)
- **Short-lived tokens**: Access token 15 phút + Refresh token 7 ngày. Khi bị compromise, thiệt hại tối đa 15 phút
- **Token rotation**: Mỗi lần dùng refresh token thì issue access token mới và invalidate refresh token cũ

**Câu hỏi Trick**

**Trick 1**: JWT payload có bị đọc được không? Có nên lưu password hay sensitive data vào JWT không?

*Trả lời*: Có thể đọc được — JWT chỉ base64 encoded, không mã hóa. Bất kỳ ai có token đều decode được payload trong 1 giây. **Không bao giờ** lưu password, credit card, hay data nhạy cảm vào JWT. Chỉ lưu: user ID, role, expiry.

---

**Trick 2**: Sự khác nhau giữa JWT `HS256` và `RS256`?

*Trả lời*:
- **HS256** (HMAC): Dùng **1 secret key** để sign và verify. Mọi service cần verify đều phải biết secret → nếu một service bị compromise, toàn bộ hệ thống bị ảnh hưởng
- **RS256** (RSA): Dùng **private key** để sign (chỉ auth service biết), **public key** để verify (mọi service đều có thể có). An toàn hơn cho microservices

---

## Q2: SQL Injection — Nguyên nhân và cách phòng chống

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | Vulnerable | Safe |
|---|---|---|
| String concat | `"SELECT * FROM users WHERE id = " + id` | Không bao giờ dùng |
| Parameterized query | Không | `"SELECT * FROM users WHERE id = ?"` |
| ORM | Dùng sai (native query concat) | Dùng đúng (built-in param binding) |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> SQL Injection như nhân viên tiếp tân nhận đơn đặt hàng viết tay. Khách hàng gian lận viết: *"Tên: `'; DROP TABLE orders; --`"* — nếu nhân viên copy y chang vào hệ thống mà không kiểm tra, hệ thống thực thi lệnh xóa bảng.

**Câu hỏi tình huống**

> Code review, bạn thấy đoạn code này. Vấn đề gì?

```java
String query = "SELECT * FROM users WHERE username = '" + username + "'";
Statement stmt = conn.createStatement();
ResultSet rs = stmt.executeQuery(query);
```

*Trả lời*: SQL Injection vulnerability. Nếu `username = "admin' OR '1'='1"` thì query thành `WHERE username = 'admin' OR '1'='1'` → trả về tất cả users. Fix:

```java
String query = "SELECT * FROM users WHERE username = ?";
PreparedStatement stmt = conn.prepareStatement(query);
stmt.setString(1, username);
ResultSet rs = stmt.executeQuery();
```

**Câu hỏi Trick**

**Trick 1**: Dùng ORM như Hibernate/JPA có hoàn toàn tránh được SQL Injection không?

*Trả lời*: Không hoàn toàn — vẫn bị nếu dùng **native query với string concat**:

```java
// Vẫn bị SQL Injection dù dùng JPA
@Query(value = "SELECT * FROM users WHERE name = '" + name + "'", nativeQuery = true)

// An toàn
@Query("SELECT u FROM User u WHERE u.name = :name")
User findByName(@Param("name") String name);
```

---

**Trick 2**: Ngoài SQL Injection, khi nhận input từ user còn cần phòng chống gì?

*Trả lời*:
- **XSS (Cross-Site Scripting)**: Escape HTML output, Content Security Policy header
- **Path Traversal**: Validate file path, không cho `../` trong filename
- **Mass Assignment**: Không bind toàn bộ request body vào entity (dùng DTO)
- **SSRF**: Validate URL user cung cấp, không cho gọi internal services

---

## Q3: Secrets Management — Best Practices

**Trả lời Basic** *(Phân biệt đặc điểm)*

| Cách lưu secret | An toàn | Lý do |
|---|---|---|
| Hardcode trong code | Không | Ai clone repo đều thấy |
| Trong git (file .env) | Không | Git history không xóa được dễ dàng |
| Environment variable | Tương đối | Expose qua `/proc`, child processes |
| Secret manager (Vault/AWS SM) | Tốt | Audit log, rotation, least privilege |
| Encrypted + key management | Tốt | Tách key và data |

**Câu hỏi tình huống**

> Developer vô tình commit AWS credentials lên GitHub public repo. Bạn phản ứng thế nào?

*Trả lời*: **Treat as compromised ngay lập tức** — không phải đợi xác nhận có ai thấy chưa:
1. **Revoke credentials ngay** trong AWS IAM Console
2. Issue credentials mới
3. Kiểm tra CloudTrail logs để xem có activity bất thường không
4. Xóa khỏi git history (`git filter-branch` hoặc BFG Repo Cleaner) — nhưng coi như đã lộ vì git history có thể đã bị crawl
5. Bật **GitHub secret scanning** để auto-detect lần sau

**Câu hỏi Trick**

**Trick 1**: Environment variables có thực sự an toàn không?

*Trả lời*: Tương đối — có thể bị lộ qua:
- `/proc/PID/environ` trên Linux (process khác cùng user có thể đọc)
- Accidentally logged trong crash dump, error reporter (Sentry)
- Child processes kế thừa env vars

Tốt hơn env var: đọc secret từ file (chmod 400) hoặc từ secret manager tại runtime, không expose qua environment.

---

**Trick 2**: Principle of Least Privilege là gì? Áp dụng thế nào trong AWS?

*Trả lời*: Mỗi component chỉ có **tối thiểu permission cần thiết** để làm việc của nó.

Áp dụng trong AWS:
- Mỗi ECS Task có **IAM Role riêng** với chỉ permission cần thiết (không dùng admin role)
- S3 bucket policy: service A chỉ đọc được bucket của mình, không đọc bucket của service B
- Database: app user chỉ có `SELECT, INSERT, UPDATE` — không có `DROP, ALTER`
- Định kỳ dùng **IAM Access Analyzer** để detect over-permissive policies

---

## Q4: Public Subnet vs Private Subnet — Khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | Public Subnet | Private Subnet |
|---|---|---|
| Truy cập từ internet | Trực tiếp (qua Internet Gateway) | Không trực tiếp |
| Truy cập ra internet | Trực tiếp | Qua NAT Gateway |
| Dùng cho | Load Balancer, Bastion Host | App server, Database |
| Rủi ro | Cao hơn (exposed) | Thấp hơn |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **Public Subnet** — như mặt tiền cửa hàng. Khách hàng đi vào trực tiếp được, ai cũng thấy.
>
> **Private Subnet** — như kho hàng phía sau. Khách không vào được trực tiếp, chỉ nhân viên nội bộ mới tiếp cận qua cửa riêng.

**Keyword để nhớ**: Chỉ đặt những thứ **cần internet thấy** vào Public. Mọi thứ còn lại vào Private.

**Câu hỏi tình huống**

> Bạn deploy hệ thống gồm: ALB, ECS App, RDS Database. Đặt từng thứ vào subnet nào?

*Trả lời*:

```
Internet
    ↓
[Public Subnet]   → ALB (cần nhận traffic từ internet)
    ↓
[Private Subnet]  → ECS App (chỉ ALB mới gọi vào)
    ↓
[Private Subnet]  → RDS Database (chỉ App mới gọi vào)
```

- ALB ở Public vì cần nhận request từ ngoài
- App ở Private vì không cần internet trực tiếp, chỉ nhận từ ALB
- DB ở Private vì tuyệt đối không expose ra ngoài

**Câu hỏi Trick**

**Trick 1**: App ở Private Subnet cần gọi ra ngoài (ví dụ gọi API bên thứ 3). Làm thế nào?

*Trả lời*: Dùng **NAT Gateway** đặt ở Public Subnet. App → NAT Gateway → Internet. Traffic chiều vào không đi qua được NAT → App vẫn không bị expose trực tiếp.

```
Private Subnet (App) → NAT Gateway (Public Subnet) → Internet
                                                          ↓
                                         Response đi ngược lại cùng đường
```

**Bẫy tiếp**: NAT Gateway và Internet Gateway khác nhau thế nào?

*Trả lời*:
- **Internet Gateway**: Cho phép traffic **2 chiều** — resource trong subnet nhận được request từ internet trực tiếp
- **NAT Gateway**: Chỉ cho phép traffic **1 chiều ra** — resource trong private subnet gọi ra được, nhưng internet không gọi vào được

---

**Trick 2**: Database ở Private Subnet, developer cần connect trực tiếp để debug. Làm thế nào mà không expose DB ra internet?

*Trả lời*: Dùng **Bastion Host** (Jump Server) — 1 EC2 nhỏ đặt ở Public Subnet, chỉ mở port SSH từ IP của developer:

```
Developer → SSH vào Bastion Host (Public) → SSH tunnel → RDS (Private)
```

Hoặc dùng **AWS Session Manager** — không cần mở port SSH, không cần Bastion Host, audit log đầy đủ mọi session.

---

## Q5: Security Group vs NACL — Khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | Security Group | NACL |
|---|---|---|
| Áp dụng cho | EC2 instance / ENI | Toàn bộ Subnet |
| Stateful/Stateless | Stateful — response tự động được phép | Stateless — phải cho phép cả 2 chiều |
| Rule | Chỉ Allow | Allow và Deny |
| Thứ tự rule | Không quan trọng | Quan trọng (số nhỏ ưu tiên hơn) |
| Dùng cho | Kiểm soát từng instance | Kiểm soát toàn subnet, block IP |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **Security Group** — như bảo vệ riêng của từng phòng. Ai được vào phòng này không ảnh hưởng đến phòng khác.
>
> **NACL** — như bảo vệ ở cổng tòa nhà. Chặn ở đây thì cả tòa nhà bị ảnh hưởng, không vào được phòng nào.

**Keyword để nhớ**: Security Group = **instance level, stateful**. NACL = **subnet level, stateless**.

**Câu hỏi tình huống**

> Phát hiện IP `1.2.3.4` đang tấn công hệ thống. Bạn block bằng Security Group hay NACL?

*Trả lời*: **NACL** — vì:
- Security Group chỉ có Allow rule, không có Deny → không block được IP cụ thể
- NACL có Deny rule → thêm rule `Deny 1.2.3.4` là xong, block toàn bộ subnet ngay lập tức
- Không cần sửa từng instance một

**Câu hỏi Trick**

**Trick 1**: Security Group là Stateful nghĩa là gì?

*Trả lời*: Khi cho phép traffic **vào** (inbound), response **ra** (outbound) tự động được phép — không cần tạo outbound rule riêng. Ví dụ: mở port 443 inbound, browser gọi vào, server trả response → response đi ra tự động được phép dù không có outbound rule cho port đó.

NACL Stateless thì ngược lại — phải tạo rule cho cả 2 chiều. Quên tạo outbound rule → response bị block → connection fail.

---

**Trick 2**: Một request vào EC2 đi qua bao nhiêu lớp kiểm tra?

*Trả lời*: **2 lớp theo thứ tự**:

```
Internet → NACL (subnet level) → Security Group (instance level) → EC2
```

NACL check trước — nếu bị Deny tại NACL thì Security Group không được hỏi đến. Cả 2 đều phải pass thì request mới vào được EC2.

---

## Q6: IAM — Role vs User vs Policy — Khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | IAM User | IAM Role | IAM Policy |
|---|---|---|---|
| Là gì | Người dùng cụ thể | Danh tính tạm thời | Bộ quy tắc permission |
| Credentials | Long-term (access key) | Short-term (temporary token) | Không có credentials |
| Dùng cho | Developer, CI/CD service account | AWS service, cross-account, federated | Gắn vào User/Role để cấp quyền |
| Rotate | Thủ công | Tự động (expire) | Không cần |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **IAM User** — như thẻ nhân viên cố định. Tên bạn, access key của bạn, dùng mãi.
>
> **IAM Role** — như thẻ khách mời 1 ngày. Ai cần thì mượn, hết ngày tự hết hạn, không lo bị lộ lâu dài.
>
> **IAM Policy** — như danh sách phòng được phép vào. Gắn vào thẻ nào thì thẻ đó được vào những phòng đó.

**Câu hỏi tình huống**

> EC2 instance cần đọc file từ S3. Cách nào đúng: tạo IAM User rồi hardcode access key vào app, hay dùng IAM Role?

*Trả lời*: **IAM Role** — vì:
- Role gắn trực tiếp vào EC2, app tự động lấy temporary credentials qua Instance Metadata Service
- Không có long-term credentials để lộ
- Credentials tự rotate, không cần làm gì

Hardcode access key là **anti-pattern nghiêm trọng** — key lộ là mất kiểm soát ngay.

**Câu hỏi Trick**

**Trick 1**: Sự khác nhau giữa **Trust Policy** và **Permission Policy** của IAM Role?

*Trả lời*:
- **Trust Policy**: Ai được **assume** role này? (Who can use this role?) — Ví dụ: EC2 service, Lambda, account khác
- **Permission Policy**: Role này được làm gì? (What can this role do?) — Ví dụ: đọc S3, write DynamoDB

Thiếu Trust Policy → không ai assume được role dù Permission đầy đủ. Đây là lỗi cấu hình phổ biến.

---

**Trick 2**: `aws sts assume-role` dùng để làm gì? Khi nào cần?

*Trả lời*: Dùng khi cần **đổi sang identity khác tạm thời**:
- **Cross-account access**: Account A cần truy cập resource ở Account B → Account A assume Role ở Account B
- **Least privilege**: CI/CD pipeline assume role chỉ đủ quyền deploy, không dùng admin credentials thường xuyên
- **Audit trail**: CloudTrail ghi lại ai assume role nào, lúc nào → traceable
