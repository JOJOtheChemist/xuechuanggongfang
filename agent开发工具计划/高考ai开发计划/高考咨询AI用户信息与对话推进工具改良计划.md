# 高考咨询 AI 用户信息与对话推进工具改良计划

## 目标
让高考咨询 AI 不只是“会查学校”，还要真正知道当前在和谁聊、对方现在走到哪一步、前面问过什么、还差什么信息没补齐。

这一轮重点补 3 件事：
- 能查看当前用户的高考咨询画像
- 能更新当前用户的高考咨询画像
- 能简短记录每次对话问了什么、已经推进到哪一步

## 你这次提的核心需求，我整理成产品语言

高考咨询 AI 需要知道：
- 用户叫什么
- 是学生本人还是家长
- 分数多少
- 位次多少
- 哪一届高考
- 选考科目 / 科类是什么
- 省内还是省外优先
- 想去哪些城市
- 想选什么专业，不想选什么专业
- 公办/民办、本科/专科、学校层次这些筛选条件
- 风险偏好是偏冲、偏稳还是偏保
- 用户之前问过什么问题
- 这些问题当前推进到哪一步
- 用户一直在反复关心什么，比如统考、志愿填报、专业就业、城市选择、滑档风险

## 现状判断

当前项目里已经有这些可复用能力：
- `get_current_user_profile_snapshot`
- `update_current_user_intelligence`
- `search_yunnan_admission`
- `search_yunnan_admission_school_detail`
- `list_yunnan_admission_schools`
- `interpret_admission_risk`

结论：
- “通用用户画像读写”底座已经有了
- “高考查学校”工具也已经有了
- 真正缺的是“高考咨询专用记忆层”

也就是说，这次不要重复造一个泛用户系统，而是补一个高考咨询专用工具层，专门解决：
- 高考字段不完整
- 历史问题没有连续性
- Agent 不知道当前咨询进度
- 下一轮追问和推荐容易断层

## 我的建议：不要做一个大杂烩总工具，最好拆成 2 个主工具 + 1 个编排层

### 1. 读取高考咨询状态工具
建议新增：`get_current_gaokao_consultation_state`

用途：
- 给 Agent 一次性读取“当前这个用户的高考咨询状态”
- 不只是读基础资料，还要读高考专用画像和最近几轮推进摘要

建议返回内容：
- `user_display_name`
- `user_role`：学生 / 家长 / 其他
- `gaokao_profile`
- `consultation_progress`
- `recent_question_summaries`
- `main_concerns`
- `missing_key_fields`
- `recommended_next_question`

这个工具解决的问题：
- Agent 一开口就知道用户是谁
- Agent 知道前面聊到哪，不会每次都像第一次认识
- Agent 知道下一步该追问什么，而不是乱问

### 2. 更新高考咨询状态工具
建议新增：`update_current_gaokao_consultation_state`

用途：
- 当用户补充了分数、位次、选科、意向城市、专业偏好时，写回高考画像
- 当这一轮聊完后，把“本轮大概问了什么、结论是什么、下一步是什么”简短写回

建议支持两类写入：
- `profile_patch`
- `progress_patch`

建议入参：
- `profile_patch`
- `progress_patch`
- `source_message_summary`
- `confidence_note`

其中：

`profile_patch` 建议字段：
- `student_name`
- `display_name`
- `user_role`
- `exam_year`
- `province`
- `city`
- `score`
- `rank`
- `batch`
- `exam_type`
- `subject_mode`
- `selected_subjects`
- `preferred_cities`
- `preferred_provinces`
- `target_school_levels`
- `ownership_preference`
- `major_preferences`
- `major_avoidances`
- `career_goals`
- `risk_preference`
- `budget_note`
- `accommodation_preference`
- `family_constraints`

`progress_patch` 建议字段：
- `current_stage`
- `main_concerns`
- `latest_question_summary`
- `latest_answer_summary`
- `resolved_points`
- `pending_questions`
- `recommended_next_step`
- `followup_priority`

### 3. 高考咨询编排层
建议新增：`route_gaokao_consultation`

用途：
- 不负责存数据本身，而是负责把“先读画像 -> 判断缺口 -> 查学校 -> 输出建议 -> 回写推进摘要”串起来

建议流程：
1. 先调用 `get_current_gaokao_consultation_state`
2. 判断当前缺什么关键信息
3. 如果信息不足，优先只追问一个最关键问题
4. 如果信息足够，调用高考检索工具做学校/专业/风险分析
5. 回答完成后，调用 `update_current_gaokao_consultation_state`
6. 把本轮摘要和推进状态写回

