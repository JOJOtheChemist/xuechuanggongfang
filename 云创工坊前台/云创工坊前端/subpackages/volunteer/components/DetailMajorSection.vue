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
          <text class="major-name">{{ majorDisplayName(major) }}</text>
        </view>

        <view class="major-meta">
          <text>{{ major.degreeLevel || '层次待补充' }}</text>
          <text v-if="major.latestScoreYearText">{{ major.latestScoreYearText }}</text>
        </view>

        <view v-if="major.scoreRows.length > 0" class="major-score-table-scroll">
          <view class="major-score-table">
            <view class="major-score-row major-score-row-head">
              <view
                v-for="column in scoreTableColumns"
                :key="column.key"
                :class="[
                  'major-score-cell',
                  'major-score-cell-head',
                  `major-score-cell-${column.key}`
                ]"
              >
                <text class="major-score-cell-head-line">{{ column.label }}</text>
              </view>
            </view>
            <view
              v-for="row in major.scoreRows"
              :key="`${major.renderKey}-${row.year}`"
              class="major-score-row"
            >
              <text class="major-score-cell major-score-cell-year">{{ row.year }}</text>
              <text class="major-score-cell major-score-cell-minScore">{{ formatScoreCell(row.minScore) }}</text>
              <text class="major-score-cell major-score-cell-minRank">{{ formatScoreCell(row.minRank) }}</text>
              <text class="major-score-cell major-score-cell-groupMinScore">{{ formatScoreCell(row.groupMinScore) }}</text>
              <text class="major-score-cell major-score-cell-groupMinRank">{{ formatScoreCell(row.groupMinRank) }}</text>
            </view>
          </view>
        </view>

        <view v-else class="major-score-empty">
          <text>暂无分数线数据</text>
        </view>

        <text v-if="majorDetailText(major)" class="major-desc">{{ majorDetailText(major) }}</text>
      </view>
    </view>
  </view>
</template>

<script>
const SCORE_TABLE_COLUMNS = Object.freeze([
  { key: 'year', label: '年份' },
  { key: 'minScore', label: '最低分' },
  { key: 'minRank', label: '最低位次' },
  { key: 'groupMinScore', label: '专业组最低分' },
  { key: 'groupMinRank', label: '专业组最低位次' }
])

function normalizeSubjectTrack(value) {
  return String(value || '').trim()
}

