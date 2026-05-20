# Skill 文档触发与注入粒度说明

## 1. 这份说明要回答什么

这份文档专门回答两个问题：

1. `SKILL.md` 这类 skill 文档，当前系统是怎么触发的？
2. skill 一旦触发后，注入给模型的是整个文件，还是更细的粒度？

结论先说：

- 当前实现里，skill 触发靠的是“用户消息是否包含关键词”。
- 当前实现里，`SKILL.md` 是整份文件拼进去的。
- 当前实现里，reference 文档也是“按文件粒度”选择，但一旦选中，就是整份文件拼进去。
- 当前实现里，没有做到“按标题、按段落、按 chunk”做更细粒度注入。

## 2. 当前系统里到底有多少个 skill

文件：

- [skill-registry.ts](/Users/yeya/Documents/HBuilderProjects/云创工坊/学创工坊后端/kode-sdk-xuechuang/server/services/skills/skill-registry.ts:127)

关键点：

- 当前注册逻辑只有一个构造函数：`buildZhangXuefengSkill()`
- `registeredSkills` 也是这样生成的：

```ts
const registeredSkills = [buildZhangXuefengSkill()].filter(Boolean) as RegisteredSkill[];
```

这说明：

- 就“当前代码实现”来说，真正进入框架的 skill 只有一个：`zhangxuefeng-perspective`
- 所谓“其他 skill 文档”，目前并没有作为第二、第三个 skill 被真正注册进这套框架

所以如果你问“其他 skill 文档触发后会怎样”，严格来说分两层：

1. **当前事实**：现在只有一个 skill 被注册，别的 skill 还没进来。
2. **当前框架规则**：未来如果别的 skill 按同样方式注册，它们会遵守同一套触发和注入机制，除非你专门改代码。

## 3. Skill 触发条件是什么

### 3.1 先要被 agent 允许使用

文件：

- [yunnan-gaokao-volunteer-consultant-v3.ts](/Users/yeya/Documents/HBuilderProjects/云创工坊/学创工坊后端/kode-sdk-xuechuang/server/agents/yunnan-gaokao-volunteer-consultant-v3.ts:20)
- [chatAgentRouting.ts](/Users/yeya/Documents/HBuilderProjects/云创工坊/学创工坊后端/kode-sdk-xuechuang/server/routes/chatAgentRouting.ts:328)

规则是：

1. agent 配置里要有 `skillIds`
2. 路由层会把命中的 skill 再和 `agentConfig.skillIds` 做一次交集过滤

也就是说，不是所有 agent 都能随便触发任意 skill。

### 3.2 再看用户消息有没有命中关键词

文件：

- [skill-matcher.ts](/Users/yeya/Documents/HBuilderProjects/云创工坊/学创工坊后端/kode-sdk-xuechuang/server/services/skills/skill-matcher.ts:18)

当前命中逻辑非常直接：

```ts
const matchedKeyword = skill.triggerKeywords.find((keyword) => message.includes(keyword));
```

这代表：

- 不是语义检索
- 不是 embedding 相似度
- 不是分类模型
- 就是普通的字符串包含匹配

只要 `message.includes(keyword)` 返回真，就算触发。

### 3.3 关键词从哪里来

文件：

- [skill-registry.ts](/Users/yeya/Documents/HBuilderProjects/云创工坊/学创工坊后端/kode-sdk-xuechuang/server/services/skills/skill-registry.ts:73)
- [SKILL.md](/Users/yeya/Documents/HBuilderProjects/云创工坊/zhangxuefeng-skill-main/SKILL.md:1)

关键词来源有两部分：

1. `skill-registry.ts` 内置的基础关键词
2. `SKILL.md` 里被引号包起来的短语

当前 `collectTriggerKeywords()` 会把这些东西合并起来，生成 `triggerKeywords`。

所以从框架角度看，`SKILL.md` 不只是“给模型看的说明书”，它还会间接参与“触发词构建”。

## 4. Skill 触发后，`SKILL.md` 是整份注入还是部分注入

文件：

- [skill-loader.ts](/Users/yeya/Documents/HBuilderProjects/云创工坊/学创工坊后端/kode-sdk-xuechuang/server/services/skills/skill-loader.ts:51)

答案很明确：

- `SKILL.md` 是整份注入
- 不是按章节切
- 不是按 frontmatter 和 body 分开筛选
- 不是按标题命中后只取某一段

原因就在这里：

```ts
const skillMarkdown = readFileIfExists(skill.skillFile);
```

然后它会被原样拼进 blocks：

```ts
const blocks = [
  '[Skill Activation]',
  `Skill: ${skill.id}`,
  'Use the following skill context only for this turn unless the user clearly keeps the same mode.',
  '',
  skillMarkdown.trim(),
];
```

这说明当前设计是：

- 只要 skill 被激活
- 就把该 skill 的 `SKILL.md` 全文拼进 `systemPromptAugment`

所以，**`SKILL.md` 的注入粒度是“整文件级”**。

## 5. Reference 文档的粒度是整文件，还是更细

文件：

- [skill-loader.ts](/Users/yeya/Documents/HBuilderProjects/云创工坊/学创工坊后端/kode-sdk-xuechuang/server/services/skills/skill-loader.ts:19)

答案是：

- reference 的“选择粒度”是文件级
- reference 的“注入粒度”也是文件级

也就是说分两步：

1. 先判断“要不要选中某个 reference 文件”
2. 一旦选中，就把这个 reference 文件全文拼进去

### 5.1 选择是按文件选

比如当前这段逻辑：

