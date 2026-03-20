# Topic 17: Problem Solving & Personal Task Management

---

## Q1: Estimation — Ước lượng thời gian và độ phức tạp

### Trả lời Basic

| Kỹ thuật | Mô tả | Dùng khi |
|---|---|---|
| **Story Points** | Đơn vị tương đối (1, 2, 3, 5, 8, 13…) | Sprint planning, so sánh tương đối |
| **Three-point Estimate** | (Optimistic + 4×Likely + Pessimistic) / 6 | Task có nhiều ẩn số |
| **T-shirt Sizing** | XS/S/M/L/XL | Rough estimate ở giai đoạn sớm |
| **Planning Poker** | Team đồng thuận, giảm anchoring bias | Sprint planning |

**Công thức Three-point:**
```
E = (O + 4M + P) / 6
Variance = ((P - O) / 6)²
```

---

### Trả lời Nâng cao

**Ví dụ thực tế:**

Ước tính một feature "đăng nhập bằng Google OAuth":
- Optimistic: 2 ngày (API đơn giản, có sẵn lib)
- Likely: 4 ngày (test edge cases, token refresh)
- Pessimistic: 8 ngày (security review, backend phải refactor)

→ E = (2 + 4×4 + 8) / 6 ≈ **4.3 ngày**

**Bẫy hay gặp:**
- **Anchoring bias**: Người đầu tiên nói số, cả team bị ảnh hưởng → dùng Planning Poker (reveal đồng thời)
- **Ước lượng thiếu buffer**: Không tính review, deploy, hotfix → thêm 20-30% buffer
- **Happy path estimate**: Chỉ estimate khi mọi thứ hoàn hảo → phải hỏi "điều gì có thể sai?"

---

### Câu hỏi tình huống

**PM yêu cầu bạn estimate feature mới trong 30 phút, nhưng bạn chưa đọc spec. Bạn làm gì?**

Gợi ý trả lời:
1. Đưa ra **range** thay vì con số chính xác: "2–5 ngày, tùy scope"
2. Liệt kê rõ **assumptions**: "Giả sử API backend đã sẵn sàng, không cần security review"
3. Đặt **checkpoint**: "Sau khi đọc spec kỹ, tôi sẽ confirm lại trong 24h"
4. Không bao giờ cam kết số cứng khi chưa hiểu rõ

---

### Câu hỏi Trick

**Trick 1:** PM nói "Team khác estimate task này chỉ 2 ngày, tại sao team bạn estimate 5 ngày?"

→ Bẫy: Bị áp lực giảm estimate → team sẽ rush, nợ technical debt
→ Trả lời đúng: "Có thể context khác nhau. Estimate của tôi bao gồm [X, Y, Z]. Nếu bỏ Y, Z thì có thể về 2 ngày, nhưng rủi ro là…"

**Trick 2:** Stakeholder hỏi "Estimate có chắc chắn không?"

→ Estimate không bao giờ là cam kết (commitment), đó là **dự đoán có cơ sở**
→ Dùng Cone of Uncertainty: càng sớm trong dự án, range estimate càng rộng

---

## Q2: Planning — Lập kế hoạch Sprint và phân chia task

### Trả lời Basic

| Bước | Hoạt động | Output |
|---|---|---|
| **Backlog Refinement** | Review, estimate, clarify story | Groomed backlog |
| **Sprint Planning** | Chọn story vào sprint, breakdown task | Sprint backlog |
| **Capacity Planning** | Tính capacity thực tế của team | Số SP có thể commit |
| **Definition of Done** | Tiêu chí hoàn thành | Checklist DoD |

**Công thức Capacity:**
```
Capacity = (Số ngày sprint × Số dev) - (ngày nghỉ + meeting + buffer 20%)
```

---

### Trả lời Nâng cao

**Ví dụ thực tế:**

Sprint 2 tuần, 4 dev, velocity = 30 SP:
- Ngày làm việc: 10 ngày/người × 4 người = 40 người-ngày
- Trừ meeting (~10%): 36 người-ngày
- Trừ buffer (20%): ~29 người-ngày ≈ **30 SP** (khớp velocity)

