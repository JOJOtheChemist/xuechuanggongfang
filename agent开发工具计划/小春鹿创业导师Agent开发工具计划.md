# 小春鹿创业导师 Agent 开发工具计划

## 目标
让「小春鹿」从“能介绍板块”升级成“能做创业陪跑”的导师型 Agent，稳定完成这几类事：
- 推荐现有资料
- 先了解用户信息，再给个性化推荐
- 生成适合当前场景的推荐话术
- 检索创业校园相关的话术知识库
- 在知识库暂时为空时，也能先靠一批冷启动内容跑起来

## 现状判断
当前项目里，小春鹿已经有这些可复用能力：
- `get_current_user_profile_snapshot`：读取当前登录用户画像
- `update_current_user_intelligence`：沉淀当前登录用户长期画像
- `search_projects`：查官方已发布项目摘要
- `inspect_project_details`：查看项目详情和资料提示
- `search_activities`：查活动、训练营、讲座等

结论：
- “用户是谁”“平台上有什么项目/活动/资料入口”这层基础能力已经有了
- 真正缺的是“创业导师专用”的资料推荐、追问补全、话术生成、话术知识库检索、知识库入库这几类工具
- 不建议重复开发一个“大而全总入口”，应该在现有工具上补齐创业导师闭环

## 不重不漏的工具分层

### 1. 用户创业画像补全工具
建议新增：`collect_startup_profile`

用途：
- 当用户只说“我想创业”“我不知道从哪开始”时，帮助 Agent 有节奏地补齐关键信息
- 不直接输出一长串追问，而是根据缺失字段给出“下一问建议”

建议字段：
- `current_role`：学生 / 校园合伙人 / 创业中 / 有项目但未落地
- `startup_stage`：想法期 / 组队期 / 验证期 / 初步运营期
- `interest_direction`：电商 / 校园服务 / 文创 / AI 应用 / 家乡资源 / 赛事项目
- `resource_base`：时间 / 团队 / 供应链 / 内容能力 / 校园渠道 / 资金情况
- `current_blocker`：没方向 / 不会选项目 / 不会找队友 / 不知道怎么验证 / 不会表达
- `goal_window`：最近 7 天 / 30 天 / 本学期

返回建议：
- 缺失字段清单
- 最优先确认的 1 个问题
- 给用户的自然追问话术

为什么需要：
- 现在虽然有用户画像读写，但没有“创业导师视角下到底还缺哪些信息”的判断层
- 这个工具能把“追问什么”标准化，减少 Agent 漫无边际盘问

### 2. 创业资料推荐工具
建议新增：`recommend_startup_materials`

用途：
- 基于用户画像 + 当前问题，推荐最该先看的资料
- 资料来源可以先混合：
  - 官方项目资料
  - 官方活动回放/课程
  - 创业知识库条目

建议入参：
- `user_need`
- `startup_stage`
- `interest_direction`
- `current_blocker`
- `limit`

建议返回：
- 资料标题
- 资料类型：项目 / 活动 / 课程 / 话术卡 / 方法文档
- 推荐原因
- 建议先看顺序
- 建议看完后的下一步动作
- 若命中平台项目，保留 `project_id` / `activity_id`

为什么需要：
- 现在 `search_projects` 和 `search_activities` 是“查得到”
- 但还缺“导师判断后帮用户排优先级”的能力

### 3. 创业推荐话术生成工具
建议新增：`generate_startup_recommendation_script`

用途：
- 在拿到用户画像和推荐内容后，输出适合不同场景的话术
- 不是让大模型裸写，而是把话术结构固定住，方便稳定输出

建议场景：
- `cold_start_guidance`：新手起步引导
- `material_recommendation`：资料推荐
- `project_recommendation`：项目推荐
- `activity_invitation`：活动邀请
- `followup_nudge`：二次跟进
- `confidence_boost`：安抚焦虑、降低行动门槛

建议返回：
- `opening`
- `core_recommendation`
- `why_it_fits_you`
- `next_step`
- `short_version`
- `wechat_style_version`

为什么需要：
- 创业导师不是只会“给答案”，还要会“说得像人”
- 这个工具适合把话术模板化，减少回复忽长忽短、忽硬忽软

### 4. 创业话术知识库检索工具
建议新增：`search_startup_script_kb`

用途：
- 检索“创业校园推荐话术知识库”
- 支持按场景、对象、阶段、语气、关键词来搜

建议入参：
- `query`
- `scene`
- `target_user_type`
- `startup_stage`
- `tone`
- `limit`

建议返回：
- 话术标题
- 适用场景
- 适用对象
- 推荐话术正文
- 使用注意事项
- 来源类型：人工沉淀 / 冷启动模板 / 运营精选

为什么需要：
- 你已经明确想做“推荐话术知识库”
- 既然以后要让话术可积累、可复用、可运营配置，就不要只靠 prompt 写死

### 5. 创业话术知识库入库工具
建议新增：`upsert_startup_script_kb`

