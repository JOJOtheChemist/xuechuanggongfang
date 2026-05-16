<template>
  <view class="status-card">
    <view class="status-head">
      <view>
        <text class="status-title">当前解锁状态</text>
        <text class="status-subtitle">{{ subtitle }}</text>
      </view>
      <view class="status-head-actions">
        <view
          class="status-refresh"
          :class="{ 'status-refresh-disabled': loading }"
          @tap="$emit('refresh')"
        >
          <text>{{ loading ? '同步中...' : '刷新' }}</text>
        </view>
        <view class="status-badges">
          <text class="status-badge">{{ unlockModeLabel }}</text>
          <text class="status-badge status-badge-accent">{{ userTypeLabel }}</text>
        </view>
      </view>
    </view>

    <view class="status-grid">
      <view class="status-metric">
        <text class="status-metric-label">当前分数</text>
        <text class="status-metric-value">{{ scoreValueText }}</text>
      </view>
      <view class="status-metric">
        <text class="status-metric-label">查询次数</text>
        <text class="status-metric-value">{{ modifyCountText }}</text>
      </view>
    </view>

    <view class="status-note-row">
      <text class="status-note">{{ scoreNotice }}</text>
      <text v-if="paymentOrderNo" class="status-order">订单号 {{ paymentOrderNo }}</text>
    </view>

  </view>
</template>

<script>
export default {
  name: 'VolunteerAccessStatusCard',
  props: {
    status: {
      type: Object,
      default() {
        return {}
      }
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    unlockModeLabel() {
      return this.status.unlockModeLabel || '未解锁'
    },
    userTypeLabel() {
      return this.status.userTypeLabel || '未解锁权限'
    },
    subtitle() {
      if (this.status.paymentPaidAt) {
        return '已完成 19.9 元付费解锁'
      }

      if (this.status.unlocked) {
        return '分享解锁已生效'
      }

      return '暂未解锁'
    },
    scoreValueText() {
      const score = this.status.score && this.status.score.value
      const numeric = Number(score)
      if (!Number.isFinite(numeric)) return '未保存'
      return `${Number.isInteger(numeric) ? numeric : numeric.toFixed(1).replace(/\\.0$/, '')} 分`
    },
    modifyCountText() {
      const score = this.status.score || {}
      if (score.unlimited) {
        return '无限次'
      }

      const remaining = score.remainingModifyCount
      const total = score.totalModifyCount
      if (remaining === null || total === null || remaining === undefined || total === undefined) {
        return '未开启'
      }

      return `剩余 ${remaining}/${total}`
    },
    scoreNotice() {
      return (this.status.score && this.status.score.notice) || '解锁后即可开始筛选'
    },
    paymentOrderNo() {
      return this.status.paymentOrderNo || ''
    }
  }
}
</script>

<style scoped>
.status-card {
  padding: 26rpx 24rpx;
  border-radius: 24rpx;
  background: linear-gradient(180deg, #ffffff 0%, #fff9f3 100%);
  box-shadow: 0 12rpx 28rpx rgba(15, 23, 42, 0.04);
  display: flex;
  flex-direction: column;
  gap: 22rpx;
}

.status-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
}

.status-head-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12rpx;
}

.status-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #17337e;
}

.status-subtitle {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: #64748b;
}

.status-badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10rpx;
}

.status-refresh {
  min-width: 104rpx;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(23, 51, 126, 0.08);
  color: #17337e;
  font-size: 22rpx;
  font-weight: 600;
  text-align: center;
}

.status-refresh-disabled {
  opacity: 0.55;
}

.status-badge {
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(23, 51, 126, 0.08);
  color: #17337e;
  font-size: 22rpx;
  font-weight: 600;
}

.status-badge-accent {
  background: rgba(217, 119, 6, 0.12);
  color: #b45309;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.status-metric {
  padding: 18rpx 20rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.86);
  border: 1rpx solid rgba(226, 232, 240, 0.9);
}

.status-metric-label {
  display: block;
  font-size: 22rpx;
  color: #64748b;
}

.status-metric-value {
  display: block;
  margin-top: 10rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #0f172a;
}

.status-note-row {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.status-note,
.status-order {
  font-size: 24rpx;
  line-height: 1.6;
  color: #475569;
}

.status-order {
  color: #b45309;
}
</style>
