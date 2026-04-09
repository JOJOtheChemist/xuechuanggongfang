<template>
  <view class="volunteer-page">
    <view class="volunteer-banner-wrap">
      <swiper
        class="volunteer-banner-swiper"
        :indicator-dots="bannerImages.length > 1"
        indicator-color="rgba(255, 255, 255, 0.72)"
        indicator-active-color="#ffffff"
        circular
        autoplay
        interval="3500"
        duration="500"
      >
        <swiper-item
          v-for="banner in bannerImages"
          :key="banner.id"
          class="volunteer-banner-item"
        >
          <image
            class="volunteer-banner-image"
            :src="banner.imageUrl"
            mode="aspectFill"
          />
        </swiper-item>
      </swiper>
    </view>

    <view class="filter-header">
      <view class="row-top">
        <picker
          mode="selector"
          :range="topFilterOptions"
          range-key="label"
          :value="selectedTopFilterIndex"
          @change="onTopFilterChange"
        >
          <view class="select-box">
            <text class="select-text">{{ selectedTopFilterLabel }}</text>
            <view class="arrow-down"></view>
          </view>
        </picker>

        <view class="score-input-shell">
          <input
            v-model="scoreInput"
            class="score-input"
            type="digit"
            confirm-type="search"
            placeholder="输入分数"
            placeholder-class="input-placeholder"
            @confirm="reloadInstitutions"
          />
          <text class="score-unit">分</text>
        </view>
      </view>

      <view class="search-row">
        <input
          v-model="keyword"
          class="search-input"
          confirm-type="search"
          placeholder="院校名称"
          placeholder-class="input-placeholder"
          @confirm="reloadInstitutions"
        />
        <input
          v-model="majorKeyword"
          class="search-input"
          confirm-type="search"
          placeholder="专业关键词"
          placeholder-class="input-placeholder"
          @confirm="reloadInstitutions"
        />
        <view class="search-button" @tap="reloadInstitutions">
          <text>筛选</text>
        </view>
      </view>

      <view class="row-basic">
        <picker
          mode="selector"
          :range="cityOptions"
          range-key="label"
          :value="selectedCityIndex"
          @change="onCityChange"
        >
          <view class="basic-tag">
            <text>{{ selectedCityLabel }}</text>
          </view>
        </picker>

        <picker
          mode="selector"
          :range="levelOptions"
          range-key="label"
          :value="selectedLevelIndex"
          @change="onLevelChange"
        >
          <view class="basic-tag">
            <text>{{ selectedLevelLabel }}</text>
          </view>
        </picker>

        <picker
          mode="selector"
          :range="natureOptions"
          range-key="label"
          :value="selectedNatureIndex"
          @change="onNatureChange"
        >
          <view class="basic-tag">
            <text>{{ selectedNatureLabel }}</text>
          </view>
        </picker>
      </view>

      <view class="row-risk">
        <view
          v-for="option in riskFilterOptions"
          :key="option.value"
          class="risk-pill"
          :class="[
            `risk-pill-${option.value}`,
            {
              'risk-pill-active': scoreValue !== null && selectedRiskFilterKey === option.value,
              'risk-pill-disabled': scoreValue === null
            }
          ]"
          @tap="handleRiskFilterSelect(option.value)"
        >
          <text>{{ option.label }}</text>
        </view>
      </view>

      <view class="row-type">
        <view class="summary-strip">
          <text>{{ resultSummary }}</text>
        </view>
        <view class="reset-button" @tap="resetFilters">
          <text>重置</text>
        </view>
      </view>
    </view>

    <view class="result-container">
      <view v-if="loading" class="state-box">
        <text>正在加载院校数据</text>
      </view>

      <view v-else-if="errorText" class="state-box error">
        <text>{{ errorText }}</text>
        <view class="state-action" @tap="loadInstitutions">
          <text>重新加载</text>
        </view>
      </view>

      <view v-else-if="visibleSchools.length === 0" class="state-box">
        <text>{{ scoreValue === null ? '没有匹配的院校' : '按当前分数未匹配到院校' }}</text>
      </view>

      <block v-else>
        <view class="school-list">
          <volunteer-school-card
            v-for="school in visibleSchools"
            :key="school.id"
            :school="school"
            @select="handleSchoolSelect"
          />
        </view>

        <view
          v-if="hasMore"
          class="load-more"
          @tap="loadMore"
        >
          <text>{{ loadingMore ? '正在加载' : '加载更多院校' }}</text>
        </view>
      </block>
    </view>
  </view>
