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

---

## Q5: Testing trong NestJS — Unit vs E2E

### Trả lời Basic

| Loại | Tool | Test gì |
|---|---|---|
| Unit test | Jest | Service/Guard/Pipe logic riêng lẻ |
| Integration | Jest + TestingModule | Module với DI thật |
| E2E | Jest + Supertest | HTTP endpoint, full flow |

### Trả lời Nâng cao

```typescript
// Unit test — mock dependencies
describe('UsersService', () => {
  let service: UsersService;
  let userRepo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(UsersService);
    userRepo = module.get(getRepositoryToken(User));
  });

  it('should find user by email', async () => {
    userRepo.findOne.mockResolvedValue({ id: '1', email: 'test@test.com' });
    const user = await service.findByEmail('test@test.com');
    expect(user.email).toBe('test@test.com');
  });
});
```

**E2E test:**

```typescript
describe('Users (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule], // Real module
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  it('POST /users', () => {
    return request(app.getHttpServer())
      .post('/users')
      .send({ email: 'test@test.com', password: 'password123' })
      .expect(201);
  });
});
```

### Câu hỏi Trick

**Trick:** E2E test nên dùng DB thật hay mock?

→ **DB thật** (test database) — vì TypeORM, migrations, và query behavior khác nhau giữa mock và thật. Dùng **Docker Compose** chạy Postgres test, reset DB trước mỗi test suite. Mock DB chỉ hợp lý cho unit test service logic.

---

## Q6: Configuration Management trong NestJS

### Trả lời Basic

```typescript
// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,       // Không cần import lại trong từng module
      envFilePath: `.env.${process.env.NODE_ENV}`,
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        DB_HOST: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
      }),
    }),
  ],
})
export class AppModule {}

// Dùng trong service
@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getPort() {
    return this.configService.get<number>('PORT');
  }
}
```

### Trả lời Nâng cao

**Typed config với namespace:**

```typescript
// config/database.config.ts
export const databaseConfig = registerAs('database', () => ({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  name: process.env.DB_NAME,
}));

// Inject typed
@InjectableConfig('database') private dbConfig: ConfigType<typeof databaseConfig>
// dbConfig.host, dbConfig.port — type-safe
```

### Câu hỏi Trick

**Trick:** `.env` file có nên commit vào git không? Quản lý secret thế nào trong team?

→ **Không commit** `.env` production vào git. Commit `.env.example` với placeholder. Trong production: inject qua K8s Secret, AWS Secrets Manager, hoặc Vault. Trong dev team: dùng tool như **dotenv-vault** hoặc chia sẻ qua password manager.

---

## Q7: Swagger/OpenAPI Documentation

### Trả lời Basic

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('API Docs')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
}
```

**Annotate DTO và Controller:**

```typescript
export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  @IsEmail()
  email: string;
}

@ApiOperation({ summary: 'Create new user' })
@ApiResponse({ status: 201, type: UserDto })
@ApiResponse({ status: 400, description: 'Validation failed' })
@Post()
create(@Body() dto: CreateUserDto): Promise<UserDto> { ... }
```

### Câu hỏi Trick

**Trick:** Swagger UI nên expose trên production không?

→ **Không** — hoặc bảo vệ bằng authentication, chỉ accessible từ internal network. Swagger UI tiết lộ toàn bộ API structure, request/response format → tăng attack surface. Thường disable trên production bằng cách check `NODE_ENV`.

---

## Q8: Graceful Shutdown trong NestJS

### Trả lời Basic

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks(); // Lắng nghe SIGTERM, SIGINT

  await app.listen(3000);
}

// Module cleanup
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.connection.close(); // Đóng DB connection khi shutdown
  }
}
```

### Trả lời Nâng cao

> **Graceful shutdown flow khi K8s gửi SIGTERM:**
> 1. `SIGTERM` nhận → NestJS stop nhận request mới
> 2. Đợi in-flight request hoàn thành (grace period)
> 3. `OnModuleDestroy` hooks chạy — đóng DB, message queue connection
> 4. Process exit

```typescript
// Timeout cho graceful shutdown
app.enableShutdownHooks();

const server = app.getHttpServer();
server.keepAliveTimeout = 65000; // > K8s terminationGracePeriodSeconds (60s)

// Trong K8s deployment
// terminationGracePeriodSeconds: 60
```

### Câu hỏi Trick

**Trick:** Không có graceful shutdown, điều gì xảy ra khi K8s rolling update?

→ K8s gửi SIGTERM và routing stop traffic đến pod. Nếu app không handle SIGTERM → **process bị kill ngay** → in-flight request bị drop → user thấy error. Với graceful shutdown: app hoàn thành request hiện tại trước khi tắt → **zero-downtime deployment**.

## Q9: NestJS vs Express vs Fastify — Khi nào chọn cái nào?

**Trả lời Basic**

| Tiêu chí | Express | Fastify | NestJS |
|---|---|---|---|
| **Kiến trúc** | Minimalist, không có structure | Minimalist, schema-based | Opinionated, Angular-style |
| **Performance** | Baseline | ~2x nhanh hơn Express | Tương đương Express/Fastify (layer overhead) |
| **Learning curve** | Thấp | Thấp-Trung | Cao (DI, decorators, modules) |
| **TypeScript** | Cần tự setup | Built-in | First-class citizen |
| **Scalability** | Cần tự tổ chức | Cần tự tổ chức | Có sẵn structure |
| **Ecosystem** | Lớn nhất | Đang lớn | Dùng được cả Express/Fastify |
| **Khi nào dùng** | MVP, prototype, microservice nhỏ | High-performance API, I/O intensive | Enterprise app, team lớn, long-term |

