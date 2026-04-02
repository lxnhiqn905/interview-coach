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

---

## Q3: Docker Networking — Bridge, Host, Overlay

**Trả lời Basic**

| Network Driver | Đặc điểm | Dùng khi |
|---|---|---|
| `bridge` | Default, containers trong cùng host giao tiếp qua virtual network | Dev, single-host |
| `host` | Container dùng trực tiếp network của host | Performance critical, không cần isolation |
| `overlay` | Nhiều Docker host, dùng trong Swarm/K8s | Multi-host, cluster |
| `none` | Không có network | Isolated task |

**Trả lời Nâng cao**

```bash
# Tạo custom bridge network
docker network create my-network

# Container chỉ giao tiếp được với container trong cùng network
docker run --network my-network --name api api-image
docker run --network my-network --name db postgres

# Giao tiếp qua hostname (container name)
# Từ api container: psql -h db -U postgres
```

> Custom bridge tốt hơn default bridge: hỗ trợ **DNS resolution theo container name**, isolation tốt hơn.

**Câu hỏi Trick**

> Hai container trên cùng host, cùng `docker run` mặc định — giao tiếp được với nhau không?

*Trả lời*: Có thể, nhưng **không qua hostname** — phải dùng IP. Nên tạo custom network và dùng container name để DNS resolve. Default bridge không tự động có DNS.

---

## Q4: Docker Volumes — Persist Data

**Trả lời Basic**

| Loại | Mount | Dùng khi |
|---|---|---|
| **Volume** | Managed by Docker (`/var/lib/docker/volumes/`) | DB data, production |
| **Bind mount** | Host path tùy chọn | Dev (live reload), config |
| **tmpfs** | RAM only, không persist | Sensitive data, cache tạm |

**Trả lời Nâng cao**

```bash
# Volume — Docker quản lý
docker run -v my-data:/var/lib/postgresql/data postgres

# Bind mount — map thư mục host vào container
docker run -v $(pwd)/src:/app/src node-app  # Dev: code thay đổi ngay

# Backup volume
docker run --rm -v my-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/backup.tar.gz /data
```

**Câu hỏi Trick**

> Xóa container thì volume có bị xóa không?

*Trả lời*: **Không** — volume có lifecycle độc lập với container. Phải xóa riêng: `docker volume rm my-data` hoặc `docker rm -v container-name`. Đây là cơ chế bảo vệ data. Bind mount thì data nằm trên host, hoàn toàn không bị ảnh hưởng.

---

## Q5: Docker Compose — Quản lý multi-container

**Trả lời Basic**

```yaml
# docker-compose.yml
services:
  api:
    build: .
    ports:
      - "8080:8080"
    environment:
      - DB_HOST=db
    depends_on:
      db:
        condition: service_healthy
    networks:
      - app-network

  db:
    image: postgres:15
    volumes:
      - db-data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: secret
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
      interval: 5s
      retries: 5
    networks:
      - app-network

volumes:
  db-data:

networks:
  app-network:
```

**Câu hỏi Trick**

> `depends_on` có đảm bảo DB ready trước khi API start không?

*Trả lời*: `depends_on` chỉ đảm bảo container **start theo thứ tự**, không đảm bảo service **ready**. DB có thể start nhưng chưa accept connection. Cần thêm `condition: service_healthy` kết hợp với `healthcheck` như ví dụ trên.

---

## Q6: Docker Security — Best Practices

**Trả lời Basic**

| Practice | Vấn đề tránh |
|---|---|
| Không chạy container với root | Nếu bị compromise, attacker có full quyền |
| Dùng image nhỏ (alpine, distroless) | Giảm attack surface |
| Scan image (Trivy, Snyk) | Phát hiện CVE trong dependencies |
| Không hardcode secret | Secret leak qua `docker history` |
| Read-only filesystem | Ngăn attacker ghi file |

**Trả lời Nâng cao**

```dockerfile
# Non-root user
FROM eclipse-temurin:17-jre-alpine
RUN addgroup -S app && adduser -S app -G app
USER app  # Chạy với user non-root

# Read-only với tmpfs cho temp
# docker run --read-only --tmpfs /tmp myimage
```

**Câu hỏi Trick**

> Secret truyền qua `ENV` trong Dockerfile có an toàn không?

*Trả lời*: **Không** — `ENV` bị lưu trong image layer, `docker history` hoặc `docker inspect` đều thấy. Đúng cách: truyền qua runtime (`-e`, `--env-file`), hoặc Docker Secrets (Swarm), hoặc mount file từ secret manager.

---

## Q7: Docker Registry — Docker Hub vs Private Registry

**Trả lời Basic**

| | Docker Hub | Private Registry (ECR, GCR, Harbor) |
|---|---|---|
| Chi phí | Free (public), trả phí (private) | Chi phí lưu trữ cloud |
| Security | Public image có thể pull bởi ai | Kiểm soát access qua IAM |
| Rate limit | Có (100-200 pulls/6h free) | Không |
| Use case | Open source, public image | Production, private code |

**Câu hỏi tình huống**

> Pipeline CI/CD đột ngột fail với lỗi "Too Many Requests" khi pull image. Nguyên nhân và fix?

*Trả lời*: Docker Hub rate limit. Fix:
1. **Short-term**: Authenticate với Docker Hub account (tăng limit lên 200/6h)
2. **Medium-term**: Cache base images trong Private Registry (ECR mirror)
3. **Long-term**: Dùng base image từ ECR Public Gallery hoặc tự host registry nội bộ

**Câu hỏi Trick**

> Làm thế nào để chỉ pull image nếu có version mới, tránh kéo lại image giống hệt?

*Trả lời*: Dùng **image digest** thay vì tag. Tag `latest` có thể thay đổi, nhưng digest (`sha256:abc123...`) là cố định. Trong production, pin image theo digest để đảm bảo reproducible deployment.

---

## Q8: Health Check trong Docker — Cấu hình đúng

**Trả lời Basic**

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1
```

| Option | Ý nghĩa |
|---|---|
| `--interval` | Bao lâu check 1 lần |
| `--timeout` | Timeout per check |
| `--start-period` | Bỏ qua fail trong X giây đầu (app đang start) |
| `--retries` | Fail bao nhiêu lần liên tiếp thì unhealthy |

**Câu hỏi tình huống**

> Container status là `unhealthy` nhưng app vẫn chạy bình thường. Debug thế nào?

*Trả lời*: `docker inspect <container>` → xem `Health.Log` để thấy output của health check command. Thường nguyên nhân: `curl` không có trong image (dùng alpine), endpoint trả về non-2xx, hoặc timeout quá ngắn.

**Câu hỏi Trick**

> Docker Compose `healthcheck` và K8s `livenessProbe` — cái nào ưu tiên khi deploy lên K8s?

*Trả lời*: **K8s probe** có quyền cao hơn — K8s tự manage container lifecycle, không phụ thuộc Docker healthcheck. Tuy nhiên Docker healthcheck vẫn hữu ích cho `depends_on` trong Compose khi dev local.