</template>

<script>
import { getApiBaseUrl } from '../../utils/api-switch'
import VolunteerSchoolCard from '../../components/volunteer/SchoolCard.vue'

const PAGE_SIZE = 20
const SCORE_PAGE_SIZE = 100
const DEFAULT_PROVINCE = '云南'
const VOLUNTEER_BANNERS = [
  {
    id: 'yunnan-1',
    imageUrl: 'https://xuechuang.xyz/oss/share-assets/xuechuang/volunteer/banner/yunnan-1.jpg'
  },
  {
    id: 'yunnan-2',
    imageUrl: 'https://xuechuang.xyz/oss/share-assets/xuechuang/volunteer/banner/yunnan-2.jpg'
  },
  {
    id: 'yunnan-3',
    imageUrl: 'https://xuechuang.xyz/oss/share-assets/xuechuang/volunteer/banner/yunnan-3.jpg'
  }
]

function appendQuery(url, query) {
  const pairs = []

  Object.keys(query || {}).forEach((key) => {
    const value = query[key]
    if (value === undefined || value === null || value === '') return
    pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  })

  if (!pairs.length) return url
  return `${url}${url.indexOf('?') === -1 ? '?' : '&'}${pairs.join('&')}`
}

async function requestAdmission(path, query = {}) {
  const response = await uni.request({
    url: appendQuery(`${getApiBaseUrl()}${path}`, query),
    method: 'GET',
    header: {
      'Content-Type': 'application/json'
    }
  })
  const raw = Array.isArray(response) ? response[1] : response
  const body = raw && raw.data

  if (!body || body.code !== 0) {
    throw new Error((body && body.message) || '请求失败')
  }

  return body.data
}

function normalizeNature(value) {
  if (value === 'public') return '公办'
  if (value === 'private') return '民办'
  return value || ''
}

function isValidInstitution(item) {
  return item && item.name && !/^\d+$/.test(String(item.name).trim())
}

function badgeFromName(name) {
  const text = String(name || '').replace(/[()（）]/g, '').trim()
  return text.slice(0, 2) || '院校'
}

