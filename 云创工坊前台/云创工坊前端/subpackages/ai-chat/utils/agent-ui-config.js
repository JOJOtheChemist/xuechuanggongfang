import { DEFAULT_AGENT_ID } from './chat-auth.js'
import gaokaoConsultantAvatarUrl from '../static/gaokao-consultant-avatar.png'

const GAOKAO_CONSULTANT_AVATAR_URL = gaokaoConsultantAvatarUrl
const XIAOCHUNLU_AVATAR_URL =
	'https://xuechuang.xyz/oss/share-assets/xuechuang/ai-chat/avatars/xiaochunlu-chat-avatar-v1.png'
const XIAOCHUNLU_TOPIC_IMAGE_ROOT =
	'https://xuechuang.xyz/oss/share-assets/xuechuang/ai-chat/topics'
const XIAOCHUNLU_TOPIC_IMAGE_URLS = {
	article: `${XIAOCHUNLU_TOPIC_IMAGE_ROOT}/xiaochunlu-topic-academic-planning-v1.webp`,
	business: `${XIAOCHUNLU_TOPIC_IMAGE_ROOT}/xiaochunlu-topic-employment-guidance-v1.webp`,
	campusAmbassador: `${XIAOCHUNLU_TOPIC_IMAGE_ROOT}/xiaochunlu-topic-entrepreneurship-practice-v1.webp`
}
const XIAOCHUNLU_TOPIC_PROMPTS = {
	article: {
		guessPrompts: [
			'文章板块里现在有什么可以先看？',
			'如果我是新手，先看哪些文章更合适？',
			'你先按我的情况推荐几篇文章',
			'我时间不多，先看哪类资料最值？',
			'文章里哪些内容更适合先入门？',
			'你先帮我从文章里排个优先级'
		],
		suggestionPrompts: [
			'先推荐文章',
			'新手先看哪些',
			'时间少看什么',
			'先排个优先级'
		]
	},
	business: {
		guessPrompts: [
			'业务板块里现在有哪些入口？',
			'如果我想开始做业务，第一步该点哪里？',
			'你先按新手视角给我理一下业务入口',
			'我没团队没经验，业务这边该怎么开始？',
			'哪些业务更适合我现在去做？',
			'你先帮我判断我适合先看哪个业务'
		],
		suggestionPrompts: [
			'先看业务入口',
			'新手怎么开始',
			'适合做哪个业务',
			'先帮我理一遍'
		]
	},
	campusAmbassador: {
		guessPrompts: [
			'19.9 的校园大使到底是干什么的？',
			'我想加入校园大使，具体怎么进？',
			'校园大使和普通看文章有什么区别？',
			'如果我想靠分享和邀请开始，先做哪一步？',
			'校园大使适不适合新手先试一下？',
			'你先帮我判断要不要开 19.9 校园大使'
		],
		suggestionPrompts: [
			'校园大使怎么进',
			'19.9 值不值得',
			'分享邀请怎么做',
			'先帮我判断下'
		]
	}
}
const GAOKAO_GUESS_PROMPT_POOL = [
	'我云南物理类，520分，想学计算机，先帮我按冲稳保筛学校。',
	'我家孩子历史类，485分，想留昆明，师范和汉语言哪个好报？',
	'临床医学和口腔医学到底怎么选？普通家庭更适合哪个？',
	'如果只看就业，云南本地读书和去省外读书怎么选？',
	'云南物理类，498分，想走电气或自动化，公办本科先怎么筛？',
	'历史类女生，502分，想考编，先看师范院校还是先看城市？',
	'家里预算一般，想学医学，护理、临床、口腔到底怎么排优先级？',
	'分数刚过一本线，想冲省外双非，值不值得赌一把？',
	'以后想进国企，云南读工科和去外省读工科差别大不大？',
	'不想被调剂到天坑专业，志愿顺序到底该怎么排？',
	'孩子想学法学，但只看就业的话，这专业到底值不值得报？',
	'专科想走就业，云南本地有哪些专业比硬冲本科更稳？'
]