**Kỹ thuật chia nhỏ task:**
- Story > 8 SP → nên split nhỏ hơn
- Mỗi task ≤ 1 ngày → dễ track, dễ unblock
- Phân task theo **vertical slice** (end-to-end feature) thay vì horizontal (BE xong rồi mới FE)

---

### Câu hỏi tình huống

**Giữa sprint, team nhận thêm "urgent bug production". Bạn xử lý thế nào?**

Gợi ý trả lời:
1. **Triage mức độ**: P0 (down production) vs P1 (degraded) vs P2 (minor)
2. **Trade-off rõ ràng**: Thêm việc → phải bỏ/dời story nào? Không nên "squeeze thêm" mà không bỏ gì
3. **Thông báo sớm**: Báo stakeholder nếu sprint goal bị ảnh hưởng
4. **Post-mortem**: Sau khi fix, review nguyên nhân để prevent

---

### Câu hỏi Trick

**Trick:** "Team không bao giờ hoàn thành hết sprint backlog. Vấn đề là gì?"

→ Không phải team lười — thường do **over-commitment** hoặc **estimate sai**
→ Giải pháp: Review velocity 3 sprint gần nhất, dùng số đó làm baseline, không dùng capacity lý thuyết

---

## Q3: Risk Management — Quản lý rủi ro

### Trả lời Basic

**Risk Matrix:**

| | Low Impact | High Impact |
|---|---|---|
| **High Probability** | Mitigate | Avoid |
| **Low Probability** | Accept | Transfer/Contingency |

**4 chiến lược:**
- **Avoid**: Thay đổi plan để loại bỏ rủi ro
- **Mitigate**: Giảm xác suất hoặc tác động
- **Transfer**: Chuyển rủi ro (insurance, outsource)
- **Accept**: Chấp nhận và chuẩn bị contingency plan

---

### Trả lời Nâng cao

**Ví dụ thực tế:**

Risk: "Vendor API có thể thay đổi breaking change trước go-live"
- Probability: Medium, Impact: High → **Mitigate**
- Action: Tạo abstraction layer, pin API version, theo dõi changelog
- Contingency: Chuẩn bị fallback logic nếu API down

