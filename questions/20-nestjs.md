# Topic 20: NestJS

---

## Q1: Module System — Cấu trúc và Dependency Injection

### Trả lời Basic

| Thành phần | Vai trò | Tương đương Spring |
|---|---|---|
| **Module** | Nhóm feature liên quan | `@Configuration` |
| **Controller** | Xử lý HTTP request/response | `@RestController` |
| **Service** | Business logic | `@Service` |
| **Provider** | Bất kỳ class nào có thể inject | `@Component` |
| **Repository** | Data access layer | `@Repository` |

**DI Container hoạt động:**
```
Module khai báo providers → NestJS tạo instance → inject vào nơi cần
```

---

### Trả lời Nâng cao

**Module pattern — feature module:**

```typescript
// users.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService], // Cho module khác dùng
})
export class UsersModule {}
```

**DI scope — quan trọng khi có stateful service:**

| Scope | Instance | Dùng khi |
|---|---|---|
| `DEFAULT` (Singleton) | 1 instance toàn app | Stateless service |
| `REQUEST` | 1 instance per request | Cần request context (user info) |
| `TRANSIENT` | Mỗi lần inject tạo mới | Stateful, không share |

```typescript
@Injectable({ scope: Scope.REQUEST })
export class CacheService {
  // Mỗi request có cache riêng
}
```

---

### Câu hỏi tình huống

**Module A cần dùng Service từ Module B, Module B cần Service từ Module A. Xử lý circular dependency thế nào?**

Gợi ý trả lời:
1. **Dấu hiệu**: NestJS throw error "Circular dependency detected"
2. **Fix 1**: Dùng `forwardRef()` — cho NestJS biết resolve sau
```typescript
@Inject(forwardRef(() => ModuleB))
private readonly serviceB: ServiceB
```
3. **Fix tốt hơn**: Tách shared logic ra module thứ 3 (SharedModule), cả A và B import từ đó — circular dependency thường là dấu hiệu thiết kế chưa tốt

---

### Câu hỏi Trick

**Trick:** Service được inject mà không khai báo trong `providers` của module — có lỗi không?

→ Có — NestJS DI container chỉ biết về những gì được khai báo trong module. Nếu muốn dùng service từ module khác, module đó phải `export` service, và module hiện tại phải `import` module đó.
→ Global module (`@Global()`) là exception — providers của nó available toàn app mà không cần import.

---

## Q2: Guards, Interceptors, Pipes, Filters — Request Lifecycle

### Trả lời Basic

**Thứ tự xử lý request trong NestJS:**

```
Request
  → Middleware
  → Guards (auth check)
  → Interceptors (before)
  → Pipes (validation/transform)
  → Controller/Handler
  → Interceptors (after)
  → Exception Filters (nếu có lỗi)
→ Response
```

| | Mục đích | Ví dụ |
|---|---|---|
| **Guard** | Quyết định allow/deny request | Auth, Role check |
| **Interceptor** | Transform request/response, logging | Add metadata, cache response |
| **Pipe** | Validate và transform input | Validate DTO, parse int |
| **Filter** | Xử lý exception | Format error response |

---

### Trả lời Nâng cao

**Guard — JWT Auth:**

```typescript
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];

    if (!token) throw new UnauthorizedException();

    try {
      request.user = this.jwtService.verify(token);
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
```

**Pipe — validation với class-validator:**

```typescript
// DTO
export class CreateUserDto {
  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;
}

// Controller
@Post()
create(@Body() dto: CreateUserDto) { // Pipe validate tự động
  return this.usersService.create(dto);
}

// Enable globally
app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
```

**`whitelist: true`**: Tự động strip các field không có trong DTO — tránh mass assignment attack.

---

### Câu hỏi tình huống

**Cần log toàn bộ request/response (method, path, status, duration) mà không sửa từng controller. Đặt logic ở đâu?**

Gợi ý trả lời:
- **Interceptor** — vì cần xử lý cả trước (capture start time, log request) và sau (log response, duration)
- Không dùng Middleware vì Middleware không access được response sau khi controller xử lý xong

```typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const req = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.url} - ${duration}ms`);
      }),
    );
  }
}
```

---

### Câu hỏi Trick

**Trick:** Guard vs Middleware — cả 2 đều có thể check auth, dùng cái nào?

→ Middleware không có context về handler sẽ xử lý request (không biết là route nào, không access được metadata như `@Roles()`)
→ Guard có `ExecutionContext` → biết handler, class, và custom metadata → dùng Guard khi cần role-based auth, feature flag per-route
→ Middleware dùng cho logic không cần biết route cụ thể: rate limiting, request ID injection, CORS

---

## Q3: TypeORM với NestJS — Entity, Repository, Transaction

### Trả lời Basic

| Concept | Mô tả | Ví dụ |
|---|---|---|
| **Entity** | Map class → DB table | `@Entity()`, `@Column()` |
| **Repository** | Query cho 1 entity | `userRepo.findOne()` |
| **DataSource** | Connection pool | Inject để raw query |
| **Migration** | Thay đổi schema có version | `typeorm migration:run` |

---

### Trả lời Nâng cao

**Entity + Repository pattern:**

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false }) // Không return trong query thường
  password: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Order, order => order.user)
  orders: Order[];
}

// Service
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  findByEmail(email: string) {
    return this.userRepo.findOne({ where: { email } });
  }
}
```

**Transaction:**

```typescript
async transfer(fromId: string, toId: string, amount: number) {
  return this.dataSource.transaction(async (manager) => {
    const from = await manager.findOneOrFail(Account, { where: { id: fromId } });
    const to = await manager.findOneOrFail(Account, { where: { id: toId } });

    from.balance -= amount;
    to.balance += amount;

    await manager.save([from, to]); // Cả 2 trong 1 transaction
  });
}
```

---

### Câu hỏi tình huống

**App đang dùng `synchronize: true` trong TypeORM config production. Vấn đề gì có thể xảy ra?**

Gợi ý trả lời:
- `synchronize: true` tự động ALTER TABLE mỗi khi app start để match Entity
- **Rủi ro**: Xóa column nếu bạn remove field khỏi Entity, data loss không thể recover
- **Đúng**: Dùng migrations — mọi thay đổi schema phải qua migration file, có thể review, rollback
- `synchronize: true` chỉ OK trong development local

---

### Câu hỏi Trick

**Trick:** N+1 problem với TypeORM — khi nào xảy ra và fix thế nào?

→ Xảy ra khi load danh sách entity rồi access relation:
```typescript
// 1 query lấy 100 orders + 100 query lấy user cho mỗi order
const orders = await orderRepo.find();
for (const order of orders) {
  console.log(order.user.name); // Lazy load → N query
}
```
→ Fix: Eager load với `relations` hoặc `QueryBuilder` với `leftJoinAndSelect`:
```typescript
const orders = await orderRepo.find({ relations: ['user'] }); // 1 JOIN query
```

---

## Q4: Microservices với NestJS — Transport Layer

### Trả lời Basic

| Transport | Protocol | Dùng khi |
|---|---|---|
| **TCP** | TCP socket | Internal service, low latency |
| **Redis** | Pub/Sub | Simple message passing |
| **Kafka** | Event streaming | High throughput, event sourcing |
| **RabbitMQ** | AMQP | Task queue, routing phức tạp |
| **gRPC** | HTTP/2 + Protobuf | Performance critical, strong typing |
| **HTTP** | REST | External-facing API |

---

### Trả lời Nâng cao

**Message Pattern vs Event Pattern:**

```typescript
// Message Pattern — có response (Request-Reply)
@MessagePattern('get_user')
async getUser(@Payload() data: { id: string }) {
  return this.usersService.findById(data.id);
}

// Event Pattern — fire-and-forget (không có response)
@EventPattern('user_created')
async handleUserCreated(@Payload() data: UserCreatedEvent) {
  await this.emailService.sendWelcome(data.email);
}
```

**Hybrid app — vừa HTTP vừa microservice:**

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Thêm microservice transport
  app.connectMicroservice({
    transport: Transport.KAFKA,
    options: { client: { brokers: ['kafka:9092'] } },
  });

  await app.startAllMicroservices();
  await app.listen(3000);
}
```

---

### Câu hỏi tình huống

**Service A gọi Service B qua message, nhưng B đang down. Bạn xử lý thế nào?**

Gợi ý trả lời:
1. **Timeout**: Set timeout cho message, không block vô hạn
2. **Retry với backoff**: Exponential backoff để tránh spam service đang recover
3. **Circuit Breaker**: Sau N lần fail, tự động ngắt circuit, không gửi request nữa cho đến khi B recover
4. **Dead Letter Queue**: Message không xử lý được sau N retry → đưa vào DLQ để review sau
5. **Async fallback**: Nếu B không critical, cho A tiếp tục và xử lý B async sau

---

### Câu hỏi Trick

**Trick:** `@MessagePattern` vs `@EventPattern` — khi nào dùng cái nào?

→ `@MessagePattern`: Caller **chờ** response → dùng khi cần kết quả để xử lý tiếp (query data, validate)
→ `@EventPattern`: Fire-and-forget → dùng khi không cần response (notification, audit log, trigger side effect)
→ Dùng Event Pattern nhiều hơn trong microservices để giảm coupling — service không phụ thuộc vào availability của service khác
