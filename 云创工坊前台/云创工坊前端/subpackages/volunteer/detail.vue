<template>
    <view class="school-detail-page">
      <view class="hero-section" :style="heroBackgroundStyle">
      <view class="hero-mask"></view>

      <view class="hero-header">
        <view class="hero-nav">
          <view class="nav-action" @tap="goBack">
            <text class="nav-action-icon">{{ backIcon }}</text>
          </view>
          <text class="nav-title">学校详情</text>
          <view class="nav-placeholder"></view>
        </view>

        <view class="hero-content">
          <text class="hero-name">{{ institution.name || initialName || '院校详情' }}</text>
          <text class="hero-meta">{{ headerMeta }}</text>

          <view v-if="tagList.length" class="hero-tag-row">
            <view v-for="tag in tagList" :key="tag" class="hero-tag">
              <text>{{ tag }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="content-wrap">
      <view v-if="loading" class="state-card">
        <text class="state-title">正在加载学校详情</text>
      </view>

      <view v-else-if="errorText" class="state-card state-card-error">
        <text class="state-title">{{ errorText }}</text>
        <view class="state-action" @tap="loadDetail">
          <text>重新加载</text>
        </view>
      </view>

      <block v-else>
        <detail-overview-grid
          :reference-score-text="referenceScoreText"
          :major-count-text="majorCountText"
        />

        <detail-content-section :overview-text="overviewText" />

        <detail-gallery-section :gallery-images="galleryImages" />

        <detail-base-info-section :base-fields="baseFields" />

        <detail-major-section
          :majors="majors"
          :major-count-text="majorCountText"
          :subject-track-filter="detailSubjectTrack"
        />
      </block>

      <volunteer-support-phone-card
        :description="customerServiceNotice"
        :rules="customerServiceRules"
        :phone="customerServicePhone"
      />
    </view>
  </view>
</template>

<script>
import { requestAdmission } from '../../utils/admission-api'
import { getStaticAssetUrl } from '../../utils/cloud-static-assets'
import { getCachedImageSync, resolveCachedImages } from '../../utils/remote-image-cache'
import { VOLUNTEER_CUSTOMER_SERVICE_PHONE } from '../../utils/volunteer-local-admission'
import {
  buildVolunteerSupportNotice,
  buildVolunteerSupportRules
} from '../../utils/volunteer-support-rules'
import VolunteerSupportPhoneCard from '../../components/volunteer/SupportPhoneCard.vue'
import DetailBaseInfoSection from './components/DetailBaseInfoSection.vue'
import DetailContentSection from './components/DetailContentSection.vue'
import DetailGallerySection from './components/DetailGallerySection.vue'
import DetailMajorSection from './components/DetailMajorSection.vue'
import DetailOverviewGrid from './components/DetailOverviewGrid.vue'

const DETAIL_HERO_IMAGES = [
  getStaticAssetUrl('/static/volunteer-guide/direct-score-top-hero.jpg')
]
const HIDDEN_TAGS = new Set(['spring', 'vocational'])

function normalizeNature(value) {
  if (value === 'public') return '公办'
  if (value === 'private') return '民办'
  return value || '待补充'
}

function formatScore(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '待补充'
  if (Number.isInteger(numeric)) return `${numeric} 分`
  return `${numeric.toFixed(1).replace(/\.0$/, '')} 分`
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

function decodeQueryText(value) {
  const text = String(value || '').trim()
  if (!text) return ''

  try {
    return decodeURIComponent(text)
  } catch (error) {
    return text
  }
}

export default {
  components: {
    DetailBaseInfoSection,
    DetailContentSection,
    DetailGallerySection,
    DetailMajorSection,
    DetailOverviewGrid,
    VolunteerSupportPhoneCard
  },
  data() {
    return {
      institutionId: '',
      initialName: '',
      detailExamType: '',
      detailSubjectTrack: '',
      detailMajorCategory: '',
      detailRiskBucket: '',
      previewMode: false,
      backIcon: '<',
      loading: true,
      errorText: '',
      detail: null,
      cachedHeroFallbackUrl: getCachedImageSync(DETAIL_HERO_IMAGES[0]),
      cachedGalleryImageMap: {},
      detailImageCacheTaskToken: 0
    }
  },
  computed: {
    institution() {
      const detailInstitution = this.detail && this.detail.institution
      return detailInstitution && typeof detailInstitution === 'object' ? detailInstitution : {}
    },
    majors() {
      return Array.isArray(this.detail && this.detail.majors) ? this.detail.majors : []
    },
    heroImage() {
      if (this.galleryImages.length > 0) {
        return this.galleryImages[0].displayUrl || this.galleryImages[0].publicUrl
      }

      const numericId = Number(this.institution.id || this.institutionId || 0)
      if (!Number.isFinite(numericId) || numericId <= 0) {
        return this.cachedHeroFallbackUrl || DETAIL_HERO_IMAGES[0]
      }

      const fallbackUrl = DETAIL_HERO_IMAGES[numericId % DETAIL_HERO_IMAGES.length]
      return getCachedImageSync(fallbackUrl) || fallbackUrl
    },
    heroBackgroundStyle() {
      const url = this.heroImage
      if (!url) {
        return {}
      }

      return {
        backgroundImage: `url('${url}')`,
        backgroundRepeat: 'repeat-x',
        backgroundPosition: 'center top',
        backgroundSize: 'auto 100%'
      }
    },
    headerMeta() {
      const parts = [
        this.institution.city,
        this.institution.schoolLevel,
        normalizeNature(this.institution.ownershipType),
        this.institution.schoolType
      ].filter(Boolean)

      return parts.join(' · ') || '学校基础信息'
    },
    tagList() {
      if (!Array.isArray(this.institution.tags)) {
        return []
      }

      return this.institution.tags
        .filter((tag) => {
          const text = String(tag || '').trim()
          return text && !HIDDEN_TAGS.has(text.toLowerCase())
        })
        .slice(0, 6)
    },
    galleryImages() {
      const imageAssets = Array.isArray(this.institution.imageAssets) ? this.institution.imageAssets : []
      return imageAssets
        .filter(item => item && typeof item.publicUrl === 'string' && item.publicUrl.trim())
        .slice(0, 3)
        .map((item) => {
          const publicUrl = String(item.publicUrl || '').trim()
          return Object.assign({}, item, {
            publicUrl,
            displayUrl: this.cachedGalleryImageMap[publicUrl] || getCachedImageSync(publicUrl) || publicUrl
          })
        })
    },
    referenceScoreText() {
      return this.institution.referenceScore === null || this.institution.referenceScore === undefined
        ? '待补充'
        : formatScore(this.institution.referenceScore)
    },
    majorCountText() {
      const count = this.institution.majorCount || this.majors.length || 0
      return count > 0 ? `${count} 个` : '待补充'
    },
    institutionExtraPayload() {
      const payload = this.institution.extraPayload
      return payload && typeof payload === 'object' ? payload : {}
    },
    overviewText() {
      const directText = pickFirstText(
        this.institution.introduction,
        this.institutionExtraPayload.introduction,
        this.institutionExtraPayload.schoolIntroduction,
        this.institutionExtraPayload.school_intro,
        this.institutionExtraPayload.summary,
        this.institutionExtraPayload.description,
        this.institutionExtraPayload.desc
      )

      if (directText) {
        return directText
      }

      const name = this.institution.name || this.initialName || '该院校'
      const parts = []
      const locationText = [this.institution.province, this.institution.city].filter(Boolean).join(' ')

      if (locationText) {
        parts.push(`${name}位于${locationText}`)
      }
      if (this.institution.schoolLevel) {
        parts.push(`办学层次为${this.institution.schoolLevel}`)
      }
      if (this.institution.schoolType) {
        parts.push(`院校类型为${this.institution.schoolType}`)
      }
      if (this.institution.ownershipType) {
        parts.push(`办学性质为${normalizeNature(this.institution.ownershipType)}`)
      }
      if (this.institution.majorCount || this.majors.length) {
        parts.push(`当前已收录 ${this.majorCountText} 招生专业`)
      }
      if (this.institution.referenceScore !== null && this.institution.referenceScore !== undefined) {
        parts.push(
          this.institution.latestScoreYear
            ? `${this.institution.latestScoreYear} 年参考录取分约为 ${formatScore(this.institution.referenceScore)}`
            : `近年参考录取分约为 ${formatScore(this.institution.referenceScore)}`
        )
      }

      if (!parts.length) {
        return '当前暂无更详细的学校介绍，后续会逐步补充院校简介、招生特色和更多专业内容。'
      }

      return `${parts.join('，')}。`
    },
    baseFields() {
      return [
        {
          label: '院校名称',
          value: this.institution.name || this.initialName || '待补充'
        },
        {
          label: '所在省份',
          value: this.institution.province || '待补充'
        },
        {
          label: '所在地区',
          value: this.institution.city || '待补充'
        },
        {
          label: '办学层次',
          value: this.institution.schoolLevel || '待补充'
        },
        {
          label: '办学性质',
          value: normalizeNature(this.institution.ownershipType)
        },
        {
          label: '院校类型',
          value: this.institution.schoolType || '待补充'
        }
      ]
    },
    customerServicePhone() {
      return VOLUNTEER_CUSTOMER_SERVICE_PHONE
    },
    customerServiceNotice() {
      return buildVolunteerSupportNotice()
    },
    customerServiceRules() {
      return buildVolunteerSupportRules()
    }
  },
  onLoad(options) {
    const safeOptions = options || {}

    this.institutionId = safeOptions.id ? String(safeOptions.id) : ''
    this.detailExamType = decodeQueryText(safeOptions.examType)
    this.detailSubjectTrack = decodeQueryText(safeOptions.subjectTrack)
    this.detailMajorCategory = decodeQueryText(safeOptions.majorCategory)
    this.detailRiskBucket = decodeQueryText(safeOptions.riskBucket)
    this.previewMode =
      String(safeOptions.preview || '').trim() === '1' ||
      String(safeOptions.preview || '').trim().toLowerCase() === 'true'

    this.initialName = decodeQueryText(safeOptions.name)

    if (!this.institutionId) {
      this.loading = false
      this.errorText = '缺少学校信息'
      return
    }

    this.syncDetailImageCache()
    this.loadDetail()
  },
  methods: {
    async syncDetailImageCache() {
      const galleryUrls = this.galleryImages
        .map((item) => String(item && item.publicUrl || '').trim())
        .filter(Boolean)
      const heroFallbackUrl = DETAIL_HERO_IMAGES[0]
      const urls = Array.from(new Set([heroFallbackUrl, ...galleryUrls].filter(Boolean)))

      if (!urls.length) {
        return
      }

      const nextGalleryMap = Object.assign({}, this.cachedGalleryImageMap)
      let seededChanged = false

      urls.forEach((url) => {
        const cachedUrl = getCachedImageSync(url)
        if (url === heroFallbackUrl && cachedUrl && this.cachedHeroFallbackUrl !== cachedUrl) {
          this.cachedHeroFallbackUrl = cachedUrl
        }
        if (galleryUrls.includes(url) && cachedUrl && nextGalleryMap[url] !== cachedUrl) {
          nextGalleryMap[url] = cachedUrl
          seededChanged = true
        }
      })

      if (seededChanged) {
        this.cachedGalleryImageMap = nextGalleryMap
      }

      const taskToken = this.detailImageCacheTaskToken + 1
      this.detailImageCacheTaskToken = taskToken

      try {
        const cachedUrls = await resolveCachedImages(urls)
        if (taskToken !== this.detailImageCacheTaskToken) {
          return
        }

        const updatedGalleryMap = Object.assign({}, this.cachedGalleryImageMap)
        let galleryChanged = false

        urls.forEach((url, index) => {
          const cachedUrl = String(cachedUrls[index] || '').trim()
          if (!cachedUrl) {
            return
          }

          if (url === heroFallbackUrl && this.cachedHeroFallbackUrl !== cachedUrl) {
            this.cachedHeroFallbackUrl = cachedUrl
          }

          if (galleryUrls.includes(url) && updatedGalleryMap[url] !== cachedUrl) {
            updatedGalleryMap[url] = cachedUrl
            galleryChanged = true
          }
        })

        if (galleryChanged) {
          this.cachedGalleryImageMap = updatedGalleryMap
        }
      } catch (error) {
        console.warn('[volunteer][detail] cache images failed:', error)
      }
    },
    async loadDetail() {
      this.loading = true
      this.errorText = ''

      try {
        const detailPath = this.previewMode
          ? `/admission/preview-institutions/${this.institutionId}`
          : `/admission/institutions/${this.institutionId}`
        const detail = await requestAdmission(detailPath, {
          examType: this.detailExamType,
          subjectTrack: this.detailSubjectTrack,
          majorCategory: this.detailMajorCategory,
          riskBucket: this.detailRiskBucket
        }, {
          auth: !this.previewMode
        })
        this.detail = detail
        this.syncDetailImageCache()
      } catch (error) {
        console.error('[volunteer][detail] load detail failed:', error)
        const message = error.message || '学校详情加载失败'
        this.errorText = message

        if (/请先登录|登录/.test(message)) {
          uni.showToast({
            title: '未登录',
            icon: 'none'
          })
          return
        }

        if (/解锁|支付 19\.9|邀请/.test(message)) {
          uni.showModal({
            title: '暂未解锁',
            content: message,
            showCancel: false,
            success: () => {
              uni.reLaunch({
                url: '/pages/volunteer/index'
              })
            }
          })
        }
      } finally {
        this.loading = false
      }
    },
    goBack() {
      const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
      if (pages.length > 1) {
        uni.navigateBack()
        return
      }

      uni.reLaunch({
        url: '/pages/volunteer/index'
      })
    },
    contactCustomerService() {}
  }
}
</script>

<style scoped>
.school-detail-page {
  min-height: 100vh;
  background: #f8fafc;
}

.hero-section {
  position: relative;
  min-height: 620rpx;
  overflow: hidden;
  background-color: #2b5a93;
}

.hero-mask {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.08) 0%, rgba(15, 23, 42, 0.16) 56%, rgba(15, 23, 42, 0.32) 100%);
}

