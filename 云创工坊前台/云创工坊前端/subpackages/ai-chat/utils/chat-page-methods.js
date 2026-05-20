import { getApiBaseUrl } from '@/utils/api-switch.js'
import {
	fetchAdmissionUnlockStatus,
	startAdmissionUnlockPayment
} from '@/utils/admission-access.js'
import {
	VOLUNTEER_CUSTOMER_SERVICE_PHONE,
	createDefaultUnlockStatus,
	normalizeUnlockStatus
} from '@/utils/volunteer-local-admission.js'
import { buildVolunteerPaymentConfirmText } from '@/utils/volunteer-support-rules.js'
import {
	CHAT_PATH,
	buildRequestError,
	createSessionId,
	extractDisplayUserInfo,
	getDailyNoticeKey,
	getStoredTokenByPriority,
	getStoredValue,
	getResponsePayload,
	getResponseStatusCode,
	hasAuthFailure,
	hasPowerFailure,
	hasServiceFailure,
	isSuccessPayload,
	normalizeText,
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

function syncCurrentUserProfile(ctx) {
	const userInfo = extractDisplayUserInfo()
	ctx.currentUserId = userInfo.userId || ''
	ctx.currentUserName = userInfo.nickname || '我'
	ctx.currentUserAvatarUrl = userInfo.avatar || ''
}

function resolveAssistantAvatarUrl(nextAvatarUrl, currentAvatarUrl) {
	const next = normalizeText(nextAvatarUrl, '')
	if (!next) {
		return normalizeText(currentAvatarUrl, '')
	}

	const current = normalizeText(currentAvatarUrl, '')
	if (current && /^\/(?:subpackages|static)\//.test(next)) {
		return current
	}

	return next
}

function hasLocalStoredLogin() {
	const tokenEntry = getStoredTokenByPriority()
	return !!String(tokenEntry.value || '').trim()
}

const TEAM_BROWSER_ROUTE = '/pages/extra/team-browser'
const TEAM_DYNAMICS_ROUTE = '/pages/extra/team-dynamics'
const GOAL_SETTING_ROUTE = '/pages/extra/goal-setting'
const DIRECT_SCORE_SHARE_ENTRY_PATH = '/subpackages/volunteer/index?entry=direct_score'
const MAX_VISIBLE_CHOICE_CARDS = 2
const MAX_VISIBLE_GOAL_CARDS = 1
const MAX_VISIBLE_ARTICLE_CARDS = 3
const MAX_VISIBLE_MEMBERSHIP_CARDS = 2
const MAX_VISIBLE_SCHOOL_CARDS = 5

function isRecord(value) {
	return !!value && typeof value === 'object' && !Array.isArray(value)
}

function decodeUtf8Bytes(uint8) {
	if (!(uint8 instanceof Uint8Array) || uint8.length === 0) return ''

	let output = ''
	let index = 0

	while (index < uint8.length) {
		const byte1 = uint8[index]

		if (byte1 < 0x80) {
			output += String.fromCharCode(byte1)
			index += 1
			continue
		}

		if (byte1 >= 0xc2 && byte1 <= 0xdf && index + 1 < uint8.length) {
			const byte2 = uint8[index + 1]
			if ((byte2 & 0xc0) === 0x80) {
				output += String.fromCharCode(((byte1 & 0x1f) << 6) | (byte2 & 0x3f))
				index += 2
				continue
			}
		}

		if (byte1 >= 0xe0 && byte1 <= 0xef && index + 2 < uint8.length) {
			const byte2 = uint8[index + 1]
			const byte3 = uint8[index + 2]
			const validSecondByte =
				(byte2 & 0xc0) === 0x80 &&
				(byte3 & 0xc0) === 0x80 &&
				!(byte1 === 0xe0 && byte2 < 0xa0) &&
				!(byte1 === 0xed && byte2 >= 0xa0)
			if (validSecondByte) {
				output += String.fromCharCode(
					((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f)
				)
				index += 3
				continue
			}
		}

		if (byte1 >= 0xf0 && byte1 <= 0xf4 && index + 3 < uint8.length) {
			const byte2 = uint8[index + 1]
			const byte3 = uint8[index + 2]
			const byte4 = uint8[index + 3]
			const validFourBytes =
				(byte2 & 0xc0) === 0x80 &&
				(byte3 & 0xc0) === 0x80 &&
				(byte4 & 0xc0) === 0x80 &&
				!(byte1 === 0xf0 && byte2 < 0x90) &&
				!(byte1 === 0xf4 && byte2 >= 0x90)
			if (validFourBytes) {
				const codePoint =
					((byte1 & 0x07) << 18) |
					((byte2 & 0x3f) << 12) |
					((byte3 & 0x3f) << 6) |
					(byte4 & 0x3f)
				output += String.fromCodePoint(codePoint)
				index += 4
				continue
			}
		}

		output += '\uFFFD'
		index += 1
	}

	return output
}

function decodeArrayBufferText(value, decoder = null, stream = false) {
	if (typeof value === 'string') return value

	const textDecoder = decoder || (typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : null)
	let uint8 = null

	if (value instanceof ArrayBuffer) {
		uint8 = new Uint8Array(value)
	} else if (value && value.buffer instanceof ArrayBuffer) {
		uint8 = new Uint8Array(value.buffer, value.byteOffset || 0, value.byteLength || value.length || 0)
	}

	if (!uint8) {
		return String(value || '')
	}

	if (textDecoder) {
		try {
			return textDecoder.decode(uint8, { stream })
		} catch (error) {
			return textDecoder.decode(uint8)
		}
	}

	return decodeUtf8Bytes(uint8)
}

function parseSseEventBlock(block) {
	const lines = String(block || '').split(/\r?\n/)
	let eventType = 'message'
	const dataLines = []

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index]
		if (!line || line.startsWith(':')) continue
		if (line.startsWith('event:')) {
			eventType = line.slice(6).trim() || 'message'
			continue
		}
		if (line.startsWith('data:')) {
			dataLines.push(line.slice(5).replace(/^\s/, ''))
		}
	}

	if (!dataLines.length) return null

	const rawData = dataLines.join('\n')
	let data = rawData
	try {
		data = JSON.parse(rawData)
	} catch (error) {
		data = rawData
	}

	return { type: eventType, data }
}