const AGENT_UI_ID_ALIASES = {
	'xiaochunlu-campus-startup-mentor': 'xiaochunlu-ai-v2',
	'yunnan-gaokao-volunteer-consultant': DEFAULT_AGENT_ID,
	'yunnan-gaokao-volunteer-consultant-v2': DEFAULT_AGENT_ID,
	'yunnan-gaokao-volunteer-consultant-v3-2': DEFAULT_AGENT_ID,
	'yunnan-gaokao-volunteer-consultant-v4': DEFAULT_AGENT_ID,
	'yunnan-gaokao-volunteer-consultant-v5': DEFAULT_AGENT_ID,
	'yunnan-gaokao-volunteer-consultant-v6': DEFAULT_AGENT_ID,
	'yunnan-gaokao-volunteer-consultant-v7': DEFAULT_AGENT_ID,
	'yunnan-zhangxuefeng-volunteer-consultant-v3': DEFAULT_AGENT_ID
}

const AGENT_UI_CONFIGS = {
	[DEFAULT_AGENT_ID]: {
		assistantName: '云南志愿填报老师 雪峰哥',
		assistantRole: '高考志愿顾问',
		assistantAvatarUrl: GAOKAO_CONSULTANT_AVATAR_URL,
		transportMode: 'sync',
		introQuickPrompts: GAOKAO_GUESS_PROMPT_POOL,
		introSuggestionPrompts: [
			'520分冲稳保',
			'昆明学校怎么选',
			'医学专业怎么比',
			'省内省外怎么选'
		],
		quickPrompts: [
			'我云南物理类，520分，想学计算机，先帮我按冲稳保筛学校。',
			'我家孩子历史类，485分，想留昆明，师范和汉语言哪个好报？',
			'临床医学和口腔医学到底怎么选？普通家庭更适合哪个？'
		],
		composerPlaceholder: '直接输入分数、位次、科类、城市或专业方向'
	},
	'xiaochunlu-ai-v2': {
		assistantName: '小春鹿',
		assistantRole: '校园成长顾问',
		assistantAvatarUrl: XIAOCHUNLU_AVATAR_URL,
		transportMode: 'stream',
		introTopics: [
			{
				topicKey: 'article',
				label: '文章',
				action: '你先帮我推荐文章',
				tone: 'blue',
				badgeText: '文',
				imageUrl: XIAOCHUNLU_TOPIC_IMAGE_URLS.article,
				guessPrompts: XIAOCHUNLU_TOPIC_PROMPTS.article.guessPrompts,
				suggestionPrompts: XIAOCHUNLU_TOPIC_PROMPTS.article.suggestionPrompts
			},
			{
				topicKey: 'business',
				label: '业务',
				action: '你先带我看看业务入口',
				tone: 'green',
				badgeText: '业',
				imageUrl: XIAOCHUNLU_TOPIC_IMAGE_URLS.business,
				guessPrompts: XIAOCHUNLU_TOPIC_PROMPTS.business.guessPrompts,
				suggestionPrompts: XIAOCHUNLU_TOPIC_PROMPTS.business.suggestionPrompts
			},
			{
				topicKey: 'campus-ambassador',
				label: '校园大使',
				action: '你先给我讲讲 19.9 校园大使',
				tone: 'pink',
				badgeText: '使',
				imageUrl: XIAOCHUNLU_TOPIC_IMAGE_URLS.campusAmbassador,
				guessPrompts: XIAOCHUNLU_TOPIC_PROMPTS.campusAmbassador.guessPrompts,
				suggestionPrompts: XIAOCHUNLU_TOPIC_PROMPTS.campusAmbassador.suggestionPrompts
			}
		],
		quickPrompts: [
			'你先帮我推荐文章',
			'你先带我看看业务入口',
			'你先给我讲讲 19.9 校园大使'
		],
		introQuickPrompts: [
			...XIAOCHUNLU_TOPIC_PROMPTS.article.guessPrompts
		],
		introSuggestionPrompts: [
			...XIAOCHUNLU_TOPIC_PROMPTS.article.suggestionPrompts
		],
		composerPlaceholder: '问我文章、业务或 19.9 校园大使'
	}
}

export function getAgentUiConfig(agentId) {
	const normalizedAgentId = String(agentId || '').trim()
	const resolvedAgentId = AGENT_UI_ID_ALIASES[normalizedAgentId] || normalizedAgentId
	return AGENT_UI_CONFIGS[resolvedAgentId] || AGENT_UI_CONFIGS[DEFAULT_AGENT_ID]
}
