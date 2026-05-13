<template>
  <view class="section-card">
    <view class="section-head">
      <text class="section-title">招生专业</text>
      <text class="section-subtitle">{{ majorCountText }}</text>
    </view>

    <view v-if="normalizedMajors.length === 0" class="empty-card">
      <text>暂无专业明细</text>
    </view>

    <view v-else class="major-list">
      <view
        v-for="major in normalizedMajors"
        :key="major.renderKey"
        class="major-card"
      >
        <view class="major-top">
          <text class="major-name">{{ major.majorName }}</text>
          <text v-if="major.majorCategory" class="major-tag">{{ major.majorCategory }}</text>
        </view>

        <view class="major-score-row">
          <view
            class="major-score-chip"
            :class="{ 'major-score-chip--empty': !major.hasReferenceScore }"
          >
            <text class="major-score-label">专业参考</text>
            <text class="major-score-value">{{ major.referenceScoreText }}</text>
          </view>
          <text v-if="major.latestScoreYearText" class="major-score-year">{{ major.latestScoreYearText }}</text>
        </view>

        <view class="major-meta">
          <text>{{ major.degreeLevel || '层次待补充' }}</text>
        </view>

        <text v-if="majorDetailText(major)" class="major-desc">{{ majorDetailText(major) }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { resolveMajorReferenceScore } from '../../../utils/volunteer-local-admission'

function pickFirstText(...values) {
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (typeof value !== 'string') continue
    const text = value.trim()
    if (text) return text
  }

  return ''
}

export default {
  name: 'VolunteerDetailMajorSection',
  props: {
    majors: {
      type: Array,
      default() {
        return []
      }
    },
    majorCountText: {
      type: String,
      default: '待补充'
    }
  },
  computed: {
    normalizedMajors() {
      return (Array.isArray(this.majors) ? this.majors : []).map((item, index) => {
        const source = item && typeof item === 'object' ? item : {}
        const rawKey = source.id || source.majorCode || source.majorName || `major-${index}`
        const referenceScore = resolveMajorReferenceScore(source, null)
        const latestScoreYear = Number(source.latestScoreYear)
        return Object.assign({}, source, {
          renderKey: `major-${rawKey}`,
          hasReferenceScore: referenceScore !== null,
          referenceScoreText: referenceScore === null ? '待补充' : this.formatScore(referenceScore),
          latestScoreYearText:
            Number.isFinite(latestScoreYear) && latestScoreYear > 0 ? `${Math.trunc(latestScoreYear)} 年参考` : ''
        })
      })
    }
  },
  methods: {
    formatScore(value) {
      const numeric = Number(value)
      if (!Number.isFinite(numeric) || numeric <= 0) return '待补充'
      if (Number.isInteger(numeric)) return `${numeric} 分`
      return `${numeric.toFixed(1).replace(/\.0$/, '')} 分`
    },
    majorDetailText(major) {
      const parts = []

      if (major.majorCode) {
        parts.push(`专业代码 ${major.majorCode}`)
      }

      const extraPayload = major.extraPayload && typeof major.extraPayload === 'object' ? major.extraPayload : {}
      const extraRemark = pickFirstText(
        extraPayload.summary,
        extraPayload.description,
        extraPayload.trainingDirection,
        extraPayload.training_direction
      )

      if (extraRemark) {
        parts.push(extraRemark)
      }

      return parts.join(' · ')
    }
  }
}
</script>

<style scoped>
.section-card {
  padding: 28rpx;
  margin-bottom: 20rpx;
  border-radius: 28rpx;
  background: #f8fafc;
  box-shadow: 0 12rpx 28rpx rgba(15, 23, 42, 0.04);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #111827;
}

.section-subtitle {
  font-size: 26rpx;
  color: #6b7280;
}

.empty-card {
  padding: 28rpx 24rpx;
  border-radius: 22rpx;
  background: #ffffff;
  font-size: 28rpx;
  color: #6b7280;
  text-align: center;
}

.major-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.major-card {
  padding: 24rpx;
  border-radius: 24rpx;
  background: #ffffff;
}

.major-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.major-name {
  flex: 1;
  font-size: 34rpx;
  line-height: 1.5;
  font-weight: 700;
  color: #111827;
}

.major-tag {
  flex-shrink: 0;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: #ede9fe;
  font-size: 24rpx;
  color: #6d28d9;
}

.major-score-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 18rpx;
}

.major-score-chip {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 100%);
  border: 1rpx solid rgba(16, 185, 129, 0.18);
}

.major-score-chip--empty {
  background: #f8fafc;
  border-color: rgba(148, 163, 184, 0.22);
}

.major-score-label {
  font-size: 23rpx;
  color: #047857;
}

.major-score-chip--empty .major-score-label {
  color: #64748b;
}

.major-score-value {
  font-size: 28rpx;
  font-weight: 800;
  color: #065f46;
}

.major-score-chip--empty .major-score-value {
  color: #94a3b8;
}

.major-score-year {
  font-size: 24rpx;
  color: #94a3b8;
}

.major-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx 20rpx;
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #64748b;
}

.major-desc {
  display: block;
  margin-top: 14rpx;
  font-size: 26rpx;
  line-height: 1.7;
  color: #475569;
}
</style>