export default {
  components: {
    VolunteerSchoolCard
  },
  data() {
    return {
      loading: false,
      loadingMore: false,
      detailLoading: false,
      errorText: '',
      scoreInput: '',
      keyword: '',
      majorKeyword: '',
      institutions: [],
      detailCache: {},
      detailLoadingMap: {},
      bannerImages: VOLUNTEER_BANNERS,
      page: 0,
      total: 0,
      selectedExamIndex: 0,
      selectedCityIndex: 0,
      selectedLevelIndex: 0,
      selectedNatureIndex: 0,
      selectedSchoolTypeIndex: 0,
      selectedRiskFilterKey: '',
      examOptions: [
        { label: '全部考试', value: '' },
        { label: '春季高考', value: 'spring' },
        { label: '职教高考', value: 'vocational' }
      ],
      cityOptions: [
        { label: '全部地区', value: '' },
        { label: '昆明市', value: '昆明市' },
        { label: '曲靖市', value: '曲靖市' },
        { label: '玉溪市', value: '玉溪市' },
        { label: '保山市', value: '保山市' },
        { label: '昭通市', value: '昭通市' },
        { label: '普洱市', value: '普洱市' },
        { label: '临沧市', value: '临沧市' },
        { label: '丽江市', value: '丽江市' },
        { label: '大理州', value: '大理白族自治州' },
        { label: '楚雄州', value: '楚雄彝族自治州' },
        { label: '红河州', value: '红河哈尼族彝族自治州' },
        { label: '文山州', value: '文山壮族苗族自治州' },
        { label: '德宏州', value: '德宏傣族景颇族自治州' },
        { label: '西双版纳州', value: '西双版纳傣族自治州' },
        { label: '迪庆州', value: '迪庆藏族自治州' },
        { label: '怒江州', value: '怒江傈僳族自治州' },
        { label: '上海市', value: '上海市' },
        { label: '重庆市', value: '重庆市' },
        { label: '长沙市', value: '长沙市' },
        { label: '乌鲁木齐市', value: '乌鲁木齐市' },
        { label: '阿拉尔市', value: '阿拉尔市' },
        { label: '铁门关市', value: '铁门关市' }
      ],
      levelOptions: [
        { label: '全部层次', value: '' },
        { label: '本科', value: '本科' },
        { label: '专科', value: '专科' }
      ],
      natureOptions: [
        { label: '全部性质', value: '' },
        { label: '公办', value: '公办' },
        { label: '民办', value: '民办' }
      ],
      schoolTypeOptions: [
        { label: '全部院校类型', value: '' },
        { label: '综合类', value: '综合类' },
        { label: '理工类', value: '理工类' },
        { label: '师范类', value: '师范类' },
        { label: '医药类', value: '医药类' },
        { label: '财经类', value: '财经类' },
        { label: '农林类', value: '农林类' },
        { label: '艺术类', value: '艺术类' },
        { label: '体育类', value: '体育类' },
        { label: '政法类', value: '政法类' },
        { label: '语言类', value: '语言类' },
        { label: '旅游类', value: '旅游类' },
        { label: '民族类', value: '民族类' }
      ],
      riskFilterOptions: [
        { label: '稳', value: 'stable' },
        { label: '冲', value: 'hard' },
        { label: '保', value: 'safe' },
        { label: '补录', value: 'supplement' }
      ]
    }
	  },
	  computed: {
	    topFilterOptions() {
	      return [
	        ...this.examOptions.map((item, index) => ({
	          ...item,
	          filterType: 'exam',
	          sourceIndex: index
	        })),
	        ...this.schoolTypeOptions.slice(1).map((item, index) => ({
	          ...item,
	          filterType: 'schoolType',
	          sourceIndex: index + 1
	        }))
	      ]
	    },
	    selectedTopFilterIndex() {
	      if (this.selectedSchoolTypeIndex > 0) {
	        return this.examOptions.length + this.selectedSchoolTypeIndex - 1
	      }

	      return this.selectedExamIndex
	    },
	    selectedTopFilterLabel() {
	      if (this.selectedSchoolTypeIndex > 0) {
	        return this.selectedSchoolTypeLabel
	      }

	      return this.selectedExamLabel
	    },
	    selectedExamLabel() {
	      return this.examOptions[this.selectedExamIndex]?.label || '全部考试'
	    },
	    selectedExamValue() {
	      return this.examOptions[this.selectedExamIndex]?.value || ''
	    },
	    selectedCityLabel() {
	      return this.cityOptions[this.selectedCityIndex]?.label || '全部地区'
	    },
	    selectedCityValue() {
	      return this.cityOptions[this.selectedCityIndex]?.value || ''
	    },
	    selectedLevelLabel() {
	      return this.levelOptions[this.selectedLevelIndex]?.label || '全部层次'
	    },
	    selectedLevelValue() {
	      return this.levelOptions[this.selectedLevelIndex]?.value || ''
	    },
	    selectedNatureLabel() {
	      return this.natureOptions[this.selectedNatureIndex]?.label || '全部性质'
	    },
	    selectedNatureValue() {
	      return this.natureOptions[this.selectedNatureIndex]?.value || ''
	    },
	    selectedSchoolTypeLabel() {
	      return this.schoolTypeOptions[this.selectedSchoolTypeIndex]?.label || '全部院校类型'
	    },
	    selectedSchoolTypeValue() {
	      return this.schoolTypeOptions[this.selectedSchoolTypeIndex]?.value || ''
	    },
	    selectedRiskFilterValue() {
	      return this.selectedRiskFilterKey || 'all'
	    },
	    scoreValue() {
	      const text = String(this.scoreInput || '').trim()
	      if (!text) return null
	      const value = Number(text)
	      return Number.isFinite(value) ? value : null
	    },
	    filteredInstitutions() {
	      return this.institutions.filter(isValidInstitution)
	    },
	    visibleInstitutions() {
	      if (this.scoreValue !== null && this.selectedRiskFilterKey) {
	        return this.filteredInstitutions.filter((item) => this.resolveRiskFilterKey(item) === this.selectedRiskFilterKey)
	      }

	      return this.filteredInstitutions
	    },
	    visibleSchools() {
	      return this.visibleInstitutions.map((item) => this.mapInstitutionToSchool(item))
	    },
	    riskSummary() {
	      const summary = {
	        hard: 0,
	        stable: 0,
	        safe: 0,
	        supplement: 0
	      }

	      if (this.scoreValue === null) {
	        return summary
	      }

	      return this.filteredInstitutions.reduce((currentSummary, item) => {
	        const bucket = this.resolveRiskFilterKey(item)
	        if (bucket && currentSummary[bucket] !== undefined) {
	          currentSummary[bucket] += 1
	        }
	        return currentSummary
	      }, summary)
	    },
	    hasMore() {
	      return this.institutions.length < this.total
	    },
	    resultSummary() {
	      const loadedText = this.total > 0 ? `${this.institutions.length}/${this.total}` : `${this.institutions.length}`

	      if (this.scoreValue !== null) {
	        return `当前已加载 ${loadedText} 所 · 稳 ${this.riskSummary.stable} · 冲 ${this.riskSummary.hard} · 保 ${this.riskSummary.safe} · 补录 ${this.riskSummary.supplement}`
	      }

	      return `当前已加载 ${loadedText} 所院校`
	    }
	  },
	  onLoad() {
	    this.loadInstitutions()
	  },
	  onPullDownRefresh() {
	    this.loadInstitutions(true).finally(() => {
	      uni.stopPullDownRefresh()
	    })
	  },
	  onShow() {
	    const page =
	      (this.$mp && this.$mp.page) ||
	      (typeof getCurrentPages === 'function' ? getCurrentPages().slice(-1)[0] : null)
	    const tabBar = page && typeof page.getTabBar === 'function' ? page.getTabBar() : null

	    if (tabBar && typeof tabBar.setData === 'function') {
	      tabBar.setData({
	        selected: 2
	      })
	    }
	  },
	  methods: {
	    async loadInstitutions(reset = true) {
	      if (this.loading || this.loadingMore) return

	      if (this.scoreValue === null && this.selectedRiskFilterKey) {
	        this.selectedRiskFilterKey = ''
	      }

	      const pageSize = this.scoreValue === null ? PAGE_SIZE : SCORE_PAGE_SIZE
	      const nextPage = reset ? 1 : this.page + 1

	      if (reset) {
	        this.loading = true
	      } else {
	        this.loadingMore = true
	      }

	      this.errorText = ''

	      try {
	        const result = await requestAdmission('/admission/institutions', {
	          province: DEFAULT_PROVINCE,
	          examType: this.selectedExamValue,
	          city: this.selectedCityValue,
	          schoolLevel: this.selectedLevelValue,
	          ownershipType: this.selectedNatureValue,
	          schoolType: this.selectedSchoolTypeValue,
	          score: this.scoreValue === null ? '' : this.scoreValue,
	          riskBucket: this.selectedRiskFilterValue,
	          keyword: this.keyword.trim(),
	          majorKeyword: this.majorKeyword.trim(),
	          page: nextPage,
	          pageSize
	        })
	        const items = (result.items || []).filter(isValidInstitution)
	        const nextItems = reset ? items : this.mergeInstitutions(this.institutions, items)

	        this.institutions = nextItems
	        this.page = nextPage
	        this.total = result.pagination?.total || nextItems.length
	        this.ensureVisibleDetails()
	      } catch (error) {
	        console.error('[volunteer] load institutions failed:', error)
	        this.errorText = error.message || '院校数据加载失败'
	      } finally {
	        this.loading = false
	        this.loadingMore = false
	      }
	    },
	    reloadInstitutions() {
	      this.loadInstitutions(true)
	    },
	    mergeInstitutions(currentItems, nextItems) {
	      const existedIds = currentItems.map((item) => item.id)
	      const merged = currentItems.slice()

	      nextItems.forEach((item) => {
	        if (existedIds.indexOf(item.id) === -1) {
	          existedIds.push(item.id)
	          merged.push(item)
	        }
	      })

	      return merged
	    },
	    onTopFilterChange(event) {
	      const nextIndex = Number(event.detail.value || 0)
	      const option = this.topFilterOptions[nextIndex]

	      if (!option) return

	      if (option.filterType === 'schoolType') {
	        this.selectedSchoolTypeIndex = option.sourceIndex
	        this.selectedExamIndex = 0
	      } else {
	        this.selectedExamIndex = option.sourceIndex
	        this.selectedSchoolTypeIndex = 0
	      }

	      this.handleFilterChange()
	    },
	    onCityChange(event) {
	      this.selectedCityIndex = Number(event.detail.value || 0)
	      this.handleFilterChange()
	    },
	    onLevelChange(event) {
	      this.selectedLevelIndex = Number(event.detail.value || 0)
	      this.handleFilterChange()
	    },
	    onNatureChange(event) {
	      this.selectedNatureIndex = Number(event.detail.value || 0)
	      this.handleFilterChange()
	    },
	    handleRiskFilterSelect(value) {
	      if (this.scoreValue === null) {
	        uni.showToast({
	          title: '请先输入分数',
	          icon: 'none'
	        })
	        return
	      }

	      this.selectedRiskFilterKey = this.selectedRiskFilterKey === value ? '' : value
	      this.loadInstitutions(true)
	    },
	    handleFilterChange() {
	      this.loadInstitutions(true)
	    },
	    handleSchoolSelect(school) {
	      if (!school || !school.raw) return
	      this.loadInstitutionDetail(school.raw)
	    },
	    resetFilters() {
	      this.scoreInput = ''
	      this.keyword = ''
	      this.majorKeyword = ''
	      this.selectedExamIndex = 0
	      this.selectedCityIndex = 0
	      this.selectedLevelIndex = 0
	      this.selectedNatureIndex = 0
	      this.selectedSchoolTypeIndex = 0
	      this.selectedRiskFilterKey = ''
	      this.loadInstitutions(true)
	    },
	    loadMore() {
	      if (!this.hasMore || this.loadingMore) return
	      this.loadInstitutions(false)
	    },
	    async ensureVisibleDetails() {
	      const candidateInstitutions = this.scoreValue === null ? this.visibleInstitutions : this.filteredInstitutions
	      if (!candidateInstitutions.length) return

	      const missing = candidateInstitutions.filter((item) => !this.detailCache[item.id] && !this.detailLoadingMap[item.id])
	      if (!missing.length) return

	      this.detailLoading = true

	      try {
	        await Promise.all(missing.map((item) => this.loadInstitutionDetail(item, false)))
	      } finally {
        this.detailLoading = false
      }
    },
    async loadInstitutionDetail(item, showToast = true) {
      if (!item || !item.id || this.detailCache[item.id] || this.detailLoadingMap[item.id]) {
        return
      }

      this.$set(this.detailLoadingMap, item.id, true)

      try {
        const detail = await requestAdmission(`/admission/institutions/${item.id}`)
        this.$set(this.detailCache, item.id, detail)
      } catch (error) {
        console.error('[volunteer] load institution detail failed:', error)
        if (showToast) {
          uni.showToast({
            title: '专业加载失败',
            icon: 'none'
          })
        }
      } finally {
        this.$delete(this.detailLoadingMap, item.id)
      }
    },
	    formatScore(value) {
	      const numeric = Number(value)
	      if (!Number.isFinite(numeric)) return '--'
	      if (Number.isInteger(numeric)) return String(numeric)
	      return numeric.toFixed(1).replace(/\.0$/, '')
	    },
	    firstFiniteNumber(...values) {
	      for (let index = 0; index < values.length; index += 1) {
	        const currentValue = values[index]
	        if (currentValue === undefined || currentValue === null || currentValue === '') continue

	        const numeric = Number(currentValue)
	        if (Number.isFinite(numeric)) {
	          return numeric
	        }
	      }

	      return null
	    },
	    getDetailRecord(item) {
	      if (!item || !item.id) return {}
	      const detail = this.detailCache[item.id]
	      return detail && typeof detail === 'object' ? detail : {}
	    },
	    getDetailInstitution(item) {
	      const detail = this.getDetailRecord(item)
	      if (detail.institution && typeof detail.institution === 'object') {
	        return detail.institution
	      }
	      return {}
	    },
	    resolveReferenceScore(item) {
	      const detail = this.getDetailRecord(item)
	      const detailInstitution = this.getDetailInstitution(item)
	      return this.firstFiniteNumber(
	        item && item.referenceScore,
	        item && item.reference_score,
	        detailInstitution.referenceScore,
	        detailInstitution.reference_score,
	        detail.referenceScore,
	        detail.reference_score
	      )
	    },
	    resolveScoreLineYears(item) {
	      const detail = this.getDetailRecord(item)
	      const detailInstitution = this.getDetailInstitution(item)
	      return this.firstFiniteNumber(
	        item && item.scoreLineYears,
	        item && item.score_line_years,
	        detailInstitution.scoreLineYears,
	        detailInstitution.score_line_years,
	        detail.scoreLineYears,
	        detail.score_line_years
	      )
	    },
	    resolveLatestScoreYear(item) {
	      const detail = this.getDetailRecord(item)
	      const detailInstitution = this.getDetailInstitution(item)
	      return this.firstFiniteNumber(
	        item && item.latestScoreYear,
	        item && item.latest_score_year,
	        detailInstitution.latestScoreYear,
	        detailInstitution.latest_score_year,
	        detail.latestScoreYear,
	        detail.latest_score_year
	      )
	    },
	    resolveScoreGap(item, referenceScore = this.resolveReferenceScore(item)) {
	      const detail = this.getDetailRecord(item)
	      const detailInstitution = this.getDetailInstitution(item)
	      const explicitGap = this.firstFiniteNumber(
	        item && item.scoreGap,
	        item && item.score_gap,
	        detailInstitution.scoreGap,
	        detailInstitution.score_gap,
	        detail.scoreGap,
	        detail.score_gap
	      )

	      if (explicitGap !== null) {
	        return explicitGap
	      }

	      if (this.scoreValue === null || referenceScore === null) {
	        return null
	      }

	      return Number((this.scoreValue - referenceScore).toFixed(2))
	    },
	    resolveRemoteRiskBucket(item) {
	      const detail = this.getDetailRecord(item)
	      const detailInstitution = this.getDetailInstitution(item)
	      const candidates = [
	        item && item.riskBucket,
	        item && item.risk_bucket,
	        detailInstitution.riskBucket,
	        detailInstitution.risk_bucket,
	        detail.riskBucket,
	        detail.risk_bucket
	      ]

	      for (let index = 0; index < candidates.length; index += 1) {
	        const value = candidates[index]
	        if (['hard', 'stable', 'safe', 'supplement'].includes(value)) {
	          return value
	        }
	      }

	      return ''
	    },
	    resolveRiskFilterKey(item) {
	      if (this.scoreValue === null || !item) return ''

	      const referenceScore = this.resolveReferenceScore(item)
	      const remoteRiskBucket = this.resolveRemoteRiskBucket(item)
	      if (referenceScore === null) {
	        return remoteRiskBucket || 'supplement'
	      }

	      const userScore = this.scoreValue

	      if (Math.abs(userScore - referenceScore) <= 5) {
	        return 'stable'
	      }

	      if (userScore < referenceScore && referenceScore - userScore <= 15) {
	        return 'hard'
	      }

	      if (userScore > referenceScore + 5) {
	        return 'safe'
	      }

	      return remoteRiskBucket || 'supplement'
	    },
	    mapInstitutionToSchool(item) {
	      const detail = this.detailCache[item.id] || {}
	      const majors = Array.isArray(detail.majors) ? detail.majors : []
	      const majorCount = item.majorCount || majors.length || 0
	      const referenceScore = this.resolveReferenceScore(item)
	      const scoreLineYears = this.resolveScoreLineYears(item)
	      const latestScoreYear = this.resolveLatestScoreYear(item)
	      const scoreGap = this.resolveScoreGap(item, referenceScore)
	      const hasScore = this.scoreValue !== null
	      const strategyTone = hasScore ? this.resolveRiskFilterKey(item) : ''
	      const strategyShortMap = {
	        hard: '冲',
	        stable: '稳',
	        safe: '保',
	        supplement: '补录'
	      }
	      const strategyLabelMap = {
	        hard: '冲刺(有一定风险)',
	        stable: '稳妥',
	        safe: '保底',
	        supplement: '补录'
	      }
	      const majorNames = majors.slice(0, 4).map((major) => {
	        const category = major.majorCategory ? ` · ${major.majorCategory}` : ''
	        return `${major.majorName}${category}`
      })

      if (!majorNames.length) {
        majorNames.push(this.detailLoadingMap[item.id] ? '专业正在加载' : '暂无专业明细')
      }

      return {
        id: item.id,
        raw: item,
        name: item.name,
        badge: badgeFromName(item.name),
        city: item.city || '地区待补充',
        level: item.schoolLevel || '层次待补充',
        nature: normalizeNature(item.ownershipType) || '性质待补充',
	        category: item.schoolType || '类型待补充',
	        matchRate: strategyTone ? strategyShortMap[strategyTone] : `${majorCount}个`,
	        tip: strategyTone ? '建议' : '专业',
	        referenceLabel:
	          referenceScore === null
	            ? '录取分数'
	            : latestScoreYear
	              ? `${latestScoreYear}录取分`
	              : scoreLineYears
	                ? `近${Math.min(scoreLineYears, 3)}年录取均分`
	                : '录取分数',
	        minScore: referenceScore === null ? '暂无真实分数线' : `${this.formatScore(referenceScore)} 分`,
        middleLabel: hasScore ? '分差' : '专业数量',
        middleValue: hasScore
          ? scoreGap === null
            ? '待补充'
            : `${scoreGap > 0 ? '+' : ''}${this.formatScore(scoreGap)} 分`
          : `${majorCount} 个`,
        majorCount,
        strategy: hasScore
          ? (item.strategyLabel || strategyLabelMap[strategyTone] || '补录')
          : '输入分数后查看',
        strategyTone,
        majors: majorNames
      }
    }
  }
}
</script>