function consumeSseBuffer(buffer) {
	const normalized = String(buffer || '').replace(/\r\n/g, '\n')
	const segments = normalized.split('\n\n')
	const rest = segments.pop() || ''
	return {
		rest,
		events: segments.map(parseSseEventBlock).filter(Boolean)
	}
}

function buildStreamHeaders(token = '') {
	return {
		'Content-Type': 'application/json',
		Accept: 'text/event-stream',
		...(token ? { Authorization: `Bearer ${token}`, 'X-Access-Token': token } : {})
	}
}

function parseStreamResponsePayload(response) {
	const raw = response && response.data
	if (isRecord(raw)) return raw

	const text = decodeArrayBufferText(raw).trim()
	if (!text) return {}

	try {
		const payload = JSON.parse(text)
		return isRecord(payload) ? payload : {}
	} catch (error) {
		return { message: text }
	}
}

function createStreamRequest({ url, data, token = '', onEvent }) {
	return new Promise((resolve, reject) => {
		let settled = false
		let buffer = ''
		let sawCompleteEvent = false
		let sawErrorEvent = false
		let chunkCount = 0
		let eventCount = 0
		let streamStartedAt = Date.now()
		let firstChunkAt = 0
		const traceSessionId = normalizeText(data && data.sessionId, '')
		const traceAgentId = normalizeText(data && data.agentId, '')
		const traceId = `${traceAgentId || 'agent'}:${traceSessionId || 'session'}:${streamStartedAt}`
		const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : null

		console.log(`[ai-chat][stream][${traceId}] request start`, {
			url,
			agentId: traceAgentId,
			sessionId: traceSessionId
		})

		const emitBufferedEvents = (forceFinalBlock = false) => {
			const parsed = consumeSseBuffer(buffer)
			buffer = parsed.rest
			const events = parsed.events.slice()

			if (forceFinalBlock) {
				const trailingEvent = parseSseEventBlock(buffer)
				if (trailingEvent) {
					events.push(trailingEvent)
					buffer = ''
				}
			}

			events.forEach((event) => {
				eventCount += 1
				if (event && event.type === 'complete') {
					sawCompleteEvent = true
					console.log(`[ai-chat][stream][${traceId}] complete event`, {
						eventCount,
						chunkCount,
						elapsed: Date.now() - streamStartedAt
					})
				}
				if (event && event.type === 'error') {
					sawErrorEvent = true
					console.warn(`[ai-chat][stream][${traceId}] error event`, {
						eventCount,
						chunkCount,
						elapsed: Date.now() - streamStartedAt,
						payload: event.data
					})
				}
				if (event && event.type === 'text' && (eventCount <= 3 || eventCount % 20 === 0)) {
					console.log(`[ai-chat][stream][${traceId}] text event`, {
						eventCount,
						chunkCount,
						deltaLength: String(event.data && event.data.delta || '').length
					})
				}
				if (typeof onEvent === 'function') onEvent(event)
			})
		}

		const finish = (handler, payload) => {
			if (settled) return
			settled = true
			handler(payload)
		}

		const requestTask = uni.request({
			url,
			method: 'POST',
			data,
			enableChunked: true,
			responseType: 'arraybuffer',
			header: buildStreamHeaders(token),
			success: (response) => {
				if (decoder) {
					try {
						buffer += decoder.decode()
					} catch (error) {
						console.warn('[ai-chat] flush stream decoder failed:', error)
					}
				}
				emitBufferedEvents(true)
				console.log(`[ai-chat][stream][${traceId}] request success`, {
					statusCode: response && response.statusCode,
					chunkCount,
					eventCount,
					sawCompleteEvent,
					sawErrorEvent,
					elapsed: Date.now() - streamStartedAt
				})
				finish(resolve, { unsupported: false, response })
			},
			fail: (error) => {
				if (decoder) {
					try {
						buffer += decoder.decode()
					} catch (flushError) {
						console.warn('[ai-chat] flush stream decoder on fail failed:', flushError)
					}
				}

				try {
					emitBufferedEvents(true)
				} catch (eventError) {
					finish(reject, eventError)
					return
				}

				const errMsg = normalizeText(error && error.errMsg, '')
				const isRecoverableTailFailure =
					sawCompleteEvent &&
					!sawErrorEvent &&
					(chunkCount > 0 || /network error|ERR_INCOMPLETE_CHUNKED_ENCODING|abort|fail/i.test(errMsg))

				console.warn(`[ai-chat][stream][${traceId}] request fail`, {
					errMsg,
					chunkCount,
					eventCount,
					sawCompleteEvent,
					sawErrorEvent,
					elapsed: Date.now() - streamStartedAt
				})

				if (isRecoverableTailFailure) {
					console.warn('[ai-chat] stream tail failure recovered after complete event:', errMsg || error)
					finish(resolve, {
						unsupported: false,
						response: {
							statusCode: 200,
							data: '',
							errMsg
						},
						recoveredFromFail: true
					})
					return
				}

				finish(reject, error)
			}
		})

		if (!requestTask || typeof requestTask.onChunkReceived !== 'function') {
			if (requestTask && typeof requestTask.abort === 'function') {
				try {
					requestTask.abort()
				} catch (error) {
					console.warn('[ai-chat] abort unsupported stream request failed:', error)
				}
			}
			finish(resolve, { unsupported: true, response: null })
			return
		}

		requestTask.onChunkReceived((chunk) => {
			try {
				chunkCount += 1
				if (!firstChunkAt) {
					firstChunkAt = Date.now()
					console.log(`[ai-chat][stream][${traceId}] first chunk`, {
						after: firstChunkAt - streamStartedAt
					})
				}
				if (chunkCount <= 3 || chunkCount % 20 === 0) {
					console.log(`[ai-chat][stream][${traceId}] chunk received`, {
						chunkCount,
						elapsed: Date.now() - streamStartedAt
					})
				}
				buffer += decodeArrayBufferText(chunk && chunk.data !== undefined ? chunk.data : chunk, decoder, true)
				emitBufferedEvents()
			} catch (error) {
				console.error(`[ai-chat][stream][${traceId}] chunk parse failed`, error)
				finish(reject, error)
			}
		})
	})
}

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
				area: normalizeText(item && (item.area || item.location || item.city), ''),
				location: normalizeText(item && (item.location || item.area || item.city), ''),
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
		.map((tool, index) => normalizeToolCall(tool, index))
		.filter((tool) => tool.name || tool.summary || tool.inputPreview || tool.hasParams)
}

