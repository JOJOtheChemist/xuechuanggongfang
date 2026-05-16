import { getApiBaseUrl } from '@/utils/api-switch.js'
import {
	CHAT_PATH,
	buildRequestError,
	createSessionId,
	extractDisplayUserInfo,
	extractPayloadMessage,
	getCurrentAuthToken,
	getDailyNoticeKey,
	getStoredRefreshToken,
	getStoredTokenByPriority,
	getStoredValue,
	getResponsePayload,
	getResponseStatusCode,
	hasAuthFailure,
	hasPowerFailure,
	hasServiceFailure,
	isJwtLikeToken,
	isSuccessPayload,
	maskToken,
	normalizeText,
	nowTimeText,
	requestJsonWithRefresh,
	requestRaw,
	resolveActiveToken,
	setStoredValue,
	unwrapPayloadData
} from './chat-auth.js'

function clipInlineText(value, limit = 120) {
	const text = normalizeText(value, '')
	if (!text) return ''
	return text.length > limit ? `${text.slice(0, Math.max(0, limit - 1)).trim()}…` : text
}

const TEAM_BROWSER_ROUTE = '/pages/extra/team-browser'
const TEAM_DYNAMICS_ROUTE = '/pages/extra/team-dynamics'
const GOAL_SETTING_ROUTE = '/pages/extra/goal-setting'
const MAX_VISIBLE_CHOICE_CARDS = 2
const MAX_VISIBLE_GOAL_CARDS = 1
const MAX_VISIBLE_ARTICLE_CARDS = 3
const MAX_VISIBLE_MEMBERSHIP_CARDS = 2
const MAX_VISIBLE_SCHOOL_CARDS = 5

const MEMBERSHIP_CARD_PRESETS = {
	cobuilder: {
		title: '校园大使入口',
		badgeByIntent: {
			purchase: '19.9 入口',
			upgrade: '升级建议',
			renew: '续费提醒'
		},
		pillText: '创业路径',
		benefitsByIntent: {
			purchase: ['加入团队后可继续看伙伴动态与开单情况', '可生成团队邀请二维码，开始拉新推广', '适合从创业入口进入实操路径'],
			upgrade: ['补上团队身份后，很多创业动作会更顺', '后续可继续看团队协同与邀请数据', '更适合往创业实操和推广路径走'],
			renew: ['续费后继续保留校园大使身份', '继续使用团队协同和邀请相关权益', '继续衔接团队动态和成长路径']
		},
		buttonTextByIntent: {
			purchase: '去加入团队',
			upgrade: '去加入团队',
			renew: '去查看团队'
		}
	},
	student: {
		title: '学习成长入口',
		badgeByIntent: {
			purchase: '学习入口',
			upgrade: '推荐查看',
			renew: '继续学习'
		},
		pillText: '学习路径',
		benefitsByIntent: {
			purchase: ['适合先了解主菜单学习与创业板块', '看完资料后再决定是否加入团队', '先把方向、目标和节奏定清楚'],
			upgrade: ['先补齐学习基础，再决定下一步', '适合先把个人目标设起来', '更容易判断自己适合哪条路径'],
			renew: ['继续保留当前学习节奏', '继续补齐目标与资料查看', '再决定是否进入更深的实操路径']
		},
		buttonTextByIntent: {
			purchase: '去设定目标',
			upgrade: '去设定目标',
			renew: '去设定目标'
		}
	}
}

function normalizeMembershipCardType(value) {
	const normalized = normalizeText(value, '').toLowerCase()
	if (!normalized) return ''
	if (
		normalized === 'student' ||
		normalized === 'member' ||
		normalized.includes('学生证') ||
		normalized.includes('会员')
	) {
		return 'student'
	}
	if (
		normalized === 'cobuilder' ||
		normalized === 'co_builder' ||
		normalized.includes('共建者') ||
		normalized.includes('合伙人') ||
		normalized.includes('builder')
	) {
		return 'cobuilder'
	}
	return ''
}

function normalizeMembershipCardIntent(value) {
	const normalized = normalizeText(value, '').toLowerCase()
	if (!normalized) return 'purchase'
	if (normalized === 'renew' || normalized === 'renewal' || normalized.includes('续费')) return 'renew'
	if (normalized === 'upgrade' || normalized.includes('升级')) return 'upgrade'
	return 'purchase'
}

function buildMembershipCardRoute(cardType, intent) {
	if (cardType === 'student') {
		return GOAL_SETTING_ROUTE
	}
	if (intent === 'renew') {
		return '/pages/extra/team-center'
	}
	return TEAM_BROWSER_ROUTE
}

