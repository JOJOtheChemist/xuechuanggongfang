# `zhangxuefeng-perspective` Skill 触发说明

## 1. 这次为什么会触发

你这次看到的调试信息是：

```text
agentId: yunnan-gaokao-volunteer-consultant-v3
本轮触发 skill: 是
已触发 skills: zhangxuefeng-perspective
已加载 skill 文件: /home/ubuntu/ai-dearauthors/zhangxuefeng-skill-main/SKILL.md | /home/ubuntu/ai-dearauthors/zhangxuefeng-skill-main/references/research/05-decisions.md | /home/ubuntu/ai-dearauthors/zhangxuefeng-skill-main/references/research/01-writings.md
skill 注入字符数: 16205
skill 触发原因: zhangxuefeng-perspective:keyword:张雪峰
```

本质上，它是按下面 4 步触发的：

1. 当前 agent `yunnan-gaokao-volunteer-consultant-v3` 允许挂载 `zhangxuefeng-perspective`。
2. 系统把用户消息拿去做 skill 匹配。
3. 匹配器在消息里找到了关键词 `张雪峰`。
4. 命中后，把 `SKILL.md` 和本轮相关参考文件一起拼进系统提示词，所以前端 Debug 面板显示“本轮触发 skill: 是”。

## 2. 触发链路

### 2.1 Agent 先声明自己可用哪些 skill

文件：

- [yunnan-gaokao-volunteer-consultant-v3.ts](/Users/yeya/Documents/HBuilderProjects/云创工坊/学创工坊后端/kode-sdk-xuechuang/server/agents/yunnan-gaokao-volunteer-consultant-v3.ts:3)

关键点：

- 第 20 行声明了 `skillIds: ['zhangxuefeng-perspective']`
- 第 41-42 行也在 system prompt 里写了，如果用户明确要求“用张雪峰视角”“切换到张雪峰”“张雪峰会怎么看”，允许按需注入这个 skill

这说明两件事：

1. 这个 agent 在产品定义层面是“允许使用”这个 skill 的。
2. 这个 agent 的默认人格还是“云南志愿填报顾问 Plus”，skill 只是按需补充，不是永久替代主人格。

### 2.2 Skill 注册时会抽取触发关键词

文件：

- [skill-registry.ts](/Users/yeya/Documents/HBuilderProjects/云创工坊/学创工坊后端/kode-sdk-xuechuang/server/services/skills/skill-registry.ts:19)
- [SKILL.md](/Users/yeya/Documents/HBuilderProjects/云创工坊/zhangxuefeng-skill-main/SKILL.md:1)

关键点：

- `skill-registry.ts` 第 19-25 行先定位 skill 根目录
- 第 31-70 行解析 `SKILL.md` 头部 frontmatter
- 第 73-98 行从 `description + body` 里收集触发关键词
- 第 75-84 行内置了一组基础关键词，包括：
  - `张雪峰`
  - `雪峰视角`
  - `张雪峰视角`
  - `用张雪峰`
  - `张雪峰会怎么看`
  - `张雪峰模式`
  - `切换到张雪峰`
  - `如果张雪峰会怎么说`
- 第 86-89 行还会把 `SKILL.md` 里带引号的短语一起抽出来，作为补充触发词

而 `SKILL.md` 自己也明写了触发描述：

- 第 7 行：用于“用张雪峰的视角分析教育选择、职业规划、阶层流动等问题”
- 第 8-9 行：当用户提到“用张雪峰的视角”“张雪峰会怎么看”“张雪峰模式”“雪峰视角”等，就应触发

所以，skill 的触发规则不是写死在前端，而是由：

1. `skill-registry.ts` 的基础关键词
2. `SKILL.md` 里的 frontmatter 描述

一起决定的。

### 2.3 运行时按“消息是否包含关键词”匹配

文件：

- [skill-matcher.ts](/Users/yeya/Documents/HBuilderProjects/云创工坊/学创工坊后端/kode-sdk-xuechuang/server/services/skills/skill-matcher.ts:18)

关键点：

- 第 22 行先把用户消息转成小写并去空格
- 第 27 行用 `message.includes(keyword)` 做包含匹配
- 第 31 行把命中原因记成 `keyword:命中的词`

所以你这次调试面板里出现：

```text
skill 触发原因: zhangxuefeng-perspective:keyword:张雪峰
```

就是因为用户消息文本里包含了 `张雪峰` 这 3 个字，命中了基础关键词表中的 `张雪峰`。

注意，这里是非常直接的“字符串包含”逻辑，不是向量检索，也不是语义分类器。

