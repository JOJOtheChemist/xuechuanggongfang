# 解决 UID 显示为“未登录”的问题：【全局状态兜底】 🔍

**现象**：用户确实登录成功了，页面也能正常操作，但调试信息显示 `UID: null` 或 `未登录`。

### 🐞 原因分析
- 我们的应用使用自定义的 `uni.setStorageSync('userId', ...)` 来保存登录态。
- 但 `uniCloud.getCurrentUserInfo()`（系统标准方法）默认只认 `uni_id_token`，且在某些自定义登录场景下（如仅保存了 `userId` 而未正确持久化 `uni_id_token` 状态），它查不到信息。
- 导致前端页面虽然逻辑上是登录的（能读到 `userId`），但调试用的 `currentUid` 取不到值，产生了“僵尸号”假象。

### 🛠️ 修复方案
我们在 `main.js` 中实施了**全局混入 (Global Mixin)**，强行打通两套逻辑：

1.  **注入全局变量**：
    向所有页面自动注入 `global_uid` 变量，替代页面里各自为战的 `currentUid`。这样就不需要在每个页面重复写获取用户 ID 的代码。

2.  **双重兜底策略**：
    在 `onShow` 生命周期中，我们的混入代码会执行以下逻辑：优先查系统标准 Token，查不到则**自动回退查找本地缓存**。
    
    代码片段 (`main.js`):
    ```javascript
    Vue.mixin({
      data() {
        return {
          global_uid: '' // 全局变量
        }
      },
      onShow() {
        const userInfo = uniCloud.getCurrentUserInfo()
        // 核心修复点：优先使用标准接口，如果没有则回退到本地缓存 'userId'
        this.global_uid = userInfo.uid || uni.getStorageSync('userId')
      }
    })
    ```

### ✅ 验证
现在所有页面（包括“加入团队确认页”和“团队列表页”）底部的调试信息，均统一使用这个增强版的 `global_uid`。
只要 App 本地缓存里有 `userId`，前端就能正确显示 ID，彻底消除了“假未登录”的困惑。
