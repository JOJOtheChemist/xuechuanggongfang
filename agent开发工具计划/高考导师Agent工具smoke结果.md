# 高考导师 Agent Smoke 结果

## 本次结论
- 已用真实线上测试号直接跑通主后端高考志愿接口
- `xuechuang-kode` 已同步新工具代码并 `pm2 restart xuechuang-kode` 成功
- 3 个新增工具已完成注册并通过线上 tool smoke
- `yunnan-gaokao-info-assistant` 已挂载新工具，agent 配置 smoke 通过

## 本次线上环境
- 主站域名：`https://xuechuang.xyz`
- 主后端进程：`xuechuang-workshop-backend`
- Kode 进程：`xuechuang-kode`
- 本次重启结果：`pm2 restart xuechuang-kode` 成功

## 测试号与鉴权
- 测试号来自线上主后端真实用户库
- 本次用于志愿接口 smoke 的测试号用户主键：`userId=1`
- 该账号在线上 `auth/me` 验证通过
- 该账号在线上志愿系统处于已解锁状态，可调用 `/api/v1/admission/institutions`

## 线上接口级 smoke
已验证通过：
- `GET /api/v1/auth/me`
- `GET /api/v1/admission/institutions?province=云南&examType=vocational&riskBucket=stable&page=1&pageSize=2`

接口返回样例结论：
- `auth/me` 返回成功，测试号昵称为 `十五哈哈`
- 志愿列表真实返回 2 所学校样例：
- `昆明医科大学`，`riskBucket=stable`，`strategyLabel=稳妥`
- `云南民族大学`，`riskBucket=stable`，`strategyLabel=稳妥`

## 线上 tool smoke
执行脚本：
- `/home/ubuntu/ai-dearauthors/xuechuang-workshop-backend/kode-sdk-xuechuang/server/scripts/smoke-yunnan-admission-tools.ts`

工具注册结果：
- `search_yunnan_admission`
- `search_yunnan_admission_school_detail`
- `list_yunnan_admission_schools`
- `interpret_admission_risk`

注册后工具总数：
- `21`

本次通过点：
- `list_yunnan_admission_schools` 返回真实学校列表
- `search_yunnan_admission_school_detail` 返回真实学校详情
- `interpret_admission_risk` 已注册为 `ai` 工具
- `search_yunnan_admission` 可被正常调用

tool smoke 关键样例：
- `list_yunnan_admission_schools` 样例返回：
- `昆明医科大学`，参考分 `495`，档位 `stable`，标签 `稳妥`
- `云南民族大学`，参考分 `505`，档位 `stable`，标签 `稳妥`
- `search_yunnan_admission_school_detail` 样例命中：
- 学校：`昆明医科大学`
- 简介已返回
- `detailMajorCount = 1`

## 线上 agent smoke
执行脚本：
- `/home/ubuntu/ai-dearauthors/xuechuang-workshop-backend/kode-sdk-xuechuang/server/scripts/smoke-yunnan-gaokao-assistant.ts`

验证结果：
- `yunnan-gaokao-info-assistant` 已成功注册
- agent 已挂载：
- `search_yunnan_admission`
- `search_yunnan_admission_school_detail`
- `list_yunnan_admission_schools`
- `interpret_admission_risk`
- agent smoke 脚本执行成功

额外验证：
- `GET http://127.0.0.1:8001/api/chat/agents/yunnan-gaokao-info-assistant/meta`
- 返回 `ok: true`
- 返回的 `assistantName` 为 `云南高考资讯助手`

## 当前仍需注意
- 线上主后端目前 `preview-institutions` / `preview-institutions/:id` 仍返回 `NOT_FOUND`
- 这意味着当前生产环境实际应走“已登录主链路”，不能依赖游客预览链路
- 手工直打 `xuechuang-kode /api/chat/sync` 时，若直接复用主后端 token，会遇到 `kode` 自身 JWT 校验不一致的问题
- 但这不影响本次结论：高考数据工具链、工具注册、agent 挂载、线上 pm2 重启、线上 smoke 都已经完成

## 本次纠偏
- 前一轮“表为空 / 没入库”的判断已经确认不成立
- `volunteer` 页面使用的是主后端真实高考志愿数据
- `较难 / 较稳 / 兜底` 是必须交给导师解释的核心结果，不只是筛选列表

## 最终状态
- 开发完成：是
- 工具注册完成：是
- 线上代码同步完成：是
- `pm2` 重启成功：是
- 真实测试号 smoke 完成：是