<style scoped>
.volunteer-page {
  min-height: 100vh;
  background: #ffffff;
}

.volunteer-banner-wrap {
  padding: 0;
}

.volunteer-banner-swiper {
  width: 100%;
  height: 560rpx;
  border-radius: 0;
  overflow: hidden;
  background: #efe7ff;
  box-shadow: none;
}

.volunteer-banner-item {
  overflow: hidden;
}

.volunteer-banner-image {
  width: 100%;
  height: 100%;
  display: block;
}

.filter-header {
  position: sticky;
  top: 0;
  z-index: 30;
  margin: -72rpx 24rpx 0;
  padding: 28rpx 30rpx 24rpx;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12rpx);
  border-radius: 32rpx;
  box-shadow: 0 16rpx 40rpx rgba(15, 23, 42, 0.08);
}

.row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18rpx;
}

.select-box {
  min-width: 220rpx;
  padding: 18rpx 22rpx;
  border-radius: 20rpx;
  background: #F3E8FF;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.select-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #4C1D95;
}

.arrow-down {
  width: 14rpx;
  height: 14rpx;
  margin-left: 14rpx;
  border-right: 4rpx solid #A78BFA;
  border-bottom: 4rpx solid #A78BFA;
  transform: rotate(45deg) translateY(-4rpx);
}

