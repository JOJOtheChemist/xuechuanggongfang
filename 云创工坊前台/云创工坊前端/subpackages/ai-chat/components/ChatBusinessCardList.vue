<template>
	<view v-if="cards.length" class="business-card-group">
		<template v-for="card in cards">
			<navigator
				v-if="buildNavigatorUrl(card)"
				:key="card.id || card.businessId"
				class="business-card-nav"
				hover-class="business-card-hover"
				:url="buildNavigatorUrl(card)"
				:open-type="resolveNavigatorOpenType(card)"
			>
				<view class="business-card">
					<view class="business-card-head">
						<view class="business-card-copy">
							<view class="business-card-title-row">
								<text class="business-card-title">{{ card.title }}</text>
								<text v-if="resolveBusinessBadgeText(card)" class="business-card-badge">{{ resolveBusinessBadgeText(card) }}</text>
							</view>
							<text v-if="card.summary" class="business-card-summary">{{ card.summary }}</text>
						</view>
						<view v-if="resolveBusinessPillText(card)" class="business-card-pill">
							<text class="business-card-pill-text">{{ resolveBusinessPillText(card) }}</text>
						</view>
					</view>

					<view class="business-card-footer">
						<text class="business-card-meta">
							{{ resolveBusinessMeta(card) }}
						</text>
						<view class="business-card-button">
							<text class="business-card-button-text">{{ resolveBusinessButtonText(card) }}</text>
						</view>
					</view>
				</view>
			</navigator>
		</template>
	</view>
</template>

<script>
export default {
	name: 'ChatBusinessCardList',
	props: {
		cards: {
			type: Array,
			default: () => []
		}
	},
	methods: {
		resolveBusinessBadgeText(card = {}) {
			if (Object.prototype.hasOwnProperty.call(card, 'badgeText')) {
				return String(card.badgeText || '').trim()
			}
			return ''
		},
		resolveBusinessMeta(card = {}) {
			const tag = String(card.tag || '').trim()
			const categoryLabel = this.resolveCategoryTypeLabel(card.categoryType)
			if (tag) return tag
			if (categoryLabel) return categoryLabel
			return card.hasSignup ? '支持在线报名' : '可查看服务详情'
		},
		resolveCategoryTypeLabel(categoryType = '') {
			const normalizedType = String(categoryType || '').trim().toLowerCase()
			if (normalizedType === 'learning') return '学习服务'
			if (normalizedType === 'signup') return '报名服务'
			if (normalizedType === 'consult') return '咨询服务'
			return ''
		},
		resolveBusinessPillText(card = {}) {
			if (Object.prototype.hasOwnProperty.call(card, 'pillText')) {
				return String(card.pillText || '').trim()
			}
			return card.hasSignup ? '报名入口' : '咨询入口'
		},
		resolveBusinessButtonText(card = {}) {
			if (Object.prototype.hasOwnProperty.call(card, 'buttonText')) {
				return String(card.buttonText || '').trim() || '去查看'
			}
			return card.hasSignup ? '去报名' : '去咨询'
		},
		normalizeRouteUrl(routeUrl = '') {
			const normalizedRoute = String(routeUrl || '').trim()
			if (!normalizedRoute) return ''
			return normalizedRoute.startsWith('/') ? normalizedRoute : `/${normalizedRoute}`
		},
		appendAiPlanningSource(routeUrl, card = {}) {
			const normalizedRoute = this.normalizeRouteUrl(routeUrl)
			if (!normalizedRoute) return ''
			if (!normalizedRoute.includes('/pages/extra/signup/index')) return normalizedRoute
			if (/[?&]source=/.test(normalizedRoute)) return normalizedRoute
			const businessId = String(card.businessId || card.id || '').trim()
			const isPlanningSignup = businessId === '15' || /[?&]id=15(?:&|$)/.test(normalizedRoute)
			if (!isPlanningSignup) return normalizedRoute
			return `${normalizedRoute}${normalizedRoute.includes('?') ? '&' : '?'}source=ai_chat_business`
		},
		buildBusinessRoute(card = {}) {
			const explicitRoute = this.appendAiPlanningSource(card.routeUrl || card.url || '', card)
			if (explicitRoute) return explicitRoute

			const businessId = String(card.businessId || card.id || '').trim()
			if (!businessId) return ''

			const query = [`id=${encodeURIComponent(businessId)}`]
			const title = String(card.title || '').trim()
			if (title) query.push(`category=${encodeURIComponent(title)}`)
			query.push(`type=${encodeURIComponent(card.hasSignup ? 'signup' : 'consult')}`)
			if (businessId === '15') query.push('source=ai_chat_business')
			return `/pages/extra/signup/index?${query.join('&')}`
		},
		buildNavigatorUrl(card = {}) {
			const routeUrl = this.buildBusinessRoute(card)
			if (!routeUrl) return ''
			const openType = this.resolveNavigatorOpenType(card)
			if (openType === 'switchTab') {
				return routeUrl.split('?')[0]
			}
			return routeUrl
		},
		resolveNavigatorOpenType(card = {}) {
			const routeUrl = this.buildBusinessRoute(card)
			const path = String(routeUrl || '').split('?')[0]
			if (path === '/pages/dashboard/index' || path === '/pages/business/index' || path === '/pages/task-center/index' || path === '/pages/profile/index') {
				return 'switchTab'
			}
			if (path === '/pages/extra/signup/index') {
				return 'redirect'
			}
			return 'navigate'
		}
	}
}
</script>

<style scoped>
.business-card-group {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.business-card-nav {
	display: block;
}

.business-card {
	display: flex;
	flex-direction: column;
	gap: 18rpx;
	padding: 24rpx;
	border-radius: 28rpx;
	background: linear-gradient(135deg, rgba(255, 243, 230, 0.98), rgba(255, 224, 196, 0.94));
	border: 1rpx solid rgba(224, 165, 108, 0.34);
	box-shadow: 0 18rpx 32rpx rgba(204, 145, 86, 0.14);
}

.business-card-hover {
	transform: translateY(2rpx) scale(0.995);
}

.business-card-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 18rpx;
}

.business-card-copy {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.business-card-title-row {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 10rpx;
}

.business-card-title {
	font-size: 30rpx;
	line-height: 1.45;
	font-weight: 800;
	color: #6b3e09;
}

.business-card-badge {
	padding: 6rpx 14rpx;
	border-radius: 999rpx;
	font-size: 20rpx;
	font-weight: 700;
	color: #9b6020;
	background: rgba(255, 255, 255, 0.7);
}

.business-card-summary {
	font-size: 22rpx;
	line-height: 1.65;
	color: rgba(107, 62, 9, 0.76);
}

.business-card-pill {
	flex-shrink: 0;
	padding: 10rpx 14rpx;
	border-radius: 18rpx;
	background: rgba(255, 255, 255, 0.74);
}

.business-card-pill-text {
	font-size: 20rpx;
	font-weight: 700;
	color: #b26c27;
}

.business-card-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}

.business-card-meta {
	font-size: 22rpx;
	line-height: 1.5;
	color: rgba(107, 62, 9, 0.72);
}

.business-card-button {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 16rpx 24rpx;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #f1a95b, #d98a36);
	box-shadow: 0 10rpx 20rpx rgba(201, 132, 57, 0.24);
}

.business-card-button-text {
	font-size: 24rpx;
	font-weight: 800;
	color: #ffffff;
}
</style>
