# Terraform / Infrastructure as Code

---

## Q1: `terraform plan` vs `terraform apply` — Quy trình đúng

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | `terraform plan` | `terraform apply` |
|---|---|---|
| Tác động | Chỉ đọc, không thay đổi | Thay đổi infrastructure thật |
| Mục đích | Preview changes | Execute changes |
| Output | Execution plan | Applied changes + new state |
| An toàn | Luôn an toàn | Không thể undo một số thay đổi |

**Trả lời Nâng cao** *(Tình huống thực tế)*

> **terraform plan** — như xem bản thiết kế trước khi xây nhà. Thấy sẽ thêm/xóa/sửa gì, không tốn gạch vữa.
>
> **terraform apply** — như bắt đầu xây thật. Một số việc không làm lại được (đập tường rồi thì khó hoàn nguyên).

**Câu hỏi tình huống**

> Junior DevOps chạy `terraform apply` thẳng lên production mà không review plan. 5 phút sau production DB bị xóa. Bạn thiết kế process thế nào để ngăn chặn?

*Trả lời*:
1. **Required plan review**: CI tạo plan file, human approve trước khi apply
2. **`prevent_destroy = true`** lifecycle rule trên critical resources

```hcl
resource "aws_db_instance" "prod" {
  lifecycle {
    prevent_destroy = true  # Terraform error nếu cố xóa
  }
}
```

3. **Separate state per environment** — dev/staging/prod không chung state file
4. **RBAC**: Production apply chỉ cho senior/infra team
5. **Atlantis/Terraform Cloud**: PR-based workflow, plan comment tự động trên PR

**Câu hỏi Trick**

**Trick 1**: `terraform state` là gì? Nếu state file bị mất thì sao?

*Trả lời*: State file lưu mapping giữa Terraform resource và infrastructure thật. Nếu mất state, Terraform không biết resource nào đang tồn tại → `terraform apply` sẽ cố tạo lại toàn bộ → duplicate resource hoặc conflict. Fix bằng `terraform import` để import resource thật vào state mới — nhưng rất tốn công. **Phòng ngừa**: lưu state ở S3 + DynamoDB locking, không commit state vào git.

---

**Trick 2**: 2 người cùng chạy `terraform apply` lên cùng environment cùng lúc. Vấn đề gì xảy ra?

*Trả lời*: Race condition — cả 2 đọc state cũ, apply changes, ghi state mới → một trong hai ghi đè state của người kia → state bị corrupt, infrastructure thật không khớp với state. Fix bằng **state locking** với DynamoDB:

```hcl
terraform {
  backend "s3" {
    bucket         = "tf-state"
    key            = "prod/terraform.tfstate"
    region         = "ap-southeast-1"
    dynamodb_table = "tf-lock"  # Lock table
  }
}
```

---

## Q2: Terraform `module` — Khi nào nên dùng?

**Trả lời Basic** *(Phân biệt đặc điểm)*

| | Không dùng module | Dùng module |
|---|---|---|
| Code | Duplicate giữa env | Tái dùng |
| Thay đổi | Phải sửa nhiều nơi | Sửa một chỗ |
| Complexity | Đơn giản | Thêm abstraction layer |
| Khi nào | Infrastructure đơn giản, 1 env | Nhiều env giống nhau, chuẩn hóa |

**Câu hỏi tình huống**

> Bạn có 3 environment (dev/staging/prod) với cùng infrastructure (VPC, EKS, RDS) nhưng khác size. Bạn tổ chức code Terraform thế nào?

*Trả lời*: Dùng module + workspace hoặc separate var files:

```
modules/
  vpc/
  eks/
  rds/
environments/
  dev/
    main.tf      # gọi modules với var nhỏ
    terraform.tfvars
  prod/
    main.tf      # gọi cùng modules với var lớn hơn
    terraform.tfvars
```

**Câu hỏi Trick**

**Trick 1**: `terraform destroy` xóa resource theo thứ tự nào?

*Trả lời*: Ngược với thứ tự tạo — **dependency graph đảo ngược**. Resource phụ thuộc vào resource khác sẽ bị xóa trước. Ví dụ: EC2 instance trong VPC sẽ bị xóa trước VPC. Terraform tự tính toán dependency graph từ references trong code.

