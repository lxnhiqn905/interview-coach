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
