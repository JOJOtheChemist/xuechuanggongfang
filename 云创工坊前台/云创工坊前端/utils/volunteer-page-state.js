import {
  VOLUNTEER_TOP_FILTER_OPTIONS,
  createDefaultUnlockStatus
} from './volunteer-local-admission'

function withOptionKeys(items, prefix) {
  return (Array.isArray(items) ? items : []).map((item, index) => {
    const source = item && typeof item === 'object' ? item : {}
    const rawKey =
      source.value ||
      source.examType ||
      source.majorCategory ||
      source.label ||
      `${prefix}-${index}`

    return Object.assign({}, source, {
      key: `${prefix}-${rawKey}-${index}`
    })
  })
}

const cityOptions = [
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
]

const levelOptions = [
  { label: '全部层次', value: '' },
  { label: '本科', value: '本科' },
  { label: '专科', value: '专科' }
]

const natureOptions = [
  { label: '全部性质', value: '' },
  { label: '公办', value: '公办' },
  { label: '民办', value: '民办' }
]

const schoolTypeOptions = [
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
]

const riskFilterOptions = [
  { label: '较难', value: 'hard' },
  { label: '较稳', value: 'stable' },
  { label: '兜底', value: 'safe' },
  { label: '补录', value: 'supplement' }
]

const topFilterOptions = withOptionKeys(VOLUNTEER_TOP_FILTER_OPTIONS, 'top')
const keyedCityOptions = withOptionKeys(cityOptions, 'city')
const keyedLevelOptions = withOptionKeys(levelOptions, 'level')
const keyedNatureOptions = withOptionKeys(natureOptions, 'nature')
const keyedSchoolTypeOptions = withOptionKeys(schoolTypeOptions, 'school-type')
const keyedRiskFilterOptions = withOptionKeys(riskFilterOptions, 'risk')

export function createVolunteerPageData() {
  return {
    loading: false,
    loadingMore: false,
    errorText: '',
    scoreInput: '',
    appliedScoreInput: '',
    keyword: '',
    appliedKeyword: '',
    majorKeyword: '',
    appliedMajorKeyword: '',
    userLoggedIn: false,
    currentUserId: '',
    currentUserNickname: '',
    currentUserAvatar: '',
    admissionUnlockStatus: createDefaultUnlockStatus(),
    unlockStatusLoading: false,
    scoreSaving: false,
    queryCountConsuming: false,
    unlockPaymentProcessing: false,
    lastUnlockStatusLoadedAt: 0,
    institutions: [],
    institutionBaseCacheKey: '',
    institutionLoadProgressText: '',
    lastInstitutionRequestKey: '',
    lastInstitutionRequestAt: 0,
    activeInstitutionRequestKey: '',
    activeInstitutionRequestPromise: null,
    institutionReloadTimer: null,
    institutionRequestSeq: 0,
    unlockStatusRequestPromise: null,
    skipNextShowRefresh: false,
    debugForceRemote: false,
    admissionDebugPayload: null,
    bannerImages: [],
    guestPreviewInstitutions: [],
    guestPreviewLoading: false,
    guestPreviewRequestPromise: null,
    shareInviteSheetVisible: false,
    page: 0,
    total: 0,
    activeDropdownKey: '',
    selectedTopFilterIndex: 0,
    appliedTopFilterIndex: 0,
    selectedCityIndex: 0,
    appliedCityIndex: 0,
    selectedLevelIndex: 0,
    appliedLevelIndex: 0,
    selectedNatureIndex: 0,
    appliedNatureIndex: 0,
    selectedSchoolTypeIndex: 0,
    appliedSchoolTypeIndex: 0,
    selectedRiskFilterKey: '',
    appliedRiskFilterKey: '',
    localRemainingQueryCount: null,
    localQueryUnlimited: false,
    topFilterOptions,
    cityOptions: keyedCityOptions,
    levelOptions: keyedLevelOptions,
    natureOptions: keyedNatureOptions,
    schoolTypeOptions: keyedSchoolTypeOptions,
    riskFilterOptions: keyedRiskFilterOptions
  }
}
