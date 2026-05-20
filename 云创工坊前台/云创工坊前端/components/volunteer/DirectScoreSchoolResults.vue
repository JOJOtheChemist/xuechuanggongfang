<template>
  <view class="school-results">
    <view class="school-list">
      <view
        v-for="school in schoolItems"
        :key="school.renderKey"
        class="school-list-item school-preview-card"
        :class="{ 'school-preview-card-single-major': !shouldUseMajorScroll(school) }"
        @tap="handleSelect(school)"
      >
        <view class="school-preview-head">
          <view class="school-preview-head-main">
            <view class="school-preview-badge">
              <image
                v-if="shouldShowSchoolThumb(school)"
                class="school-preview-badge-image"
                :src="school.thumbUrl"
                mode="aspectFill"
                @error.stop="handleSchoolThumbError(school)"
              />
              <text v-else class="school-preview-badge-text">{{ school.badge || '院校' }}</text>
            </view>
            <view class="school-preview-meta">
              <text class="school-preview-name">{{ school.name }}</text>
              <text class="school-preview-subtitle">
                {{ school.subtitle }}
              </text>
            </view>
          </view>
          <view class="school-preview-retention">
            <text class="school-preview-retention-label">保研率</text>
            <text class="school-preview-retention-value">{{ school.retentionRateText }}</text>
          </view>
        </view>

        <view class="school-preview-tags">
          <text
            v-for="tag in school.metaTags"
            :key="tag.renderKey"
            class="school-preview-tag"
          >{{ tag.label }}</text>
        </view>

        <view v-if="school.loadingDetails" class="school-preview-loading">
          <text class="school-preview-loading-text">专业分数正在补充加载</text>
        </view>

        <scroll-view
          v-if="shouldUseMajorScroll(school)"
          class="school-preview-majors-scroll"
          scroll-y
          enable-flex
        >
          <view class="school-preview-majors">
            <view
              v-for="major in school.majors"
              :key="major.renderKey"
              class="school-preview-major-card"
            >
              <view v-if="major.isPlaceholder" class="school-preview-major-placeholder">
                <text class="school-preview-major-placeholder-text">{{ major.label }}</text>
              </view>
              <block v-else>
                <view class="school-preview-major-title-row">
                  <text class="school-preview-major-title">{{ major.label }}</text>
                </view>
                <view class="school-preview-score-table-scroll">
                  <view class="school-preview-score-table">
                    <view class="school-preview-score-row school-preview-score-row-head">
                      <view
                        v-for="column in scoreTableColumns"
                        :key="column.key"
                        :class="[
                          'school-preview-score-cell',
                          'school-preview-score-cell-head',
                          `school-preview-score-cell-${column.key}`
                        ]"
                      >
                        <text class="school-preview-score-cell-head-line">{{ column.label }}</text>
                      </view>
                    </view>
                    <view
                      v-for="row in major.scoreRows"
                      :key="row.year"
                      class="school-preview-score-row"
                    >
                      <text class="school-preview-score-cell school-preview-score-cell-year">{{ row.year }}</text>
                      <text class="school-preview-score-cell school-preview-score-cell-minScore">{{ formatScoreCell(row.minScore) }}</text>
                      <text class="school-preview-score-cell school-preview-score-cell-minRank">{{ formatScoreCell(row.minRank) }}</text>
                      <text class="school-preview-score-cell school-preview-score-cell-groupMinScore">{{ formatScoreCell(row.groupMinScore) }}</text>
                      <text class="school-preview-score-cell school-preview-score-cell-groupMinRank">{{ formatScoreCell(row.groupMinRank) }}</text>
                    </view>
                  </view>
                </view>
              </block>
            </view>
            <text
              v-if="school.moreMajorCount > 0"
              class="school-preview-major-more-note"
            >+{{ school.moreMajorCount }} 个专业</text>
          </view>
        </scroll-view>

        <view v-else class="school-preview-majors school-preview-majors-static">
          <view
            v-for="major in school.majors"
            :key="major.renderKey"
            class="school-preview-major-card"
          >
            <view v-if="major.isPlaceholder" class="school-preview-major-placeholder">
              <text class="school-preview-major-placeholder-text">{{ major.label }}</text>
            </view>
            <block v-else>
              <view class="school-preview-major-title-row">
                <text class="school-preview-major-title">{{ major.label }}</text>
              </view>
              <view class="school-preview-score-table-scroll">
                <view class="school-preview-score-table">
                  <view class="school-preview-score-row school-preview-score-row-head">
                    <view
                      v-for="column in scoreTableColumns"
                      :key="column.key"
                      :class="[
                        'school-preview-score-cell',
                        'school-preview-score-cell-head',
                        `school-preview-score-cell-${column.key}`
                      ]"
                    >
                      <text class="school-preview-score-cell-head-line">{{ column.label }}</text>
                    </view>
                  </view>
                  <view
                    v-for="row in major.scoreRows"
                    :key="row.year"
                    class="school-preview-score-row"
                  >
                    <text class="school-preview-score-cell school-preview-score-cell-year">{{ row.year }}</text>
                    <text class="school-preview-score-cell school-preview-score-cell-minScore">{{ formatScoreCell(row.minScore) }}</text>
                    <text class="school-preview-score-cell school-preview-score-cell-minRank">{{ formatScoreCell(row.minRank) }}</text>
                    <text class="school-preview-score-cell school-preview-score-cell-groupMinScore">{{ formatScoreCell(row.groupMinScore) }}</text>
                    <text class="school-preview-score-cell school-preview-score-cell-groupMinRank">{{ formatScoreCell(row.groupMinRank) }}</text>
                  </view>
                </view>
              </view>
            </block>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getCachedImageSync, resolveCachedImages } from '../../utils/remote-image-cache'

