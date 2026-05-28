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
import { getCurrentUserInfo, getHttpService, normalizeUserInfo } from '@/utils/http-services'
import {
	CHAT_PATH,
	DEFAULT_AGENT_ID,
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

const MID_BODY_PROTOCOL_BRACKETS = new Set(['{', '}', '[', ']', '｛', '｝', '［', '］'])

function normalizeMidBodyProtocolLineBreaks(value = '') {
	return String(value || '')
		.replace(/[}｝]\s*[{｛]/g, '\n')
		.replace(/[\]］]\s*[\[［]/g, '\n')
}

function stripVisibleFormattingMarkers(value = '') {
	return String(value || '').replace(/\*\*(.+?)\*\*/g, '$1')
}

function stripMidBodyProtocolBrackets(value = '') {
	const source = String(value || '')
	if (!source) {
		return ''
	}

	const chars = Array.from(source)
	let firstVisibleIndex = 0
	while (firstVisibleIndex < chars.length && /\s/.test(chars[firstVisibleIndex])) {
		firstVisibleIndex += 1
	}

	let lastVisibleIndex = chars.length - 1
	while (lastVisibleIndex >= 0 && /\s/.test(chars[lastVisibleIndex])) {
		lastVisibleIndex -= 1
	}

	if (firstVisibleIndex >= lastVisibleIndex) {
		return source
	}

	const cleaned = chars
		.filter((char, index) => {
			if (index <= firstVisibleIndex || index >= lastVisibleIndex) {
				return true
			}
			return !MID_BODY_PROTOCOL_BRACKETS.has(char)
		})
		.join('')

	return cleaned.replace(/^\s*[\[{｛［]\s*/, '').replace(/\s*[\]｝}］]\s*$/, '')
}

function normalizeFixedQaKey(value = '') {
	return String(value || '')
		.trim()
		.toLowerCase()
		.replace(/[\s，。！？；：、,.!?;:“”"'（）()\[\]{}<>《》·—\-]/g, '')
}

function enrichPromptEntryWithReply(item = {}, replyMap = {}) {
	if (!item || typeof item !== 'object') return item
	const label = normalizeText(item.label, '')
	const action = normalizeText(item.action, '')
	const routeUrl = normalizeText(item.routeUrl, '')
	const reply = normalizeText(
		item.reply ||
		item.fixedReply ||
		resolveFixedQaReplyFromMap({ ...item, label, action }, replyMap),
		''
	)

	return {
		...item,
		label,
		action: action || label,
		routeUrl,
		reply
	}
}

function enrichPromptCollectionWithReplies(prompts = [], replyMap = {}) {
	return (Array.isArray(prompts) ? prompts : []).map((item) => enrichPromptEntryWithReply(item, replyMap))
}

function enrichIntroTopicsWithReplies(topics = [], replyMap = {}) {
	return (Array.isArray(topics) ? topics : []).map((topic) => {
		if (!topic || typeof topic !== 'object') return topic
		return {
			...topic,
			guessPrompts: enrichPromptCollectionWithReplies(topic.guessPrompts, replyMap),
			suggestionPrompts: enrichPromptCollectionWithReplies(topic.suggestionPrompts, replyMap)
		}
	})
}

function normalizeFixedQaLookupKey(value) {
	return normalizeText(value, '')
		.toLowerCase()
		.replace(/[\s，。！？；：、,.!?;:“”"'（）()\[\]{}<>《》·—\-]/g, '')
}

function buildFixedQaReplyMap(entries = []) {
	return (Array.isArray(entries) ? entries : []).reduce((acc, entry) => {
		const question = normalizeText(entry && entry.question, '')
		const answer = normalizeText(entry && entry.answer, '')
		const entryKey = normalizeText(entry && entry.entryKey, '')
		if (question && answer) {
			acc[normalizeFixedQaLookupKey(question)] = answer
		}
		if (entryKey && answer) {
			acc[`key:${normalizeFixedQaLookupKey(entryKey)}`] = answer
		}
		return acc
	}, {})
}

function resolveFixedQaReplyFromMap(item = {}, replyMap = {}) {
	const candidates = [
		item && item.reply,
		item && item.fixedReply,
		item && item.answer,
		item && item.response,
		item && item.action,
		item && item.label,
		item && item.question,
		item && item.entryKey
	]

	for (let i = 0; i < candidates.length; i += 1) {
		const candidate = normalizeText(candidates[i], '')
		if (!candidate) continue
		const answer = replyMap[normalizeFixedQaLookupKey(candidate)] || replyMap[`key:${normalizeFixedQaLookupKey(candidate)}`]
		if (answer) return answer
	}

	return ''
}

function enrichPromptItemWithFixedReply(item, replyMap = {}) {
	if (typeof item === 'string') {
		const text = normalizeText(item, '')
		if (!text) return null
		return {
			label: text,
			action: text,
			routeUrl: '',
			reply: resolveFixedQaReplyFromMap({ label: text, action: text }, replyMap)
		}
	}

	if (!item || typeof item !== 'object') return null
	const label = normalizeText(item.label || '', '')
	const action = normalizeText(item.action || label, '')
	if (!label && !action) return null

	return {
		...item,
		label,
		action: action || label,
		routeUrl: normalizeText(item.routeUrl || '', ''),
		reply: normalizeText(
			item.reply || item.fixedReply || resolveFixedQaReplyFromMap({ ...item, label, action }, replyMap),
			''
		)
	}
}

function enrichPromptArrayWithFixedReplies(prompts = [], replyMap = {}) {
	return (Array.isArray(prompts) ? prompts : [])
		.map((item) => enrichPromptItemWithFixedReply(item, replyMap))
		.filter(Boolean)
}

function enrichIntroTopicsWithFixedReplies(topics = [], replyMap = {}) {
	return (Array.isArray(topics) ? topics : [])
		.map((topic) => {
			if (!topic || typeof topic !== 'object') return null
			return {
				...topic,
				guessPrompts: enrichPromptArrayWithFixedReplies(topic.guessPrompts, replyMap),
				suggestionPrompts: enrichPromptArrayWithFixedReplies(topic.suggestionPrompts, replyMap)
			}
		})
		.filter(Boolean)
}

function compactToolText(value) {
	return String(value || '')
		.replace(/\{\s*query\s*\}/gi, '')
		.replace(/(^|\n)\s*(query|url|link|href)\s*[:：]\s*/gi, '$1')
		.replace(/\s+/g, ' ')
		.trim()
}

function resolveToolDisplayName(toolName = '', toolLabel = '') {
	const name = normalizeText(toolName, '')
	const label = normalizeText(toolLabel, '')
	const normalizedName = name.toLowerCase()
	const normalizedLabel = label.toLowerCase()

	if (
		normalizedName === 'web_search' ||
		normalizedLabel === 'web search' ||
		normalizedLabel === 'web research summary' ||
		normalizedLabel === '网页研究总结'
	) {
		return '网页研究总结'
	}

	if (
		normalizedName === 'web_fetch' ||
		normalizedLabel === '网页正文抓取' ||
		normalizedLabel === '网页正文提取'
	) {
		return '网页正文提取'
	}

	if (normalizedName.includes('update_current_user_intelligence')) {
		return '更新用户画像'
	}

	if (normalizedName.includes('get_current_user_profile_snapshot')) {
		return '读取用户画像'
	}

	if (normalizedName.includes('search_yunnan_admission_school_detail')) {
		return '院校详情核验'
	}

	if (normalizedName.includes('search_yunnan_admission')) {
		return '云南志愿检索'
	}

	if (normalizedName.includes('search_web_search_knowledge')) {
		return '历史搜索知识库'
	}

	return label || name || '工具'
}

function isWebSearchTool(toolName = '', toolLabel = '') {
	const name = normalizeText(toolName, '').toLowerCase()
	const label = normalizeText(toolLabel, '').toLowerCase()
	return (
		name === 'web_search' ||
		label === 'web search' ||
		label === 'web research summary' ||
		label === '网页研究总结'
	)
}

function isWebFetchTool(toolName = '', toolLabel = '') {
	const name = normalizeText(toolName, '').toLowerCase()
	const label = normalizeText(toolLabel, '').toLowerCase()
	return (
		name === 'web_fetch' ||
		label === '网页正文抓取' ||
		label === '网页正文提取'
	)
}

function isProfileReadTool(toolName = '', toolLabel = '') {
	const name = normalizeText(toolName, '').toLowerCase()
	const label = normalizeText(toolLabel, '').toLowerCase()
	return (
		name.includes('get_current_user_profile_snapshot') ||
		label === '读取用户画像'
	)
}

function isProfileWriteTool(toolName = '', toolLabel = '') {
	const name = normalizeText(toolName, '').toLowerCase()
	const label = normalizeText(toolLabel, '').toLowerCase()
	return (
		name.includes('update_current_user_intelligence') ||
		label === '更新用户画像'
	)
}

function isProfileTool(toolName = '', toolLabel = '') {
	return isProfileReadTool(toolName, toolLabel) || isProfileWriteTool(toolName, toolLabel)
}

function isPendingToolState(state = '') {
	const normalized = normalizeText(state, '').toLowerCase()
	return normalized === 'executing' || normalized === 'running' || normalized === 'pending'
}

function resolveProfileToolSummary(toolName = '', state = '') {
	const normalizedState = normalizeText(state, '').toLowerCase()
	if (isProfileReadTool(toolName)) {
		if (normalizedState === 'failed' || normalizedState === 'error') return '读取用户画像失败'
		if (isPendingToolState(normalizedState)) return '正在读取当前用户画像'
		return '已读取当前用户画像'
	}
	if (isProfileWriteTool(toolName)) {
		if (normalizedState === 'failed' || normalizedState === 'error') return '更新用户画像失败'
		if (isPendingToolState(normalizedState)) return '正在更新当前用户画像'
		return '已更新当前用户画像'
	}
	return ''
}

function resolveToolSemanticKey(tool = {}) {
	const name = normalizeText(tool && tool.name, '').toLowerCase()
	const label = normalizeText(tool && tool.label, '').toLowerCase()
	return `${name}::${label}`
}

function parseJsonLikeToolPayload(value) {
	if (typeof value !== 'string') return null
	const text = String(value || '').trim()
	if (!text) return null
	if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
		try {
			return JSON.parse(text)
		} catch (error) {
			return null
		}
	}
	return null
}

function extractToolDisplayText(value, limit = 0) {
	const text = normalizeText(value, '')
		.replace(/\{\s*query\s*\}/gi, '')
		.replace(/(^|\n)\s*(query|url|link|href)\s*[:：]\s*/gi, '$1')
	if (!text) return ''
	return limit > 0 ? clipInlineText(text, limit) : text
}

function splitToolPreviewSegments(value, limit = 36, maxItems = 4) {
	const text = normalizeText(value, '')
		.replace(/\{\s*query\s*\}/gi, '')
		.replace(/(^|\n)\s*(query|url|link|href)\s*[:：]\s*/gi, '$1')
	if (!text) return []

	const segments = text
		.split(/[\n。！？；;]+/g)
		.map((item) => clipInlineText(item, limit))
		.map((item) => normalizeText(item, ''))
		.filter(Boolean)

	if (segments.length) {
		return Array.from(new Set(segments)).slice(0, maxItems)
	}

	return [clipInlineText(text, limit)]
}

function resolveWebResearchLoadingSegments(tool = {}) {
	if (isWebSearchTool(tool && tool.name, tool && tool.label)) {
		return ['正在搜索', '正在筛选高相关网页', '正在整理研究总结']
	}

	if (isWebFetchTool(tool && tool.name, tool && tool.label)) {
		return ['正在抓取网页正文', '正在提取关键段落', '正在整理网页信息']
	}

	return ['正在调用网页工具']
}

function extractSafeWebResearchText(value) {
	const text = normalizeText(value, '')
	if (!text) return ''

	const parsed = parseJsonLikeToolPayload(text)
	if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
		return extractToolDisplayText(
			parsed.summary ||
			parsed.content ||
			parsed.body ||
			parsed.text ||
			parsed.message ||
			'',
			0
		)
	}

	if (
		/^\s*\{/.test(text) ||
		/^\s*"?\s*(query|url|link|href|keyword|keywords|search)\s*"?\s*[:：]/i.test(text)
	) {
		return ''
	}

	return extractToolDisplayText(text, 0)
}

function buildWebResearchPresentation(tool = {}, fallbackParams = '') {
	const isWebResearch =
		isWebSearchTool(tool && tool.name, tool && tool.label) ||
		isWebFetchTool(tool && tool.name, tool && tool.label)

	if (!isWebResearch) {
		return null
	}

	const parsedSummary = parseJsonLikeToolPayload(tool && tool.summary)
	const parsedParams = parseJsonLikeToolPayload(fallbackParams)
	const summaryBody = parsedSummary && typeof parsedSummary === 'object'
		? (
			parsedSummary.summary ||
			parsedSummary.content ||
			parsedSummary.body ||
			parsedSummary.text ||
			parsedSummary.message
		)
		: ''
	const paramsBody = parsedParams && typeof parsedParams === 'object'
		? (
			parsedParams.summary ||
			parsedParams.content ||
			parsedParams.body ||
			parsedParams.text ||
			parsedParams.message
		)
		: ''
	const resultText = extractToolDisplayText(
		summaryBody ||
		(tool && tool.summary) ||
		paramsBody ||
		'',
		0
	)
	const safeInputPreview = extractSafeWebResearchText(tool && tool.inputPreview)
	const previewSource = resultText || safeInputPreview
	const previewSegments = resultText
		? splitToolPreviewSegments(previewSource, 34, 5)
		: resolveWebResearchLoadingSegments(tool)

	return {
		isWebResearch: true,
		resultText,
		previewSegments,
	}
}

function extractWebResearchLivePreviewText(inputPreview = '') {
	return extractSafeWebResearchText(inputPreview)
}

function syncCurrentUserProfile(ctx) {
	const userInfo = extractDisplayUserInfo()
	const cachedUserInfo = normalizeUserInfo(getCurrentUserInfo())
	ctx.currentUserId = userInfo.userId || ''
	ctx.currentUserName = userInfo.nickname || '我'
	ctx.currentUserAvatarUrl = userInfo.avatar || ''
	ctx.currentUserProfileInfo = cachedUserInfo
	ctx.currentUserIsCampusPartner = hasCampusPartnerIdentity(cachedUserInfo)
}

function toIdentitySignalList(value) {
	if (Array.isArray(value)) {
		return value
	}
	if (value === undefined || value === null || value === '') {
		return []
	}
	return [value]
}

function hasCampusPartnerIdentity(userInfo = {}) {
	const source = userInfo && typeof userInfo === 'object' ? userInfo : {}
	const profile = source.profile && typeof source.profile === 'object' ? source.profile : {}
	const membership = source.membership && typeof source.membership === 'object' ? source.membership : {}
	const teamInfo = source.team_info && typeof source.team_info === 'object'
		? source.team_info
		: (source.teamInfo && typeof source.teamInfo === 'object' ? source.teamInfo : {})
	const partnerInfo = source.partner_info && typeof source.partner_info === 'object'
		? source.partner_info
		: (source.partnerInfo && typeof source.partnerInfo === 'object' ? source.partnerInfo : {})
	const signalParts = [
		...toIdentitySignalList(source.role),
		...toIdentitySignalList(source.type),
		...toIdentitySignalList(source.identities),
		...toIdentitySignalList(source.identityTags),
		normalizeText(source.membership_segment, ''),
		normalizeText(source.membership_segment_label, ''),
		normalizeText(source.memberIdentity, ''),
		normalizeText(source.memberIdentityLabel, ''),
		normalizeText(source.badge, ''),
		normalizeText(membership.segment, ''),
		normalizeText(membership.segmentLabel, ''),
		normalizeText(membership.memberIdentity, ''),
		normalizeText(membership.memberIdentityLabel, ''),
		membership.hasCampusPartnerMembership ? 'campus_partner' : '',
		(source.team_id || source.teamId || teamInfo.team_id || teamInfo.teamId) ? 'campus_partner' : '',
		normalizeText(source.team_id || source.teamId, ''),
		normalizeText(teamInfo.team_id || teamInfo.teamId, ''),
		normalizeText(teamInfo.position, ''),
		normalizeText(teamInfo.status, ''),
		normalizeText(partnerInfo.level, ''),
		normalizeText(partnerInfo.status, ''),
		normalizeText(partnerInfo.partner_id, ''),
		normalizeText(profile.badge, ''),
		normalizeText(profile.role, ''),
		normalizeText(profile.type, ''),
	]
		.map((item) => normalizeText(item, '').toLowerCase())
		.filter(Boolean)

	return signalParts.some((item) => /校园合伙人|校园大使|共建者|campus[_-\s]?partner|partner/.test(item))
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
				const isRecoverableMidStreamFailure =
					!sawCompleteEvent &&
					!sawErrorEvent &&
					(eventCount > 0 || chunkCount > 0) &&
					/network error|ERR_INCOMPLETE_CHUNKED_ENCODING|abort|fail|timeout/i.test(errMsg)

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

				if (isRecoverableMidStreamFailure) {
					console.warn('[ai-chat] mid-stream failure will enter recovery mode:', errMsg || error)
					finish(resolve, {
						unsupported: false,
						response: {
							statusCode: 200,
							data: '',
							errMsg
						},
						interrupted: true,
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
	campus_score_ambassador: {
		title: '校园查分大使入口',
		badgeByIntent: {
			purchase: '查分入口',
			upgrade: '推荐查看',
			renew: '续费提醒'
		},
		pillText: '查分路径',
		benefitsByIntent: {
			purchase: ['适合先了解查分与成长板块', '看完资料后再决定下一步', '先把方向、目标和节奏定清楚'],
			upgrade: ['先补齐查分基础，再决定下一步', '适合先把个人目标设起来', '更容易判断自己适合哪条路径'],
			renew: ['继续保留当前查分节奏', '继续补齐目标与资料查看', '再决定是否进入更深的路径']
		},
		buttonTextByIntent: {
			purchase: '去设定目标',
			upgrade: '去设定目标',
			renew: '去设定目标'
		}
	},
	campus_partner: {
		title: '校园合伙人入口',
		badgeByIntent: {
			purchase: '小春鹿推荐',
			upgrade: '推荐查看',
			renew: '续费提醒'
		},
		pillText: '团队入口',
		summaryByIntent: {
			purchase: '先看团队加入入口、适合谁、加入后怎么开始，避免刚进来就把问题问偏了。',
			upgrade: '如果你已经有一些基础，先看团队入口和协同路径，会更容易判断下一步怎么走。',
			renew: '先看当前团队入口和身份状态，再决定接下来是续费、参与还是继续往下推进。'
		},
		benefitsByIntent: {
			purchase: ['适合想先了解团队和业务起步的同学', '先把团队入口和节奏看清楚', '再决定要不要往下走'],
			upgrade: ['更适合想进入协同与实践路径', '先确认入口再做决定', '如果你已经有基础，可直接看团队路径'],
			renew: ['适合先看清入口和状态', '继续保留当前团队路径', '再决定下一步动作']
		},
		buttonTextByIntent: {
			purchase: '去看合伙人',
			upgrade: '去看合伙人',
			renew: '去看合伙人'
		}
	},
	gaokao_teacher: {
		title: '高考咨询老师',
		badgeByIntent: {
			purchase: '高考AI',
			upgrade: '推荐分流',
			renew: '继续咨询'
		},
		pillText: '志愿填报',
		benefitsByIntent: {
			purchase: ['分数、位次、学校、专业问题更适合在这里问', '会按高考咨询场景来接，不容易答偏', '适合直接去高考 AI 老师那边继续问'],
			upgrade: ['如果你已经在问高考问题，直接切到这里更准', '会按志愿填报逻辑继续承接', '不用在小春鹿这里绕一层'],
			renew: ['继续沿着高考问题往下问更顺', '方便延续上一轮志愿咨询', '适合继续看学校和专业建议']
		},
		buttonTextByIntent: {
			purchase: '去高考 AI',
			upgrade: '去高考 AI',
			renew: '继续咨询'
		}
	}
}

function normalizeMembershipCardType(value) {
	const normalized = normalizeText(value, '').toLowerCase()
	if (!normalized) return ''
	if (
		normalized === 'student' ||
		normalized === 'member' ||
		normalized === 'campus_score_ambassador' ||
		normalized === 'campus-score-ambassador' ||
		normalized.includes('学生证') ||
		normalized.includes('会员') ||
		normalized.includes('校园查分大使') ||
		normalized.includes('查分大使')
	) {
		return 'campus_score_ambassador'
	}
	if (
		normalized === 'gaokao_teacher' ||
		normalized === 'gaokao-teacher' ||
		normalized.includes('高考咨询老师') ||
		normalized.includes('高考老师') ||
		normalized.includes('高考ai') ||
		normalized.includes('志愿老师')
	) {
		return 'gaokao_teacher'
	}
	if (
		normalized === 'campus_partner' ||
		normalized === 'campus-partner' ||
		normalized.includes('校园合伙人') ||
		normalized.includes('共建者') ||
		normalized.includes('校园大使') ||
		normalized.includes('合伙人')
	) {
		return 'campus_partner'
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
	if (cardType === 'gaokao_teacher') {
		return `${CHAT_PATH}?agentId=${encodeURIComponent(DEFAULT_AGENT_ID)}`
	}
	if (cardType === 'campus_score_ambassador') {
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
	const label = resolveToolDisplayName(name, tool && tool.label)
	const toolVariant = (() => {
		if (isWebSearchTool(name, label)) return 'web-search'
		if (isWebFetchTool(name, label)) return 'web-fetch'
		return ''
	})()
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
	const rawInputPreview = clipInlineText(inputSource, 120)
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
	const webResearchPresentation = buildWebResearchPresentation(tool, typeof params === 'string' ? params : '')
	const shouldHideParams = !!(webResearchPresentation && webResearchPresentation.resultText)
	const normalizedState = normalizeText(tool && tool.state, '').toLowerCase()
	const isLiveWebResearch =
		!!toolVariant &&
		!shouldHideParams &&
		(normalizedState === 'executing' || normalizedState === 'running' || normalizedState === 'pending')
	const livePreviewText = isLiveWebResearch
		? extractWebResearchLivePreviewText(rawInputPreview)
		: ''
	const livePreviewFallback = isLiveWebResearch
		? resolveWebResearchLoadingSegments(tool)[0]
		: ''
	const isProfileToolCall = isProfileTool(name, label)
	const profileToolSummary = isProfileToolCall ? resolveProfileToolSummary(name, normalizedState) : ''
	const inputPreview = isProfileToolCall
		? profileToolSummary
		: toolVariant === 'web-search' || toolVariant === 'web-fetch'
		? extractWebResearchLivePreviewText(rawInputPreview) || livePreviewFallback
		: rawInputPreview
	const summary = isProfileToolCall
		? profileToolSummary
		: webResearchPresentation && webResearchPresentation.resultText
		? webResearchPresentation.resultText
		: (livePreviewText || livePreviewFallback || clipInlineText(tool && tool.summary, 160))

	return {
		id: normalizeText(tool && tool.id, `${name || 'tool'}-${index}-${Date.now()}`),
		name,
		label,
		params,
		hasParams: isProfileToolCall ? false : (shouldHideParams ? false : hasParams),
		inputPreview,
		summary,
		fullSummary: isProfileToolCall
			? profileToolSummary
			: webResearchPresentation && webResearchPresentation.resultText
			? webResearchPresentation.resultText
			: normalizeText(tool && tool.summary, ''),
		previewSegments: isProfileToolCall
			? [profileToolSummary]
			: webResearchPresentation
			? webResearchPresentation.previewSegments
			: (livePreviewText ? splitToolPreviewSegments(livePreviewText, 34, 5) : []),
		isWebResearchSummary: !!webResearchPresentation,
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
			const articleId = normalizeText(item && (item.articleId || item.article_id || item.articleld || item.id || item._id), '')
			const title = clipInlineText(item && (item.title || item.articleTitle || item.name), 40)
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

function safeJsonStringify(value, fallback = '') {
	try {
		return JSON.stringify(value, null, 2)
	} catch (error) {
		return fallback || String(value || '')
	}
}

function summarizeStreamEventPayload(eventData = {}) {
	if (!isRecord(eventData)) return ''
	if (eventData.delta) return clipInlineText(eventData.delta, 80)
	if (eventData.summary) return clipInlineText(eventData.summary, 80)
	if (eventData.reply) return clipInlineText(eventData.reply, 80)
	if (eventData.message) return clipInlineText(eventData.message, 80)
	if (eventData.name) return clipInlineText(resolveToolDisplayName(eventData.name, eventData.label), 80)
	return clipInlineText(safeJsonStringify(eventData), 80)
}

function sleep(ms = 0) {
	return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)))
}

function createMessageId(ctx, rolePrefix = 'm') {
	const nextSeed = Number(ctx && ctx.messageIdSeed) + 1
	ctx.messageIdSeed = Number.isFinite(nextSeed) ? nextSeed : 1
	return `${rolePrefix}-${Date.now()}-${ctx.messageIdSeed}`
}

function markRequestDebug(ctx, {
	url = '',
	method = 'POST',
	transportMode = '',
	startedAt = Date.now()
} = {}) {
	ctx.runtimeDebugData = {
		...ctx.runtimeDebugData,
		requestApi: String(url || ''),
		requestMethod: String(method || 'POST').toUpperCase(),
		requestTransportMode: String(transportMode || ''),
		requestStartedAt: new Date(startedAt).toISOString(),
		firstReplyAt: '',
		firstReplyMs: 0,
		firstReplyEventType: '',
		requestCompletedAt: '',
		requestTotalMs: 0,
		lastStatusCode: 0
	}
}

function markFirstReplyDebug(ctx, eventType = '', at = Date.now()) {
	const runtime = ctx.runtimeDebugData || {}
	if (runtime.firstReplyAt) return
	const startedAtMs = Date.parse(runtime.requestStartedAt || '')
	ctx.runtimeDebugData = {
		...runtime,
		firstReplyAt: new Date(at).toISOString(),
		firstReplyMs: Number.isFinite(startedAtMs) ? Math.max(0, at - startedAtMs) : 0,
		firstReplyEventType: String(eventType || '')
	}
}

function markRequestCompletedDebug(ctx, {
	at = Date.now(),
	statusCode = 0
} = {}) {
	const runtime = ctx.runtimeDebugData || {}
	const startedAtMs = Date.parse(runtime.requestStartedAt || '')
	ctx.runtimeDebugData = {
		...runtime,
		requestCompletedAt: new Date(at).toISOString(),
		requestTotalMs: Number.isFinite(startedAtMs) ? Math.max(0, at - startedAtMs) : 0,
		lastStatusCode: Number(statusCode) || 0
	}
}

function setActiveAssistantSegment(ctx, kind = '', messageId = '') {
	ctx.activeAssistantSegmentKind = String(kind || '')
	ctx.activeAssistantMessageId = String(messageId || '')
	if (ctx.activeAssistantSegmentKind !== 'text') {
		ctx.activeAssistantSegmentText = ''
	}
}

function ensureAssistantStreamSegment(ctx, kind = 'text', initialContent = '') {
	const normalizedKind = kind === 'tool' ? 'tool' : 'text'
	if (ctx.activeAssistantMessageId) {
		setActiveAssistantSegment(ctx, normalizedKind, ctx.activeAssistantMessageId)
		return ctx.activeAssistantMessageId
	}

	const messageId = ctx.beginAssistantStreamMessage(initialContent, normalizedKind)
	setActiveAssistantSegment(ctx, normalizedKind, messageId)
	return messageId
}

function hasToolMessageAfterLastUser(messages = []) {
	if (!Array.isArray(messages) || !messages.length) return false
	let seenUser = false
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const item = messages[index]
		if (!item) continue
		if (item.role === 'user') {
			seenUser = true
			break
		}
		if (item.role === 'assistant' && Array.isArray(item.toolCalls) && item.toolCalls.length) {
			return true
		}
	}
	return !seenUser
		? messages.some((item) => item && item.role === 'assistant' && Array.isArray(item.toolCalls) && item.toolCalls.length)
		: false
}

function collectAssistantTextAfterLastUser(messages = []) {
	if (!Array.isArray(messages) || !messages.length) return ''
	const collected = []
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const item = messages[index]
		if (!item) continue
		if (item.role === 'user') break
		if (item.role !== 'assistant') continue
		const text = normalizeText(item.content, '')
		if (text) {
			collected.unshift(text)
		}
	}
	return collected.join('')
}

function resolveAppendedAssistantText(fullText = '', messages = []) {
	const normalizedFullText = normalizeText(fullText, '')
	if (!normalizedFullText) return ''
	const existingText = collectAssistantTextAfterLastUser(messages)
	if (!existingText) return normalizedFullText
	if (normalizedFullText.startsWith(existingText)) {
		return normalizeText(normalizedFullText.slice(existingText.length), '')
	}
	return normalizedFullText
}

function stripKnownReplyMetaTags(value = '') {
	return String(value || '')
		.replace(/<business(?:[_\s-]*card)(?:[_\s-]*meta)>[\s\S]*?<\/business(?:[_\s-]*card)(?:[_\s-]*meta)>/gi, '')
		.replace(/<article(?:[_\s-]*card)(?:[_\s-]*meta)>[\s\S]*?<\/article(?:[_\s-]*card)(?:[_\s-]*meta)>/gi, '')
		.replace(/<invite(?:[_\s-]*card)(?:[_\s-]*meta)>[\s\S]*?<\/invite(?:[_\s-]*card)(?:[_\s-]*meta)>/gi, '')
		.replace(/<project(?:[_\s-]*card)(?:[_\s-]*meta)>[\s\S]*?<\/project(?:[_\s-]*card)(?:[_\s-]*meta)>/gi, '')
		.replace(/<activity(?:[_\s-]*card)(?:[_\s-]*meta)>[\s\S]*?<\/activity(?:[_\s-]*card)(?:[_\s-]*meta)>/gi, '')
		.replace(/<course(?:[_\s-]*card)(?:[_\s-]*meta)>[\s\S]*?<\/course(?:[_\s-]*card)(?:[_\s-]*meta)>/gi, '')
		.replace(/<membership(?:[_\s-]*card)(?:[_\s-]*meta)>[\s\S]*?<\/membership(?:[_\s-]*card)(?:[_\s-]*meta)>/gi, '')
		.replace(/<choice(?:[_\s-]*card)(?:[_\s-]*meta)>[\s\S]*?<\/choice(?:[_\s-]*card)(?:[_\s-]*meta)>/gi, '')
		.replace(/<reply(?:[_\s-]*json)>[\s\S]*?<\/reply(?:[_\s-]*json)>/gi, '')
		.trim()
}

function extractFlexibleXmlReplySection(source = '', tagName = 'reply') {
	const normalized = String(source || '')
		.replace(/＜/g, '<')
		.replace(/＞/g, '>')
	const openRegex = new RegExp(`<${tagName}(?:\\s[^>]*)?>`, 'i')
	const openMatch = openRegex.exec(normalized)
	if (!openMatch || typeof openMatch.index !== 'number') {
		return null
	}

	const openStart = openMatch.index
	const openEnd = openStart + openMatch[0].length
	const closeRegex = new RegExp(`</${tagName}\\s*>`, 'i')
	const closeMatch = closeRegex.exec(normalized.slice(openEnd))
	const closeStart = closeMatch && typeof closeMatch.index === 'number'
		? openEnd + closeMatch.index
		: normalized.length

	return {
		openStart,
		visibleSlice: normalized.slice(openEnd, closeStart)
	}
}

function extractBracketedVisibleReplyText(value = '') {
	return splitBracketedVisibleReplyText(value).visibleText
}

function splitBracketedVisibleReplyText(value = '') {
	const source = stripKnownReplyMetaTags(value)
	if (!source) {
		return {
			thinkingText: '',
			visibleText: ''
		}
	}
	const normalized = source
		.replace(/｛/g, '{')
		.replace(/｝/g, '}')
		.replace(/［/g, '[')
		.replace(/］/g, ']')
	const replySection = extractFlexibleXmlReplySection(normalized, 'reply')
	if (replySection) {
		return {
			thinkingText: normalizeText(source.slice(0, replySection.openStart), ''),
			visibleText: normalizeText(
				stripVisibleFormattingMarkers(
					stripMidBodyProtocolBrackets(
						normalizeMidBodyProtocolLineBreaks(replySection.visibleSlice)
					)
				),
				''
			)
		}
	}
	const dialectSection = extractFlexibleXmlReplySection(normalized, '方言回复')
	if (dialectSection) {
		return {
			thinkingText: normalizeText(source.slice(0, dialectSection.openStart), ''),
			visibleText: normalizeText(
				stripVisibleFormattingMarkers(
					stripMidBodyProtocolBrackets(
						normalizeMidBodyProtocolLineBreaks(dialectSection.visibleSlice)
					)
				),
				''
			)
		}
	}
	const pairs = [
		{ open: '[', close: ']' },
		{ open: '{', close: '}' }
	]

	for (const pair of pairs) {
		const startIndex = normalized.indexOf(pair.open)
		if (startIndex < 0) continue

		let depth = 0
		for (let index = startIndex; index < normalized.length; index += 1) {
			const char = normalized[index]
			if (char === pair.open) {
				depth += 1
				continue
			}
			if (char === pair.close) {
				depth -= 1
				if (depth === 0) {
					return {
						thinkingText: normalizeText(source.slice(0, startIndex), ''),
						visibleText: normalizeText(normalized.slice(startIndex + 1, index), '')
					}
				}
			}
		}

		return {
			thinkingText: normalizeText(source.slice(0, startIndex), ''),
			visibleText: normalizeText(normalized.slice(startIndex + 1), '')
		}
	}

	return {
		thinkingText: normalizeText(source, ''),
		visibleText: ''
	}
}

function extractRecoveredAssistantPayload(formattedMessages = []) {
	if (!Array.isArray(formattedMessages) || !formattedMessages.length) return null
	const messages = formattedMessages.filter(Boolean)
	const lastUserIndex = (() => {
		for (let index = messages.length - 1; index >= 0; index -= 1) {
			if (messages[index] && messages[index].role === 'user') return index
		}
		return -1
	})()
	for (let index = messages.length - 1; index > lastUserIndex; index -= 1) {
		const item = messages[index]
		if (!item || item.role !== 'assistant') continue
		const content = normalizeText(item.content, '')
		const toolCalls = Array.isArray(item.toolCalls) ? item.toolCalls : []
		if (!content && !toolCalls.length) continue
		return {
			content,
			thinkingText: normalizeText(item.thinkingText || '', ''),
			toolCalls,
			timestamp: item.timestamp || ''
		}
	}
	return null
}

function resolveGaokaoStatusTextByTool(toolName = '', phase = '') {
	const name = normalizeText(toolName, '').toLowerCase()
	const currentPhase = normalizeText(phase, '').toLowerCase()

	if (
		name.includes('search_yunnan_admission_school_detail') ||
		name.includes('school_detail')
	) {
		return 'AI 正在比对院校'
	}

	if (
		name.includes('search_yunnan_admission') ||
		name.includes('web_search') ||
		name.includes('web_fetch')
	) {
		return 'AI 正在联网检索'
	}

	if (
		name.includes('get_current_gaokao_consultation_state') ||
		name.includes('update_current_gaokao_consultation_state') ||
		name.includes('update_current_user_intelligence')
	) {
		return 'AI 正在更新画像'
	}

	if (currentPhase === 'tool_running') {
		return 'AI 正在调用工具'
	}

	if (currentPhase === 'responding') {
		return 'AI 正在整理建议'
	}

	return 'AI 正在思考'
}

function isDebugToolsEnabled(ctx) {
	return !!(ctx && ctx.enableDebugTools)
}

export const chatPageMethods = {
	async bootstrapPage() {
		syncCurrentUserProfile(this)
		await this.syncAccessState()
		await this.loadAgentMeta()
		if (isDebugToolsEnabled(this)) {
			await this.refreshProfileDebugData()
			await this.refreshRuntimeDebugData()
		}
	},
	async syncAccessState() {
		syncCurrentUserProfile(this)
		await this.refreshCurrentUserMembershipState()
		await this.refreshAiPowerBalance({ silent: true, showDailyNotice: true })
		await this.refreshAdmissionUnlockState({ silent: true })
	},
	async refreshCurrentUserMembershipState() {
		syncCurrentUserProfile(this)
		const token = await resolveActiveToken()
		if (!token) {
			return this.currentUserIsCampusPartner
		}

		try {
			const userCenter = getHttpService('user-center')
			const res = await userCenter.getUserInfo({ _token: token })
			if (!res || res.code !== 0 || !res.data) {
				return this.currentUserIsCampusPartner
			}

			const latestUser = normalizeUserInfo(Object.assign({}, getCurrentUserInfo(), res.data))
			this.currentUserProfileInfo = latestUser
			this.currentUserIsCampusPartner = hasCampusPartnerIdentity(latestUser)
			return this.currentUserIsCampusPartner
		} catch (error) {
			console.warn('[ai-chat] refresh current user membership state failed:', error)
			return this.currentUserIsCampusPartner
		}
	},
	async refreshAdmissionUnlockState(options = {}) {
		if (!this.requiresVolunteerUnlock) {
			this.admissionUnlockStatus = normalizeUnlockStatus(this.admissionUnlockStatus || {})
			this.unlockStatusInitialized = true
			return this.admissionUnlockStatus
		}

		const token = await resolveActiveToken()
		if (!token) {
			this.admissionUnlockStatus = createDefaultUnlockStatus()
			this.unlockStatusInitialized = true
			return this.admissionUnlockStatus
		}

		this.unlockStatusLoading = true
		try {
			const result = await fetchAdmissionUnlockStatus()
			const nextStatus = normalizeUnlockStatus(result && result.data)
			this.admissionUnlockStatus = nextStatus
			this.unlockStatusInitialized = true
			if (!nextStatus.unlocked) {
				this.connectionText = '待解锁'
			} else if (!this.showPowerPrompt) {
				this.connectionText = '已就绪'
			}
			return nextStatus
		} catch (error) {
			console.warn('[ai-chat] refresh admission unlock state failed:', error)
			this.admissionUnlockStatus = createDefaultUnlockStatus()
			this.unlockStatusInitialized = true
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
				try {
					const fixedQaUrl = `${getApiBaseUrl()}/chat/agents/${encodeURIComponent(this.agentId)}/fixed-qa`
					const fixedQaResponse = await requestJsonWithRefresh({
						url: fixedQaUrl,
						method: 'GET',
						token
					})
					const fixedQaStatusCode = Number(fixedQaResponse && fixedQaResponse.statusCode) || 0
					const fixedQaPayload = fixedQaResponse && fixedQaResponse.payload ? fixedQaResponse.payload : {}
					const fixedQaData = unwrapPayloadData(fixedQaPayload)
					if (fixedQaStatusCode === 200 && fixedQaData && Array.isArray(fixedQaData.entries) && fixedQaData.entries.length) {
						this.applyFixedQaPrompts(fixedQaData.entries)
					}
				} catch (error) {
					console.warn('[ai-chat] fixed qa load failed', error)
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
	appendUserMessage(content) {
		const text = normalizeText(content, '')
		if (!text) return
		this.messages = this.messages.concat([{
			id: createMessageId(this, 'u'),
			role: 'user',
			content: text
		}])
		this.scrollToBottom()
	},
	appendAssistantMessage(content) {
		const text = normalizeText(content, '')
		if (!text) return
		this.messages = this.messages.concat([{
			id: createMessageId(this, 'a'),
			role: 'assistant',
			content: text
		}])
		this.scrollToBottom()
	},
	resolveFixedQaReply(item = {}) {
		const replyMap = this.fixedQaReplyMap && typeof this.fixedQaReplyMap === 'object'
			? this.fixedQaReplyMap
			: {}
		const answer = resolveFixedQaReplyFromMap(item, replyMap)
		if (answer) return normalizeText(answer, '')
		return normalizeText(item && (item.reply || item.fixedReply), '')
	},
	applyFixedQaPrompts(entries = []) {
		const replyMap = buildFixedQaReplyMap(entries)
		this.fixedQaEntries = Array.isArray(entries) ? entries : []
		this.fixedQaReplyMap = replyMap
		this.quickPrompts = enrichPromptCollectionWithReplies(this.quickPrompts, replyMap)
		this.visualGuessPrompts = enrichPromptCollectionWithReplies(this.visualGuessPrompts, replyMap)
		this.visualSuggestionPrompts = enrichPromptCollectionWithReplies(this.visualSuggestionPrompts, replyMap)
		this.visualIntroTopics = enrichIntroTopicsWithReplies(this.visualIntroTopics, replyMap)
	},
	buildAssistantPayloadMessage(payload = {}, fixedId = '') {
		const rawText = normalizeText(payload.content || payload.reply || payload.message, '')
		const cleanedText = stripKnownReplyMetaTags(rawText)
		const splitText = splitBracketedVisibleReplyText(cleanedText)
		let text = splitText.visibleText || cleanedText
		const thinkingText = normalizeText(
			payload.thinkingText || (splitText.visibleText ? splitText.thinkingText : ''),
			''
		)
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
			.filter((card) => !this.currentUserIsCampusPartner || card.cardType !== 'campus_partner')

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
			id: fixedId || createMessageId(this, 'a'),
			role: 'assistant',
			content: text,
			thinkingText,
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
		if (payload && Object.prototype.hasOwnProperty.call(payload, 'runtimeDebug')) {
			this.runtimeDebugData.lastCompletedPayload = payload.runtimeDebug || null
		}
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
				thinkingText: hasOwn('thinkingText')
					? message.thinkingText
					: (normalizeText(previousMessage.thinkingText, '') || ''),
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
		if (payload && Object.prototype.hasOwnProperty.call(payload, 'runtimeDebug')) {
			this.runtimeDebugData.lastCompletedPayload = payload.runtimeDebug || null
		}
		this.scrollToBottom()
	},
	replaceTrailingAssistantMessages(payload = {}) {
		const messages = Array.isArray(this.messages) ? this.messages.slice() : []
		const lastUserIndex = (() => {
			for (let index = messages.length - 1; index >= 0; index -= 1) {
				if (messages[index] && messages[index].role === 'user') return index
			}
			return -1
		})()
		const trailingAssistantMessages = messages
			.slice(lastUserIndex + 1)
			.filter((item) => item && item.role === 'assistant')
		const longestThinkingText = trailingAssistantMessages
			.map((item) => normalizeText(item && item.thinkingText, ''))
			.sort((left, right) => right.length - left.length)[0] || ''
		const mergedToolCalls = []
		const seenToolCallIds = new Set()
		trailingAssistantMessages.forEach((item) => {
			const toolCalls = Array.isArray(item && item.toolCalls) ? item.toolCalls : []
			toolCalls.forEach((tool) => {
				const toolId = normalizeText(tool && tool.id, '')
				const dedupeKey = toolId || `${normalizeText(tool && tool.name, '')}:${normalizeText(tool && tool.label, '')}`
				if (!dedupeKey || seenToolCallIds.has(dedupeKey)) return
				seenToolCallIds.add(dedupeKey)
				mergedToolCalls.push(tool)
			})
		})
		const finalMessage = this.buildAssistantPayloadMessage({
			...payload,
			thinkingText: normalizeText(payload && payload.thinkingText, '') || longestThinkingText,
			toolCalls: Array.isArray(payload && payload.toolCalls)
				? payload.toolCalls
				: (Array.isArray(payload && payload.tools) ? payload.tools : mergedToolCalls)
		}, trailingAssistantMessages[0] && trailingAssistantMessages[0].id)
		if (!finalMessage) return
		const preservedPrefix = messages.slice(0, lastUserIndex + 1)
		this.messages = preservedPrefix.concat([finalMessage])
		this.activeAssistantMessageId = finalMessage.id
		this.activeAssistantSegmentKind = 'text'
		this.activeAssistantSegmentText = normalizeText(finalMessage.content, '')
		this.streamReplyStarted = !!(finalMessage.content || finalMessage.thinkingText)
		this.scrollToBottom()
	},
	pushStreamDebugEvent(eventType = '', eventData = {}) {
		const type = normalizeText(eventType, '')
		if (!type) return
		const seq = Number(this.runtimeDebugData.streamEventSeq || 0) + 1
		const nextEvent = {
			id: `stream-${Date.now()}-${seq}`,
			seq,
			type,
			summary: summarizeStreamEventPayload(eventData),
			payload: isRecord(eventData) ? eventData : { value: eventData },
			payloadText: safeJsonStringify(isRecord(eventData) ? eventData : { value: eventData }, ''),
			at: new Date().toISOString()
		}
		const currentEvents = Array.isArray(this.runtimeDebugData.streamEvents)
			? this.runtimeDebugData.streamEvents
			: []
		this.runtimeDebugData = {
			...this.runtimeDebugData,
			streamEventSeq: seq,
			streamEvents: currentEvents.concat([nextEvent]).slice(-120)
		}
	},
	upsertAssistantStreamToolCall(toolPayload = {}) {
		const normalizedTool = normalizeToolCall(toolPayload, 0)
		if (!normalizedTool || !normalizedTool.id) return

		const messageId = ensureAssistantStreamSegment(this, 'tool', '')
		const nextMessages = this.messages.map((item) => {
			if (!item || item.id !== messageId) return item

			const currentTools = Array.isArray(item.toolCalls) ? item.toolCalls.slice() : []
			const semanticKey = resolveToolSemanticKey(normalizedTool)
			const exactIndex = currentTools.findIndex(
				(entry) => entry && String(entry.id || '') === normalizedTool.id
			)
			const fallbackIndex = exactIndex >= 0
				? exactIndex
				: currentTools.findIndex((entry) => {
					if (!entry) return false
					if (resolveToolSemanticKey(entry) !== semanticKey) return false
					if (isPendingToolState(entry.state) || isProfileTool(normalizedTool.name, normalizedTool.label)) {
						return true
					}
					return false
				})
			const existingIndex = fallbackIndex

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
		this.runtimeDebugData = {
			...this.runtimeDebugData,
			liveRenderedText: String(this.messages.find((item) => item && item.id === messageId)?.content || '')
		}
		this.streamReplyStarted = true
		this.scrollToBottom()
	},
	upsertAssistantThinkingText(content = '') {
		const nextContent = String(content || '')
		const messageId = this.activeAssistantMessageId || this.beginAssistantStreamMessage('', 'text')
		const nextMessages = this.messages.map((item) => {
			if (!item || item.id !== messageId) return item
			return {
				...item,
				thinkingText: nextContent
			}
		})
		this.messages = nextMessages
		this.runtimeDebugData = {
			...this.runtimeDebugData,
			liveThinkingText: nextContent
		}
		if (nextContent) {
			this.streamReplyStarted = true
		}
		this.scrollToBottom()
	},
	beginAssistantStreamMessage(initialContent = '', segmentKind = 'text') {
		const messageId = createMessageId(this, 'a')
		setActiveAssistantSegment(this, segmentKind, messageId)
		this.activeAssistantSegmentText = segmentKind === 'text' ? String(initialContent || '') : ''
		this.streamReplyStarted = !!String(initialContent || '')
		this.messages = this.messages.concat([{
			id: messageId,
			role: 'assistant',
			content: String(initialContent || ''),
			thinkingText: '',
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
		const messageId = ensureAssistantStreamSegment(this, 'text', nextContent)
		const nextMessages = this.messages.map((item) => {
			if (!item || item.id !== messageId) return item
			return {
				...item,
				content: nextContent
			}
		})
		this.messages = nextMessages
		this.runtimeDebugData = {
			...this.runtimeDebugData,
			liveRenderedText: nextContent
		}
		this.activeAssistantSegmentKind = 'text'
		this.activeAssistantSegmentText = nextContent
		this.streamReplyStarted = !!nextContent
		this.scrollToBottom()
	},
	async sendMessageSyncRequest(content, token) {
		const url = `${getApiBaseUrl()}/chat/sync`
		markRequestDebug(this, {
			url,
			method: 'POST',
			transportMode: 'sync',
			startedAt: Date.now()
		})
		const { response, payload, statusCode } = await requestJsonWithRefresh({
			url,
			method: 'POST',
			data: { message: content, agentId: this.agentId, sessionId: this.sessionId },
			token
		})

		if (statusCode !== 200 || !isSuccessPayload(payload, response)) {
			markRequestCompletedDebug(this, {
				at: Date.now(),
				statusCode
			})
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
		const syncCompletedAt = Date.now()
		markFirstReplyDebug(this, 'sync_response', syncCompletedAt)
		markRequestCompletedDebug(this, {
			at: syncCompletedAt,
			statusCode
		})
		if (data && data.sessionId) this.sessionId = normalizeText(data.sessionId, this.sessionId)
		if (data) {
			this.resolvedAgentId = normalizeText(
				data.resolvedAgentId || data.agentId,
				this.resolvedAgentId || this.agentId
			)
		}

		this.appendAssistantPayloadMessage({
			content: normalizeText(data && (data.reply || data.message), '收到，我继续帮你整理。'),
			thinkingText: data && data.thinkingText,
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
			skillDebug: data && data.skillDebug,
			runtimeDebug: data || null
		})
	},
	async sendMessageStreamRequest(content, token) {
		const url = `${getApiBaseUrl()}/chat`
		markRequestDebug(this, {
			url,
			method: 'POST',
			transportMode: 'stream',
			startedAt: Date.now()
		})
		let streamedText = ''
		let completedPayload = null
		let streamThinkingText = ''
		let streamFakeThinkingText = ''
		const resolveLiveThinkingText = () => normalizeText(streamFakeThinkingText, '') || normalizeText(streamThinkingText, '')

		const result = await createStreamRequest({
			url,
			token,
			data: { message: content, agentId: this.agentId, sessionId: this.sessionId },
			onEvent: (event) => {
				const eventData = isRecord(event && event.data) ? event.data : {}
				const eventType = normalizeText(event && event.type, '')
				this.pushStreamDebugEvent(eventType, eventData)

				if (eventData.sessionId) {
					this.sessionId = normalizeText(eventData.sessionId, this.sessionId)
				}

				if (eventType === 'start') {
					this.connectionText = this.visualMode === 'gaokao' ? 'AI 正在思考' : '流式回复中'
					return
				}

				if (eventType === 'think_start') {
					markFirstReplyDebug(this, 'think_start', Date.now())
					this.connectionText = this.visualMode === 'gaokao' ? 'AI 正在思考' : '思考中'
					return
				}

				if (eventType === 'thinking') {
					markFirstReplyDebug(this, 'thinking', Date.now())
					if (eventData.kind === 'fake') {
						streamFakeThinkingText = `${streamFakeThinkingText}${String(eventData.delta || '')}`
					} else {
						streamThinkingText = `${streamThinkingText}${String(eventData.delta || '')}`
					}
					this.upsertAssistantThinkingText(resolveLiveThinkingText())
					this.connectionText = this.visualMode === 'gaokao' ? 'AI 正在思考' : '思考中'
					return
				}

				if (eventType === 'think_end') {
					this.connectionText = this.visualMode === 'gaokao' ? 'AI 正在调用工具' : '调用工具中'
					return
				}

				if (eventType === 'heartbeat') {
					const phase = normalizeText(eventData.phase, '')
					if (phase === 'responding') {
						markFirstReplyDebug(this, 'heartbeat:responding', Date.now())
					}
					if (!streamedText) {
						this.connectionText = this.visualMode === 'gaokao'
							? resolveGaokaoStatusTextByTool('', phase)
							: phase === 'tool_running'
								? '调用工具中'
								: phase === 'responding'
									? '生成中'
									: '思考中'
					}
					return
				}

				if (eventType === 'text') {
					markFirstReplyDebug(this, 'text', Date.now())
					streamedText += String(eventData.delta || '')
					this.upsertAssistantThinkingText(resolveLiveThinkingText())
					this.runtimeDebugData = {
						...this.runtimeDebugData,
						liveThinkingText: resolveLiveThinkingText()
					}
					this.updateAssistantStreamText(streamedText)
					this.connectionText = this.visualMode === 'gaokao' ? 'AI 正在整理建议' : '生成中'
					return
				}

				if (eventType === 'tool_start') {
					markFirstReplyDebug(this, 'tool_start', Date.now())
					this.connectionText = this.visualMode === 'gaokao'
						? resolveGaokaoStatusTextByTool(eventData.name, 'tool_running')
						: '调用工具中'
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
					this.connectionText = this.visualMode === 'gaokao'
						? 'AI 正在整理建议'
						: '生成中'
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
					markFirstReplyDebug(this, 'tool', Date.now())
					this.connectionText = this.visualMode === 'gaokao'
						? resolveGaokaoStatusTextByTool(eventData.name, 'responding')
						: '生成中'
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
					this.runtimeDebugData.lastCompletedPayload = eventData
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

		if (result && result.interrupted) {
			const recovered = await this.recoverInterruptedStream(token)
			if (recovered) {
				return true
			}
			if (streamedText) {
				this.updateAssistantStreamText(streamedText)
			}
			throw buildRequestError('流式连接中断，且未能自动恢复最终回复', 500, 'STREAM_INTERRUPTED')
		}

		const response = result && result.response
		const statusCode = getResponseStatusCode(response)
		markRequestCompletedDebug(this, {
			at: Date.now(),
			statusCode
		})
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
			const completedText = normalizeText(
				completedPayload.reply,
				streamedText || '收到，我继续帮你整理。'
			)
			const extractedCompletedText = extractBracketedVisibleReplyText(completedText)
			const cleanedCompletedText = stripKnownReplyMetaTags(completedText)
			const currentAssistantText = this.activeAssistantMessageId
				? normalizeText(
					((this.messages.find((item) => item && item.id === this.activeAssistantMessageId) || {}).content),
					''
				)
			: ''
			const appendedAssistantText = resolveAppendedAssistantText(completedText, this.messages)
			const finalVisibleText =
				extractedCompletedText ||
				cleanedCompletedText ||
				appendedAssistantText ||
				currentAssistantText ||
				streamedText
			this.replaceTrailingAssistantMessages({
				content: finalVisibleText,
				thinkingText: normalizeText(completedPayload.thinkingText, '') || resolveLiveThinkingText(),
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
				skillDebug: completedPayload.skillDebug,
				runtimeDebug: completedPayload
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
				const isCampusPartnerCard = cardType === 'campus_partner'
				const customBenefits = Array.isArray(item && item.benefits)
					? item.benefits.map((benefit) => normalizeText(benefit, '')).filter(Boolean)
					: []
				return {
					id: normalizeText(item && item.id, `${cardType}-${intent}-${index}-${Date.now()}`),
					cardType,
					intent,
					title: isCampusPartnerCard
						? preset.title
						: normalizeText(item && item.title, preset.title),
					badge: isCampusPartnerCard
						? normalizeText(preset.badgeByIntent[intent], '')
						: normalizeText(item && item.badge, preset.badgeByIntent[intent] || ''),
					pillText: isCampusPartnerCard
						? normalizeText(preset.pillText, '')
						: normalizeText(item && item.pillText, preset.pillText || ''),
					summary: isCampusPartnerCard
						? normalizeText(preset.summaryByIntent && preset.summaryByIntent[intent], '')
						: (
							clipInlineText(
								item && (item.recommendationReason || item.questionRelation || item.summary),
								120
							) || normalizeText(preset.summaryByIntent && preset.summaryByIntent[intent], '')
						),
					benefits: (
						isCampusPartnerCard
							? (preset.benefitsByIntent[intent] || [])
							: (customBenefits.length ? customBenefits : (preset.benefitsByIntent[intent] || []))
					).slice(0, 3),
					buttonText: isCampusPartnerCard
						? normalizeText(preset.buttonTextByIntent[intent], '立即前往')
						: normalizeText(item && item.buttonText, preset.buttonTextByIntent[intent] || '立即前往'),
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
	buildSchoolCardRoute(card = {}) {
		const institutionId = Number(card && card.institutionId)
		if (!Number.isFinite(institutionId) || institutionId <= 0) {
			return ''
		}

		const query = [`id=${encodeURIComponent(institutionId)}`]
		if (card.preview) query.push('preview=1')
		if (card.title) query.push(`name=${encodeURIComponent(card.title)}`)
		if (card.examType) query.push(`examType=${encodeURIComponent(card.examType)}`)
		if (card.subjectTrack) query.push(`subjectTrack=${encodeURIComponent(card.subjectTrack)}`)
		if (card.majorCategory) query.push(`majorCategory=${encodeURIComponent(card.majorCategory)}`)
		if (card.riskBucketParam) query.push(`riskBucket=${encodeURIComponent(card.riskBucketParam)}`)
		return `/subpackages/volunteer/detail?${query.join('&')}`
	},
	handleSchoolCardTap(card = {}) {
		const routeUrl = this.buildSchoolCardRoute(card)
		if (!routeUrl) {
			uni.showToast({ title: '学校信息不完整', icon: 'none' })
			return
		}

		uni.navigateTo({
			url: routeUrl,
			fail: () => {
				uni.showToast({ title: '页面打开失败', icon: 'none' })
			}
		})
	},
	handleSchoolCardCopy(card = {}) {
		const routeUrl = this.buildSchoolCardRoute(card)
		if (!routeUrl) {
			uni.showToast({ title: '学校信息不完整', icon: 'none' })
			return
		}

		uni.setClipboardData({
			data: routeUrl,
			success: () => {
				uni.showToast({
					title: '跳转 URL 已复制',
					icon: 'none'
				})
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
				confirmText: '立即开通',
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
		this.activeAssistantMessageId = ''
		this.activeAssistantSegmentKind = ''
		this.activeAssistantSegmentText = ''
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
		this.runtimeDebugData = {
			sessionId: '',
			fetchedAt: '',
			error: '',
			provider: '',
			model: '',
			baseUrl: '',
			requestApi: '',
			requestMethod: '',
			requestTransportMode: '',
			requestStartedAt: '',
			firstReplyAt: '',
			firstReplyMs: 0,
			firstReplyEventType: '',
			requestCompletedAt: '',
			requestTotalMs: 0,
			lastStatusCode: 0,
			runtimeMessagesPath: '',
			fileExists: false,
			parseError: '',
			rawFileText: '',
			rawMessages: [],
			formattedMessages: [],
			streamEvents: [],
			streamEventSeq: 0,
			liveThinkingText: '',
			liveRenderedText: '',
			lastCompletedPayload: null
		}
		this.connectionText = '连接中'
		this.clearAccessPrompt()
		this.bootstrapPage()
	},
	handleQuickActionSelect(item) {
		if (typeof this.applyPromptSelection === 'function' && this.applyPromptSelection(item)) {
			return
		}
		const text = normalizeText(item && (item.label || item.action), '')
		if (!text) return
		this.draftText = text
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
		if (!isDebugToolsEnabled(this)) return
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
	async refreshRuntimeDebugData() {
		if (!isDebugToolsEnabled(this)) return
		const token = await resolveActiveToken()
		if (!token) return
		if (!this.messages.some((item) => item && item.role === 'user')) {
			this.runtimeDebugData = {
				...this.runtimeDebugData,
				sessionId: this.sessionId,
				fetchedAt: '',
				error: '',
				provider: '',
				model: '',
				baseUrl: '',
				runtimeMessagesPath: '',
				fileExists: false,
				parseError: '',
				rawFileText: '',
				rawMessages: [],
				formattedMessages: []
			}
			return
		}

		try {
			const url = `${getApiBaseUrl()}/chat/agents/${encodeURIComponent(this.agentId)}/debug-runtime?sessionId=${encodeURIComponent(this.sessionId)}`
			const { response, payload, statusCode } = await requestJsonWithRefresh({
				url,
				method: 'GET',
				token
			})

			if (statusCode !== 200 || !isSuccessPayload(payload, response)) {
				this.runtimeDebugData = {
					...this.runtimeDebugData,
					sessionId: this.sessionId,
					fetchedAt: '',
					error: normalizeText(
						payload && (payload.error || payload.message || payload.errMsg || payload.errorCode || payload.code),
						`runtime debug 请求失败: ${statusCode || 'unknown'}`
					)
				}
				return
			}

			const data = unwrapPayloadData(payload)
			this.runtimeDebugData = {
				...this.runtimeDebugData,
				sessionId: normalizeText(data && data.sessionId, this.sessionId),
				fetchedAt: normalizeText(data && data.fetchedAt, ''),
				error: '',
				provider: normalizeText(data && data.provider, ''),
				model: normalizeText(data && data.model, ''),
				baseUrl: normalizeText(data && data.baseUrl, ''),
				runtimeMessagesPath: normalizeText(data && data.runtimeMessagesPath, ''),
				fileExists: !!(data && data.fileExists),
				parseError: normalizeText(data && data.parseError, ''),
				rawFileText: normalizeText(data && data.rawFileText, ''),
				rawMessages: Array.isArray(data && data.rawMessages) ? data.rawMessages : [],
				formattedMessages: Array.isArray(data && data.formattedMessages) ? data.formattedMessages : []
			}
		} catch (error) {
			console.warn('[ai-chat] refresh runtime debug failed:', error)
			const payload = isRecord(error && error.payload) ? error.payload : {}
			this.runtimeDebugData = {
				...this.runtimeDebugData,
				sessionId: this.sessionId,
				fetchedAt: '',
				error: normalizeText(
					(payload && (payload.error || payload.message)) ||
					error?.message ||
					'runtime debug 拉取失败',
					'runtime debug 拉取失败'
				)
			}
		}
	},
	async recoverInterruptedStream(token) {
		const maxAttempts = 12
		for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
			this.connectionText = `AI 正在补发结果 ${attempt}/${maxAttempts}`
			await this.refreshRuntimeDebugData()

			const recovered = extractRecoveredAssistantPayload(this.runtimeDebugData.formattedMessages)
			if (recovered) {
				this.upsertAssistantPayloadMessage({
					content: recovered.content,
					thinkingText: recovered.thinkingText,
					toolCalls: recovered.toolCalls,
					runtimeDebug: this.runtimeDebugData.lastCompletedPayload || {
						reply: recovered.content,
						toolCalls: recovered.toolCalls
					}
				})
				this.connectionText = '已恢复'
				return true
			}

			if (attempt < maxAttempts) {
				await sleep(2000)
			}
		}

		return false
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

		this.messages = this.messages.concat([{
			id: createMessageId(this, 'u'),
			role: 'user',
			content
		}])
		this.draftText = ''
		this.isSending = true
		this.streamReplyStarted = false
		this.activeAssistantMessageId = ''
		this.activeAssistantSegmentKind = ''
		this.activeAssistantSegmentText = ''
		this.connectionText = '响应中'
		this.runtimeDebugData = {
			...this.runtimeDebugData,
			sessionId: this.sessionId,
			fetchedAt: '',
			error: '',
			provider: '',
			model: '',
			baseUrl: '',
			requestApi: '',
			requestMethod: '',
			requestTransportMode: '',
			requestStartedAt: '',
			firstReplyAt: '',
			firstReplyMs: 0,
			firstReplyEventType: '',
			requestCompletedAt: '',
			requestTotalMs: 0,
			lastStatusCode: 0,
			parseError: '',
			rawFileText: '',
			rawMessages: [],
			formattedMessages: [],
			streamEvents: [],
			streamEventSeq: 0,
			liveThinkingText: '',
			liveRenderedText: '',
			lastCompletedPayload: null
		}
		this.pushStreamDebugEvent('request', {
			agentId: this.agentId,
			sessionId: this.sessionId,
			content
		})
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
			if (!(this.runtimeDebugData && this.runtimeDebugData.requestCompletedAt)) {
				markRequestCompletedDebug(this, {
					at: Date.now(),
					statusCode: error && error.statusCode
				})
			}
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
			this.activeAssistantSegmentKind = ''
			this.activeAssistantSegmentText = ''
			if (isDebugToolsEnabled(this)) {
				await this.refreshProfileDebugData()
				await this.refreshRuntimeDebugData()
			}
			this.scrollToBottom()
		}
	}
}