**Iron Triangle — trade-off khi có rủi ro:**
```
Scope ←→ Time ←→ Cost (Quality)
```
Khi risk xảy ra, chỉ có 3 lựa chọn:
1. Giảm scope
2. Tăng time
3. Tăng resource (thêm người — Brooks's Law cảnh báo!)

---

### Câu hỏi tình huống

**Một thư viện third-party bạn đang dùng thông báo deprecated và sẽ không còn support sau 3 tháng. Bạn xử lý thế nào?**

Gợi ý trả lời:
1. **Assess impact**: Bao nhiêu chỗ trong code dùng? Migration effort là bao nhiêu?
2. **Research alternatives**: Tìm replacement, PoC nhỏ để validate
3. **Create risk item**: Đưa vào backlog với priority phù hợp
4. **Plan migration**: Chia nhỏ, không big-bang migration

---

### Câu hỏi Trick

**Trick:** "Rủi ro nào bạn không thể manage được?"

→ Câu trả lời sâu: External dependency (vendor down, cloud outage), key person risk (ngôi sao rời team), business pivot
→ Cách handle: Document, cross-train, design for failure (circuit breaker, fallback), không có single point of failure trong team

---

## Q4: Technical Blocker — Xử lý khi team bị block

### Trả lời Basic

| Loại Blocker | Ví dụ | Cách xử lý |
|---|---|---|
| **Knowledge gap** | Dev không biết công nghệ X | Pair programming, spike task |
| **Dependency** | Chờ team khác deliver API | Escalate sớm, mock API, parallel track |
| **Environment** | Dev/staging env bị lỗi | Timebox fix, escalate nếu quá 1 ngày |
| **Unclear requirement** | Story không đủ acceptance criteria | Product Owner meeting ngay |

**Timebox rule**: Mỗi blocker → dev tự unblock trong **4 giờ** → raise flag, không im lặng 2 ngày.

---

### Trả lời Nâng cao

**Cross-team dependency — bẫy kinh điển:**

Team A (bạn) cần API từ Team B. Team B nói "2 tuần nữa có". Bạn làm gì?
1. **Mock API** theo contract đã thống nhất → team A tiếp tục
2. **Contract testing** (Pact) → đảm bảo khi real API đến, không break
3. **Escalate ngay** nếu deadline chồng chéo → không chờ đến ngày sprint review mới báo

---

### Câu hỏi tình huống

**Dev senior nhất của team bị stuck 2 ngày với một bug production. Bạn xử lý thế nào?**

Gợi ý trả lời:
1. **Check in, không blame**: "Mình cần tìm hiểu xem bạn đang cần gì"
2. **Rubber duck / pair debug**: Đôi khi giải thích cho người khác nghe giúp tìm ra vấn đề
3. **Timebox decision**: Nếu sau N giờ vẫn stuck → escalate, bring in external expert
4. **Workaround option**: Có cách tạm thời bypass để giảm impact không?
5. **Post-mortem**: Sau khi fix, document lại để tránh lần sau

---

### Câu hỏi Trick

**Trick:** "Bạn có should intervene khi senior dev đang làm không?"

→ Bẫy: Micromanage vs ignore hoàn toàn
→ Trả lời đúng: Không intervene vào HOW (cách implement), nhưng phải intervene vào TIMELINE và IMPACT. Check-in định kỳ, tạo môi trường tâm lý an toàn để dev raise blocker sớm.

---

## Q5: Schedule Slip — Khi dự án bị trễ

### Trả lời Basic

**Khi nhận ra sẽ trễ, có 3 lựa chọn (Iron Triangle):**

| Option | Hành động | Trade-off |
|---|---|---|
| **Reduce Scope** | Cắt feature ít quan trọng | Deliver đúng hạn, ít feature |
| **Extend Timeline** | Dời deadline | Delay revenue/launch |
| **Add Resource** | Thêm người | Brooks's Law: có thể làm chậm hơn |

**Brooks's Law**: "Adding manpower to a late software project makes it later"
→ Người mới cần ramp-up time, distract người cũ

---

### Trả lời Nâng cao

**Khi nào nên báo sớm?**

"Nếu tôi biết ngày 15 sẽ trễ, tôi báo ngày 5, không phải ngày 14"

**Framework báo cáo trễ:**
1. **Facts**: "Chúng ta sẽ trễ 1 tuần, do [nguyên nhân cụ thể]"
2. **Options**: Trình bày 2-3 options với trade-off rõ ràng
3. **Recommendation**: Đề xuất option bạn thấy phù hợp nhất
4. **Next steps**: Bước tiếp theo cụ thể

→ Stakeholder được quyết định, team leader cung cấp thông tin đầy đủ

---

### Câu hỏi tình huống

**Sprint cuối trước release, team estimate còn 40% work nhưng chỉ còn 1 tuần. Bạn làm gì?**

Gợi ý trả lời:
1. **Triage ngay**: Phân loại Must Have / Should Have / Nice to Have
2. **Negotiate scope**: Đề xuất release với Must Have, defer phần còn lại
3. **Communicate ngay**: Không đợi ngày release mới báo
4. **Root cause**: Tại sao xảy ra? Estimate sai? Scope creep? Dependency?
5. **Không overtime blind**: Overtime ngắn hạn OK, nhưng phải có end date rõ ràng

---

### Câu hỏi Trick

**Trick 1:** "PM nói 'không thể dời deadline, không thể cắt feature, hãy thêm người'. Bạn phản ứng thế nào?"

→ Bẫy: Đồng ý rồi team burn out
→ Trả lời đúng: "Tôi hiểu áp lực. Nhưng thêm người lúc này sẽ mất 1-2 tuần onboard, có thể làm chậm hơn. Tôi đề xuất focus team hiện tại vào X, defer Y sang v1.1. Đây là analysis của tôi..."

**Trick 2:** "Một mình bạn có thể làm thêm giờ để bù không?"

→ Đây là leadership trap. Nếu lead làm OT một mình, team không thấy vấn đề thực sự, issue bị che giấu
→ Đúng hơn: Transparent về vấn đề, giải pháp bền vững thay vì heroic effort

---

## Q6: 1-on-1 và Performance Management

### Trả lời Basic

**Mục đích 1-on-1:**

| Không phải | Là |
|---|---|
| Status update | Build trust, understand blocker |
| Manager talking | Dev talking (70/30) |
| Ad-hoc | Định kỳ, có chuẩn bị |
| Performance review | Continuous feedback |

**Cấu trúc 1-on-1 30 phút:**
- 5 phút: Check-in cá nhân
- 15 phút: Blocker, concern, update
- 10 phút: Growth, feedback, career

---

### Trả lời Nâng cao

**Feedback model — SBI:**
- **Situation**: "Trong sprint review hôm qua..."
- **Behavior**: "Khi bạn interrupt stakeholder 3 lần..."
- **Impact**: "PM cảm thấy bị disrespect, team mất tín nhiệm"

→ Tránh dùng "bạn luôn luôn", "bạn không bao giờ"
→ Feedback cụ thể, kịp thời, riêng tư (praise public, criticize private)

**Khi dev underperform:**
1. Xác định rõ: Thiếu skill hay thiếu will?
2. Thiếu skill: Training, pair programming, clearer task
3. Thiếu will: Tìm nguyên nhân (burnout? personal issue? misalignment?)
4. Nếu không cải thiện sau 30-60 ngày: PIP (Performance Improvement Plan), không để kéo dài ảnh hưởng team

---

### Câu hỏi tình huống

**Dev giỏi nhất của bạn xin nghỉ đột ngột. Bạn xử lý thế nào?**

Gợi ý trả lời:
1. **Ngắn hạn**: Offboarding plan, knowledge transfer, document critical systems
2. **Trung hạn**: Redistribute workload hợp lý, không một người gánh hết
3. **Dài hạn**: Tuyển người, nhưng quan trọng hơn là review tại sao người giỏi rời — có systemic problem không?
4. **Prevention**: Không để single point of failure về knowledge. Cross-train thường xuyên

---

### Câu hỏi Trick

**Trick:** "Bạn có nên là bạn bè với team member không?"

→ Ranh giới quan trọng: Friendly nhưng không phải best friend
→ Khi cần đưa ra quyết định khó (feedback tiêu cực, PIP, không promote), friendship có thể cản trở
→ Professional relationship với mutual respect là ideal

---

## Q7: Conflict Resolution — Giải quyết mâu thuẫn trong team

### Trả lời Basic

**Loại conflict:**

| Loại | Ví dụ | Healthy? |
|---|---|---|
| **Task conflict** | Tranh luận về technical approach | ✅ Tốt nếu constructive |
| **Process conflict** | Bất đồng về cách làm việc | ⚠️ Cần resolve sớm |
| **Relationship conflict** | Personal clash, distrust | ❌ Toxic, phải address ngay |

**5 phong cách giải quyết conflict (Thomas-Kilmann):**
- Competing, Collaborating, Compromising, Avoiding, Accommodating

---

### Trả lời Nâng cao

**Khi 2 dev tranh luận về technical approach:**
1. **Tách người khỏi ý kiến**: "Chúng ta đang đánh giá giải pháp, không phải đánh giá người"
2. **Define criteria rõ ràng**: Tiêu chí là gì? Performance? Maintainability? Deadline?
3. **Data-driven decision**: PoC, benchmark, không tranh luận cảm tính
4. **Disagree and commit**: Khi quyết định xong, cả team execute, không passive-aggressive

**Khi team member complain về nhau:**
1. Nghe riêng từng người, không "xử lý tập thể" ngay
2. Tìm điểm chung, objective fact
3. Mediate cuộc gặp trực tiếp nếu cần
4. Document nếu serious

---

### Câu hỏi tình huống

**PM yêu cầu team làm theo cách mà dev của bạn cho là kỹ thuật tệ. Dev phàn nàn với bạn. Bạn xử lý thế nào?**

Gợi ý trả lời:
1. **Hiểu rõ concern của dev**: Technical debt cụ thể là gì? Risk là gì?
2. **Escalate với data**: Mang concern lên PM với business impact rõ ràng, không complain chung chung
3. **Propose alternative**: Đừng chỉ nói "không được", đề xuất cách vừa đáp ứng business need vừa maintain quality
4. **Nếu bị override**: Transparent với team về lý do, document trade-off, plan để address tech debt sau
5. **Không undermining**: Không để team disrespect PM quyết định sau khi đã escalate đúng cách

---

### Câu hỏi Trick

**Trick 1:** "Team lead nên đứng về phía team hay phía management?"

→ Bẫy: Câu hỏi nhị phân
→ Trả lời đúng: Team lead là **bridge**, không phải phe nào. Nhiệm vụ là translate: business needs → technical reality và ngược lại. Khi conflict thực sự xảy ra, align với điều gì là đúng cho sản phẩm và người dùng.

**Trick 2:** "Nếu bạn biết quyết định của cấp trên là sai, bạn làm gì?"

→ Đúng quy trình: Raise concern một lần, rõ ràng, với data
→ Nếu vẫn bị override: Disagree and commit (không sabotage)
→ Nếu quyết định vi phạm ethics/legal: Đây là khác biệt — phải escalate cao hơn hoặc consider hệ quả nghiêm trọng hơn

---

---

# Phần 2: Developer — Personal Problem Solving

---

## Q8: Bị stuck — Khi không giải quyết được vấn đề kỹ thuật

### Trả lời Basic

| Giai đoạn | Thời gian | Hành động |
|---|---|---|
| **Tự giải quyết** | 0–30 phút | Đọc lại error, log, tài liệu |
| **Rubber duck** | 30–60 phút | Giải thích vấn đề ra giấy hoặc cho người khác nghe |
| **Tìm kiếm có hướng** | 60–120 phút | Search chính xác error message, đọc issue tracker |
| **Hỏi người khác** | > 2 giờ | Hỏi đồng nghiệp, senior, Stack Overflow |
| **Escalate** | > 4 giờ | Báo lead, đừng im lặng |

**Nguyên tắc:** Không ngồi stuck 1 ngày mà không raise flag. Raise sớm không phải yếu — là professional.

---

### Trả lời Nâng cao

**Quy trình debug hiệu quả:**
1. **Reproduce được không?** — Nếu không reproduce được, đừng fix mù
2. **Isolate**: Thu hẹp vùng nghi ngờ, binary search trong code
3. **Hypothesis**: Đặt giả thuyết, kiểm chứng từng cái một
4. **Revert**: Nếu bug mới xuất hiện → `git bisect` hoặc revert từng commit
5. **Read the stack trace top-down**: Root cause thường ở dưới cùng, không phải dòng đầu

**Rubber duck debugging:**
- Giải thích vấn đề cho người không biết gì (hoặc con vịt cao su)
- Trong lúc giải thích, não tự tìm ra contradiction
- Nghiên cứu cho thấy ~90% bug được tìm ra trong lúc explain, trước khi người kia trả lời

---

### Câu hỏi tình huống

**Bạn đang fix bug production, đã debug 3 tiếng, vẫn chưa tìm ra nguyên nhân. Bạn làm gì?**

Gợi ý trả lời:
1. **Báo lead ngay**: Không chờ tự fix xong — production đang ảnh hưởng user
2. **Đánh giá workaround**: Có cách tạm thời giảm thiệt hại không? (feature flag, rollback, redirect traffic)
3. **Bring in help**: Nhờ senior review fresh eyes, đừng ego về việc tự giải quyết
4. **Document những gì đã thử**: Tránh người khác lặp lại, giúp cả team converge nhanh hơn

---

### Câu hỏi Trick

**Trick:** "Bao giờ thì nên tự giải quyết, bao giờ thì nên hỏi?"

→ Bẫy 1: Hỏi quá sớm → không develop problem-solving skill, làm phiền người khác
→ Bẫy 2: Hỏi quá muộn → mất nhiều giờ lãng phí, impact production
→ Trả lời đúng: **Timebox 30 phút – 2 giờ** tùy mức độ urgent. Khi hỏi, phải show những gì đã thử để người trả lời không mất thời gian lặp lại.

---

## Q9: Task Management cá nhân — Quản lý công việc của chính mình

### Trả lời Basic

| Kỹ thuật | Mô tả | Dùng khi |
|---|---|---|
| **Time blocking** | Block lịch theo loại việc | Nhiều loại task khác nhau |
| **Pomodoro** | 25 phút focus, 5 phút nghỉ | Task cần deep work |
| **Eat the frog** | Làm task khó/sợ nhất đầu tiên | Hay procrastinate |
| **2-minute rule** | Việc < 2 phút → làm ngay | Tránh task nhỏ tích tụ |
| **Daily shutdown** | Review xong việc, ghi todo ngày mai | Tránh mang việc về nhà tâm trí |

**WIP limit**: Không làm nhiều hơn 2–3 task song song. Context-switching phá hủy deep work.

---

### Trả lời Nâng cao

**Phân loại task — Ma trận Eisenhower:**

| | Urgent | Not Urgent |
|---|---|---|
| **Important** | Do Now (production bug) | Schedule (learning, refactor) |
| **Not Important** | Delegate (interruptions) | Eliminate (busywork) |

**Dấu hiệu task management tệ:**
- Cuối ngày không biết mình đã làm gì
- Liên tục bị interrupt, không có deep work time
- Task nhỏ tích tụ thành debt lớn
- Estimate của bản thân luôn sai (thực tế gấp đôi)

**Fix:** Track thực tế time bỏ ra (timesheet đơn giản) trong 2 tuần → calibrate lại estimate của bản thân

---

### Câu hỏi tình huống

**Bạn đang có 3 task cùng priority, lead nói làm hết trong tuần này. Bạn làm gì?**

Gợi ý trả lời:
1. **Estimate từng task**: Bao nhiêu giờ mỗi cái?
2. **Cộng lại và so với capacity**: Nếu 3 task = 40h nhưng chỉ còn 30h → không khả thi
3. **Negotiate priority**: "3 task này tôi estimate 40h, tôi chỉ có 30h. Bạn muốn tôi ưu tiên cái nào?"
4. **Đừng im lặng và cố nhồi**: Kết quả là tất cả xong 70%, không cái nào done properly

---

### Câu hỏi Trick

**Trick:** "Làm thế nào để không bị interrupt liên tục mà vẫn không bị coi là unfriendly?"

→ Không phải lựa chọn nhị phân
→ Giải pháp: Thiết lập "focus hours" rõ ràng (9–11h sáng không check Slack), batch câu hỏi (trả lời cùng một lúc), dùng status indicator
→ Communicate proactively: "Tôi đang focus, sẽ trả lời sau 11h" tốt hơn im lặng

---

## Q10: Học công nghệ mới — Tiếp cận và tự học hiệu quả

### Trả lời Basic

| Cách học | Hiệu quả | Bẫy |
|---|---|---|
| **Đọc docs** | Chính xác | Khô, dễ quên |
| **Tutorial/video** | Dễ hiểu | Tutorial hell — chỉ follow, không hiểu sâu |
| **Build project nhỏ** | Retain tốt nhất | Tốn thời gian setup |
| **Teach/explain** | Củng cố kiến thức | Cần audience |
| **Đọc source code** | Hiểu internals | Cần nền tảng trước |

**Learning Pyramid**: Nghe → Đọc → Xem → Demo → Discuss → **Practice → Teach** (retain cao nhất)

---

### Trả lời Nâng cao

**Khi công ty yêu cầu học công nghệ mới trong thời gian ngắn:**

Framework tiếp cận:
1. **Skim overview** (30 phút): Đọc README, intro docs, understand "why this exists"
2. **Hello world** (1–2 giờ): Chạy được ví dụ cơ bản nhất
3. **Core concepts** (1 ngày): 20% concepts giải quyết 80% use cases
4. **Apply vào real task**: Học qua thực hành, không học xong mới làm
5. **Deep dive theo nhu cầu**: Gặp vấn đề gì thì đào sâu phần đó

**Tránh "tutorial hell":**
- Sau khi xem tutorial → đóng lại, tự làm lại từ đầu không nhìn
- Nếu không làm được → chỉ follow, chưa hiểu

---

### Câu hỏi tình huống

**Lead assign bạn task dùng công nghệ bạn chưa biết, deadline 1 tuần. Bạn làm gì?**

Gợi ý trả lời:
1. **Communicate ngay**: "Tôi chưa biết X, tôi cần N ngày để học baseline. Deadline có flexible không?"
2. **Time-box learning**: Không học vô tận — dành 1–2 ngày ramp up, còn lại làm thực tế
3. **Ask for resource**: Ai trong team đã biết X? Có thể pair không?
4. **Deliver incremental**: Sau 3 ngày show progress, đừng im lặng đến ngày cuối

---

### Câu hỏi Trick

**Trick:** "Bao nhiêu công nghệ là đủ? Có nên học rộng hay học sâu?"

→ Không có câu trả lời đúng duy nhất — phụ thuộc role và giai đoạn career
→ Junior/Mid: Học sâu 1–2 stack chính, hiểu đủ để làm việc thực tế
→ Senior+: T-shaped — sâu ở 1 lĩnh vực, rộng đủ để communicate với các team khác
→ Bẫy: Jack of all trades, master of none — biết tất cả ở mức tutorial, không đủ sâu để giải quyết production problem thực sự

---

## Q11: Xử lý khi chính mình gây ra bug production

### Trả lời Basic

**Quy trình khi phát hiện mình gây ra incident:**

| Bước | Hành động | Không nên |
|---|---|---|
| **Immediate** | Báo ngay, không che giấu | Im lặng chờ người khác phát hiện |
| **Contain** | Rollback/hotfix để giảm impact | Fix vội không test, gây thêm bug |
| **Communicate** | Update status liên tục | Disappear trong lúc incident |
| **Root cause** | Post-mortem sau khi resolve | Blame bản thân quá mức |
| **Prevent** | Action item cụ thể để tránh lặp lại | "Sẽ cẩn thận hơn" — không đủ |

---

### Trả lời Nâng cao

**Blameless post-mortem:**
- Incident xảy ra không phải do một người xấu — do **system failure**
- Câu hỏi đúng: "Tại sao system cho phép điều này xảy ra?" không phải "Ai làm sai?"
- Action item: Fix process, add test, add monitoring — không phải "ai đó cần cẩn thận hơn"

**Tâm lý khi gây ra bug:**
- Shame → im lặng → làm mọi thứ tệ hơn
- Professional response: Nhận trách nhiệm → focus vào fix → học từ đó → move on
- Senior dev không phải người không bao giờ bug — là người handle bug professional

---

### Câu hỏi tình huống

**Bạn merge code vào Friday, cuối giờ phát hiện production bị lỗi nhẹ, chưa có user complain. Bạn làm gì?**

Gợi ý trả lời:
1. **Báo ngay, không chờ Monday**: "Tôi vừa phát hiện issue, đây là mức độ tác động..."
2. **Assess severity**: Bao nhiêu user ảnh hưởng? Data bị corrupt không?
3. **Decision về rollback**: Nếu có thể rollback nhanh và safe → làm ngay. Nếu rollback phức tạp → weigh option
4. **Đừng để ego quyết định**: "Fix weekend cho xong" có thể gây thêm risk vì review ít người

---

### Câu hỏi Trick

**Trick:** "Nếu không ai biết là do bạn gây ra, bạn có tự báo không?"

→ Đây là câu hỏi về integrity
→ Trả lời đúng: Có — vì không phải để tự trừng phạt, mà để team có đủ context fix đúng. Dev giấu lỗi gây ra "investigation cost" cao hơn nhiều lần, và mất trust khi bị phát hiện sau.
→ Văn hóa blameless tồn tại được chỉ khi mọi người tin rằng báo lỗi sẽ không bị punish.
