<template>
  <view class="detail-page">
    <view v-if="loading" class="loading-state">
      <text class="loading-text">加载详情中...</text>
    </view>
    
    <view v-else-if="!detail && !permissionDenied" class="error-state">
      <text class="error-text">未找到订单详情</text>
    </view>
    
    <view v-else-if="permissionDenied" class="permission-denied-state">
       <view class="icon-box">
         <text class="icon-text">!</text>
       </view>
       <text class="title">无权查看</text>
       <text class="desc">只能查看本人或直推下级的报名详情</text>
    </view>
    
    <view v-else class="content-container">
      <!-- 页面顶部标题区域 -->
      <view class="page-header" style="margin: -30rpx -30rpx 30rpx; padding-top: 40rpx; padding-bottom: 80rpx;">
        <text class="header-title-large">订单详情</text>
        <text class="header-subtitle">Order Information</text>
      </view>

      <!-- 基础信息卡片 -->
      <view class="section-card" style="position: relative; z-index: 10;">
        <view class="section-header">
           <view class="section-icon"></view>
          <text class="section-title">基础信息</text>
        </view>
        <view class="info-list">
          <view class="info-item">
            <text class="label">姓名</text>
            <text class="value">{{ detail.name || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="label">手机号</text>
            <text class="value highlight">{{ detail.mobile || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="label">微信号</text>
            <text class="value">{{ detail.wechat_id || '-' }}</text>
          </view>
           <view class="info-item">
            <text class="label">年龄</text>
            <text class="value">{{ detail.age || '-' }}</text>
          </view>
          <view class="info-item">
             <text class="label">民族</text>
             <text class="value">{{ detail.nation || '-' }}</text>
           </view>
        </view>
      </view>
      
      <!-- 业务信息卡片 -->
      <view class="section-card">
        <view class="section-header">
           <view class="section-icon"></view>
          <text class="section-title">业务详情</text>
        </view>
        <view class="info-list">
           <view class="info-item">
             <text class="label">业务板块</text>
             <text class="value">{{ detail.business_name || '-' }}</text>
           </view>
           <view class="info-item">
            <text class="label">学校</text>
            <text class="value">{{ detail.school || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="label">入学年份</text>
            <text class="value">{{ detail.entry_year || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="label">工作期限</text>
            <text class="value">{{ detail.work_duration || '-' }}</text>
          </view>
           <view class="info-item full-width">
              <text class="label">备注</text>
              <text class="value remark">{{ detail.remark || '无' }}</text>
            </view>
        </view>
      </view>
      
      <!-- 邀请关系卡片 -->
      <view class="section-card">
        <view class="section-header">
          <text class="section-title">关系链</text>
        </view>
        <view class="info-list">
          <view class="info-item">
            <text class="label">推荐人 (显示)</text>
            <text class="value">{{ detail.referrer || '无' }}</text>
          </view>
           <view class="info-item">
            <text class="label">推荐人UID</text>
            <text class="value tiny">{{ detail.referrer_uid || '-' }}</text>
          </view>
           <view class="info-item">
            <text class="label">UID</text>
            <text class="value tiny">{{ detail.user_id || '-' }}</text>
          </view>
          <view class="info-item">
           <text class="label">提交时间</text>
           <text class="value">{{ formatTime(detail.create_date) }}</text>
         </view>
        </view>
      </view>
      
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      detail: null,
      loading: true,
      permissionDenied: false
    }
  },
  onLoad(options) {
    let signupId = options.id
    
    // 如果 URL 没带 id，尝试从缓存拿 (兼容之前的逻辑)
    if (!signupId) {
      const cached = uni.getStorageSync('current_order_detail')
      if (cached && (cached.id || cached._id)) {
        signupId = cached.id || cached._id
      }
    }
    
    if (signupId) {
      this.fetchDetail(signupId)
    } else {
       uni.showToast({ title: '未指定订单ID', icon: 'none' })
       this.loading = false
    }
  },
  methods: {
    async fetchDetail(signupId) {
      this.loading = true
      try {
        const token = uni.getStorageSync('token')
        const businessService = uniCloud.importObject('business-service')
        
        // 显式传递 _token，使用对象参数形式
        const res = await businessService.getSignupDetail({ 
          signupId, 
          _token: token 
        })
        
        if (res && res.code === 0 && res.data) {
          this.detail = res.data
        } else if (res && res.code === -403) {
          this.permissionDenied = true
        } else {
          uni.showToast({ title: res.message || '获取失败', icon: 'none' })
        }
      } catch (e) {
        console.error('Fetch detail error:', e)
        uni.showToast({ title: '网络错误', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    formatTime(ts) {
      if (!ts) return ''
      const date = new Date(ts)
      return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`
    }
  }
}
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  background-color: #F1F5F9;
  padding-bottom: 40rpx;
}

/* Distinct Header Design */
.page-header {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  padding: 40rpx 30rpx 80rpx;
  color: #fff;
}
.header-title-large {
  font-size: 44rpx;
  font-weight: 800;
  display: block;
  margin-bottom: 8rpx;
}
.header-subtitle {
  font-size: 24rpx;
  opacity: 0.8;
}

/* Card Overlap Layout */
.content-container {
  padding: 0 30rpx;
  margin-top: -40rpx;
}

.loading-state, .error-state, .permission-denied-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 60vh;
  gap: 20rpx;
}
.loading-text, .error-text {
  color: #64748B;
  font-size: 28rpx;
}
.permission-denied-state .icon-box {
  width: 120rpx;
  height: 120rpx;
  background-color: #F1F5F9;
  border-radius: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30rpx;
}
.permission-denied-state .icon-text {
  font-size: 60rpx;
  color: #94A3B8;
  font-weight: 700;
  font-family: monospace;
}
.permission-denied-state .title {
  font-size: 34rpx;
  font-weight: 700;
  color: #334155;
  margin-bottom: 12rpx;
}
.permission-denied-state .desc {
  font-size: 26rpx;
  color: #94A3B8;
  max-width: 480rpx;
  text-align: center;
  line-height: 1.5;
}

.section-card {
  background-color: #fff;
  border-radius: 24rpx;
  padding: 40rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 10rpx 30rpx rgba(0,0,0,0.08); /* More prominent shadow */
}

.section-header {
  margin-bottom: 30rpx;
  display: flex;
  align-items: center;
}

.section-icon {
  width: 8rpx;
  height: 32rpx;
  background-color: #2563EB; /* Blue accent */
  border-radius: 4rpx;
  margin-right: 16rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #0F172A;
}

.info-list {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx 0;
}

.info-item {
  width: 50%;
  padding-right: 10rpx; /* Prevent touching */
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.info-item.full-width {
  width: 100%;
}

.label {
  font-size: 24rpx;
  color: #94A3B8;
  margin-bottom: 10rpx;
  font-weight: 500;
}

.value {
  font-size: 30rpx;
  color: #334155;
  font-weight: 600;
  word-break: break-all; /* Allow breaking for long UIDs */
}

.value.highlight {
  color: #2563EB;
}

.value.tiny {
  font-size: 24rpx;
  color: #94A3B8;
  font-family: monospace;
  background: #F8FAFC;
  padding: 4rpx 8rpx;
  border-radius: 4rpx;
  display: inline-block;
  word-break: break-all;
}

.value.remark {
    line-height: 1.6;
    background: #FEF2F2; /* Light red/orange bg for remark */
    padding: 16rpx;
    border-radius: 12rpx;
    font-size: 26rpx;
    color: #991B1B;
}
</style>
