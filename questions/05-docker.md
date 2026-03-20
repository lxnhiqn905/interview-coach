# Docker

---

## Q1: `CMD` vs `ENTRYPOINT` — Khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | CMD | ENTRYPOINT |
|---|---|---|
| Mục đích | Default arguments | Command chính của container |
| Override khi `docker run` | Dễ — truyền argument là override | Khó — phải dùng `--entrypoint` |
| Kết hợp | CMD làm default args cho ENTRYPOINT | ENTRYPOINT nhận args từ CMD |
| Dạng khuyến nghị | Exec form | Exec form |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **ENTRYPOINT** — như nghề nghiệp của container. Container này **là** một Java app, luôn luôn chạy `java -jar`.
>
> **CMD** — như tham số công việc hôm nay. Mặc định chạy với config này, nhưng có thể đổi khi cần.

**Cách Docker kết hợp ENTRYPOINT và CMD:**

```
Command thực thi = ENTRYPOINT + CMD
```

```dockerfile
ENTRYPOINT ["java", "-jar", "app.jar"]
CMD ["--spring.profiles.active=prod"]  # Default, có thể override
```

| Dockerfile | `docker run` command | Thực thi |
|---|---|---|
| ENTRYPOINT + CMD | `docker run myapp` | `java -jar app.jar --spring.profiles.active=prod` |
| ENTRYPOINT + CMD | `docker run myapp --spring.profiles.active=dev` | `java -jar app.jar --spring.profiles.active=dev` (CMD bị thay) |
| ENTRYPOINT + CMD | `docker run --entrypoint sh myapp` | `sh` (ENTRYPOINT bị thay, CMD bị bỏ) |

**Nếu chỉ có CMD, không có ENTRYPOINT:**

```dockerfile
CMD ["java", "-jar", "app.jar", "--spring.profiles.active=prod"]
```

| `docker run` command | Thực thi |
|---|---|
| `docker run myapp` | `java -jar app.jar --spring.profiles.active=prod` |
| `docker run myapp echo hello` | `echo hello` — replace **toàn bộ** CMD |

→ Không có ENTRYPOINT thì CMD chạy độc lập như command đầy đủ, nhưng dễ bị replace toàn bộ.

**Câu hỏi tình huống**

> Bạn muốn build image có thể dùng được theo 2 cách: `docker run myapp` để chạy app, và `docker run myapp --help` để xem help. Thiết kế `CMD`/`ENTRYPOINT` thế nào?

*Trả lời*: Dùng `ENTRYPOINT` cho command chính, `CMD` cho default argument:

```dockerfile
ENTRYPOINT ["java", "-jar", "app.jar"]
CMD ["--help"]   # Nếu không truyền gì thì show help
```

Nếu chỉ dùng `CMD ["java", "-jar", "app.jar"]` thì `docker run myapp --help` sẽ override toàn bộ, chạy chỉ `--help` thay vì `java -jar app.jar --help`.

**Câu hỏi Trick**

**Trick 1**: Sự khác nhau giữa Shell form và Exec form là gì? Tại sao Exec form được khuyến nghị?

```dockerfile
# Shell form
CMD java -jar app.jar

# Exec form
CMD ["java", "-jar", "app.jar"]
```

*Trả lời*: Shell form chạy qua `/bin/sh -c` → PID 1 là shell, không phải Java app. Khi `docker stop`, signal `SIGTERM` gửi đến shell, **không đến Java app** → app không shutdown gracefully. Exec form chạy trực tiếp → Java app là PID 1, nhận `SIGTERM` trực tiếp, có thể handle shutdown hook.

---

**Trick 2**: Dockerfile có nhiều `CMD`, cái nào có hiệu lực?

*Trả lời*: Chỉ `CMD` **cuối cùng** có hiệu lực. Các `CMD` trước bị ignore hoàn toàn. Tương tự với `ENTRYPOINT`.

---

## Q2: `COPY` vs `ADD` — Khi nào dùng cái nào?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | COPY | ADD |
|---|---|---|
| Copy file/dir | Có | Có |
| Auto extract `.tar` | Không | Có |
| Hỗ trợ URL | Không | Có |
| Predictable | Cao | Thấp hơn |
| Khuyến nghị | Mặc định dùng | Chỉ khi cần extract tar |

**Câu hỏi tình huống**

> Dockerfile build mất 10 phút mỗi lần thay đổi 1 dòng code Java. Bạn optimize thế nào?

*Trả lời*: Tận dụng **layer caching** — đặt phần ít thay đổi lên trên:

```dockerfile
# Sai — copy toàn bộ source trước, cache miss mỗi lần đổi code
COPY . .
RUN mvn dependency:go-offline

# Đúng — copy pom.xml trước, download deps (cache hit nếu pom.xml không đổi)
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn package -DskipTests
```

Kết hợp **multi-stage build** để giảm image size:

```dockerfile
FROM maven:3.9 AS builder
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn package -DskipTests

FROM eclipse-temurin:17-jre   # Chỉ JRE, không cần JDK
COPY --from=builder /app/target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
```

**Câu hỏi Trick**

**Trick 1**: Image size 1.2GB — bạn reduce bằng cách nào?

*Trả lời*:
1. **Multi-stage build** — chỉ copy artifact, không copy build tools
2. **Base image nhỏ hơn** — dùng `eclipse-temurin:17-jre-alpine` thay vì `eclipse-temurin:17`
3. **Gộp RUN commands** — mỗi `RUN` tạo một layer mới

```dockerfile
# Tạo 3 layer, layer xóa file không giảm được size của layer trước
RUN apt-get update
RUN apt-get install -y curl
RUN rm -rf /var/lib/apt/lists/*

# Đúng — 1 layer, xóa ngay trong cùng layer
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
```

---

**Trick 2**: `.dockerignore` dùng để làm gì? Không có thì sao?

*Trả lời*: Loại bỏ file không cần thiết khỏi **build context** gửi lên Docker daemon. Không có `.dockerignore`, toàn bộ thư mục (kể cả `node_modules`, `.git`, `target/`) được gửi lên → build chậm, image có thể chứa file nhạy cảm (`.env`, credentials).

```
# .dockerignore
.git
target/
*.log
.env
node_modules
```
