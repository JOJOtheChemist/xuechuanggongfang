import { DEFAULT_AGENT_ID } from './chat-auth.js'

const GAOKAO_CONSULTANT_AVATAR_URL = '/subpackages/ai-chat/static/gaokao-consultant-avatar.png'
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
	'我这个分数能报哪样学校',
	'帮我按冲稳保搭一下志愿',
	'云南这几所学校到底怎么比',
	'这个专业以后好不好就业',
	'春季高考和职教高考怎么选',
	'征集志愿还能不能捡漏',
	'位次和分数到底该先看哪个',
	'服从调剂到底要不要勾',
	'怕滑档的话志愿顺序怎么排',
	'公办和民办学校应该怎么选',
	'想留在云南读书怎么筛学校',
	'医学类专业报考要注意哪些坑',
	'师范类学校和综合大学怎么比',
	'家长最容易忽略的填报风险有哪些',
	'专科和本科志愿能不能一起规划',
	'如果分数刚压线应该怎么报更稳',
	'热门专业是不是都不适合冲',
	'录取概率怎么看才不容易误判'
]

const AGENT_UI_ID_ALIASES = {
	'xiaochunlu-campus-startup-mentor': 'xiaochunlu-ai-v2'
}

const AGENT_UI_CONFIGS = {
	[DEFAULT_AGENT_ID]: {
		assistantName: '云南志愿填报顾问',
		assistantRole: '高考志愿顾问',
		assistantAvatarUrl: GAOKAO_CONSULTANT_AVATAR_URL,
		introQuickPrompts: GAOKAO_GUESS_PROMPT_POOL,
		introSuggestionPrompts: [
			'冲稳保怎么搭',
			'这个分数报哪里',
			'云南院校怎么比',
			'专业方向怎么选'
		],
		quickPrompts: [
			'我这个分数能报哪样学校',
			'帮我按冲稳保搭一下志愿',
			'云南这几所学校到底怎么比'
		],
		composerPlaceholder: '直接输入分数、位次、科类、城市或专业方向'
	},
	'xiaochunlu-ai-v2': {
		assistantName: '小春鹿',
		assistantRole: '校园成长顾问',
		assistantAvatarUrl: XIAOCHUNLU_AVATAR_URL,
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