.arrow-down.small {
  width: 12rpx;
  height: 12rpx;
  border-width: 3rpx;
}

.score-input-shell {
  min-width: 220rpx;
  padding: 0 20rpx;
  height: 72rpx;
  border-radius: 20rpx;
  background: #F3E8FF;
  display: flex;
  align-items: center;
  gap: 10rpx;
  box-sizing: border-box;
}

.score-input {
  flex: 1;
  min-width: 0;
  height: 72rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #6D28D9;
}

.score-unit {
  flex-shrink: 0;
  font-size: 24rpx;
  font-weight: 600;
  color: #8B5CF6;
}

.search-row {
  display: flex;
  gap: 12rpx;
  margin-bottom: 18rpx;
}

.search-input {
  flex: 1;
  height: 72rpx;
  padding: 0 18rpx;
  border-radius: 16rpx;
  background: #fbf7ff;
  border: 1rpx solid #f0e5ff;
  box-sizing: border-box;
  font-size: 24rpx;
  color: #1f2937;
}

.input-placeholder {
  color: #A78BFA;
}

.search-button {
  width: 108rpx;
  height: 72rpx;
  border-radius: 16rpx;
  background: #7C3AED;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 600;
  box-shadow: 0 8rpx 20rpx rgba(139, 92, 246, 0.25);
}