### 2.4 Agent 路由层再按 `skillIds` 过滤一次

文件：

- [chatAgentRouting.ts](/Users/yeya/Documents/HBuilderProjects/云创工坊/学创工坊后端/kode-sdk-xuechuang/server/routes/chatAgentRouting.ts:244)

关键点：

- 第 246 行：如果 agent 没配置 `skillIds`，直接返回空 skill
- 第 253-256 行：调用 `resolveSkillMatch`
- 第 258-260 行：把命中的 skill 再和 `agentConfig.skillIds` 交集过滤
- 第 269-278 行：返回真正要注入的 prompt 和 debug 信息

这一步很重要，因为它说明：

- `skill-matcher.ts` 负责“从全局注册 skill 里找谁命中了”
- `chatAgentRouting.ts` 负责“当前 agent 允不允许用这个 skill”

也就是说，这套框架是两层控制：

1. 全局可注册
2. 单 agent 可授权

## 3. 这次为什么只加载了 3 个文件

文件：

- [skill-loader.ts](/Users/yeya/Documents/HBuilderProjects/云创工坊/学创工坊后端/kode-sdk-xuechuang/server/services/skills/skill-loader.ts:19)

`loadedSkillFiles` 不是把整个 skill 目录全塞进去，而是：

1. 永远先加载 `SKILL.md`
2. 再根据本轮消息内容，挑选少量 reference 文件

### 3.1 必加载：`SKILL.md`

`skill-loader.ts` 第 55 行会读 `skill.skillFile`，第 65-70 行固定把它放进注入块里。

所以无论如何，`SKILL.md` 都会进入本轮 prompt。

### 3.2 按消息内容选择参考文件

`skill-loader.ts` 第 19-48 行定义了 `pickReferenceFiles` 规则。

和你这次最相关的是这一段：

- 第 33-38 行，如果消息里命中 `专业|志愿|学校|金融|艺术|就业|阶层|普通家庭|城市|考研|ai|人工智能`
- 那么就加载：
  - `references/research/05-decisions.md`
  - `references/research/01-writings.md`

而你这次消息里本身就出现了：

- `张雪峰`
- `skill`
- `解释文档`
- 以及调试信息里已经带着 `agentId`、`已加载 skill 文件`、`skill 触发原因`

从结果看，本轮 loader 至少判定到了“张雪峰相关 + 教育/志愿语境”，于是把下面 3 个文件送进了 prompt：

1. `SKILL.md`
2. `05-decisions.md`
3. `01-writings.md`

### 3.3 为什么没有加载 `03-expression-dna.md`

因为 `03-expression-dna.md` 和 `02-conversations.md` 的加载条件是：

- 第 28-31 行：消息中包含 `怎么说`、`语气`、`视角`、`切换`

你这次调试输出里实际展示的已加载文件没有这两个，说明当前那一轮真正送进 matcher/loader 的文本，没有命中这组条件，或者命中时使用的是另一段更短的用户消息。

换句话说，当前框架是“按本轮最终进入后端的 message 文本内容”来挑参考文件，不是按你 IDE 打开的 tab 来挑。

## 4. `skill 注入字符数: 16205` 是怎么来的

文件：

- [skill-matcher.ts](/Users/yeya/Documents/HBuilderProjects/云创工坊/学创工坊后端/kode-sdk-xuechuang/server/services/skills/skill-matcher.ts:70)
- [skill-loader.ts](/Users/yeya/Documents/HBuilderProjects/云创工坊/学创工坊后端/kode-sdk-xuechuang/server/services/skills/skill-loader.ts:65)

计算方式很直接：

1. `skill-loader.ts` 把这些内容拼成一个大字符串：
   - `[Skill Activation]`
   - `Skill: zhangxuefeng-perspective`
   - 一句“仅本轮使用”的说明
   - 整个 `SKILL.md`
   - 若干 `Reference: xxx.md`
2. `skill-matcher.ts` 第 76 行取 `systemPromptAugment.length`
3. 这个长度值就被记成 `skillPromptChars`

所以 `16205` 不是“文件大小”，而是“最终注入到系统提示词里的整段文本字符数”。

## 5. 前端 Debug 面板为什么会显示这些字段

文件：