function normalizeChoiceOptionTone(value, index = 0) {
	const normalized = normalizeText(value, '').toLowerCase()
	if (normalized === 'primary' || normalized === 'outline' || normalized === 'neutral') {
		return normalized
	}
	if (index === 0) return 'primary'
	if (index === 1) return 'outline'
	return 'neutral'
}

function normalizeChoiceOptions(options = []) {
	if (!Array.isArray(options)) return []
	return options
		.map((item, index) => {
			if (typeof item === 'string') {
				const value = normalizeText(item, '')
				if (!value) return null
				return {
					label: value,
					value,
					kind: '',
					meta: null,
					tone: normalizeChoiceOptionTone('', index)
				}
			}

			const label = normalizeText(item && (item.label || item.text || item.value), '')
			const value = normalizeText(item && (item.value || item.label || item.text), '')
			if (!label || !value) return null

			return {
				label,
				value,
				kind: normalizeText(item && item.kind, '').toLowerCase(),
				meta: item && item.meta && typeof item.meta === 'object' ? { ...item.meta } : null,
				tone: normalizeChoiceOptionTone(item && item.tone, index)
			}
		})
		.filter(Boolean)
}

function normalizeSchoolCards(schoolCards) {
	if (!Array.isArray(schoolCards)) return []
	return schoolCards
		.map((item, index) => {
			const institutionId = Number(item && item.institutionId)
			const title = normalizeText(item && (item.title || item.name), '')
			if (!Number.isFinite(institutionId) || institutionId <= 0 || !title) return null

			return {
				id: normalizeText(item && item.id, `school-card-${institutionId}-${index}`),
				institutionId,
				title,
				summary: clipInlineText(item && item.summary, 120),
				city: normalizeText(item && item.city, ''),
				schoolLevel: normalizeText(item && item.schoolLevel, ''),
				ownershipType: normalizeText(item && item.ownershipType, ''),
				schoolType: normalizeText(item && item.schoolType, ''),
				riskBucket: normalizeText(item && item.riskBucket, ''),
				strategyLabel: normalizeText(item && item.strategyLabel, ''),
				referenceScore: Number.isFinite(Number(item && item.referenceScore)) ? Number(item.referenceScore) : null,
				scoreGap: Number.isFinite(Number(item && item.scoreGap)) ? Number(item.scoreGap) : null,
				majorCount: Number(item && item.majorCount) || 0,
				majorPreview: Array.isArray(item && item.majorPreview)
					? item.majorPreview.map((major) => normalizeText(major, '')).filter(Boolean).slice(0, 3)
					: [],
				logoUrl: normalizeText(item && item.logoUrl, ''),
				coverImageUrl: normalizeText(item && item.coverImageUrl, ''),
				examType: normalizeText(item && item.examType, ''),
				subjectTrack: normalizeText(item && item.subjectTrack, ''),
				majorCategory: normalizeText(item && item.majorCategory, ''),
				riskBucketParam: normalizeText(item && item.riskBucketParam, ''),
				preview: !!(item && item.preview)
			}
		})
		.filter(Boolean)
		.slice(0, MAX_VISIBLE_SCHOOL_CARDS)
}

function normalizeToolCalls(toolCalls) {
	if (!Array.isArray(toolCalls)) return []
	return toolCalls
		.map((tool, index) => {
			const name = normalizeText(tool && tool.name, '')
			const label = normalizeText(tool && tool.label, name || '工具')
			const params = tool && Object.prototype.hasOwnProperty.call(tool, 'params')
				? tool.params
				: normalizeText(tool && tool.input, '')
			const inputPreview = clipInlineText(
				tool && Object.prototype.hasOwnProperty.call(tool, 'input')
					? tool.input
					: params,
				120
			)
			const summary = clipInlineText(tool && tool.summary, 160)
			const durationMs = Number(tool && tool.durationMs)
			const hasParams = typeof (tool && tool.hasParams) === 'boolean'
				? tool.hasParams
				: (
					typeof params === 'string'
						? !!params.trim()
						: Array.isArray(params)
							? params.length > 0
							: !!(params && typeof params === 'object')
				)

			return {
				id: normalizeText(tool && tool.id, `${name || 'tool'}-${index}-${Date.now()}`),
				name,
				label,
				params,
				hasParams,
				inputPreview,
				summary,
				state: normalizeText(tool && tool.state, ''),
				durationText: Number.isFinite(durationMs) && durationMs >= 0 ? `${durationMs}ms` : ''
			}
		})
		.filter((tool) => tool.name || tool.summary || tool.inputPreview || tool.hasParams)
}