```ts
if (/专业|志愿|学校|金融|艺术|就业|阶层|普通家庭|城市|考研|ai|人工智能/i.test(lowered)) {
  pushFile(path.join('references', 'research', '05-decisions.md'));
  pushFile(path.join('references', 'research', '01-writings.md'));
}
```

这不是“选中某几段”，而是“选中某个文件”。

### 5.2 一旦选中，就是整份文件注入

后面的注入逻辑是：

```ts
const referenceSections = referenceFiles
  .map((filePath) => {
    const content = readFileIfExists(filePath).trim();
    if (!content) return '';
    return `## Reference: ${path.basename(filePath)}\n${content}`;
  })
```

这里的 `content` 就是整个文件内容。

它没有做这些事情：

- 没有按 `#` 标题切片
- 没有按段落切片
- 没有按 token 数裁剪
- 没有按相似度只抽一小段
- 没有做 RAG chunk 检索

所以，**当前 reference 的实际注入粒度也是“整文件级”**。

## 6. 当前有没有更细粒度机制

答案是：**没有。**

至少从当前 `skills` 目录下这几个核心文件来看：

- [skill-registry.ts](/Users/yeya/Documents/HBuilderProjects/云创工坊/学创工坊后端/kode-sdk-xuechuang/server/services/skills/skill-registry.ts:1)
- [skill-matcher.ts](/Users/yeya/Documents/HBuilderProjects/云创工坊/学创工坊后端/kode-sdk-xuechuang/server/services/skills/skill-matcher.ts:1)
- [skill-loader.ts](/Users/yeya/Documents/HBuilderProjects/云创工坊/学创工坊后端/kode-sdk-xuechuang/server/services/skills/skill-loader.ts:1)
- [types.ts](/Users/yeya/Documents/HBuilderProjects/云创工坊/学创工坊后端/kode-sdk-xuechuang/server/services/skills/types.ts:1)

目前都没有出现下面这些更细粒度能力：

- section 索引
- heading 级别路由
- paragraph chunk
- embedding 检索
- token budget 裁切
- 摘要化压缩

所以这套系统现在更像：

- “关键词路由 + 文件级注入”

而不是：

- “语义路由 + chunk 级 RAG”

## 7. 如果未来有“其他 skill 文档”，它们会怎样工作

如果你后面继续新增 skill，而代码结构不改，只是照着现在的模式扩展，那么行为会是这样的：

### 7.1 新 skill 的触发方式

新 skill 需要至少做三件事：

1. 在 `skill-registry.ts` 里注册
2. 为它生成 `triggerKeywords`
3. 在对应 agent 的 `skillIds` 里授权

这样它才可能被触发。

### 7.2 新 skill 的 `SKILL.md` 注入方式

如果你继续复用现在的 `buildSkillPromptAugment()`，那么新 skill 的 `SKILL.md` 也会是：

- 触发即整份拼进去

### 7.3 新 skill 的 reference 注入方式

如果你继续复用现在的 `pickReferenceFiles()` 思路，那么新 skill 的 reference 文档也会是：

- 先按规则选中文件
- 选中后整份拼进去

所以答案很直接：

**在当前框架下，不管是现在这个 skill，还是未来新增的其他 skill，只要你不改 loader 逻辑，注入粒度都会是“文件级”，不会自动变成更细颗粒度。**

## 8. 当前设计的优点

这套“整文件注入”的好处其实很实用：

- 实现简单
- 容易调试
- `loadedSkillFiles` 很清楚
- 很容易回答“为什么这轮用了这个文件”
- skill 作者写文档时，不需要额外维护 chunk 索引

对于现在这种 skill 数量还少、reference 文件也不多的阶段，这是一个很稳的起点。

## 9. 当前设计的局限

但它的边界也很清楚：

### 9.1 容易把无关内容一起塞进去

只要某个 reference 文件被选中，就会整份注入。  
如果文件很长，而本轮只需要其中 10%，其余 90% 也会一起进入 prompt。

### 9.2 token 成本会越来越高

现在你看到的是 `skillPromptChars`，本质上就是注入文本越来越长。  
skill 变多、reference 变多后，prompt 成本会上升得很快。

### 9.3 触发条件比较粗

现在用的是 `message.includes(keyword)`。  
这会带来两个典型问题：

- 用户换一种说法，可能漏触发
- 用户只是顺嘴提到某个词，也可能误触发

### 9.4 reference 选择规则会越来越硬编码

现在 `pickReferenceFiles()` 里是直接写正则和关键词。  
一个 skill 还能扛住，skill 一多，这个文件会越来越像“手写路由表”。

## 10. 一句话结论

当前 skill 框架的真实行为可以概括成一句话：

**触发层面是“关键词命中”，注入层面是“整份 `SKILL.md` + 按文件选择并整份注入的 reference 文档”，还没有做到章节级、段落级或 chunk 级的更细粒度加载。**

## 11. 如果下一步要升级，可以怎么演进

如果你后面准备把 skill 框架做成更成熟的系统，通常有 3 个演进方向：

1. 把触发从“字符串包含”升级成“关键词 + 语义匹配”的混合模式。
2. 把 reference 从“整文件注入”升级成“按标题切片 / 按 chunk 检索”。
3. 把 `SKILL.md` 自身拆成结构化段落，比如：
   - role
   - trigger
   - style
   - workflow
   - references

这样后面就可以做到“角色规则永远注入，参考知识按需切片注入”。

如果你要，我下一步可以直接继续写第三份文档：`skill框架升级方案.md`，把“当前文件级注入”怎么演进到“细粒度 chunk 注入”拆成一套可实施方案。
