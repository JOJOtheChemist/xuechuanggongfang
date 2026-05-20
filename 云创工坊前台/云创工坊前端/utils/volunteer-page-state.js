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
  { label: '云南省', value: '云南省' },
  { label: '河北省', value: '河北省' },
  { label: '山西省', value: '山西省' },
  { label: '辽宁省', value: '辽宁省' },
  { label: '吉林省', value: '吉林省' },
  { label: '黑龙江省', value: '黑龙江省' },
  { label: '江苏省', value: '江苏省' },
  { label: '浙江省', value: '浙江省' },
  { label: '安徽省', value: '安徽省' },
  { label: '福建省', value: '福建省' },
  { label: '江西省', value: '江西省' },
  { label: '山东省', value: '山东省' },
  { label: '河南省', value: '河南省' },
  { label: '湖北省', value: '湖北省' },
  { label: '湖南省', value: '湖南省' },
  { label: '广东省', value: '广东省' },
  { label: '海南省', value: '海南省' },
  { label: '四川省', value: '四川省' },
  { label: '贵州省', value: '贵州省' },
  { label: '陕西省', value: '陕西省' },
  { label: '甘肃省', value: '甘肃省' },
  { label: '青海省', value: '青海省' },
  { label: '台湾省', value: '台湾省' },
  { label: '内蒙古自治区', value: '内蒙古自治区' },
  { label: '广西壮族自治区', value: '广西壮族自治区' },
  { label: '西藏自治区', value: '西藏自治区' },
  { label: '宁夏回族自治区', value: '宁夏回族自治区' },
  { label: '新疆维吾尔自治区', value: '新疆维吾尔自治区' }
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
    cityOptions: withOptionKeys(cityOptions, 'city'),
    levelOptions: keyedLevelOptions,
    natureOptions: keyedNatureOptions,
    schoolTypeOptions: keyedSchoolTypeOptions,
    riskFilterOptions: keyedRiskFilterOptions
  }
}