function normalizeBusinessCards(businessCards = []) {
	if (!Array.isArray(businessCards)) return []
	return businessCards
		.map((item, index) => {
			const businessId = normalizeText(item && (item.businessId || item.business_id || item.id), '')
			const title = clipInlineText(item && item.title, 28)
			if (!businessId || !title) return null

			return {
				id: normalizeText(item && item.id, `business-card-${index}-${Date.now()}`),
				businessId,
				title,
				summary: clipInlineText(
					item && (item.recommendationReason || item.questionRelation || item.summary || item.description),
					88
				),
				categoryType: normalizeText(item && (item.categoryType || item.category_type), ''),
				tag: normalizeText(item && item.tag, ''),
				hasArticles: !!(item && (item.hasArticles || item.has_articles)),
				hasSignup: item && Object.prototype.hasOwnProperty.call(item, 'hasSignup')
					? !!item.hasSignup
					: true
			}
		})
		.filter(Boolean)
		.slice(0, 3)
}

function normalizeGoalCards(goalCards = []) {
	if (!Array.isArray(goalCards)) return []
	return goalCards
		.map((item, index) => {
			const routeUrl = normalizeText(item && (item.routeUrl || item.url), '')
			const title = clipInlineText(item && item.title, 24)
			if (!routeUrl || !title) return null

			return {
				id: normalizeText(item && item.id, `goal-card-${index}-${Date.now()}`),
				title,
				summary: clipInlineText(item && item.summary, 88),
				routeUrl,
				buttonText: normalizeText(item && item.buttonText, '去设目标')
			}
		})
		.filter(Boolean)
		.slice(0, MAX_VISIBLE_GOAL_CARDS)
}

function normalizeArticleCards(articleCards = []) {
	if (!Array.isArray(articleCards)) return []
	return articleCards
		.map((item, index) => {
			const articleId = normalizeText(item && (item.articleId || item.article_id || item.id), '')
			const title = clipInlineText(item && item.title, 40)
			if (!articleId || !title) return null

			const tags = Array.isArray(item && item.tags)
				? item.tags.map((tag) => normalizeText(tag, '')).filter(Boolean).slice(0, 3)
				: []
			const summary = clipInlineText(
				item && (item.recommendationReason || item.questionRelation || item.summary),
				88
			)

			return {
				id: normalizeText(item && item.id, `article-card-${index}-${Date.now()}`),
				articleId,
				title,
				summary,
				categoryTitle: normalizeText(item && (item.categoryTitle || item.category_title), ''),
				tags,
				pricePoints: Number(item && (item.pricePoints ?? item.price_points ?? 0)) || 0,
				unlocked: Boolean(item && item.unlocked)
			}
		})
		.filter(Boolean)
		.slice(0, MAX_VISIBLE_ARTICLE_CARDS)
}

export function createDefaultDebugInfo() {
	return {
		localLoginState: '未知',
		aiAuthState: '未知',
		tokenSource: '-',
		tokenIsJwt: false,
		tokenPreview: '-',
		refreshTokenState: '-',
		userId: '-',
		nickname: '-',
		lastAction: '初始化',
		lastStatusCode: '-',
		lastMessage: '-',
		updatedAt: '-'
	}
}