## 为什么我不建议只做一个“万能查看更新工具”

如果所有事都塞进一个工具，会有几个问题：
- 读取和写入职责混在一起，后面不好控
- 很容易把历史摘要越存越乱
- Agent 什么时候该读、什么时候该写，不够清楚
- 后面做自动追问、自动补全、自动生成下一步提示时很难扩展

所以更稳妥的方式是：
- 一个工具专门读
- 一个工具专门写
- 一个编排层决定什么时候用它们

如果你现在想先快点落地，第一版也可以先做成一个总工具：
- `manage_gaokao_consultation_state`

支持动作：
- `action: "read"`
- `action: "update_profile"`
- `action: "append_progress"`

但我仍然建议第二版尽快拆开。

## 高考咨询画像字段设计

### 1. 基础身份字段
- `user_display_name`
- `student_name`
- `user_role`
- `phone_masked`
- `wechat_bound`

说明：
- `user_display_name` 用于 Agent 称呼
- `student_name` 用于明确到底是孩子名字还是家长账号名
- `user_role` 很关键，因为家长和学生的回答方式不一样

### 2. 高考核心字段
- `exam_year`
- `province`
- `score`
- `rank`
- `batch`
- `exam_type`
- `subject_mode`
- `selected_subjects`

说明：
- `score` 和 `rank` 至少要有一个
- `exam_type` 例如普通高考、职教高考、春考
- `subject_mode` 例如文理分科 / 新高考
- `selected_subjects` 例如物理、化学、生物

### 3. 志愿筛选偏好字段
- `preferred_cities`
- `preferred_provinces`
- `in_province_priority`
- `target_school_levels`
- `ownership_preference`
- `school_tags`
- `major_preferences`
- `major_avoidances`
- `career_goals`
- `risk_preference`

说明：
- 这部分就是你说的“条件筛选的那些查看因素”
- 以后 Agent 查学校时，可以直接把这些字段带进工具里

### 4. 约束条件字段
- `budget_note`
- `distance_preference`
- `accommodation_preference`
- `family_constraints`
- `must_avoid_factors`

说明：
- 很多学校推荐不是查不到，而是没把家庭约束条件记下来
- 这些字段对后面给方案特别重要

## 对话推进记录设计

这一层是这次最关键的。

不要把整段聊天原样存进去，应该只存“可复用的短摘要”。

### 建议记录结构

`consultation_progress`：
- `current_stage`
- `main_concerns`
- `resolved_points`
- `pending_questions`
- `recommended_next_step`
- `last_updated_at`

`recent_question_summaries`：
- 每轮 1 条简短摘要
- 每条只写“用户大概问了什么 + 当前结论”
- 保留最近 10 到 20 条即可

### current_stage 建议枚举
- `initial_intake`：刚开始收集基础信息
- `score_rank_confirmation`：正在确认分数/位次/选科
- `school_screening`：开始按条件筛学校
- `major_screening`：正在缩专业范围
- `risk_explanation`：在讲冲稳保/滑档/退档
- `candidate_comparison`：在对比学校或专业
- `volunteer_drafting`：在排志愿顺序
- `decision_followup`：在收尾和二次跟进

### main_concerns 建议枚举或标签化
- `统考分数`
- `位次换算`
- `省内院校`
- `省外院校`
- `医学专业`
- `师范专业`
- `计算机专业`
- `考公导向`
- `就业导向`
- `冲稳保`
- `滑档风险`
- `民办接受度`
- `城市优先`

这部分能直接回答你说的：
- “知道用户对统考关心的是什么”
- “知道问题推进到哪一步”

## 摘要记录规则

为了防止 Agent 乱存、瞎存，建议加规则：

### 1. 只记短摘要，不存原文
建议每条 30 到 80 字以内。

示例：
- `用户确认是 2026 云南物化生考生，分数 525，优先昆明和省内公办本科。`
- `本轮主要问护理和临床怎么选，AI 已解释就业差异，下一步要补位次。`

### 2. 只记“稳定事实”和“推进节点”
该记：
- 分数、位次、选科
- 省内省外偏好
- 关注专业
- 风险偏好
- 当前卡点

不该记：
- 寒暄
- 情绪化废话
- 大段原始对话

### 3. 每轮最多写 1 到 2 条
不要一轮写十条，不然后面 Agent 反而看不清。