function normalizeToolCall(tool, index = 0) {
	const name = normalizeText(tool && tool.name, '')
	const label = normalizeText(tool && tool.label, name || '工具')
	const params = tool && Object.prototype.hasOwnProperty.call(tool, 'params')
		? tool.params
		: tool && Object.prototype.hasOwnProperty.call(tool, 'input')
			? tool.input
			: ''
	const inputSource = tool && Object.prototype.hasOwnProperty.call(tool, 'inputPreview')
		? tool.inputPreview
		: tool && Object.prototype.hasOwnProperty.call(tool, 'input')
			? tool.input
			: params
	const inputPreview = clipInlineText(inputSource, 120)
	const summary = clipInlineText(tool && tool.summary, 160)
	const rawDurationMs = tool && Object.prototype.hasOwnProperty.call(tool, 'durationMs')
		? tool.durationMs
		: tool && Object.prototype.hasOwnProperty.call(tool, 'duration')
			? tool.duration
			: null
	const durationMs = Number(rawDurationMs)
	const hasParams = typeof (tool && tool.hasParams) === 'boolean'
		? tool.hasParams
		: (
			typeof params === 'string'
				? !!params.trim()
				: Array.isArray(params)
					? params.length > 0
					: !!(params && typeof params === 'object' && Object.keys(params).length > 0)
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
}

function normalizeSkillDebug(skillDebug) {
	const source = skillDebug && typeof skillDebug === 'object' ? skillDebug : {}
	return {
		activatedSkills: Array.isArray(source.activatedSkills)
			? source.activatedSkills.map((item) => normalizeText(item, '')).filter(Boolean)
			: [],
		loadedSkillFiles: Array.isArray(source.loadedSkillFiles)
			? source.loadedSkillFiles.map((item) => normalizeText(item, '')).filter(Boolean)
			: [],
		skillPromptChars: Number(source.skillPromptChars) || 0,
		skillMatchReason: Array.isArray(source.skillMatchReason)
			? source.skillMatchReason.map((item) => normalizeText(item, '')).filter(Boolean)
			: []
	}
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

export const chatPageMethods = {
	async bootstrapPage() {
		syncCurrentUserProfile(this)
		await this.syncAccessState()
		await this.loadAgentMeta()
		await this.refreshProfileDebugData()
	},
	async syncAccessState() {
		syncCurrentUserProfile(this)
		await this.refreshAiPowerBalance({ silent: true, showDailyNotice: true })
		await this.refreshAdmissionUnlockState({ silent: true })
	},
	async refreshAdmissionUnlockState(options = {}) {
		if (!this.requiresVolunteerUnlock) {
			this.admissionUnlockStatus = normalizeUnlockStatus(this.admissionUnlockStatus || {})
			return this.admissionUnlockStatus
		}

		const token = await resolveActiveToken()
		if (!token) {
			this.admissionUnlockStatus = createDefaultUnlockStatus()
			return this.admissionUnlockStatus
		}

		this.unlockStatusLoading = true
		try {
			const result = await fetchAdmissionUnlockStatus()
			const nextStatus = normalizeUnlockStatus(result && result.data)
			this.admissionUnlockStatus = nextStatus
			if (!nextStatus.unlocked) {
				this.connectionText = '待解锁'
			} else if (!this.showPowerPrompt) {
				this.connectionText = '已就绪'
			}
			return nextStatus
		} catch (error) {
			console.warn('[ai-chat] refresh admission unlock state failed:', error)
			this.admissionUnlockStatus = createDefaultUnlockStatus()
			if (!options.silent) {
				uni.showToast({
					title: '解锁状态获取失败',
					icon: 'none'
				})
			}
			return this.admissionUnlockStatus
		} finally {
			this.unlockStatusLoading = false
		}
	},
	async loadAgentMeta() {
		try {
			const token = await resolveActiveToken()
			if (!token) {
				if (!this.messages.length && !this.hideWelcomeMessage) {
					this.messages = [{ id: 'welcome', role: 'assistant', content: '你好，先登录后我就能继续帮你分析和回答。' }]
					this.scrollToBottom()
				}
				return
			}
			const url = `${getApiBaseUrl()}/chat/agents/${encodeURIComponent(this.agentId)}/meta`
			const response = await requestRaw(url, 'GET', null, token)
			const statusCode = getResponseStatusCode(response)
			const payload = getResponsePayload(response)
			const data = unwrapPayloadData(payload)

			if (statusCode === 200 && data) {
				this.resolvedAgentId = normalizeText(
					data.resolvedAgentId || data.agentId,
					this.resolvedAgentId || this.agentId
				)
				this.resolvedAgentName = normalizeText(
					data.resolvedAgentName || data.assistantName,
					this.resolvedAgentName || this.assistantName
				)
				this.assistantName = normalizeText(data.assistantName, this.assistantName)
				this.assistantRole = normalizeText(data.assistantRole, this.assistantRole)
				this.assistantAvatarUrl = resolveAssistantAvatarUrl(
					data.avatarUrl,
					this.assistantAvatarUrl || ''
				)
				if (Array.isArray(data.quickPrompts) && data.quickPrompts.length) {
					this.quickPrompts = data.quickPrompts
				}
				if (Array.isArray(data.introQuickPrompts) && data.introQuickPrompts.length) {
					this.visualGuessPrompts = data.introQuickPrompts
					this.visualGuessPromptBatchIndex = 0
				}
				if (Array.isArray(data.introSuggestionPrompts) && data.introSuggestionPrompts.length) {
					this.visualSuggestionPrompts = data.introSuggestionPrompts
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
				this.presentLoginPrompt('AI 接口认证未通过，请重新登录后再试', { authRejected: true })
			}
		} catch (error) {
			console.warn('[ai-chat] meta load failed', error)
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
					this.presentLoginPrompt('AI 接口认证未通过，请重新登录后再试', { authRejected: true })
					return null
				}
				throw buildRequestError(payload.error || payload.message || '算力状态获取失败', statusCode, payload.errorCode || payload.code)
			}

			const balance = Number(data && (data.remaining ?? data.balance ?? data.computing_power ?? 0))
			this.aiPowerRemaining = Number.isFinite(balance) ? Math.max(0, Math.floor(balance)) : 0
			if (this.aiPowerRemaining > 0) {
				this.clearAccessPrompt()
				this.connectionText = '已就绪'
			} else {
				// 一旦算力接口成功返回，说明登录认证已经通过。
				// 这里必须覆盖掉旧的 login prompt，避免页面残留“未登录”假象。
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
				this.presentLoginPrompt('AI 接口认证未通过，请重新登录后再试', { authRejected: true })
				return null
			}
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
		const hasLocalLogin = hasLocalStoredLogin()
		if (options.authRejected && hasLocalLogin) {
			this.connectionText = '认证异常'
		} else {
			this.connectionText = '需要登录'
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
	buildAssistantPayloadMessage(payload = {}, fixedId = '') {
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
		) return null

		return {
			id: fixedId || `a-${Date.now()}`,
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
		}
	},
	appendAssistantPayloadMessage(payload = {}) {
		const message = this.buildAssistantPayloadMessage(payload)
		if (!message) return
		this.skillDebug = normalizeSkillDebug(payload.skillDebug)
		this.messages = this.messages.concat([message])
		this.scrollToBottom()
	},
	upsertAssistantPayloadMessage(payload = {}, messageId = '') {
		const message = this.buildAssistantPayloadMessage(payload, messageId || this.activeAssistantMessageId)
		if (!message) return
		this.skillDebug = normalizeSkillDebug(payload.skillDebug)

		const targetId = message.id
		const index = this.messages.findIndex((item) => item && item.id === targetId)
		if (index === -1) {
			this.messages = this.messages.concat([message])
		} else {
			const previousMessage = this.messages[index] || {}
			const hasOwn = (key) => Object.prototype.hasOwnProperty.call(payload || {}, key)
			const mergedMessage = {
				...previousMessage,
				...message,
				content: message.content || previousMessage.content || '',
				toolCalls: hasOwn('toolCalls') || hasOwn('tools')
					? message.toolCalls
					: (Array.isArray(previousMessage.toolCalls) ? previousMessage.toolCalls : []),
				businessCards: hasOwn('businessCards')
					? message.businessCards
					: (Array.isArray(previousMessage.businessCards) ? previousMessage.businessCards : []),
				goalCards: hasOwn('goalCards')
					? message.goalCards
					: (Array.isArray(previousMessage.goalCards) ? previousMessage.goalCards : []),
				articleCards: hasOwn('articleCards')
					? message.articleCards
					: (Array.isArray(previousMessage.articleCards) ? previousMessage.articleCards : []),
				projectCards: hasOwn('projectCards')
					? message.projectCards
					: (Array.isArray(previousMessage.projectCards) ? previousMessage.projectCards : []),
				activityCards: hasOwn('activityCards')
					? message.activityCards
					: (Array.isArray(previousMessage.activityCards) ? previousMessage.activityCards : []),
				schoolCards: hasOwn('schoolCards')
					? message.schoolCards
					: (Array.isArray(previousMessage.schoolCards) ? previousMessage.schoolCards : []),
				inviteCards: hasOwn('inviteCards')
					? message.inviteCards
					: (Array.isArray(previousMessage.inviteCards) ? previousMessage.inviteCards : []),
				choiceCards: hasOwn('choiceCards')
					? message.choiceCards
					: (Array.isArray(previousMessage.choiceCards) ? previousMessage.choiceCards : []),
				membershipCards: hasOwn('membershipCards')
					? message.membershipCards
					: (Array.isArray(previousMessage.membershipCards) ? previousMessage.membershipCards : [])
			}
			const nextMessages = this.messages.slice()
			nextMessages.splice(index, 1, mergedMessage)
			this.messages = nextMessages
		}

		if (targetId) {
			this.activeAssistantMessageId = targetId
		}
		this.scrollToBottom()
	},
	upsertAssistantStreamToolCall(toolPayload = {}) {
		const normalizedTool = normalizeToolCall(toolPayload, 0)
		if (!normalizedTool || !normalizedTool.id) return

		const messageId = this.activeAssistantMessageId || this.beginAssistantStreamMessage('')
		const nextMessages = this.messages.map((item) => {
			if (!item || item.id !== messageId) return item

			const currentTools = Array.isArray(item.toolCalls) ? item.toolCalls.slice() : []
			const existingIndex = currentTools.findIndex(
				(entry) => entry && String(entry.id || '') === normalizedTool.id
			)

			if (existingIndex === -1) {
				currentTools.push(normalizedTool)
			} else {
				const existingTool = currentTools[existingIndex] || {}
				const shouldUseIncomingParams =
					typeof normalizedTool.hasParams === 'boolean' && normalizedTool.hasParams

				currentTools.splice(existingIndex, 1, {
					...existingTool,
					...normalizedTool,
					name: normalizedTool.name || existingTool.name || '',
					label: normalizedTool.label || existingTool.label || normalizedTool.name || existingTool.name || '工具',
					inputPreview: normalizedTool.inputPreview || existingTool.inputPreview || '',
					summary: normalizedTool.summary || existingTool.summary || '',
					state: normalizedTool.state || existingTool.state || '',
					durationText: normalizedTool.durationText || existingTool.durationText || '',
					hasParams: shouldUseIncomingParams ? true : !!existingTool.hasParams,
					params: shouldUseIncomingParams ? normalizedTool.params : existingTool.params
				})
			}

			return {
				...item,
				toolCalls: currentTools
			}
		})

		this.messages = nextMessages
		this.streamReplyStarted = true
		this.scrollToBottom()
	},
	beginAssistantStreamMessage(initialContent = '') {
		const messageId = `a-${Date.now()}`
		this.activeAssistantMessageId = messageId
		this.streamReplyStarted = !!String(initialContent || '')
		this.messages = this.messages.concat([{
			id: messageId,
			role: 'assistant',
			content: String(initialContent || ''),
			toolCalls: [],
			businessCards: [],
			goalCards: [],
			articleCards: [],
			projectCards: [],
			activityCards: [],
			schoolCards: [],
			inviteCards: [],
			choiceCards: [],
			membershipCards: []
		}])
		this.scrollToBottom()
		return messageId
	},
	updateAssistantStreamText(content = '') {
		const nextContent = String(content || '')
		const messageId = this.activeAssistantMessageId || this.beginAssistantStreamMessage(nextContent)
		const nextMessages = this.messages.map((item) => {
			if (!item || item.id !== messageId) return item
			return {
				...item,
				content: nextContent
			}
		})
		this.messages = nextMessages
		this.streamReplyStarted = !!nextContent
		this.scrollToBottom()
	},
	async sendMessageSyncRequest(content, token) {
		const url = `${getApiBaseUrl()}/chat/sync`
		const { response, payload, statusCode } = await requestJsonWithRefresh({
			url,
			method: 'POST',
			data: { message: content, agentId: this.agentId, sessionId: this.sessionId },
			token
		})

		if (statusCode !== 200 || !isSuccessPayload(payload, response)) {
			const error = buildRequestError(
				payload.error || payload.message || '回复失败',
				statusCode,
				payload.errorCode || payload.code
			)
			error.payload = payload
			error.error = payload.error
			error.code = payload.code
			error.errMsg = payload.errMsg
			throw error
		}

		const data = unwrapPayloadData(payload)
		if (data && data.sessionId) this.sessionId = normalizeText(data.sessionId, this.sessionId)
		if (data) {
			this.resolvedAgentId = normalizeText(
				data.resolvedAgentId || data.agentId,
				this.resolvedAgentId || this.agentId
			)
		}

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
			membershipCards: data && data.membershipCards,
			skillDebug: data && data.skillDebug
		})
	},
	async sendMessageStreamRequest(content, token) {
		const url = `${getApiBaseUrl()}/chat`
		let streamedText = ''
		let completedPayload = null

		const result = await createStreamRequest({
			url,
			token,
			data: { message: content, agentId: this.agentId, sessionId: this.sessionId },
			onEvent: (event) => {
				const eventData = isRecord(event && event.data) ? event.data : {}
				const eventType = normalizeText(event && event.type, '')

				if (eventData.sessionId) {
					this.sessionId = normalizeText(eventData.sessionId, this.sessionId)
				}

				if (eventType === 'start') {
					this.connectionText = '流式回复中'
					return
				}

				if (eventType === 'text') {
					streamedText += String(eventData.delta || '')
					this.updateAssistantStreamText(streamedText)
					this.connectionText = '生成中'
					return
				}

				if (eventType === 'tool_start') {
					this.connectionText = '调用工具中'
					this.upsertAssistantStreamToolCall({
						id: eventData.id,
						name: eventData.name,
						label: eventData.label,
						input: eventData.input,
						inputPreview: eventData.inputPreview,
						params: Object.prototype.hasOwnProperty.call(eventData, 'params')
							? eventData.params
							: eventData.input,
						hasParams: eventData.hasParams,
						state: eventData.state || 'executing'
					})
					return
				}

				if (eventType === 'tool_end') {
					this.connectionText = '生成中'
					this.upsertAssistantStreamToolCall({
						id: eventData.id,
						name: eventData.name,
						label: eventData.label,
						summary: eventData.summary,
						durationMs: eventData.durationMs || eventData.duration,
						state: eventData.state || 'completed'
					})
					return
				}

				if (eventType === 'tool') {
					this.connectionText = '生成中'
					this.upsertAssistantStreamToolCall({
						id: eventData.id,
						name: eventData.name,
						label: eventData.label,
						input: eventData.input,
						inputPreview: eventData.inputPreview,
						params: Object.prototype.hasOwnProperty.call(eventData, 'params')
							? eventData.params
							: eventData.input,
						hasParams: eventData.hasParams,
						summary: eventData.summary,
						durationMs: eventData.durationMs || eventData.duration,
						state: eventData.state || 'completed'
					})
					return
				}

				if (eventType === 'complete') {
					completedPayload = eventData
				}

				if (eventType === 'error') {
					const error = buildRequestError(
						eventData.message || '聊天服务异常',
						500,
						eventData.errorCode || ''
					)
					error.payload = eventData
					error.error = eventData.message
					throw error
				}
			}
		})

		if (result && result.unsupported) {
			return 'unsupported'
		}

		const response = result && result.response
		const statusCode = getResponseStatusCode(response)
		if (statusCode !== 200) {
			const payload = parseStreamResponsePayload(response)
			const error = buildRequestError(
				payload.error || payload.message || '回复失败',
				statusCode,
				payload.errorCode || payload.code
			)
			error.payload = payload
			error.error = payload.error
			error.code = payload.code
			error.errMsg = payload.errMsg
			throw error
		}

		if (completedPayload) {
			this.resolvedAgentId = normalizeText(
				completedPayload.resolvedAgentId || completedPayload.agentId,
				this.resolvedAgentId || this.agentId
			)
		}

		if (completedPayload) {
			this.upsertAssistantPayloadMessage({
				content: normalizeText(
					completedPayload.reply,
					streamedText || '收到，我继续帮你整理。'
				),
				toolCalls: completedPayload.toolCalls,
				businessCards: completedPayload.businessCards,
				goalCards: completedPayload.goalCards,
				articleCards: completedPayload.articleCards,
				projectCards: completedPayload.projectCards,
				activityCards: completedPayload.activityCards,
				schoolCards: completedPayload.schoolCards,
				inviteCards: completedPayload.inviteCards,
				choiceCards: completedPayload.choiceCards,
				membershipCards: completedPayload.membershipCards,
				skillDebug: completedPayload.skillDebug
			})
			return true
		}

		if (streamedText) {
			this.updateAssistantStreamText(streamedText)
			return true
		}

		throw buildRequestError('流式回复为空，请稍后再试', 500, 'EMPTY_STREAM_REPLY')
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
		const hasLocalLogin = hasLocalStoredLogin()
		const forceLogin = hasLocalLogin ? '&forceLogin=1' : ''
		uni.navigateTo({ url: `/pages/auth/login/index?redirect=${redirect}${forceLogin}` })
	},
	openVolunteerInviteEntry() {
		if (!this.currentUserId) {
			this.goToLogin()
			return
		}

		this.shareInviteSheetVisible = true
	},
	closeShareInviteSheet() {
		this.shareInviteSheetVisible = false
	},
	showShareUnlockPrompt() {
		if (!this.currentUserId) {
			this.goToLogin()
			return
		}

		this.openVolunteerInviteEntry()
	},
	async handleAdmissionUnlockPayment() {
		if (!this.currentUserId) {
			this.goToLogin()
			return
		}

		if (this.unlockPaymentProcessing) {
			return
		}

		const paymentAmount = Number(this.admissionUnlockStatus && this.admissionUnlockStatus.paymentAmount) || 19.9
		const confirmed = await new Promise((resolve) => {
			uni.showModal({
				title: '支付解锁高考 AI',
				content: buildVolunteerPaymentConfirmText({
					paymentAmount
				}),
				confirmText: '创建订单',
				success: (res) => resolve(Boolean(res && res.confirm)),
				fail: () => resolve(false)
			})
		})

		if (!confirmed) {
			return
		}

		this.unlockPaymentProcessing = true
		try {
			await startAdmissionUnlockPayment({
				businessName: '高考 AI 对话解锁',
				extraData: {
					scene: 'admission_unlock',
					module: 'ai_chat',
					agentId: this.agentId
				}
			})
			const status = await this.refreshAdmissionUnlockState()
			if (status && status.unlocked) {
				uni.showToast({
					title: '支付成功，已解锁',
					icon: 'success'
				})
			}
		} catch (error) {
			const message = String((error && error.message) || '')
			if (/cancel/i.test(message)) {
				uni.showToast({
					title: '已取消支付',
					icon: 'none'
				})
				return
			}

			uni.showModal({
				title: '支付失败',
				content: message || '支付失败，请稍后重试',
				showCancel: false
			})
		} finally {
			this.unlockPaymentProcessing = false
		}
	},
	contactCustomerService() {
		const phoneNumber = String(VOLUNTEER_CUSTOMER_SERVICE_PHONE || '').trim()
		if (!phoneNumber) return

		uni.setClipboardData({
			data: phoneNumber,
			success: () => {
				uni.showToast({
					title: '号码已复制',
					icon: 'none'
				})
			}
		})
	},
	showVipOpenedServiceModal() {
		const phoneNumber = String(VOLUNTEER_CUSTOMER_SERVICE_PHONE || '').trim()
		if (!phoneNumber) return

		uni.showModal({
			title: '联系客服',
			content: `已开通高考 AI / 查分权限，如需继续协助请联系客服。\n客服电话：${phoneNumber}`,
			confirmText: '复制号码',
			cancelText: '稍后再说',
			success: (res) => {
				if (res && res.confirm) {
					this.contactCustomerService()
				}
			}
		})
	},
	buildVolunteerUnlockSharePayload() {
		const inviterId = normalizeText(this.currentUserId, '')
		const inviterName = normalizeText(this.currentUserName, '') || '一位同学'
		const title = `${inviterName}邀请你解锁高考 AI 对话和查分功能`

		if (!inviterId) {
			return {
				title: '邀请你解锁高考 AI 对话和查分功能',
				path: DIRECT_SCORE_SHARE_ENTRY_PATH
			}
		}

		return {
			title,
			path: `${DIRECT_SCORE_SHARE_ENTRY_PATH}&inviter_id=${encodeURIComponent(inviterId)}&type=business&businessId=admission_unlock&source=volunteer_unlock`
		}
	},
	resetSession() {
		if (this.isSending) return
		this.sessionId = createSessionId()
		this.draftText = ''
		this.messages = []
		this.resolvedAgentId = this.agentId
		this.resolvedAgentName = this.assistantName
		this.skillDebug = {
			activatedSkills: [],
			loadedSkillFiles: [],
			skillPromptChars: 0,
			skillMatchReason: []
		}
		this.profileDebugData = {
			sessionId: '',
			requestedAgentId: this.agentId,
			resolvedAgentId: this.resolvedAgentId || this.agentId,
			resolvedAgentName: this.resolvedAgentName || this.assistantName,
			sessionAgentId: '',
			fetchedAt: '',
			error: '',
			profileSnapshot: null,
			gaokaoSnapshot: null,
			recentUserMessages: []
		}
		this.connectionText = '连接中'
		this.clearAccessPrompt()
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
	async refreshProfileDebugData() {
		const token = await resolveActiveToken()
		if (!token) return

		try {
			const url = `${getApiBaseUrl()}/chat/agents/${encodeURIComponent(this.agentId)}/debug-profile?sessionId=${encodeURIComponent(this.sessionId)}`
			const { response, payload, statusCode } = await requestJsonWithRefresh({
				url,
				method: 'GET',
				token
			})

			if (statusCode !== 200 || !isSuccessPayload(payload, response)) {
				if (statusCode === 404) {
					await this.refreshProfileDebugDataFallback(token)
					return
				}
				this.profileDebugData = {
					sessionId: this.sessionId,
					requestedAgentId: this.agentId,
					resolvedAgentId: this.resolvedAgentId || this.agentId,
					resolvedAgentName: this.resolvedAgentName || this.assistantName,
					sessionAgentId: '',
					fetchedAt: '',
					error: normalizeText(
						payload && (payload.error || payload.message || payload.errMsg || payload.errorCode || payload.code),
						`profile debug 请求失败: ${statusCode || 'unknown'}`
					),
					profileSnapshot: null,
					gaokaoSnapshot: null,
					recentUserMessages: []
				}
				return
			}

			const data = unwrapPayloadData(payload)
			this.profileDebugData = {
				sessionId: normalizeText(data && data.sessionId, this.sessionId),
				requestedAgentId: normalizeText(data && data.requestedAgentId, this.agentId),
				resolvedAgentId: normalizeText(data && data.resolvedAgentId, this.resolvedAgentId || this.agentId),
				resolvedAgentName: normalizeText(data && data.resolvedAgentName, this.resolvedAgentName || this.assistantName),
				sessionAgentId: normalizeText(data && data.sessionAgentId, ''),
				fetchedAt: normalizeText(data && data.fetchedAt, ''),
				error: '',
				profileSnapshot: data && data.profileSnapshot ? data.profileSnapshot : null,
				gaokaoSnapshot: data && data.gaokaoSnapshot ? data.gaokaoSnapshot : null,
				recentUserMessages: Array.isArray(data && data.recentUserMessages) ? data.recentUserMessages : []
			}
		} catch (error) {
			console.warn('[ai-chat] refresh profile debug failed:', error)
			const payload = isRecord(error && error.payload) ? error.payload : {}
			if (String((payload && (payload.error || payload.message)) || error?.message || '').includes('404')) {
				await this.refreshProfileDebugDataFallback(token)
				return
			}
			this.profileDebugData = {
				sessionId: this.sessionId,
				fetchedAt: '',
				error: normalizeText(
					(payload && (payload.error || payload.message)) ||
					error?.message ||
					'profile debug 拉取失败',
					'profile debug 拉取失败'
				),
				profileSnapshot: null,
				gaokaoSnapshot: null,
				recentUserMessages: []
			}
		}
	},
	async refreshProfileDebugDataFallback(token) {
		const requestData = async (path) => {
			try {
				const { response, payload, statusCode } = await requestJsonWithRefresh({
					url: `${getApiBaseUrl()}${path}`,
					method: 'GET',
					token
				})
				if (statusCode !== 200) return null
				return unwrapPayloadData(payload)
			} catch (error) {
				return null
			}
		}

		const [userProfile, gaokaoState, intelligenceBundle, sessionDetail] = await Promise.all([
			requestData('/users/me'),
			requestData('/users/me/gaokao-consultation?noteLimit=20'),
			requestData('/users/me/intelligence?memory_limit=10'),
			requestData(`/sessions/${encodeURIComponent(this.sessionId)}`)
		])

		const session = sessionDetail && sessionDetail.session ? sessionDetail.session : sessionDetail
		const sessionMessages = Array.isArray(session && session.messages) ? session.messages : []
		const recentUserMessages = (sessionMessages.length ? sessionMessages : this.messages || [])
			.filter((item) => item && item.role === 'user' && normalizeText(item.content, ''))
			.slice(-20)
			.map((item) => ({
				id: normalizeText(item.id, ''),
				content: normalizeText(item.content, ''),
				timestamp: normalizeText(item.timestamp || item.dateTime, '')
			}))

		const combinedProfile = {
			userProfile: userProfile || null,
			intelligence: intelligenceBundle || null
		}

		this.profileDebugData = {
			sessionId: this.sessionId,
			fetchedAt: userProfile || gaokaoState || intelligenceBundle || recentUserMessages.length
				? new Date().toISOString()
				: '',
			error: userProfile || gaokaoState || intelligenceBundle || recentUserMessages.length
				? '[]'
				: 'debug-profile 路由未发布，且 fallback 接口也没有取到数据',
			profileSnapshot: combinedProfile,
			gaokaoSnapshot: gaokaoState || null,
			recentUserMessages
		}
	},
	async sendMessage(overrideText = '') {
		const content = normalizeText(overrideText || this.draftText, '')
		if (!content || this.isSending) return
		if (this.showVolunteerUnlockPrompt) {
			uni.showToast({
				title: '请先邀请好友或付费解锁',
				icon: 'none'
			})
			return
		}
		if (this.showPowerPrompt) {
			this.presentPowerPrompt('算力不足，暂时无法继续发送')
			return
		}

		const token = await resolveActiveToken()
		if (!token) {
			this.presentLoginPrompt('请先登录后再试')
			this.appendAssistantMessage('登录后才能继续聊。')
			return
		}

		this.messages = this.messages.concat([{ id: `u-${Date.now()}`, role: 'user', content }])
		this.draftText = ''
		this.isSending = true
		this.streamReplyStarted = false
		this.activeAssistantMessageId = ''
		this.connectionText = '响应中'
		this.scrollToBottom()

		try {
			const shouldUseStream = normalizeText(this.transportMode, 'stream') !== 'sync'
			if (shouldUseStream) {
				const streamed = await this.sendMessageStreamRequest(content, token)
				if (streamed === 'unsupported') {
					await this.sendMessageSyncRequest(content, token)
				}
			} else {
				await this.sendMessageSyncRequest(content, token)
			}

			if (Number(this.aiPowerRemaining) > 0) {
				this.aiPowerRemaining = Math.max(0, Math.floor(Number(this.aiPowerRemaining) - 1))
			}
			this.connectionText = '已就绪'
			this.clearAccessPrompt()
		} catch (error) {
			console.error('[ai-chat] send failed', error)
			const errorPayload = isRecord(error && error.payload) ? error.payload : error
			const hasPartialAssistantReply =
				!!this.activeAssistantMessageId ||
				this.messages.some((item) => item && item.role === 'assistant' && normalizeText(item.content, ''))
			if (hasAuthFailure(error.statusCode, errorPayload)) {
				this.presentLoginPrompt('AI 接口认证未通过，请重新登录后再试', { authRejected: true })
			} else if (hasPowerFailure(error.statusCode, errorPayload)) {
				this.presentPowerPrompt('算力不足，暂时无法继续发送')
			} else if (hasServiceFailure(error.statusCode, errorPayload)) {
				this.appendAssistantMessage('小春鹿这会儿有点忙，AI 服务暂时不可用，稍后再试就好。')
				this.connectionText = '服务异常'
				uni.showToast({ title: 'AI 服务暂时不可用', icon: 'none' })
				return
			}
			if (!hasPartialAssistantReply) {
				this.appendAssistantMessage('这次请求没成功，你可以稍后再试。')
			}
			if (!hasServiceFailure(error.statusCode, errorPayload)) {
				uni.showToast({
					title: hasPartialAssistantReply ? '回复中断，请稍后再试' : '发送失败',
					icon: 'none'
				})
			}
			this.connectionText = hasAuthFailure(error.statusCode, errorPayload)
				? '登录失效'
				: hasPowerFailure(error.statusCode, errorPayload)
					? '算力不足'
					: hasServiceFailure(error.statusCode, errorPayload)
						? '服务异常'
						: hasPartialAssistantReply
							? '回复中断'
							: '发送失败'
		} finally {
			this.isSending = false
			this.streamReplyStarted = false
			this.activeAssistantMessageId = ''
			await this.refreshProfileDebugData()
			this.scrollToBottom()
		}
	}
}