export const chatPageMethods = {
	refreshDebugPanel(reason = 'manual') {
		const tokenEntry = getStoredTokenByPriority()
		const refreshToken = getStoredRefreshToken()
		const userInfo = extractDisplayUserInfo()
		const hasLocalLogin = !!tokenEntry.value
		const tokenIsJwt = isJwtLikeToken(tokenEntry.value)
		const localLoginState = !hasLocalLogin
			? '未登录(本地无 token)'
			: tokenIsJwt
				? '已登录(本地缓存存在)'
				: '已登录(本地 token 不是 AI JWT)'

		this.debugInfo = Object.assign({}, this.debugInfo, {
			localLoginState,
			tokenSource: tokenEntry.key,
			tokenIsJwt,
			tokenPreview: maskToken(tokenEntry.value),
			refreshTokenState: refreshToken ? '有' : '无',
			userId: userInfo.userId || '-',
			nickname: userInfo.nickname || '-',
			lastAction: reason || this.debugInfo.lastAction,
			updatedAt: nowTimeText()
		})
		this.currentUserName = userInfo.nickname || '我'
		this.currentUserAvatarUrl = userInfo.avatar || ''
	},
	updateDebugRequestState(action, { statusCode = '', payload = null, aiAuthState = '', note = '' } = {}) {
		const message = note || extractPayloadMessage(payload) || this.debugInfo.lastMessage || '-'
		this.refreshDebugPanel(action)
		this.debugInfo = Object.assign({}, this.debugInfo, {
			aiAuthState: aiAuthState || this.debugInfo.aiAuthState || '未知',
			lastStatusCode: statusCode === '' || statusCode === undefined || statusCode === null ? '-' : String(statusCode),
			lastMessage: message || '-',
			updatedAt: nowTimeText()
		})
	},
	async bootstrapPage() {
		await this.syncAccessState()
		await this.loadAgentMeta()
	},
	async syncAccessState() {
		this.refreshDebugPanel('syncAccessState')
		await this.refreshAiPowerBalance({ silent: true, showDailyNotice: true })
	},
	async loadAgentMeta() {
		try {
			const token = await resolveActiveToken()
			const url = `${getApiBaseUrl()}/chat/agents/${encodeURIComponent(this.agentId)}/meta`
			const response = await requestRaw(url, 'GET', null, token)
			const statusCode = getResponseStatusCode(response)
			const payload = getResponsePayload(response)
			const data = unwrapPayloadData(payload)

			if (statusCode === 200 && data) {
				this.updateDebugRequestState('loadAgentMeta', { statusCode, payload, aiAuthState: '通过' })
				this.assistantName = normalizeText(data.assistantName, this.assistantName)
				this.assistantRole = normalizeText(data.assistantRole, this.assistantRole)
				this.assistantAvatarUrl = normalizeText(data.avatarUrl, this.assistantAvatarUrl || '')
				if (Array.isArray(data.quickPrompts) && data.quickPrompts.length) {
					this.quickPrompts = data.quickPrompts
				}
				this.composerPlaceholderOverride = normalizeText(
					data.composerPlaceholder,
					this.composerPlaceholderOverride || ''
				)
				if (!this.showLoginPrompt && !this.showPowerPrompt) {
					this.connectionText = '已就绪'
				}

				const welcome = normalizeText(data.startingText, '')
				if (welcome && !this.messages.length && !this.hideWelcomeMessage) {
					this.messages = [{ id: 'welcome', role: 'assistant', content: welcome }]
					this.scrollToBottom()
				}
				return
			}

			if (hasAuthFailure(statusCode, payload)) {
				this.updateDebugRequestState('loadAgentMeta', { statusCode, payload, aiAuthState: '被拒绝' })
				this.presentLoginPrompt('AI 接口认证未通过，请查看 Debug Panel', { authRejected: true })
			}
		} catch (error) {
			console.warn('[ai-chat] meta load failed', error)
			this.updateDebugRequestState('loadAgentMeta', {
				note: normalizeText(error && (error.message || error.errMsg), 'meta 请求异常'),
				aiAuthState: '异常'
			})
		}

		if (!this.messages.length && !this.hideWelcomeMessage) {
			this.messages = [{ id: 'welcome', role: 'assistant', content: '你好，先直接告诉我你现在最想解决的问题。' }]
			this.scrollToBottom()
		}
	},
	async refreshAiPowerBalance(options = {}) {
		const token = await resolveActiveToken()
		if (!token) {
			this.aiPowerLoading = false
			this.aiPowerRemaining = 0
			this.updateDebugRequestState('refreshAiPowerBalance', {
				aiAuthState: '缺少 token',
				note: '未拿到可用 access token'
			})
			this.presentLoginPrompt('请先登录后再试')
			return null
		}

		this.aiPowerLoading = true
		try {
			const url = `${getApiBaseUrl()}/chat/credit/status`
			const { response, payload, statusCode } = await requestJsonWithRefresh({ url, method: 'GET', token })
			const data = unwrapPayloadData(payload)

			if (statusCode !== 200 || !isSuccessPayload(payload, response)) {
				if (hasAuthFailure(statusCode, payload)) {
					this.updateDebugRequestState('refreshAiPowerBalance', { statusCode, payload, aiAuthState: '被拒绝' })
					this.presentLoginPrompt('AI 接口认证未通过，请查看 Debug Panel', { authRejected: true })
					return null
				}
				throw buildRequestError(payload.error || payload.message || '算力状态获取失败', statusCode, payload.errorCode || payload.code)
			}

			this.updateDebugRequestState('refreshAiPowerBalance', {
				statusCode,
				payload,
				aiAuthState: '通过',
				note: `算力 ${Number(data && (data.remaining ?? data.balance ?? data.computing_power ?? 0)) || 0}`
			})
			const balance = Number(data && (data.remaining ?? data.balance ?? data.computing_power ?? 0))
			this.aiPowerRemaining = Number.isFinite(balance) ? Math.max(0, Math.floor(balance)) : 0
			if (this.aiPowerRemaining > 0) {
				this.clearAccessPrompt()
				this.connectionText = '已就绪'
			} else if (!this.showLoginPrompt) {
				this.chatAccessPromptType = 'power'
				this.connectionText = '算力不足'
			}

			if (options.showDailyNotice && data && (data.grantedNow || data.dailyGrant !== undefined)) {
				this.maybeShowDailyGrantNotice(data)
			}
			return data
		} catch (error) {
			console.warn('[ai-chat] refresh ai power failed:', error)
			if (hasAuthFailure(error.statusCode, error)) {
				this.updateDebugRequestState('refreshAiPowerBalance', {
					statusCode: error.statusCode,
					payload: error,
					aiAuthState: '被拒绝',
					note: normalizeText(error.message, 'AI 接口认证失败')
				})
				this.presentLoginPrompt('AI 接口认证未通过，请查看 Debug Panel', { authRejected: true })
				return null
			}
			this.updateDebugRequestState('refreshAiPowerBalance', {
				statusCode: error.statusCode,
				payload: error,
				aiAuthState: '异常',
				note: normalizeText(error.message, '算力状态获取失败')
			})
			if (!options.silent) this.connectionText = '算力获取失败'
			return null
		} finally {
			this.aiPowerLoading = false
		}
	},
	maybeShowDailyGrantNotice(status = {}) {
		const storageKey = getDailyNoticeKey()
		if (getStoredValue(storageKey)) return
		setStoredValue(storageKey, '1')
		uni.showModal({
			title: '今日算力已到账',
			content: `已获得 ${Number(status.dailyGrant || 10)} 点 AI 算力，当天有效。`,
			showCancel: false,
			confirmText: '知道了'
		})
	},
	presentLoginPrompt(message = '登录状态已失效，请先登录后再试', options = {}) {
		this.chatAccessPromptType = 'login'
		this.refreshDebugPanel('presentLoginPrompt')
		const hasLocalLogin = this.debugInfo.localLoginState.indexOf('已登录') === 0
		if (options.authRejected && hasLocalLogin) {
			this.connectionText = '认证异常'
			this.debugInfo = Object.assign({}, this.debugInfo, {
				aiAuthState: '本地已登录，但 AI 接口拒绝 token',
				lastMessage: message || this.debugInfo.lastMessage,
				updatedAt: nowTimeText()
			})
		} else {
			this.connectionText = '需要登录'
			this.debugInfo = Object.assign({}, this.debugInfo, {
				aiAuthState: hasLocalLogin ? this.debugInfo.aiAuthState : '未登录',
				lastMessage: message || this.debugInfo.lastMessage,
				updatedAt: nowTimeText()
			})
		}
		if (message) uni.showToast({ title: message, icon: 'none' })
	},
	presentPowerPrompt(message = '算力不足，暂时无法继续发送') {
		this.chatAccessPromptType = 'power'
		this.connectionText = '算力不足'
		if (message) uni.showToast({ title: message, icon: 'none' })
	},
	clearAccessPrompt() {
		this.chatAccessPromptType = ''
	},
	appendAssistantMessage(content) {
		const text = normalizeText(content, '')
		if (!text) return
		this.messages = this.messages.concat([{ id: `a-${Date.now()}`, role: 'assistant', content: text }])
		this.scrollToBottom()
	},
	appendAssistantPayloadMessage(payload = {}) {
		let text = normalizeText(payload.content || payload.reply || payload.message, '')
		const toolCalls = normalizeToolCalls(payload.toolCalls || payload.tools)
		const businessCards = normalizeBusinessCards(payload.businessCards)
		const goalCards = normalizeGoalCards(payload.goalCards)
		const articleCards = normalizeArticleCards(payload.articleCards)
		const projectCards = Array.isArray(payload.projectCards) ? payload.projectCards : []
		const activityCards = Array.isArray(payload.activityCards) ? payload.activityCards : []
		const schoolCards = normalizeSchoolCards(payload.schoolCards)
		const inviteCards = Array.isArray(payload.inviteCards) ? payload.inviteCards : []
		const choiceCards = this.normalizeChoiceCards(payload.choiceCards)
		const membershipCards = this.normalizeMembershipCards(payload.membershipCards)

		if (schoolCards.length > 0) {
			text = clipInlineText(text, 120)
		}

		if (
			!text &&
			toolCalls.length === 0 &&
			businessCards.length === 0 &&
			goalCards.length === 0 &&
			articleCards.length === 0 &&
			projectCards.length === 0 &&
			activityCards.length === 0 &&
			schoolCards.length === 0 &&
			inviteCards.length === 0 &&
			choiceCards.length === 0 &&
			membershipCards.length === 0
		) return

		this.messages = this.messages.concat([{
			id: `a-${Date.now()}`,
			role: 'assistant',
			content: text,
			toolCalls,
			businessCards,
			goalCards,
			articleCards,
			projectCards,
			activityCards,
			schoolCards,
			inviteCards,
			choiceCards,
			membershipCards
		}])
		this.scrollToBottom()
	},
	normalizeChoiceCards(choiceCards) {
		if (!Array.isArray(choiceCards)) return []
		return choiceCards
			.map((item, index) => {
				const question = clipInlineText(item && (item.question || item.title), 80)
				const helperText = clipInlineText(item && (item.helperText || item.description), 120)
				const options = normalizeChoiceOptions(item && item.options)
				if (!question || options.length < 2) return null
				return {
					id: normalizeText(item && item.id, `choice-card-${index}-${Date.now()}`),
					question,
					helperText,
					options
				}
			})
			.filter(Boolean)
			.slice(0, MAX_VISIBLE_CHOICE_CARDS)
	},
	normalizeMembershipCards(membershipCards) {
		if (!Array.isArray(membershipCards)) return []
		return membershipCards
			.map((item, index) => {
				const cardType = normalizeMembershipCardType(item && (item.cardType || item.type || item.key))
				if (!cardType) return null
				const intent = normalizeMembershipCardIntent(item && item.intent)
				const preset = MEMBERSHIP_CARD_PRESETS[cardType]
				if (!preset) return null
				const customBenefits = Array.isArray(item && item.benefits)
					? item.benefits.map((benefit) => normalizeText(benefit, '')).filter(Boolean)
					: []
				return {
					id: normalizeText(item && item.id, `${cardType}-${intent}-${index}-${Date.now()}`),
					cardType,
					intent,
					title: normalizeText(item && item.title, preset.title),
					badge: normalizeText(item && item.badge, preset.badgeByIntent[intent] || ''),
					pillText: normalizeText(item && item.pillText, preset.pillText || ''),
					summary: clipInlineText(
						item && (item.recommendationReason || item.questionRelation || item.summary),
						120
					),
					benefits: (customBenefits.length ? customBenefits : (preset.benefitsByIntent[intent] || [])).slice(0, 3),
					buttonText: normalizeText(item && item.buttonText, preset.buttonTextByIntent[intent] || '立即前往'),
					routeUrl: normalizeText(item && (item.routeUrl || item.url), buildMembershipCardRoute(cardType, intent))
				}
			})
			.filter(Boolean)
			.slice(0, MAX_VISIBLE_MEMBERSHIP_CARDS)
	},
	resolveChoiceCardRoute(option = {}) {
		const meta = option && option.meta && typeof option.meta === 'object' ? option.meta : null
		const explicitRoute = normalizeText(meta && (meta.routeUrl || meta.url || meta.path), '')
		if (explicitRoute) return explicitRoute

		const merged = `${normalizeText(option && option.label, '')} ${normalizeText(option && option.value, '')}`
		if (/目标|设定目标|目标设立|制定目标/.test(merged)) {
			return GOAL_SETTING_ROUTE
		}
		if (/团队动态|开单情况|最近开单|伙伴动态/.test(merged)) {
			return TEAM_DYNAMICS_ROUTE
		}
		if (/加入团队|校园合伙人|去加入|团队入口/.test(merged)) {
			return TEAM_BROWSER_ROUTE
		}
		return ''
	},
	handleMembershipCardAction(card = {}) {
		const routeUrl = normalizeText(card && card.routeUrl, '') || TEAM_BROWSER_ROUTE
		uni.navigateTo({
			url: routeUrl,
			fail: () => {
				uni.showToast({ title: '页面打开失败', icon: 'none' })
			}
		})
	},
	handleSchoolCardTap(card = {}) {
		const institutionId = Number(card && card.institutionId)
		if (!Number.isFinite(institutionId) || institutionId <= 0) {
			uni.showToast({ title: '学校信息不完整', icon: 'none' })
			return
		}

		const query = [`id=${encodeURIComponent(institutionId)}`]
		if (card.preview) query.push('preview=1')
		if (card.title) query.push(`name=${encodeURIComponent(card.title)}`)
		if (card.examType) query.push(`examType=${encodeURIComponent(card.examType)}`)
		if (card.subjectTrack) query.push(`subjectTrack=${encodeURIComponent(card.subjectTrack)}`)
		if (card.majorCategory) query.push(`majorCategory=${encodeURIComponent(card.majorCategory)}`)
		if (card.riskBucketParam) query.push(`riskBucket=${encodeURIComponent(card.riskBucketParam)}`)

		uni.navigateTo({
			url: `/subpackages/volunteer/detail?${query.join('&')}`,
			fail: () => {
				uni.showToast({ title: '页面打开失败', icon: 'none' })
			}
		})
	},
	handleChoiceCardSelect(option = {}) {
		const routeUrl = this.resolveChoiceCardRoute(option)
		if (routeUrl) {
			uni.navigateTo({
				url: routeUrl,
				fail: () => {
					uni.showToast({ title: '页面打开失败', icon: 'none' })
				}
			})
			return
		}

		const value = normalizeText(option && option.value, '')
		if (!value) return
		this.sendMessage(value)
	},
	scrollToBottom() {
		this.scrollIntoViewTarget = ''
		this.$nextTick(() => {
			this.scrollIntoViewTarget = 'chat-bottom'
		})
	},
	goBack() {
		const pageCount = typeof getCurrentPages === 'function' ? getCurrentPages().length : 0
		if (pageCount > 1) {
			uni.navigateBack()
			return
		}
		uni.switchTab({ url: '/pages/business/index' })
	},
	goToLogin() {
		const redirect = encodeURIComponent(
			`${CHAT_PATH}?agentId=${encodeURIComponent(this.agentId)}&sessionId=${encodeURIComponent(this.sessionId)}`
		)
		uni.navigateTo({ url: `/pages/auth/login/index?redirect=${redirect}` })
	},
	resetSession() {
		if (this.isSending) return
		this.sessionId = createSessionId()
		this.draftText = ''
		this.messages = []
		this.connectionText = '连接中'
		this.clearAccessPrompt()
		this.refreshDebugPanel('resetSession')
		this.bootstrapPage()
	},
	handleQuickActionSelect(item) {
		const text = normalizeText(item && (item.label || item.action), '')
		if (!text) return
		this.draftText = text
		this.sendMessage(text)
	},
	copyText(text) {
		const content = normalizeText(text, '')
		if (!content) return
		uni.setClipboardData({
			data: content,
			success: () => uni.showToast({ title: '已复制', icon: 'none' })
		})
	},
	copyDebugInfo() {
		const debugInfo = this.debugInfo || {}
		const content = [
			`Agent ID: ${normalizeText(this.agentId, '-')}`,
			`Session ID: ${normalizeText(this.sessionId, '-')}`,
			`本地登录态: ${normalizeText(debugInfo.localLoginState, '-')}`,
			`AI 认证态: ${normalizeText(debugInfo.aiAuthState, '-')}`,
			`Token 来源: ${normalizeText(debugInfo.tokenSource, '-')}`,
			`JWT 格式: ${debugInfo.tokenIsJwt ? '是' : '否'}`,
			`Access Token: ${normalizeText(debugInfo.tokenPreview, '-')}`,
			`Refresh Token: ${normalizeText(debugInfo.refreshTokenState, '-')}`,
			`User ID: ${normalizeText(debugInfo.userId, '-')}`,
			`昵称: ${normalizeText(debugInfo.nickname, '-')}`,
			`最近动作: ${normalizeText(debugInfo.lastAction, '-')}`,
			`最近状态码: ${normalizeText(debugInfo.lastStatusCode, '-')}`,
			`最近响应: ${normalizeText(debugInfo.lastMessage, '-')}`,
			`最近更新时间: ${normalizeText(debugInfo.updatedAt, '-')}`
		].join('\n')
		this.copyText(content)
	},
	async sendMessage(overrideText = '') {
		const content = normalizeText(overrideText || this.draftText, '')
		if (!content || this.isSending) return
		if (this.showPowerPrompt) {
			this.presentPowerPrompt('算力不足，暂时无法继续发送')
			return
		}

		const token = await resolveActiveToken()
		if (!token) {
			this.updateDebugRequestState('sendMessage', { aiAuthState: '缺少 token', note: '发送前未拿到可用 token' })
			this.presentLoginPrompt('请先登录后再试')
			this.appendAssistantMessage('登录后才能继续聊。')
			return
		}

		this.messages = this.messages.concat([{ id: `u-${Date.now()}`, role: 'user', content }])
		this.draftText = ''
		this.isSending = true
		this.connectionText = '响应中'
		this.scrollToBottom()

		try {
			const url = `${getApiBaseUrl()}/chat/sync`
			const { response, payload, statusCode } = await requestJsonWithRefresh({
				url,
				method: 'POST',
				data: { message: content, agentId: this.agentId, sessionId: this.sessionId },
				token
			})

			if (statusCode !== 200 || !isSuccessPayload(payload, response)) {
				if (hasAuthFailure(statusCode, payload)) {
					this.updateDebugRequestState('sendMessage', { statusCode, payload, aiAuthState: '被拒绝' })
					this.presentLoginPrompt('AI 接口认证未通过，请查看 Debug Panel', { authRejected: true })
					this.appendAssistantMessage('登录状态已失效，请先登录后再试。')
					return
				}
				if (hasPowerFailure(statusCode, payload)) {
					this.updateDebugRequestState('sendMessage', { statusCode, payload, aiAuthState: '通过' })
					this.presentPowerPrompt('算力不足，暂时无法继续发送')
					this.appendAssistantMessage('算力不足，先去个人页补充后再试。')
					return
				}
				if (hasServiceFailure(statusCode, payload)) {
					this.updateDebugRequestState('sendMessage', { statusCode, payload, aiAuthState: '服务异常' })
					this.appendAssistantMessage('小春鹿这会儿有点忙，AI 服务暂时不可用，稍后再试就好。')
					this.connectionText = '服务异常'
					uni.showToast({ title: 'AI 服务暂时不可用', icon: 'none' })
					return
				}
				throw buildRequestError(payload.error || payload.message || '回复失败', statusCode, payload.errorCode || payload.code)
			}

			const data = unwrapPayloadData(payload)
			if (data && data.sessionId) this.sessionId = normalizeText(data.sessionId, this.sessionId)
			if (data && data.agentId) this.agentId = normalizeText(data.agentId, this.agentId)

			this.updateDebugRequestState('sendMessage', { statusCode, payload, aiAuthState: '通过', note: '发送成功' })
			this.appendAssistantPayloadMessage({
				content: normalizeText(data && (data.reply || data.message), '收到，我继续帮你整理。'),
				toolCalls: data && (data.toolCalls || data.tools),
				businessCards: data && data.businessCards,
				goalCards: data && data.goalCards,
				articleCards: data && data.articleCards,
				projectCards: data && data.projectCards,
				activityCards: data && data.activityCards,
				schoolCards: data && data.schoolCards,
				inviteCards: data && data.inviteCards,
				choiceCards: data && data.choiceCards,
				membershipCards: data && data.membershipCards
			})

			if (Number(this.aiPowerRemaining) > 0) {
				this.aiPowerRemaining = Math.max(0, Math.floor(Number(this.aiPowerRemaining) - 1))
			}
			this.connectionText = '已就绪'
			this.clearAccessPrompt()
		} catch (error) {
			console.error('[ai-chat] send failed', error)
			if (hasAuthFailure(error.statusCode, error)) {
				this.updateDebugRequestState('sendMessage', {
					statusCode: error.statusCode,
					payload: error,
					aiAuthState: '被拒绝',
					note: normalizeText(error.message, 'AI 接口认证失败')
				})
				this.presentLoginPrompt('AI 接口认证未通过，请查看 Debug Panel', { authRejected: true })
			} else if (hasPowerFailure(error.statusCode, error)) {
				this.updateDebugRequestState('sendMessage', {
					statusCode: error.statusCode,
					payload: error,
					aiAuthState: '通过',
					note: normalizeText(error.message, '算力不足')
				})
				this.presentPowerPrompt('算力不足，暂时无法继续发送')
			} else if (hasServiceFailure(error.statusCode, error)) {
				this.updateDebugRequestState('sendMessage', {
					statusCode: error.statusCode,
					payload: error,
					aiAuthState: '服务异常',
					note: normalizeText(error.message, 'AI 服务暂时不可用')
				})
				this.appendAssistantMessage('小春鹿这会儿有点忙，AI 服务暂时不可用，稍后再试就好。')
				this.connectionText = '服务异常'
				uni.showToast({ title: 'AI 服务暂时不可用', icon: 'none' })
				return
			} else {
				this.updateDebugRequestState('sendMessage', {
					statusCode: error.statusCode,
					payload: error,
					aiAuthState: '异常',
					note: normalizeText(error.message, '发送失败')
				})
			}
			this.appendAssistantMessage('这次请求没成功，你可以稍后再试。')
			if (!hasServiceFailure(error.statusCode, error)) {
				uni.showToast({ title: '发送失败', icon: 'none' })
			}
			this.connectionText = hasAuthFailure(error.statusCode, error)
				? '登录失效'
				: hasPowerFailure(error.statusCode, error)
					? '算力不足'
					: hasServiceFailure(error.statusCode, error)
						? '服务异常'
					: '发送失败'
		} finally {
			this.isSending = false
			this.scrollToBottom()
		}
	}
}
