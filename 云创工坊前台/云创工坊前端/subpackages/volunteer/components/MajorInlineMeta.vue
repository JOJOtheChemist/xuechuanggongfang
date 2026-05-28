<template>
  <view class="major-inline-meta">
    <view class="major-inline-meta-pill major-inline-meta-pill-subject">
      <text class="major-inline-meta-text">{{ subjectLabel }}</text>
      <text class="major-inline-meta-value">{{ subjectRequirementText || subjectRequirementFallbackText }}</text>
    </view>
    <view class="major-inline-meta-pill major-inline-meta-pill-retention">
      <text class="major-inline-meta-text">{{ retentionLabel }}</text>
      <text class="major-inline-meta-value">{{ retentionRateText || retentionRateFallbackText }}</text>
    </view>
  </view>
</template>

<script>
function normalizeText(value) {
  return String(value || '').trim()
}

function normalizePercentText(value) {
  const text = normalizeText(value)
  if (!text || ['-', '—', '--', '/'].includes(text)) return ''
  if (/%$/.test(text)) return text

  const numeric = Number(text)
  if (Number.isFinite(numeric) && numeric >= 0) {
    return `${String(numeric).replace(/\.0$/, '')}%`
  }

  return text
}

export default {
  name: 'VolunteerMajorInlineMeta',
  props: {
    subjectRequirement: {
      type: String,
      default: ''
    },
    retentionRate: {
      type: [String, Number],
      default: ''
    },
    subjectLabel: {
      type: String,
      default: '学科要求：'
    },
    retentionLabel: {
      type: String,
      default: '保研率：'
    }
  },
  computed: {
    subjectRequirementText() {
      return normalizeText(this.subjectRequirement)
    },
    subjectRequirementFallbackText() {
      return '不限'
    },
    retentionRateText() {
      return normalizePercentText(this.retentionRate)
    },
    retentionRateFallbackText() {
      return '-'
    }
  }
}
</script>

<style scoped>
.major-inline-meta {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10rpx;
  flex-wrap: wrap;
  text-align: left;
}

.major-inline-meta-pill {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  border: 1rpx solid transparent;
  box-sizing: border-box;
}

.major-inline-meta-pill-subject {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.24);
}

.major-inline-meta-pill-retention {
  background: rgba(245, 158, 11, 0.14);
  border-color: rgba(245, 158, 11, 0.28);
}

.major-inline-meta-text,
.major-inline-meta-value {
  font-size: 22rpx;
  line-height: 1.5;
}

.major-inline-meta-pill-subject .major-inline-meta-text,
.major-inline-meta-pill-subject .major-inline-meta-value {
  color: #1d4ed8;
}

.major-inline-meta-pill-retention .major-inline-meta-text,
.major-inline-meta-pill-retention .major-inline-meta-value {
  color: #b45309;
}

.major-inline-meta-value {
  font-weight: 600;
}
</style>