function pickFirstText(...values) {
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (typeof value !== 'string') continue
    const text = value.trim()
    if (text) return text
  }

  return ''
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
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
    },
    subjectTrackFilter: {
      type: String,
      default: ''
    }
  },
  computed: {
    scoreTableColumns() {
      return SCORE_TABLE_COLUMNS
    },
    normalizedMajors() {
      const normalizedSubjectTrackFilter = normalizeSubjectTrack(this.subjectTrackFilter)
      return (Array.isArray(this.majors) ? this.majors : []).map((item, index) => {
        const source = item && typeof item === 'object' ? item : {}
        const rawKey = source.id || source.majorCode || source.majorName || `major-${index}`
        const latestScoreYear = Number(source.latestScoreYear)
        const subjectTrack = this.resolveMajorSubjectTrack(source) || normalizedSubjectTrackFilter
        const extraPayload = this.resolveExtraPayload(source)
        return Object.assign({}, source, {
          renderKey: `major-${rawKey}`,
          latestScoreYearText:
            Number.isFinite(latestScoreYear) && latestScoreYear > 0 ? `${Math.trunc(latestScoreYear)} 年参考` : '',
          subjectTrack,
          scoreRows: this.normalizeScoreRows(
            source.scoreRows ||
            source.score_rows ||
            extraPayload.scoreRows ||
            extraPayload.score_rows
          )
        })
      }).filter((major) => {
        if (!normalizedSubjectTrackFilter) {
          return true
        }

        return normalizeSubjectTrack(major.subjectTrack) === normalizedSubjectTrackFilter
      })
    }
  },
  methods: {
    formatScoreCell(value) {
      if (value === null || value === undefined || value === '') return '-'
      return String(value)
    },
    normalizeScoreRows(scoreRows) {
      if (!Array.isArray(scoreRows)) return []

      return scoreRows
        .map((row) => {
          const year = Number(row && row.year)
          if (!Number.isFinite(year) || year <= 0) return null

          return {
            year: String(Math.trunc(year)),
            minScore: toFiniteNumber(row && row.minScore),
            minRank: toFiniteNumber(row && row.minRank),
            groupMinScore: toFiniteNumber(row && row.groupMinScore),
            groupMinRank: toFiniteNumber(row && row.groupMinRank)
          }
        })
        .filter(Boolean)
        .sort((left, right) => Number(right.year) - Number(left.year))
    },
    resolveExtraPayload(major) {
      if (major && major.extraPayload && typeof major.extraPayload === 'object') {
        return major.extraPayload
      }

      if (major && major.extra_payload && typeof major.extra_payload === 'object') {
        return major.extra_payload
      }

      return {}
    },
    resolveMajorSubjectTrack(major) {
      const directTrack = normalizeSubjectTrack(
        major && (major.subjectTrack || major.subject_track)
      )

      if (directTrack) {
        return directTrack
      }

      const extraPayload = this.resolveExtraPayload(major)

      return normalizeSubjectTrack(extraPayload.subjectTrack || extraPayload.subject_track)
    },
    majorDisplayName(major) {
      const majorName = String((major && major.majorName) || '').trim()
      const subjectTrack = normalizeSubjectTrack(major && major.subjectTrack)
      const majorCategory = String((major && major.majorCategory) || '').trim()

      if (!majorName) {
        return [majorCategory, subjectTrack].filter(Boolean).join(' · ')
      }

      const suffix = [majorCategory, subjectTrack].filter(Boolean).join(' · ')
      return suffix ? `${majorName} · ${suffix}` : majorName
    },
    majorDetailText(major) {
      const parts = []

      if (major.majorCode) {
        parts.push(`专业代码 ${major.majorCode}`)
      }

      const extraPayload = this.resolveExtraPayload(major)
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
  padding: 4rpx 0 0;
  border-radius: 0;
  background: transparent;
}

.major-top {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 16rpx;
}

.major-name {
  display: block;
  font-size: 26rpx;
  line-height: 1.5;
  font-weight: 700;
  color: rgb(91, 89, 124);
}

.major-tag {
  flex-shrink: 0;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: #f1f5f9;
  font-size: 22rpx;
  color: #475569;
}

.major-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx 20rpx;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #64748b;
}

.major-score-table-scroll {
  width: 100%;
  margin-top: 8rpx;
  overflow: hidden;
}

.major-score-table {
  width: 100%;
  background: #ffffff;
  border: 1rpx solid #d1d5db;
  border-radius: 10rpx;
  overflow: hidden;
  box-sizing: border-box;
}

.major-score-row {
  display: flex;
  align-items: stretch;
}

.major-score-row + .major-score-row {
  border-top: 1rpx solid #d1d5db;
}

.major-score-row-head {
  background: #ffffff;
}

.major-score-cell {
  min-height: 46rpx;
  min-width: 0;
  padding: 0 4rpx;
  background: #ffffff;
  font-size: 20rpx;
  line-height: 1.4;
  color: #334155;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  box-sizing: border-box;
  flex: 1 1 0;
}

.major-score-cell + .major-score-cell {
  border-left: 1rpx solid #d1d5db;
}

.major-score-cell-head {
  min-height: 46rpx;
  padding: 0;
  background: #f9f9fd;
  color: rgb(91, 89, 124);
  font-weight: 700;
}

.major-score-cell-head-line {
  display: block;
  line-height: 1.2;
  margin: 0 auto;
  text-align: center;
  white-space: nowrap;
}

.major-score-cell-year {
  flex: 0.8 1 0;
}

.major-score-cell-minScore {
  flex: 0.92 1 0;
}

.major-score-cell-minRank {
  flex: 1.02 1 0;
}

.major-score-cell-groupMinScore {
  flex: 1.28 1 0;
}

.major-score-cell-groupMinRank {
  flex: 1.42 1 0;
}

.major-score-empty {
  margin-top: 8rpx;
  padding: 12rpx 0;
  border-radius: 0;
  background: transparent;
  font-size: 22rpx;
  color: #64748b;
}

.major-desc {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  line-height: 1.6;
  color: #475569;
}
</style>
