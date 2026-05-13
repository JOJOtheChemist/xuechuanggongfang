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
import { getHttpService } from '@/utils/http-services'

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
      try {
        const businessService = getHttpService('business-service')
        const result = await businessService.initMissingCategories({
          _token: uni.getStorageSync('token')
        })

        if (!result || result.code !== 0 || !result.data) {
          throw new Error((result && result.message) || '初始化失败')
        }

        const details = Array.isArray(result.data.details) ? result.data.details : []
        this.addLog(`初始化完成，新建 ${result.data.successCount || 0} 条，更新 ${result.data.skipCount || 0} 条`)
        details.forEach((item) => this.addLog(`- ${item}`))
        uni.showToast({ title: '初始化完成', icon: 'success' })
      } catch (e) {
        this.addLog(`❌ 调用异常: ${e.message}`)
        uni.showToast({ title: '初始化失败', icon: 'none' })
      } finally {
        this.initLoading = false
      }
    },
    async handleUpdate() {
      if (this.loading) return
      
      this.loading = true
      
      try {
        const businessService = getHttpService('business-service')
        const result = await businessService.batchUpdatePrices({
          price: Number(this.price || 0),
          _token: uni.getStorageSync('token')
        })

        if (!result || result.code !== 0 || !result.data) {
          throw new Error((result && result.message) || '更新失败')
        }

        this.addLog(`✅ 更新成功 ${result.data.successCount || 0} 条，价格 ${result.data.price} 元`)
        ;(result.data.updatedNames || []).forEach((item) => this.addLog(`- ${item}`))
        uni.showToast({ title: '更新成功', icon: 'success' })
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
