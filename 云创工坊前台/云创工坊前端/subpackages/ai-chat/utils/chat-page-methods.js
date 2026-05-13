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
				if (welcome && !this.messages.length) {
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

		if (!this.messages.length) {
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
		const text = normalizeText(payload.content || payload.reply || payload.message, '')
		if (!text) return
		this.messages = this.messages.concat([{
			id: `a-${Date.now()}`,
			role: 'assistant',
			content: text,
			businessCards: Array.isArray(payload.businessCards) ? payload.businessCards : [],
			articleCards: Array.isArray(payload.articleCards) ? payload.articleCards : [],
			projectCards: Array.isArray(payload.projectCards) ? payload.projectCards : [],
			activityCards: Array.isArray(payload.activityCards) ? payload.activityCards : [],
			inviteCards: Array.isArray(payload.inviteCards) ? payload.inviteCards : [],
			membershipCards: Array.isArray(payload.membershipCards) ? payload.membershipCards : []
		}])
		this.scrollToBottom()
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
				businessCards: data && data.businessCards,
				articleCards: data && data.articleCards,
				projectCards: data && data.projectCards,
				activityCards: data && data.activityCards,
				inviteCards: data && data.inviteCards,
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