.row-basic {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 18rpx;
}

.row-basic picker {
  flex: 1;
  min-width: 0;
}

.basic-tag {
  padding: 14rpx 10rpx;
  border-radius: 16rpx;
  background: #f5edff;
  text-align: center;
  font-size: 24rpx;
  color: #6D28D9;
}

.basic-tag text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-risk {
  display: flex;
  gap: 12rpx;
  margin-bottom: 18rpx;
}

.risk-pill {
  flex: 1;
  min-width: 0;
  height: 68rpx;
  border-radius: 999rpx;
  background: #f5f0ff;
  border: 1rpx solid #ede1ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 600;
  color: #7C3AED;
  transition: all 0.2s ease;
}

.risk-pill-active {
  box-shadow: 0 10rpx 24rpx rgba(124, 58, 237, 0.16);
  transform: translateY(-2rpx);
}

.risk-pill-disabled {
  opacity: 0.52;
}

.risk-pill-stable.risk-pill-active {
  background: #ECFDF5;
  border-color: #A7F3D0;
  color: #047857;
}

.risk-pill-hard.risk-pill-active {
  background: #FFF7ED;
  border-color: #FED7AA;
  color: #C2410C;
}

.risk-pill-safe.risk-pill-active {
  background: #EFF6FF;
  border-color: #BFDBFE;
  color: #1D4ED8;
}

