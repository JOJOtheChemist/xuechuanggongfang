<template>
  <view class="school-results">
    <view class="school-list">
      <view
        v-for="school in schoolItems"
        :key="school.renderKey"
        class="school-list-item school-preview-card"
        @tap="handleSelect(school)"
      >
        <view class="school-preview-head">
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

        <view class="school-preview-tags">
          <text
            v-for="tag in school.metaTags"
            :key="tag.renderKey"
            class="school-preview-tag"
          >{{ tag.label }}</text>
        </view>

        <view class="school-preview-majors">
          <text
            v-for="major in school.majors"
            :key="major.renderKey"
            class="school-preview-major"
          >{{ major.label }}</text>
          <text
            v-if="school.moreMajorCount > 0"
            class="school-preview-major school-preview-major-more"
          >+{{ school.moreMajorCount }} 个专业</text>
        </view>
      </view>
    </view>

    <view
      v-if="loadingMore || hasMore || schoolItems.length > 0"
      class="load-more"
      @tap="handleLoadMore"
    >
      <text>
        {{
          loadingMore
            ? (loadingMoreText || '正在加载更多院校...')
            : hasMore
              ? '下滑到底自动加载更多院校'
              : '已经到底了'
        }}
      </text>
    </view>
  </view>
</template>

<script>
function normalizeNature(value) {
  if (value === 'public') return '公办'
  if (value === 'private') return '民办'
  return value || ''
}

function normalizeMajorCategory(value) {
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

export default {
  name: 'VolunteerSchoolResults',
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
      failedThumbMap: {}
    }
  },
  computed: {
    normalizedMajorCategoryFilter() {
      return normalizeMajorCategory(this.majorCategoryFilter)
    },
    schoolItems() {
      const source = Array.isArray(this.institutions) ? this.institutions : []
      const keyCount = {}

      return source
        .map((item, index) => this.mapInstitutionToSchool(item, index))
        .filter(Boolean)
        .map((school) => {
          const baseKey = school.renderKey
          const count = keyCount[baseKey] || 0
          keyCount[baseKey] = count + 1

          if (count > 0) {
            return Object.assign({}, school, {
              renderKey: `${baseKey}-${count}`
            })
          }

          return school
        })
    }
  },
  methods: {
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
    handleLoadMore() {
      if (!this.loadingMore && this.hasMore) {
        this.$emit('load-more')
      }
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
    },
    isHintMajor(text) {
      const value = String(text || '').trim()
      return (
        value.indexOf('加载中') !== -1 ||
        value.indexOf('已收录') === 0 ||
        value === '暂无专业明细' ||
        value === '当前类别暂无匹配专业'
      )
    },
    formatMajorName(major) {
      const majorName = String((major && (major.majorName || major.major_name)) || '').trim()
      if (!majorName) return ''

      const majorCategory = String((major && (major.majorCategory || major.major_category)) || '').trim()
      const category = majorCategory ? ` · ${majorCategory}` : ''
      return `${majorName}${category}`
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
    mapInstitutionToSchool(item, index) {
      if (!item || typeof item !== 'object') return null

      const visibleMajors = this.resolveVisibleMajors(item)
      const formattedMajors = visibleMajors
        .map((major) => this.formatMajorName(major))
        .filter(Boolean)
      const majorCount = this.getMajorCount(item) || formattedMajors.length
      const majorNames = formattedMajors.slice(0, 3)

      if (!majorNames.length) {
        majorNames.push(
          this.normalizedMajorCategoryFilter
            ? '当前类别暂无匹配专业'
            : majorCount > 0
              ? `已收录 ${majorCount} 个专业`
              : '暂无专业明细'
        )
      }

      const moreMajorCount = majorCount > majorNames.length && majorNames.every((major) => !this.isHintMajor(major))
        ? majorCount - majorNames.length
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
        thumbUrl: this.resolveSchoolThumb(item),
        coverImageUrl: this.resolveSchoolCover(item),
        city,
        level,
        nature,
        subtitle: [city, level, nature].filter(Boolean).join(' · '),
        category: item.schoolType || item.school_type || '类型待补充',
        metaTags: schoolMeta.map((tag, tagIndex) => ({
          label: tag,
          renderKey: `${renderKey}-tag-${tagIndex}`
        })),
        majors: majorNames.map((major, majorIndex) => ({
          label: major,
          renderKey: `${renderKey}-major-${majorIndex}`
        })),
        majorCount,
        moreMajorCount,
        referenceScoreText: this.buildReferenceScoreText(item),
        previewNote: majorCount > 0 ? `已收录 ${majorCount} 个专业` : '点击查看学校详情'
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
  box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.05);
  box-sizing: border-box;
}

.school-preview-head {
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

.school-preview-tag {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: #f1f5f9;
  font-size: 22rpx;
  line-height: 1.4;
  color: #475569;
}

.school-preview-majors {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  margin-top: 18rpx;
}

.school-preview-major {
  padding: 16rpx 18rpx;
  border-radius: 16rpx;
  background: #ffffff;
  border: 1rpx solid rgba(191, 219, 254, 0.9);
  font-size: 24rpx;
  line-height: 1.5;
  color: #1e3a8a;
  box-sizing: border-box;
}

.school-preview-major-more {
  background: #eff6ff;
}

.load-more {
  margin-top: 12rpx;
  min-height: 88rpx;
  padding: 0 24rpx;
  border-radius: 20rpx;
  background: #ffffff;
  border: 1rpx solid rgba(226, 232, 240, 0.9);
  color: #64748b;
  font-size: 28rpx;
  font-weight: 500;
  text-align: center;
  box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
</style>