- [chatStreamingRoutes.ts](/Users/yeya/Documents/HBuilderProjects/云创工坊/学创工坊后端/kode-sdk-xuechuang/server/routes/chatStreamingRoutes.ts:204)
- [chatSyncRoutes.ts](/Users/yeya/Documents/HBuilderProjects/云创工坊/学创工坊后端/kode-sdk-xuechuang/server/routes/chatSyncRoutes.ts:135)
- [index.vue](/Users/yeya/Documents/HBuilderProjects/云创工坊/云创工坊前台/云创工坊前端/subpackages/ai-chat/index.vue:101)

链路是：

1. 后端在流式或同步聊天路由里拿到 `skillDebug`
2. 如果有命中，就把这些字段打印/回传：
   - `activatedSkills`
   - `loadedSkillFiles`
   - `skillPromptChars`
   - `skillMatchReason`
3. 前端 `index.vue` 第 102-107 行把这些字段渲染成 Debug 面板里的文案

所以你在页面上看到的这几行，不是前端自己推断出来的，而是后端 skill 系统已经算好的结果。

## 6. 这次实际涉及到的文件

### 6.1 触发定义文件

- [SKILL.md](/Users/yeya/Documents/HBuilderProjects/云创工坊/zhangxuefeng-skill-main/SKILL.md:1)
  - 定义 skill 名称、用途、触发提示语、角色规则和参考框架

### 6.2 本轮被加载的参考文件

- [05-decisions.md](/Users/yeya/Documents/HBuilderProjects/云创工坊/zhangxuefeng-skill-main/references/research/05-decisions.md:1)
  - 偏“决策模式”和“行动记录”
- [01-writings.md](/Users/yeya/Documents/HBuilderProjects/云创工坊/zhangxuefeng-skill-main/references/research/01-writings.md:1)
  - 偏“著作体系”和“稳定核心观点”

### 6.3 Skill 框架代码

- [skill-registry.ts](/Users/yeya/Documents/HBuilderProjects/云创工坊/学创工坊后端/kode-sdk-xuechuang/server/services/skills/skill-registry.ts:19)
  - 注册 skill、读取 `SKILL.md`、抽触发关键词、收集 reference 文件
- [skill-matcher.ts](/Users/yeya/Documents/HBuilderProjects/云创工坊/学创工坊后端/kode-sdk-xuechuang/server/services/skills/skill-matcher.ts:18)
  - 用 `message.includes(keyword)` 做命中判断，生成 debug 原因
- [skill-loader.ts](/Users/yeya/Documents/HBuilderProjects/云创工坊/学创工坊后端/kode-sdk-xuechuang/server/services/skills/skill-loader.ts:19)
  - 按消息内容挑参考文件，并拼接 prompt augment
- [chatAgentRouting.ts](/Users/yeya/Documents/HBuilderProjects/云创工坊/学创工坊后端/kode-sdk-xuechuang/server/routes/chatAgentRouting.ts:244)
  - 负责 agent 维度过滤，只允许当前 agent 授权过的 skill 生效

### 6.4 Agent 和前端展示

- [yunnan-gaokao-volunteer-consultant-v3.ts](/Users/yeya/Documents/HBuilderProjects/云创工坊/学创工坊后端/kode-sdk-xuechuang/server/agents/yunnan-gaokao-volunteer-consultant-v3.ts:3)
  - 声明当前 agent 可以使用 `zhangxuefeng-perspective`
- [index.vue](/Users/yeya/Documents/HBuilderProjects/云创工坊/云创工坊前台/云创工坊前端/subpackages/ai-chat/index.vue:101)
  - 把 skill debug 字段显示到页面

## 7. 用一句话总结这套机制

这套 skill 加载框架不是“只要 agent 配了 skill 就自动生效”，而是：

**先由 agent 声明可用 skill，再由 matcher 根据用户消息关键词命中，再由 loader 按本轮消息挑选最相关的 reference 文件，最后把注入结果和调试信息一起返回前端展示。**

## 8. 对后续框架设计的启发

如果你后面要继续扩 skill 框架，这套实现的优点和局限都很明显：

优点：

- 实现简单，易调试
- `skill 触发原因` 可直接回显
- `loadedSkillFiles` 很容易排查“为什么用了这个参考文件”

局限：

- 当前匹配方式是纯字符串包含，容易误触发，也容易漏掉同义表达
- reference 文件挑选规则是写死在代码里的正则和关键词，扩展多了会越来越难维护
- `skillPromptChars` 只统计字符数，不统计 token，后面多 skill 叠加时可能更关心 token 成本

如果你需要，下一步我可以继续帮你把这份说明再扩成一份更完整的《skill 加载框架设计文档》，把“注册协议、触发器、loader、debug 输出、前端联调字段、后续可扩展方案”整理成标准化设计稿。