function normalizeNature(value) {
  if (value === 'public') return '公办'
  if (value === 'private') return '民办'
  return value || ''
}

function normalizeMajorCategory(value) {
  return String(value || '').trim()
}

function normalizeSubjectTrack(value) {
  return String(value || '').trim()
}

function badgeFromName(name) {
  const text = String(name || '').replace(/[()（）]/g, '').trim()
  return text.slice(0, 2) || '院校'
}

function asPublicUrl(asset) {
  if (!asset || typeof asset !== 'object') return ''
  return String(asset.publicUrl || asset.public_url || asset.url || '').trim()
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const SCORE_TABLE_COLUMNS = Object.freeze([
  { key: 'year', label: '年份' },
  { key: 'minScore', label: '最低分' },
  { key: 'minRank', label: '最低位次' },
  { key: 'groupMinScore', label: '专业组最低分' },
  { key: 'groupMinRank', label: '专业组最低位次' }
])

export default {
  name: 'VolunteerDirectScoreResults',
  props: {
    institutions: {
      type: Array,
      default() {
        return []
      }
    },
    hasMore: {
      type: Boolean,
      default: false
    },
    majorCategoryFilter: {
      type: String,
      default: ''
    },
    subjectTrackFilter: {
      type: String,
      default: ''
    },
    loadingMore: {
      type: Boolean,
      default: false
    },
    loadingMoreText: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      failedThumbMap: {},
      cachedThumbMap: {},
      thumbCacheTaskToken: 0,
      schoolItems: [],
      schoolHydrationTimer: null,
      schoolHydrationTaskToken: 0,
      hydratedSchoolMap: {}
    }
  },
  watch: {
    institutions: {
      immediate: true,
      handler() {
        this.syncSchoolThumbCache()
        this.scheduleSchoolHydration()
      }
    },
    majorCategoryFilter() {
      this.scheduleSchoolHydration()
    },
    subjectTrackFilter() {
      this.scheduleSchoolHydration()
    }
  },
  beforeDestroy() {
    this.clearSchoolHydrationTimer()
    this.schoolHydrationTaskToken += 1
  },
  computed: {
    normalizedMajorCategoryFilter() {
      return normalizeMajorCategory(this.majorCategoryFilter)
    },
    normalizedSubjectTrackFilter() {
      return normalizeSubjectTrack(this.subjectTrackFilter)
    },
    scoreTableColumns() {
      return SCORE_TABLE_COLUMNS
    }
  },
  methods: {
    resolveCachedThumbUrl(url) {
      const source = String(url || '').trim()
      if (!source) return ''
      return this.cachedThumbMap[source] || getCachedImageSync(source) || source
    },
    async syncSchoolThumbCache() {
      const institutions = Array.isArray(this.institutions) ? this.institutions : []
      const thumbUrls = Array.from(new Set(
        institutions
          .map((item) => this.resolveSchoolThumb(item))
          .filter((url) => /^https?:\/\//i.test(String(url || '').trim()))
      ))

      if (!thumbUrls.length) {
        return
      }

      const seededMap = Object.assign({}, this.cachedThumbMap)
      let seededChanged = false

      thumbUrls.forEach((url) => {
        const cachedUrl = getCachedImageSync(url)
        if (cachedUrl && seededMap[url] !== cachedUrl) {
          seededMap[url] = cachedUrl
          seededChanged = true
        }
      })

      if (seededChanged) {
        this.cachedThumbMap = seededMap
      }

      const taskToken = this.thumbCacheTaskToken + 1
      this.thumbCacheTaskToken = taskToken

      try {
        const cachedUrls = await resolveCachedImages(thumbUrls)
        if (taskToken !== this.thumbCacheTaskToken) {
          return
        }

        const nextMap = Object.assign({}, this.cachedThumbMap)
        let changed = false

        thumbUrls.forEach((url, index) => {
          const cachedUrl = String(cachedUrls[index] || '').trim()
          if (cachedUrl && nextMap[url] !== cachedUrl) {
            nextMap[url] = cachedUrl
            changed = true
          }
        })

        if (changed) {
          this.cachedThumbMap = nextMap
          this.refreshRenderedSchoolThumbs()
        }
      } catch (error) {
        console.warn('[direct-score-results] cache school thumbs failed:', error)
      }
    },
    clearSchoolHydrationTimer() {
      if (this.schoolHydrationTimer) {
        clearTimeout(this.schoolHydrationTimer)
        this.schoolHydrationTimer = null
      }
    },
    refreshRenderedSchoolThumbs() {
      if (!Array.isArray(this.schoolItems) || !this.schoolItems.length) {
        return
      }

      const nextItems = this.schoolItems.map((school) => {
        if (!school || !school.raw) return school

        const nextThumbUrl = this.resolveCachedThumbUrl(this.resolveSchoolThumb(school.raw))
        if (nextThumbUrl === school.thumbUrl) {
          return school
        }

        return Object.assign({}, school, {
          thumbUrl: nextThumbUrl
        })
      })

      this.schoolItems = nextItems
    },
    scheduleSchoolHydration() {
      this.clearSchoolHydrationTimer()

      const source = Array.isArray(this.institutions) ? this.institutions.slice() : []
      const keyCount = {}
      const pendingHydrations = []
      const nextSchoolItems = []

      source.forEach((item, index) => {
        const schoolShell = this.buildSchoolShell(item, index)
        if (!schoolShell) {
          return
        }

        const baseKey = schoolShell.renderKey
        const duplicateCount = keyCount[baseKey] || 0
        keyCount[baseKey] = duplicateCount + 1

        const renderKey = duplicateCount > 0 ? `${baseKey}-${duplicateCount}` : baseKey
        const hydratedCacheKey = this.buildHydratedSchoolCacheKey(item, index)
        const cachedSchool = this.hydratedSchoolMap[hydratedCacheKey]
        const schoolItem = cachedSchool
          ? this.withSchoolRenderKeys(cachedSchool, renderKey)
          : this.withSchoolRenderKeys(schoolShell, renderKey)

        const listIndex = nextSchoolItems.push(schoolItem) - 1
        if (!cachedSchool) {
          pendingHydrations.push({
            item,
            index,
            listIndex,
            renderKey,
            hydratedCacheKey
          })
        }
      })

      this.schoolItems = nextSchoolItems
      if (!pendingHydrations.length) {
        return
      }

      const taskToken = this.schoolHydrationTaskToken + 1
      this.schoolHydrationTaskToken = taskToken

      const hydrateBatch = (startIndex) => {
        if (taskToken !== this.schoolHydrationTaskToken) {
          return
        }

        const nextItems = this.schoolItems.slice()
        const batchSize = startIndex === 0 ? 4 : 3
        const batch = pendingHydrations.slice(startIndex, startIndex + batchSize)
        let changed = false

        batch.forEach((entry) => {
          const hydratedSchool = this.mapInstitutionToSchool(entry.item, entry.index)
          if (!hydratedSchool) {
            return
          }

          this.hydratedSchoolMap[entry.hydratedCacheKey] = hydratedSchool
          nextItems[entry.listIndex] = this.withSchoolRenderKeys(hydratedSchool, entry.renderKey)
          changed = true
        })

        if (changed) {
          this.schoolItems = nextItems
        }

        const nextStartIndex = startIndex + batch.length
        if (nextStartIndex >= pendingHydrations.length) {
          this.schoolHydrationTimer = null
          return
        }

        this.schoolHydrationTimer = setTimeout(() => {
          hydrateBatch(nextStartIndex)
        }, 16)
      }

      hydrateBatch(0)
    },
    buildHydratedSchoolCacheKey(item, index) {
      return [
        this.resolveInstitutionStableId(item, index),
        this.normalizedMajorCategoryFilter,
        this.normalizedSubjectTrackFilter
      ].join('::')
    },
    withSchoolRenderKeys(school, renderKey) {
      if (!school || typeof school !== 'object') {
        return school
      }

      return Object.assign({}, school, {
        renderKey,
        metaTags: (Array.isArray(school.metaTags) ? school.metaTags : []).map((tag, index) => {
          return Object.assign({}, tag, {
            renderKey: `${renderKey}-tag-${index}`
          })
        }),
        majors: (Array.isArray(school.majors) ? school.majors : []).map((major, index) => {
          return Object.assign({}, major, {
            renderKey: `${renderKey}-major-${index}`
          })
        })
      })
    },
    shouldShowSchoolThumb(school) {
      if (!school || !school.thumbUrl) return false
      return !this.failedThumbMap[school.stableId || school.renderKey || school.id]
    },
    handleSchoolThumbError(school) {
      const key = school && (school.stableId || school.renderKey || school.id)
      if (!key) return
      this.$set(this.failedThumbMap, key, true)
    },
    handleSelect(school) {
      this.$emit('select', school)
    },
    formatScoreCell(value) {
      if (value === null || value === undefined || value === '') return '-'
      return String(value)
    },
    shouldUseMajorScroll(school) {
      const majorCount = Array.isArray(school && school.majors) ? school.majors.length : 0
      return majorCount > 2
    },
    getPreviewMajors(item) {
      if (Array.isArray(item && item.majorPreview)) return item.majorPreview
      if (Array.isArray(item && item.major_preview)) return item.major_preview
      return []
    },
    getMajorCount(item) {
      const candidates = [
        item && item.majorCount,
        item && item.major_count
      ]

      for (let index = 0; index < candidates.length; index += 1) {
        const value = Number(candidates[index])
        if (Number.isFinite(value) && value > 0) {
          return value
        }
      }

      return 0
    },
    resolveVisibleMajorPreviews(item) {
      const previewMajors = this.getPreviewMajors(item)

      return this.filterMajorsByCategory(previewMajors)
        .map((major) => {
          const subjectTrack = this.resolveMajorSubjectTrack(major) || this.normalizedSubjectTrackFilter
          return Object.assign({}, major, {
            subjectTrack
          })
        })
        .filter((major) => {
          if (!this.normalizedSubjectTrackFilter) {
            return true
          }

          return normalizeSubjectTrack(major.subjectTrack) === this.normalizedSubjectTrackFilter
        })
    },
    filterMajorsByCategory(majors) {
      const normalizedFilter = this.normalizedMajorCategoryFilter
      const source = Array.isArray(majors) ? majors : []

      if (!normalizedFilter) {
        return source
      }

      return source.filter((major) => {
        const majorCategory = normalizeMajorCategory(
          major && (major.majorCategory || major.major_category)
        )
        return majorCategory === normalizedFilter
      })
    },
    resolveMajorSubjectTrack(major) {
      const directTrack = normalizeSubjectTrack(
        major && (major.subjectTrack || major.subject_track)
      )

      if (directTrack) {
        return directTrack
      }

      const extraPayload = major && major.extraPayload && typeof major.extraPayload === 'object'
        ? major.extraPayload
        : major && major.extra_payload && typeof major.extra_payload === 'object'
          ? major.extra_payload
          : {}

      return normalizeSubjectTrack(extraPayload.subjectTrack || extraPayload.subject_track)
    },
    resolveSchoolThumb(item) {
      if (!item) return ''

      const directCandidates = [
        item.thumbnailUrl,
        item.thumbnail_url,
        item.thumbUrl,
        item.thumb_url,
        item.avatarUrl,
        item.avatar_url,
        item.logoUrl,
        item.logo_url
      ]

      for (let index = 0; index < directCandidates.length; index += 1) {
        const value = String(directCandidates[index] || '').trim()
        if (value) return value
      }

      const assetCandidates = [
        item.thumbnailAsset,
        item.thumbnail_asset,
        item.thumbAsset,
        item.thumb_asset,
        item.avatarAsset,
        item.avatar_asset,
        item.logoAsset,
        item.logo_asset
      ]

      for (let index = 0; index < assetCandidates.length; index += 1) {
        const value = asPublicUrl(assetCandidates[index])
        if (value) return value
      }

      return ''
    },
    resolveSchoolCover(item) {
      if (!item) return ''

      const directCandidates = [
        item.coverImageUrl,
        item.cover_image_url,
        item.imageUrl,
        item.image_url,
        item.bannerUrl,
        item.banner_url
      ]

      for (let index = 0; index < directCandidates.length; index += 1) {
        const value = String(directCandidates[index] || '').trim()
        if (value) return value
      }

      const imageAssets = Array.isArray(item.imageAssets)
        ? item.imageAssets
        : Array.isArray(item.image_assets)
          ? item.image_assets
          : []

      for (let index = 0; index < imageAssets.length; index += 1) {
        const value = asPublicUrl(imageAssets[index])
        if (value) return value
      }

      return this.resolveSchoolThumb(item)
    },
    resolveVisibleMajors(item) {
      const previewMajors = this.getPreviewMajors(item)
      return this.filterMajorsByCategory(previewMajors)
        .map((major) => {
          const scoreRows = this.normalizeScoreRows(major && (major.scoreRows || major.score_rows))
          const subjectTrack = this.resolveMajorSubjectTrack(major) || this.normalizedSubjectTrackFilter
          return Object.assign({}, major, {
            subjectTrack,
            scoreRows
          })
        })
        .filter((major) => {
          if (!major.scoreRows.length) {
            return false
          }

          if (!this.normalizedSubjectTrackFilter) {
            return true
          }

          return normalizeSubjectTrack(major.subjectTrack) === this.normalizedSubjectTrackFilter
        })
    },
    formatMajorName(major) {
      const majorName = String((major && (major.majorName || major.major_name)) || '').trim()
      if (!majorName) return ''

      const majorCategory = String((major && (major.majorCategory || major.major_category)) || '').trim()
      const subjectTrack = this.resolveMajorSubjectTrack(major) || this.normalizedSubjectTrackFilter
      const suffix = [majorCategory, subjectTrack].filter(Boolean).join(' · ')
      return suffix ? `${majorName} · ${suffix}` : majorName
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
    buildRetentionRateText() {
      return '-'
    },
    buildSchoolMeta(item) {
      return [
        item.city || item.city_name || '地区待补充',
        item.schoolLevel || item.school_level || '层次待补充',
        normalizeNature(item.ownershipType || item.ownership_type) || '性质待补充',
        item.schoolType || item.school_type || '类型待补充'
      ]
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    },
    buildReferenceScoreText(item) {
      const score = item && (item.referenceScore || item.reference_score)
      const numeric = Number(score)
      return Number.isFinite(numeric) && numeric > 0 ? `参考分 ${numeric}` : ''
    },
    resolveInstitutionStableId(item, index) {
      const candidates = [
        item && item.stableId,
        item && item.stable_id,
        item && item.id,
        item && item.institutionId,
        item && item.institution_id,
        item && item.institutionCode,
        item && item.institution_code,
        item && item.name
      ]

      for (let currentIndex = 0; currentIndex < candidates.length; currentIndex += 1) {
        const value = String(candidates[currentIndex] || '').trim()
        if (value) return value
      }

      return `fallback-${index}`
    },
    buildSchoolShell(item, index) {
      if (!item || typeof item !== 'object') return null

      const visibleMajors = this.resolveVisibleMajorPreviews(item)
      if (!visibleMajors.length) {
        return null
      }

      const stableId = this.resolveInstitutionStableId(item, index)
      const renderKey = `school-${stableId}`
      const schoolMeta = this.buildSchoolMeta(item)
      const majorCount = this.getMajorCount(item) || visibleMajors.length
      const majorLabels = visibleMajors
        .map((major) => this.formatMajorName(major))
        .filter(Boolean)
      const city = item.city || item.city_name || '地区待补充'
      const level = item.schoolLevel || item.school_level || '层次待补充'
      const nature = normalizeNature(item.ownershipType || item.ownership_type) || '性质待补充'
      const placeholderLabel = majorLabels.length
        ? `已匹配 ${Math.min(majorLabels.length, majorCount)} 个专业，分数加载中`
        : '院校已找到，分数加载中'

      return {
        id: item.id,
        stableId,
        renderKey,
        raw: item,
        name: item.name,
        badge: badgeFromName(item.name),
        thumbUrl: this.resolveCachedThumbUrl(this.resolveSchoolThumb(item)),
        coverImageUrl: this.resolveSchoolCover(item),
        city,
        level,
        nature,
        subtitle: [city, level, nature].filter(Boolean).join(' · '),
        category: item.schoolType || item.school_type || '类型待补充',
        retentionRateText: this.buildRetentionRateText(),
        metaTags: schoolMeta.map((tag, tagIndex) => ({
          label: tag,
          renderKey: `${renderKey}-tag-${tagIndex}`
        })),
        majors: [{
          label: placeholderLabel,
          scoreRows: [],
          isPlaceholder: true,
          isLoadingDetails: true,
          renderKey: `${renderKey}-major-loading`
        }],
        majorCount,
        moreMajorCount: majorCount > 1 ? majorCount - 1 : 0,
        referenceScoreText: this.buildReferenceScoreText(item),
        previewNote: majorCount > 0 ? `已收录 ${majorCount} 个专业` : '点击查看学校详情',
        loadingDetails: true
      }
    },
    mapInstitutionToSchool(item, index) {
      if (!item || typeof item !== 'object') return null

      const visibleMajors = this.resolveVisibleMajors(item)
      if (!visibleMajors.length) {
        return null
      }

      const majorCards = visibleMajors
        .map((major, majorIndex) => {
          const label = this.formatMajorName(major)
          if (!label) return null

          const realScoreRows = Array.isArray(major && major.scoreRows) ? major.scoreRows : []

          return {
            label,
            scoreRows: realScoreRows,
            isPlaceholder: false
          }
        })
        .filter(Boolean)
      const majorCount = this.getMajorCount(item) || majorCards.length
      if (!majorCards.length) {
        return null
      }

      const visibleMajorCards = majorCards

      const moreMajorCount = majorCount > visibleMajorCards.length && visibleMajorCards.every((major) => !major.isPlaceholder)
        ? majorCount - visibleMajorCards.length
        : 0
      const schoolMeta = this.buildSchoolMeta(item)
      const stableId = this.resolveInstitutionStableId(item, index)
      const renderKey = `school-${stableId}`
      const city = item.city || item.city_name || '地区待补充'
      const level = item.schoolLevel || item.school_level || '层次待补充'
      const nature = normalizeNature(item.ownershipType || item.ownership_type) || '性质待补充'

      return {
        id: item.id,
        stableId,
        renderKey,
        raw: item,
        name: item.name,
        badge: badgeFromName(item.name),
        thumbUrl: this.resolveCachedThumbUrl(this.resolveSchoolThumb(item)),
        coverImageUrl: this.resolveSchoolCover(item),
        city,
        level,
        nature,
        subtitle: [city, level, nature].filter(Boolean).join(' · '),
        category: item.schoolType || item.school_type || '类型待补充',
        retentionRateText: this.buildRetentionRateText(),
        metaTags: schoolMeta.map((tag, tagIndex) => ({
          label: tag,
          renderKey: `${renderKey}-tag-${tagIndex}`
        })),
        majors: visibleMajorCards.map((major, majorIndex) => Object.assign({}, major, {
          renderKey: `${renderKey}-major-${majorIndex}`
        })),
        majorCount,
        moreMajorCount,
        referenceScoreText: this.buildReferenceScoreText(item),
        previewNote: majorCount > 0 ? `已收录 ${majorCount} 个专业` : '点击查看学校详情',
        loadingDetails: false
      }
    }
  }
}
</script>

<style scoped>
.school-results {
  width: 100%;
}

.school-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.school-list-item {
  width: 100%;
}

.school-preview-card {
  padding: 24rpx;
  border-radius: 20rpx;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 18rpx 42rpx rgba(24, 34, 68, 0.18);
  box-sizing: border-box;
}

.school-preview-card-single-major {
  padding-bottom: 18rpx;
}

.school-preview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.school-preview-head-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

.school-preview-badge {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%);
  color: #17337e;
  border: 1rpx solid rgba(191, 219, 254, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.school-preview-badge-text {
  font-size: 22rpx;
  font-weight: 700;
}

.school-preview-badge-image {
  width: 100%;
  height: 100%;
  display: block;
}

.school-preview-meta {
  flex: 1;
  min-width: 0;
  margin-left: 18rpx;
}

.school-preview-retention {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 10rpx 16rpx;
  border-radius: 16rpx;
  background: #f9f9fd;
  border: 1rpx solid #d4d4d8;
  box-sizing: border-box;
}

.school-preview-retention-label {
  display: inline;
  font-size: 28rpx;
  line-height: 1.4;
  color: rgb(91, 89, 124);
}

.school-preview-retention-value {
  display: inline;
  font-size: 30rpx;
  font-weight: 600;
  line-height: 1.4;
  color: rgb(106, 127, 171);
}

.school-preview-name {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.4;
  color: #0f172a;
}

.school-preview-subtitle {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  line-height: 1.5;
  color: #64748b;
}

.school-preview-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 18rpx;
}

.school-preview-loading {
  margin-top: 16rpx;
  padding: 12rpx 16rpx;
  border-radius: 14rpx;
  background: rgba(219, 234, 254, 0.42);
  border: 1rpx solid rgba(147, 197, 253, 0.65);
}

.school-preview-loading-text {
  display: block;
  font-size: 22rpx;
  line-height: 1.5;
  color: #2563eb;
}

.school-preview-tag {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: #f1f5f9;
  font-size: 22rpx;
  line-height: 1.4;
  color: #475569;
}

.school-preview-majors-scroll {
  height: 520rpx;
  margin-top: 8rpx;
}

.school-preview-majors {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  min-height: 100%;
  box-sizing: border-box;
}

.school-preview-majors-static {
  margin-top: 8rpx;
  min-height: 0;
}

.school-preview-card-single-major .school-preview-majors-static {
  margin-top: 4rpx;
}

.school-preview-major-card {
  padding: 4rpx 0 0;
  border-radius: 0;
  background: transparent;
  border: none;
  box-shadow: none;
  box-sizing: border-box;
}

.school-preview-major-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.school-preview-major-title {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  line-height: 1.5;
  color: rgb(91, 89, 124);
}

.school-preview-major-placeholder {
  padding: 8rpx 0;
}

.school-preview-major-placeholder-text {
  display: block;
  font-size: 24rpx;
  line-height: 1.6;
  color: #64748b;
}

.school-preview-score-table-scroll {
  width: 100%;
  margin-top: 4rpx;
  overflow: hidden;
}

.school-preview-score-table {
  width: 100%;
  background: #ffffff;
  border: 1rpx solid #d1d5db;
  border-radius: 10rpx;
  overflow: hidden;
  box-sizing: border-box;
}

.school-preview-score-row {
  display: flex;
  align-items: stretch;
}

.school-preview-score-row + .school-preview-score-row {
  border-top: 1rpx solid #d1d5db;
}

.school-preview-score-row-head {
  background: #ffffff;
}

.school-preview-score-cell {
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

.school-preview-score-cell + .school-preview-score-cell {
  border-left: 1rpx solid #d1d5db;
}

.school-preview-score-cell-head {
  min-height: 46rpx;
  padding: 0;
  background: #f9f9fd;
  color: rgb(91, 89, 124);
  font-weight: 700;
}

.school-preview-score-cell-head-line {
  display: block;
  line-height: 1.2;
  margin: 0 auto;
  text-align: center;
  white-space: nowrap;
}

.school-preview-score-cell-year {
  flex: 0.8 1 0;
}

.school-preview-score-cell-minScore {
  flex: 0.92 1 0;
}

.school-preview-score-cell-minRank {
  flex: 1.02 1 0;
}

.school-preview-score-cell-groupMinScore {
  flex: 1.28 1 0;
}

.school-preview-score-cell-groupMinRank {
  flex: 1.42 1 0;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.school-preview-major-more-note {
  font-size: 22rpx;
  line-height: 1.5;
  color: #64748b;
}

</style>
