# 高考导师 Agent 开发工具计划

## 目标
让高考导师 Agent 能稳定回答这几类问题：
- 按分数 / 位次查能报哪些学校
- 按地域 / 学校层次 / 专业方向筛学校
- 查看某所学校的详细信息
- 对比多所学校，给出推荐顺序
- 根据学生画像输出“冲稳保”方案

## 现状判断
当前后端已经有 `search_yunnan_admission`，能力覆盖了：
- 分数、位次、批次、年份、城市、学校层次、专业关键词筛选
- 院校列表检索
- 推荐结果输出

结论：它应该作为高考导师 Agent 的主检索工具，优先复用，不要重复造一个“总入口”。

补充修正：
- `volunteer` 页面已经有真实高考数据，不是“没有入库”
- 页面里的 `较难 / 较稳 / 兜底` 本质就是给学生看的风险分档结果
- Agent 不应该只把这三个列表当成“罗列工具”，还要负责解释每个档位背后的含义

## 建议的工具分层

### 1. 分数查询工具
建议作为核心入口，支持：
- `score`
- `rank`
- `examYear`
- `examType`
- `province`
- `city`
- `riskBucket`
- `maxScoreGap`

返回内容建议包含：
- 学校名
- 城市/地域
- 学校层次
- 专业数量或专业预览
- 参考分数 / 位次
- 推荐理由

### 2. 学校详情工具
用途是“点进某所学校后看完整信息”：
- 学校简介
- 地域
- 办学层次
- 公办/民办
- 热门专业
- 历年参考分数
- 标签
- 是否有征集志愿 / 补录信息

### 3. 标签筛选工具
适合做“罗列类”查询：
- 按 `城市`
- 按 `学校层次`
- 按 `公办/民办`
- 按 `专业大类`
- 按 `标签`（如 师范 / 医药 / 计算机 / 省内 / 省外）
- 按 `风险档位`（冲 / 稳 / 保 / 补）

这里的风险档位建议直接和当前 volunteer 系统对齐：
- `hard` = 较难 / 冲刺
- `stable` = 较稳 / 稳妥
- `safe` = 兜底 / 保底
- `supplement` = 补录 / 征集

### 4. 学校对比工具
支持 2-5 所学校对比：
- 地域
- 层次
- 热门专业
- 分数线区间
- 推荐匹配度
- 风险档位

### 5. 推荐编排工具
不一定要独立成“数据工具”，也可以是编排层：
- 先查分数命中学校
- 再查学校详情
- 再做标签筛选和对比
- 最后输出推荐结论

## 推荐实现顺序
1. 直接把 `search_yunnan_admission` 作为主入口打磨好
2. 补一个 `inspect_school_details`，专门查学校详情
3. 补一个 `list_schools_by_tags`，负责标签/地域/层次罗列
4. 补一个 `compare_schools`，做多校对比
5. 最后做一个推荐编排层，把上面工具串起来

## 数据要求
最好统一沉淀这些字段：
- `school_id`
- `school_name`
- `province`
- `city`
- `school_level`
- `ownership_type`
- `school_type`
- `tags`
- `major_list`
- `score_line`
- `rank_line`
- `exam_year`
- `exam_type`

## 工程建议
- 所有查询工具都要支持分页
- 返回结果尽量短而结构化，避免一次塞太多文本
- 工具结果里保留 `id`，方便 Agent 二次精查
- 先做云南高考，后面再抽象成多省通用

## 最小可落地版本
第一版只做 3 个能力就够用：
- 分数 / 位次查询
- 学校详情查询
- 标签筛选列表

这样 Agent 就能完成大多数“查学校 + 推荐”场景。

## Agent 解读要求
对于 `较难 / 较稳 / 兜底` 结果，Agent 输出时至少要补这几类解释：
- 为什么这所学校会被归到这个档位
- 这个档位适合什么样的分数波动和风险偏好
- 学生如果想从“较稳”往“较难”冲，还缺哪些条件
- 学生如果担心风险，应该从这批学校里优先看哪些

## 当前开发进度
已完成：
- `search_yunnan_admission`
- `search_yunnan_admission_school_detail`
- `list_yunnan_admission_schools`
- `interpret_admission_risk`

其中：
- 前 3 个工具负责查数据
- `interpret_admission_risk` 负责把 `较难 / 较稳 / 兜底` 翻译成导师可直接发给学生的解释

## 当前线上状态
- 已同步到线上 `xuechuang-kode`
- 已完成 `pm2 restart xuechuang-kode`
- 已用真实测试号跑通主后端志愿接口
- 已完成工具级 smoke
- 已完成 agent 配置级 smoke
- 详细结果见：
- `/Users/yeya/Documents/HBuilderProjects/云创工坊/agent开发工具计划/高考导师Agent工具smoke结果.md`

## 当前建议的调用链
推荐按下面顺序让 Agent 组合工具：
1. 先用 `search_yunnan_admission` 或 `list_yunnan_admission_schools` 取学校列表
2. 如果用户问某个学校细节，再用 `search_yunnan_admission_school_detail`
3. 如果用户问“为什么这所学校是较稳/兜底/较难”，再用 `interpret_admission_risk`