用途：
- 临时上传一些创业校园推荐话术
- 后续也支持运营同学持续补充、修改、下架

建议字段：
- `title`
- `scene`
- `target_user_type`
- `startup_stage`
- `tone`
- `script_text`
- `recommended_when`
- `avoid_when`
- `tags`
- `status`

为什么需要：
- 你说现在知识库是空的，这件事如果不解决，检索工具上线后也没有内容可搜
- 所以“检索工具”和“入库工具”应该成对开发

### 6. 创业推荐编排工具
建议新增：`route_startup_guidance`

用途：
- 作为创业导师的编排层，把前面的工具串起来

建议流程：
1. 先看当前用户画像
2. 判断是否缺少关键创业信息
3. 若缺失，调用画像补全工具，先生成一轮追问
4. 若信息足够，调用资料推荐工具
5. 再调用话术生成工具，输出自然回复
6. 如果命中知识库里的优质话术，再做融合增强

为什么需要：
- 单个工具能做局部判断
- 真正决定用户体验的是“什么时候追问、什么时候直接推荐、什么时候顺手沉淀画像”

## 哪些工具暂时不要重复开发

### 1. 不要再做“读取当前用户基础画像”的重复工具
因为已有：
- `get_current_user_profile_snapshot`
- `update_current_user_intelligence`

建议做法：
- 创业导师新增工具只补充“创业专用字段”和“缺口判断”
- 用户底层身份、课程记录、活动记录还是复用现有体系

### 2. 不要再做“官方项目详情查询”的重复工具
因为已有：
- `search_projects`
- `inspect_project_details`

建议做法：
- 创业资料推荐工具直接编排这两个已有工具

### 3. 不要先做一个大杂烩的“创业万能搜索”
原因：
- 会和项目搜索、活动搜索、知识库搜索边界冲突
- 后面会越来越难维护和调 prompt

建议做法：
- 保持“项目”“活动”“话术知识库”“资料推荐编排”分层明确

## 知识库冷启动建议
我的判断：需要，且应该尽快先上传一批“临时可用内容”。

原因：
- 话术知识库如果完全为空，`search_startup_script_kb` 的体验会很差
- 创业导师最需要的不是海量知识，而是“前 30 条高频好用话术”
- 冷启动内容不必一次做很大，先做高频场景就能显著提升体验

建议先上传 20 到 40 条，优先覆盖这些场景：
- 新手说“我想创业，但不知道做什么”
- 用户问“创业中心能帮我什么”
- 用户问“学习板块我先看什么”
- 用户问“有没有适合学生做的小项目”
- 用户问“我现在没团队怎么办”
- 用户问“我有个想法，但不知道能不能做”
- 用户问“先参加活动还是先看资料”
- 用户看完资料后，如何继续跟进
- 邀请用户参加活动的话术
- 对焦虑型用户的鼓励与降门槛话术

建议每条知识库至少带这些标签：
- `scene`
- `target_user_type`
- `startup_stage`
- `tone`
- `tags`

## 推荐开发顺序

### 第一阶段：先跑通最小闭环
1. 新增 `search_startup_script_kb`
2. 新增 `upsert_startup_script_kb`
3. 先人工导入一批冷启动话术
4. 新增 `generate_startup_recommendation_script`

这一阶段完成后，小春鹿至少能：
- 搜到现成话术
- 在没有现成话术时补生成一版

### 第二阶段：补齐个性化推荐
1. 新增 `collect_startup_profile`
2. 新增 `recommend_startup_materials`
3. 把现有 `search_projects` / `inspect_project_details` / `search_activities` 串进推荐流程

这一阶段完成后，小春鹿能：
- 先了解用户
- 再推荐资料
- 推荐时说明“为什么适合你”

### 第三阶段：做编排层
1. 新增 `route_startup_guidance`
2. 统一决定本轮是追问、推荐资料、推荐项目，还是给活动引导
3. 接入画像写回逻辑，把稳定信息沉淀进 `update_current_user_intelligence`

这一阶段完成后，小春鹿才真正像一个“导师”，而不是几个工具的拼接

## 最小可落地版本
如果只做最小 MVP，我建议先上 4 个能力：
- `search_startup_script_kb`
- `upsert_startup_script_kb`
- `generate_startup_recommendation_script`
- `recommend_startup_materials`

同时先导入 20 到 40 条冷启动话术。

这样第一版就已经能解决：
- 有哪些现成资料可以推荐
- 资料该怎么说给不同用户听
- 知识库虽然刚开始是空的，但能先被人工填起来

## 一句话结论
小春鹿这条线最值得补的，不是再造一个“搜索工具”，而是补齐这 6 类能力：
- 创业画像补全
- 创业资料推荐
- 创业推荐话术生成
- 创业话术知识库检索
- 创业话术知识库入库
- 创业推荐编排

其中“话术知识库先临时上传一批内容”这件事，我建议直接做，而且要放在前面做。
