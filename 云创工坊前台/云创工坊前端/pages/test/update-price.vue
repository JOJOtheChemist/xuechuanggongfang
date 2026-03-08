<template>
  <view class="container">
    <view class="header">
      <text class="title">价格配置测试工具</text>
    </view>
    
    <view class="card">
      <view class="form-item">
        <text class="label">设置价格 (元)</text>
        <input class="input" type="number" v-model="price" placeholder="请输入价格" />
      </view>
      
      <button class="btn" @click="handleUpdate" :loading="loading">一键设置价格</button>
      
      <button class="btn btn-secondary" @click="handleInit" :loading="initLoading">初始化缺失数据 (必点)</button>

      <view class="desc">
        <text>点击按钮将以下业务的价格设置为 {{price}} 元：</text>
        <view class="tag-list">
          <text class="tag">驾校</text>
          <text class="tag">勤工俭学</text>
          <text class="tag">考证</text>
        </view>
      </view>
    </view>
    
    <view class="log-box" v-if="logs.length > 0">
      <view class="log-title">操作日志：</view>
      <scroll-view scroll-y class="log-scroll">
        <view v-for="(log, index) in logs" :key="index" class="log-item">
          {{ log }}
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      price: 1.0,
      loading: false,
      initLoading: false,
      logs: []
    }
  },
  methods: {
    addLog(msg) {
      const time = new Date().toLocaleTimeString()
      this.logs.unshift(`[${time}] ${msg}`)
    },
    async handleInit() {
      if (this.initLoading) return
      this.initLoading = true
      this.addLog('开始初始化缺失的业务数据...')
      try {
        const businessService = uniCloud.importObject('business-service')
        const res = await businessService.initMissingCategories()
        if (res.code === 0) {
          this.addLog(`✅ ${res.message}`)
          if (res.data && res.data.length) {
             this.addLog(`详情: ${res.data.join(', ')}`)
          }
          uni.showToast({ title: '初始化成功', icon: 'success' })
        } else {
          this.addLog(`❌ 初始化错误: ${res.message}`)
        }
      } catch (e) {
        this.addLog(`❌ 调用异常: ${e.message}`)
      } finally {
        this.initLoading = false
      }
    },
    async handleUpdate() {
      if (this.loading) return
      
      this.loading = true
      this.addLog(`开始更新价格为 ${this.price} 元...`)
      
      try {
        const businessService = uniCloud.importObject('business-service')
        
        // 调用我们刚刚添加的 batchUpdatePrices 方法
        // 注意：如果你还没上传 cloudfunctions，这一步会报错
        const res = await businessService.batchUpdatePrices({
          price: Number(this.price)
        })
        
        if (res.code === 0) {
          const { successCount, updatedNames } = res.data
          this.addLog(`✅ 更新成功！共更新 ${successCount} 条记录`)
          if (updatedNames && updatedNames.length > 0) {
            this.addLog(`更新项目: ${updatedNames.join(', ')}`)
          }
          uni.showToast({ title: '设置成功', icon: 'success' })
        } else {
          this.addLog(`❌ 服务端返回错误: ${res.message}`)
          uni.showToast({ title: '设置失败', icon: 'none' })
        }
      } catch (e) {
        console.error(e)
        this.addLog(`❌ 调用异常: ${e.message || '未知错误'}`)
        uni.showToast({ title: '调用异常', icon: 'none' })
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.container {
  padding: 40rpx;
  background-color: #f5f7fa;
  min-height: 100vh;
}
.header {
  margin-bottom: 40rpx;
  text-align: center;
}
.title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}
.card {
  background: white;
  border-radius: 16rpx;
  padding: 40rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.05);
  margin-bottom: 30rpx;
}
.form-item {
  display: flex;
  align-items: center;
  margin-bottom: 30rpx;
}
.label {
  width: 200rpx;
  font-size: 28rpx;
  color: #666;
}
.input {
  flex: 1;
  height: 80rpx;
  background: #f8f8f8;
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
}
.btn {
  background: #4f46e5;
  color: white;
  border-radius: 8rpx;
  margin-bottom: 20rpx;
  font-size: 30rpx;
}
.btn-secondary {
  background: #10b981; /* Green */
}
.desc {
  font-size: 24rpx;
  color: #999;
}
.tag-list {
  display: flex;
  gap: 10rpx;
  margin-top: 10rpx;
}
.tag {
  background: #e0e7ff;
  color: #4f46e5;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
  font-size: 22rpx;
}
.log-box {
  background: #333;
  border-radius: 12rpx;
  padding: 20rpx;
  color: #00ff00;
  font-family: monospace;
}
.log-title {
  margin-bottom: 10rpx;
  font-size: 26rpx;
  color: #fff;
}
.log-scroll {
  height: 300rpx;
}
.log-item {
  font-size: 24rpx;
  margin-bottom: 8rpx;
  word-break: break-all;
}
</style>