.risk-pill-supplement.risk-pill-active {
  background: #FFF1F2;
  border-color: #FECDD3;
  color: #BE123C;
}

.row-type {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.summary-strip {
  flex: 1;
  min-width: 0;
  padding: 16rpx 20rpx;
  border-radius: 16rpx;
  background: #faf5ff;
  color: #7c3aed;
  font-size: 22rpx;
  line-height: 1.5;
}

.reset-button {
  width: 112rpx;
  flex-shrink: 0;
  padding: 16rpx 0;
  border-radius: 16rpx;
  background: #F5EDFF;
  color: #6D28D9;
  font-size: 24rpx;
  font-weight: 600;
  text-align: center;
}

.result-container {
  padding: 20rpx 24rpx calc(180rpx + env(safe-area-inset-bottom));
}

.school-list {
  display: flex;
  flex-direction: column;
  gap: 22rpx;
}

.state-box {
  min-height: 240rpx;
  border-radius: 24rpx;
  background: linear-gradient(180deg, #ffffff, #fbf7ff);
  border: 1rpx solid #f3e8ff;
  color: #7C6F95;
  font-size: 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 14rpx 32rpx rgba(124, 58, 237, 0.06);
}

.state-box.error {
  color: #dc2626;
  border-color: #fecaca;
  background: linear-gradient(180deg, #ffffff, #fff5f5);
}

.state-action {
  margin-top: 24rpx;
  padding: 16rpx 28rpx;
  border-radius: 16rpx;
  background: linear-gradient(135deg, #8B5CF6, #7C3AED);
  color: #ffffff;
  font-size: 24rpx;
  font-weight: 600;
  box-shadow: 0 8rpx 20rpx rgba(139, 92, 246, 0.2);
}

.load-more {
  margin-top: 8rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background: #EDE9FE;
  color: #6D28D9;
  font-size: 28rpx;
  font-weight: 600;
  text-align: center;
  box-shadow: 0 14rpx 32rpx rgba(124, 58, 237, 0.08);
}
</style>
