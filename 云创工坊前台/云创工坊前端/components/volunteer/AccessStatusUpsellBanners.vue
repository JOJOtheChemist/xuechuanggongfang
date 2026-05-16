<template>
  <view class="upsell-banners">
    <view class="upsell-banner upsell-banner-invite">
      <image
        v-if="remainingQueryBanner"
        class="upsell-banner-image"
        :src="remainingQueryBanner"
        mode="widthFix"
        :webp="true"
      />
      <view class="upsell-banner-overlay">
        <view class="upsell-banner-metrics">
          <text class="upsell-banner-metrics-text">{{ remainingMetricText }}</text>
          <text class="upsell-banner-metrics-dot">·</text>
          <text class="upsell-banner-metrics-text">{{ inviteMetricText }}</text>
        </view>
        <view class="upsell-banner-hotspot upsell-banner-hotspot-invite" @tap.stop="handleInviteTap">
          <text class="upsell-banner-hotspot-text upsell-banner-hotspot-text-hidden">去邀请</text>
        </view>
      </view>
    </view>

    <view class="upsell-banner upsell-banner-vip">
      <image
        v-if="vipBanner"
        class="upsell-banner-image"
        :src="vipBanner"
        mode="widthFix"
        :webp="true"
      />
      <view class="upsell-banner-overlay">
        <text class="upsell-banner-vip-copy">{{ vipPrivilegeText }}</text>
      <view
          class="upsell-banner-hotspot upsell-banner-hotspot-vip"
          :class="{ 'upsell-banner-hotspot-disabled': isVipOpened }"
          @tap.stop="handleVipTap"
        >
          <text
            class="upsell-banner-hotspot-text upsell-banner-hotspot-text-vip"
            :class="{ 'upsell-banner-hotspot-text-vip-opened': isVipOpened }"
          >{{ vipActionText }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'VolunteerAccessStatusUpsellBanners',
  props: {
    status: {
      type: Object,
      default() {
        return {}
      }
    },
    remainingQueryBanner: {
      type: String,
      default: ''
    },
    vipBanner: {
      type: String,
      default: ''
    },
    customerServicePhone: {
      type: String,
      default: ''
    }
  },
  computed: {
    remainingMetricText() {
      const score = this.status.score || {}
      if (score.unlimited) {
        return '无限次'
      }

      const remaining = Number(score.remainingModifyCount)
      if (Number.isFinite(remaining) && remaining >= 0) {
        return `剩余${remaining}次`
      }

      return '剩余--次'
    },
    inviteMetricText() {
      const inviteCount = Number(this.status.inviteCount)
      if (Number.isFinite(inviteCount) && inviteCount >= 0) {
        return `已邀${inviteCount}人`
      }

      return '已邀0人'
    },
    isVipOpened() {
      const unlockMode = String(this.status.unlockMode || '').trim()
      const userType = String(this.status.userType || '').trim()
      return unlockMode === 'paid' || userType === 'paid_regular' || userType === 'paid_special'
    },
    vipActionText() {
      return this.isVipOpened ? '已开通' : '立即开通'
    },
    vipPrivilegeText() {
      const phone = String(this.customerServicePhone || '').trim()
      const phoneText = phone ? `客服 ${phone}` : '联系客服'
      if (String(this.status.userType || '').trim() === 'paid_special') {
        return `查分大使 · 无限查分 · ${phoneText}`
      }

      return `VIP：客服加2次 / 查分大使无限查分 · ${phoneText}`
    }
  },
  methods: {
    handleInviteTap() {
      this.$emit('invite')
    },
    handleVipTap() {
      if (this.isVipOpened) {
        this.$emit('vip-opened')
        return
      }

      this.$emit('vip')
    }
  }
}
</script>

<style scoped>
.upsell-banners {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.upsell-banner {
  position: relative;
  width: 100%;
  margin: 0;
  padding: 0;
  line-height: 0;
}

.upsell-banner + .upsell-banner {
  margin-top: 0;
}

.upsell-banner-image {
  width: 100%;
  display: block;
}

.upsell-banner-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.upsell-banner-metrics {
  position: absolute;
  top: 50%;
  left: 190rpx;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 8rpx;
  max-width: 280rpx;
}

.upsell-banner-metrics-text,
.upsell-banner-metrics-dot {
  font-size: 20rpx;
  font-weight: 600;
  line-height: 1;
  color: #b86a2d;
  white-space: nowrap;
}

.upsell-banner-vip-copy {
  position: absolute;
  top: calc(56% + 10rpx);
  left: 128rpx;
  right: 214rpx;
  transform: translateY(-50%);
  font-size: 16rpx;
  font-weight: 500;
  line-height: 1.2;
  color: #bb6b2f;
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  word-break: break-all;
}

.upsell-banner-hotspot {
  position: absolute;
  pointer-events: auto;
  top: 50%;
  transform: translateY(-50%);
  right: 28rpx;
  width: 168rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.upsell-banner-hotspot-invite {
  right: 22rpx;
  width: 162rpx;
  height: 54rpx;
}

.upsell-banner-hotspot-vip {
  right: 44rpx;
  width: 172rpx;
  height: 60rpx;
}

.upsell-banner-hotspot-disabled {
  opacity: 0.7;
}

.upsell-banner-hotspot-text {
  font-size: 24rpx;
  font-weight: 700;
  line-height: 1;
}

.upsell-banner-hotspot-text-hidden {
  opacity: 0;
}

.upsell-banner-hotspot-text-vip {
  color: #fff7ed;
}

.upsell-banner-hotspot-text-vip-opened {
  color: rgba(255, 247, 237, 0.68);
  transform: translateX(5rpx);
}
</style>
