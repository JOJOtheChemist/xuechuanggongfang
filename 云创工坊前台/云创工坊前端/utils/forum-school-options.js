export const DEFAULT_HOME_SCHOOL = '云南大学'
export const MYSTERY_SCHOOL = '神秘学校'

export const FORUM_ALLOWED_SCHOOLS = [
  '云南大学',
  '昆明理工大学',
  '云南农业大学',
  '西南林业大学',
  '昆明医科大学',
  '大理大学',
  '云南中医药大学',
  '云南师范大学',
  '昭通学院',
  '曲靖师范学院',
  '普洱学院',
  '保山学院',
  '红河学院',
  '云南财经大学',
  '云南艺术学院',
  '云南民族大学',
  '玉溪师范学院',
  '楚雄师范学院',
  '云南警官学院',
  '昆明学院',
  '文山学院',
  '滇西科技师范学院',
  '滇西应用技术大学',
  '丽江师范学院',
  '曲靖健康医学院',
  '昆明冶金职业大学',
  '云南经济管理学院',
  '滇池学院',
  '丽江文化旅游学院',
  '昆明理工大学津桥学院',
  '昆明城市学院',
  '昆明文理学院',
  '昆明医科大学海源学院',
  '昆明传媒学院',
  '昆明科技职业大学',
  '昆明冶金高等专科学校',
  '云南国土资源职业学院',
  '云南交通职业技术学院',
  '昆明工业职业技术学院',
  '云南农业职业技术学院',
  '云南司法警官职业学院',
  '云南文化艺术职业学院',
  '云南体育运动职业技术学院',
  '西双版纳职业技术学院',
  '玉溪农业职业技术学院',
  '云南能源职业技术学院',
  '云南国防工业职业技术学院',
  '云南机电职业技术学院',
  '云南林业职业技术学院',
  '曲靖医学高等专科学校',
  '楚雄医药高等专科学校',
  '保山中医药高等专科学校',
  '丽江师范高等专科学校',
  '德宏师范高等专科学校',
  '德宏职业学院',
  '云南旅游职业学院',
  '红河卫生职业学院',
  '云南财经职业学院',
  '昆明铁道职业技术学院',
  '昭通卫生职业学院',
  '大理护理职业学院',
  '云南水利水电职业学院',
  '云南轻纺职业学院',
  '云南特殊教育职业学院',
  '云南工贸职业技术学院',
  '云南交通运输职业学院',
  '昆明幼儿师范高等专科学校',
  '曲靖职业技术学院',
  '红河职业技术学院',
  '玉溪职业技术学院',
  '保山职业学院',
  '昭通职业学院',
  '文山职业技术学院',
  '丽江职业技术学院',
  '香格里拉职业学院',
  '怒江职业技术学院',
  '临沧职业学院',
  '云南工业信息职业学院',
  '大理农林职业技术学院',
  '公安消防部队高等专科学校',
  '云南科技信息职业学院',
  '昆明艺术职业学院',
  '云南城市建设职业学院',
  '云南工程职业学院',
  '云南新兴职业学院',
  '云南经贸外事职业学院',
  '云南三鑫职业技术学院',
  '云南商务职业学院',
  '昆明卫生职业学院',
  '云南医药健康职业学院',
  '云南理工职业学院',
  '昆明航空职业学院'
]

const ALLOWED_SCHOOL_SET = new Set(FORUM_ALLOWED_SCHOOLS)

export function normalizeForumSchoolName(value) {
  const safe = String(value || '').trim()
  if (!safe) return ''
  if (safe.toLowerCase() === 'campus' || safe === '其他') return MYSTERY_SCHOOL
  return safe
}

export function sanitizeForumSchoolForList(value, fallback = '') {
  const school = normalizeForumSchoolName(value)
  if (school === MYSTERY_SCHOOL) return MYSTERY_SCHOOL
  if (ALLOWED_SCHOOL_SET.has(school)) return school
  return fallback
}

export function sanitizeForumSchoolSelection(value, fallback = '') {
  const school = normalizeForumSchoolName(value)
  if (ALLOWED_SCHOOL_SET.has(school)) return school
  return fallback
}

export function getForumSchoolOptions() {
  return FORUM_ALLOWED_SCHOOLS.slice()
}