---

**Trick 2**: `count` vs `for_each` — khác nhau thế nào?

*Trả lời*:
- **`count`**: Tạo N resource giống nhau, index bằng số (0, 1, 2...). Xóa giữa chừng → index thay đổi → Terraform recreate các resource sau
- **`for_each`**: Tạo resource theo map/set, index bằng key. Xóa một key → chỉ xóa resource đó, không ảnh hưởng resource khác

```hcl
# count — xóa "b" sẽ khiến "c" bị recreate (index shift)
resource "aws_s3_bucket" "bucket" {
  count  = 3
  bucket = "my-bucket-${count.index}"
}

# for_each — xóa "b" không ảnh hưởng "a" và "c"
resource "aws_s3_bucket" "bucket" {
  for_each = toset(["a", "b", "c"])
  bucket   = "my-bucket-${each.key}"
}
```

---

## Q3: Terraform `data` source — Đọc resource đã tồn tại

**Trả lời Basic**

`data` source cho phép Terraform **đọc** resource đã tồn tại (tạo bên ngoài Terraform hoặc ở state khác) mà không quản lý lifecycle của nó.

```hcl
# Đọc VPC đã có sẵn
data "aws_vpc" "existing" {
  filter {
    name   = "tag:Name"
    values = ["production-vpc"]
  }
}

# Dùng trong resource khác
resource "aws_subnet" "app" {
  vpc_id     = data.aws_vpc.existing.id
  cidr_block = "10.0.1.0/24"
}
```

**Câu hỏi Trick**

> `data` source và `resource` — Terraform destroy có xóa `data` source không?

*Trả lời*: Không — `data` source chỉ **read**, Terraform không quản lý lifecycle. `terraform destroy` chỉ xóa resource được khai báo bằng `resource` block. Đây là cách để reference resource bên ngoài mà không risk bị Terraform xóa.

---

## Q4: Terraform Workspace — Quản lý nhiều environment

**Trả lời Basic**

Workspace cho phép dùng **cùng code Terraform** với **state file riêng biệt** cho từng environment.

```bash
terraform workspace new staging
terraform workspace new production
terraform workspace select staging

# Dùng trong code
resource "aws_instance" "app" {
  instance_type = terraform.workspace == "production" ? "t3.large" : "t3.small"
}
```

**Trả lời Nâng cao**

> **Khi nào KHÔNG dùng Workspace**:
> - Environments có infra rất khác nhau (không chỉ khác size)
> - Cần phân quyền riêng cho từng env (dev team không nên có quyền prod workspace)
>
> **Alternative tốt hơn**: Separate directory per environment với shared modules.

```
environments/
  dev/
    main.tf     # module call với var dev
  prod/
    main.tf     # module call với var prod
```

**Câu hỏi Trick**

> `terraform.workspace` trong code có phải bad practice không?

*Trả lời*: Nhiều team cho là **anti-pattern** — logic env-specific rải rác trong code, khó test. Tốt hơn là truyền vào qua variable (`var.environment`), giữ code clean và testable.

---

## Q5: Remote Backend và State Locking

**Trả lời Basic**

| Backend | Locking | Dùng khi |
|---|---|---|
| Local (default) | Không | Dev cá nhân |
| S3 + DynamoDB | DynamoDB | AWS |
| Terraform Cloud | Built-in | Multi-team, audit |
| GCS | Built-in | GCP |
| Azure Blob | Lease-based | Azure |

**Trả lời Nâng cao**

```hcl
terraform {
  backend "s3" {
    bucket         = "company-tf-state"
    key            = "services/payment/terraform.tfstate"
    region         = "ap-southeast-1"
    encrypt        = true                    # Mã hóa state at rest
    dynamodb_table = "terraform-state-lock"  # Prevent concurrent apply
  }
}
```

**Tại sao cần encryption?** State file chứa sensitive data (password, secret key) ở dạng plaintext — phải encrypt at rest và restrict S3 bucket access.

**Câu hỏi Trick**

> Terraform apply bị interrupt giữa chừng (mất điện, Ctrl+C). State có bị corrupt không?