.hero-header {
  position: relative;
  z-index: 2;
  padding: calc(env(safe-area-inset-top) + 112rpx) 32rpx 48rpx;
  display: flex;
  flex-direction: column;
  gap: 40rpx;
  color: #ffffff;
}

.hero-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-action,
.nav-placeholder {
  width: 72rpx;
  height: 72rpx;
}

.nav-action {
  border-radius: 36rpx;
  background: rgba(255, 255, 255, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-action-icon {
  font-size: 38rpx;
  line-height: 1;
  font-weight: 700;
  color: #ffffff;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #ffffff;
}

.hero-content {
  min-width: 0;
}

.hero-name {
  display: block;
  font-size: 52rpx;
  line-height: 1.28;
  font-weight: 700;
}

.hero-meta {
  display: block;
  margin-top: 16rpx;
  font-size: 28rpx;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.88);
}

.hero-tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 22rpx;
}

.hero-tag {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.14);
  font-size: 26rpx;
  color: #ffffff;
}

.content-wrap {
  position: relative;
  z-index: 3;
  margin-top: -240rpx;
  padding: 0 24rpx calc(56rpx + env(safe-area-inset-bottom));
}

.state-card {
  border-radius: 28rpx;
  background: #f8fafc;
  box-shadow: 0 12rpx 28rpx rgba(15, 23, 42, 0.04);
}

.state-card {
  min-height: 240rpx;
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.state-card-error {
  background: #fff7f7;
}

.state-title {
  font-size: 32rpx;
  color: #475569;
}

.state-action {
  min-width: 180rpx;
  height: 76rpx;
  margin-top: 24rpx;
  border-radius: 18rpx;
  background: #ede9fe;
  color: #6d28d9;
  font-size: 28rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

</style>