### 4. 相同信息要去重
如果用户已经明确说过“只想留昆明”，后面重复提到，不要重复新增十几条记忆。

## 存储方案建议

## 方案 A：先快落地，复用现有画像工具

我的建议是第一版先基于现有：
- `get_current_user_profile_snapshot`
- `update_current_user_intelligence`

直接复用它们的 `metadata` 和 `memories` 能力。

建议结构：
- `metadata.gaokaoProfile`
- `metadata.gaokaoConsultationProgress`
- `memories` 里追加少量长期有效摘要

优点：
- 开发快
- 不用先新建很重的表
- 能先把连续对话能力跑起来

不足：
- 多轮对话记录越多，通用画像工具会越来越“重”
- 不适合后面做特别细的会话时间线

## 方案 B：第二版上正式表

建议后续新增一张高考咨询专用表，比如：
- `user_gaokao_consultation_profiles`

再配一张推进摘要表，比如：
- `user_gaokao_consultation_notes`

建议职责：
- `profiles` 存稳定字段
- `notes` 存每轮简短推进摘要

这样后面更适合：
- 做多轮历史回看
- 做阶段切换
- 做运营分析
- 做付费转化跟进

## 和现有高考工具的关系

这次新增的不是“查学校工具”，而是“让查学校更聪明”的前置层。

推荐调用链改成：
1. 先读 `get_current_gaokao_consultation_state`
2. 判断当前关键信息是否完整
3. 若信息完整，再调 `search_yunnan_admission`
4. 若锁定学校，再调 `search_yunnan_admission_school_detail`
5. 若用户问冲稳保，再调 `interpret_admission_risk`
6. 本轮结束后，调 `update_current_gaokao_consultation_state`

这样 Agent 的表现会从：
- “每轮像重新认识一次”

升级成：
- “知道你是谁，知道你前面问过什么，也知道你接下来最该看什么”

## Agent 提示词也要同步升级

除了加工具，Agent 提示词也要补规则，不然工具加了也不一定会用对。

建议在高考咨询 Agent 里加这些规则：
- 开场前优先读取当前高考咨询状态
- 用户已经给过的分数、位次、选科，不要重复问
- 缺信息时，一次只追问一个最关键字段
- 回答完后，如果本轮出现了稳定新信息，要写回画像
- 回答完后，如果本轮推进明显，要写回一条简短进展摘要
- 如果用户再次回来，优先接着上次阶段往下聊

## 最小可落地版本

如果你想尽快上，我建议第一版只做下面这些：

### 必做
- `get_current_gaokao_consultation_state`
- `update_current_gaokao_consultation_state`

### 第一版必须支持的字段
- 姓名/称呼
- 学生或家长
- 年份
- 分数
- 位次
- 选科/科类
- 意向城市
- 意向专业
- 风险偏好
- 最近 5 到 10 条问题摘要
- 当前阶段
- 当前主要关心点

### 第一版必须支持的能力
- 读取已有高考画像
- 更新稳定画像字段
- 追加一条本轮摘要
- 自动返回缺失关键字段清单
- 自动返回下一步建议追问

## 推荐开发顺序

1. 先基于现有 `update_current_user_intelligence` 的 `metadata` 做高考画像原型
2. 新增 `get_current_gaokao_consultation_state`
3. 新增 `update_current_gaokao_consultation_state`
4. 修改高考 Agent prompt，让它先读后答、答完再写
5. 跑几轮真实对话 smoke，看会不会重复问、会不会写脏数据
6. 稳定后再决定要不要拆到正式表

## smoke 重点要测什么

- 用户第一次来，只给一句“我 520 分能报哪样学校”，Agent 会不会先补最关键字段
- 用户第二次回来，Agent 能不能记得他之前是物化生、想留云南
- 用户换一个问题问“护理和口腔哪个好”，Agent 能不能接住之前的分数背景
- 用户是家长不是学生时，称呼和建议风格会不会变
- 用户多次重复某个偏好时，会不会重复写很多条垃圾摘要
- 用户没给位次时，Agent 会不会明确提醒“要更准最好补位次”

## 我对这次改良的最终判断

这次最值得补的，不是再加一个新的学校检索能力，而是补“用户画像连续性”。

因为高考咨询最怕两件事：
- 不知道这个用户是谁
- 不知道前面聊到哪一步

只要把这层补上，你现有的高考查校工具价值会立刻放大，AI 的体验会更像一个真的咨询老师，而不是只会临时答题的搜索机。