*Trả lời*: Có thể có **partial apply** — một số resource đã tạo, một số chưa. State sẽ phản ánh những gì đã apply trước khi interrupt. Chạy `terraform apply` lại — Terraform sẽ tiếp tục từ trạng thái hiện tại, không tạo lại resource đã có. **State lock** vẫn có thể bị giữ nếu crash — phải `terraform force-unlock <lock-id>` để tiếp tục.

---

## Q6: Terraform Testing — Kiểm thử infrastructure code

**Trả lời Basic**

| Level | Tool | Kiểm tra |
|---|---|---|
| Unit | `terraform validate`, `tflint` | Syntax, best practices |
| Integration | Terratest (Go) | Deploy thật, assert output |
| Policy | OPA/Conftest, Sentinel | Compliance rules |
| Plan validation | `terraform plan -detailed-exitcode` | Drift detection trong CI |

**Trả lời Nâng cao**

```go
// Terratest — integration test
func TestVpcCreation(t *testing.T) {
    opts := &terraform.Options{
        TerraformDir: "../modules/vpc",
        Vars: map[string]interface{}{
            "environment": "test",
            "cidr_block":  "10.0.0.0/16",
        },
    }
    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    vpcId := terraform.Output(t, opts, "vpc_id")
    assert.NotEmpty(t, vpcId)
}
```

**Câu hỏi Trick**

> Terratest tạo resource thật trên AWS — tốn tiền. Làm thế nào giảm chi phí?

*Trả lời*:
1. Dùng region có cost thấp nhất (`us-east-1`)
2. Dùng smallest instance type trong test
3. `defer terraform.Destroy()` — luôn cleanup sau test dù pass hay fail
4. Chạy test song song (`t.Parallel()`)
5. Dùng `localstack` cho một số AWS service (S3, DynamoDB) mà không cần real AWS

---

## Q7: `terraform import` — Đưa resource vào quản lý

**Trả lời Basic**

Khi có resource tạo thủ công (console, CLI) mà muốn Terraform quản lý:

```bash
# Khai báo resource trong .tf trước
resource "aws_s3_bucket" "existing" {
  bucket = "my-existing-bucket"
}

# Import
terraform import aws_s3_bucket.existing my-existing-bucket

# Sau đó plan để xem có diff không
terraform plan
```

**Câu hỏi tình huống**

> Toàn bộ infrastructure đang quản lý bằng tay. Muốn migrate sang Terraform. Làm thế nào?

*Trả lời*:
1. **terraformer** hoặc **tf-auto-import** — tự động generate `.tf` file và import state từ cloud
2. Import từng resource group theo thứ tự dependency (VPC → Subnet → EC2)
3. Run `terraform plan` sau mỗi import — đảm bảo no diff (config match thực tế)
4. Enable `prevent_destroy` trước khi đội vận hành dùng thật

**Câu hỏi Trick**

> `terraform import` có generate code `.tf` không?

*Trả lời*: Chỉ từ **Terraform 1.5+** có `import` block và `terraform plan -generate-config-out`. Trước đó phải tự viết `.tf` rồi import state — tốn công. Đây là lý do các tool như terraformer/aztfy được dùng nhiều.

---

## Q8: Terraform Provider và Version Pinning

**Trả lời Basic**

```hcl
terraform {
  required_version = ">= 1.5.0"     # Pin Terraform version

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"            # Cho phép 5.x, không cho 6.x
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "= 2.23.0"          # Pin exact version
    }
  }
}
```

**Trả lời Nâng cao**

> **Tại sao phải pin version**:
> - Provider minor version update có thể có breaking change trong resource schema
> - Team dùng version khác nhau → `terraform plan` cho kết quả khác nhau → không reproducible
> - `.terraform.lock.hcl` (commit vào git) lock provider version và checksum → đảm bảo consistency

**Câu hỏi Trick**

> `.terraform.lock.hcl` có nên commit vào git không?

*Trả lời*: **Có** — đây là lock file tương tự `package-lock.json`. Đảm bảo mọi người dùng cùng provider version và checksum. Nếu không commit, mỗi lần `terraform init` có thể resolve version khác nhau → không reproducible.
