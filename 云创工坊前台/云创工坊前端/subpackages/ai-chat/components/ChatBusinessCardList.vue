<template>
	<view v-if="cards.length" class="business-card-group">
		<view
			v-for="card in cards"
			:key="card.id || card.businessId"
			class="business-card"
			hover-class="business-card-hover"
			@tap="openBusiness(card)"
		>
			<view class="business-card-head">
				<view class="business-card-copy">
					<view class="business-card-title-row">
						<text class="business-card-title">{{ card.title }}</text>
						<text class="business-card-badge">创业板块</text>
					</view>
					<text v-if="card.summary" class="business-card-summary">{{ card.summary }}</text>
				</view>
				<view class="business-card-pill">
					<text class="business-card-pill-text">报名入口</text>
				</view>
			</view>

			<view class="business-card-footer">
				<text class="business-card-meta">
					{{ resolveBusinessMeta(card) }}
				</text>
				<text class="business-card-button">{{ card.hasSignup ? '去填表单' : '去查看' }}</text>
			</view>
		</view>
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
		resolveBusinessMeta(card = {}) {
			const parts = []
			if (card.categoryType) parts.push(card.categoryType)
			if (card.tag) parts.push(card.tag)
			if (card.hasArticles) parts.push('有文章')
			return parts.join(' · ') || '业务板块'
		},
		openBusiness(card = {}) {
			const routeUrl = String((card && (card.routeUrl || card.url)) || '').trim()
			if (routeUrl) {
				uni.navigateTo({
					url: routeUrl,
					fail: () => {
						uni.showToast({ title: '页面打开失败', icon: 'none' })
					}
				})
				return
			}
			const id = card.businessId || card.id
			if (!id) return
			const title = encodeURIComponent(card.title || '')
			const type = encodeURIComponent(card.categoryType || 'signup')
			uni.navigateTo({
				url: `/pages/extra/signup/index?id=${id}&category=${title}&type=${type}`
			})
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
	padding: 16rpx 24rpx;
	border-radius: 999rpx;
	font-size: 24rpx;
	font-weight: 800;
	color: #ffffff;
	background: linear-gradient(135deg, #f1a95b, #d98a36);
	box-shadow: 0 10rpx 20rpx rgba(201, 132, 57, 0.24);
}
</style>