**Quy tắc nhanh:**
- Solo project / MVP → **Express**
- Performance critical (realtime, streaming) → **Fastify**
- Team ≥ 3 người, enterprise, cần structure rõ ràng → **NestJS**
- NestJS có thể chạy trên Fastify adapter → best of both worlds khi cần performance

### Trả lời Nâng cao

> **NestJS internal architecture — tại sao có overhead?**
> NestJS thêm các layer: IoC Container (DI resolution), Module system, Interceptors/Guards/Pipes pipeline. Với cold start và high-throughput, overhead này đáng kể. Nhưng với business logic thực tế (DB query, external API), overhead này negligible.

**NestJS Fastify adapter:**
```typescript
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter()
);
await app.listen(3000, '0.0.0.0');
```

**Khi NestJS thực sự shine:**
- Monorepo với nhiều apps/libs dùng chung
- Complex business logic cần clear separation (CQRS, Event Sourcing)
- Microservices communication (built-in TCP, gRPC, Kafka transports)
- Cần enforce coding standards trong team

### Câu hỏi tình huống

**Startup cần ship MVP trong 2 tuần, team 2 người đều biết Express. Tech lead đề xuất NestJS để "scale sau này". Bạn nghĩ sao?**

→ Phản biện: 2 tuần + learning curve NestJS = **ship trễ**. YAGNI principle — don't over-engineer cho requirement chưa tồn tại.
→ Pragmatic answer: Express trước, **nếu thực sự scale và team lớn** thì migrate sau — hoặc dùng Express với folder structure tương tự NestJS (controllers/services/modules) để migration sau dễ hơn.

### Câu hỏi Trick

**Trick:** "NestJS inject dependency qua constructor hay property, cái nào tốt hơn?"

→ **Constructor injection** — đây là best practice. Lý do: (1) dependency rõ ràng khi init class, (2) dễ mock trong unit test (không cần reflect metadata), (3) immutable dependencies, (4) NestJS recommend. Property injection chỉ dùng khi circular dependency không tránh được (và circular dep thường là design smell cần refactor).

## Q10: NestJS Decorator & Middleware Pipeline — Thứ tự thực thi

**Trả lời Basic**

NestJS có nhiều loại "interceptor" khác nhau. Thứ tự thực thi khi một request đến:

```
Request
  → Middleware (Express-compatible, run trước mọi thứ)
  → Guards (AuthGuard, RolesGuard — return true/false)
  → Interceptors (before) (logging, transform request)
  → Pipes (validation, transformation — transform data)
  → Controller Handler
  → Interceptors (after) (transform response)
  → Exception Filters (nếu có error)
Response
```

| Layer | Mục đích | Ví dụ |
|---|---|---|
| **Middleware** | Cross-cutting, trước route matching | cors, helmet, logger |
| **Guard** | AuthN/AuthZ — có được vào không? | JwtAuthGuard, RolesGuard |
| **Interceptor** | Wrap execution — logging, caching, transform | LoggingInterceptor, CacheInterceptor |
| **Pipe** | Validate/transform input data | ValidationPipe, ParseIntPipe |
| **Filter** | Handle exceptions → response format | HttpExceptionFilter |

### Trả lời Nâng cao

> **Scopes: Global vs Controller vs Method**
> Mỗi layer có thể apply ở 3 level. Global chạy cho tất cả routes, Controller cho tất cả method trong controller, Method chỉ cho route đó.

```typescript
// Global scope (main.ts)
app.useGlobalGuards(new JwtAuthGuard());
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
app.useGlobalFilters(new HttpExceptionFilter());

// Controller scope
@UseGuards(RolesGuard)
@UseInterceptors(CacheInterceptor)
@Controller('users')
export class UserController {}

// Method scope — override controller scope
@UseGuards(PublicGuard) // bypass JWT cho endpoint này
@Get('public-info')
getPublicInfo() {}
```

**`ValidationPipe` options quan trọng:**
```typescript
new ValidationPipe({
  whitelist: true,        // Strip unknown properties khỏi DTO
  forbidNonWhitelisted: true,  // Throw error nếu có unknown property
  transform: true,        // Auto-transform types (string "1" → number 1)
  transformOptions: { enableImplicitConversion: true }
})
```

### Câu hỏi tình huống

**Bạn cần log tất cả request/response (method, path, duration, status). Dùng Middleware hay Interceptor?**

→ **Interceptor** tốt hơn vì: (1) có access cả request VÀ response, (2) biết execution time (wrap `next.handle()`), (3) có thể dùng RxJS operators để transform stream.
→ Middleware chỉ có access request (không biết response status/body).

```typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const req = context.switchToHttp().getRequest();
    return next.handle().pipe(
      tap(() => console.log(`${req.method} ${req.url} — ${Date.now() - start}ms`))
    );
  }
}
```

### Câu hỏi Trick

**Trick:** "Guard trả về `false` thì request bị reject với HTTP status code bao nhiêu?"

→ **403 Forbidden** (không phải 401). NestJS mặc định ném `ForbiddenException` khi Guard return false.
→ 401 Unauthorized = chưa authenticate (chưa có token). 403 Forbidden = đã authenticate nhưng không có quyền.
→ Để trả 401: Guard phải tự `throw new UnauthorizedException()` thay vì `return false`.
