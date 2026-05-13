<template>
	<view class="page-container">
		<view class="hero-card">
			<text class="hero-kicker">校园合伙人</text>
			<text class="hero-title">团队中心</text>
			<text class="hero-desc">团队信息、邀请二维码和新加入的伙伴列表都集中放在这里查看。</text>
		</view>

		<team-card ref="teamCard" />

		<view class="partners-shell">
			<view class="partners-shell-header">
				<text class="partners-shell-title">伙伴动态</text>
				<text class="partners-shell-desc">加入团队后，这里会持续展示最新伙伴和邀请入口。</text>
			</view>
			<new-partners ref="newPartners" class="partners-content" />
		</view>
	</view>
</template>

<script>
import NewPartners from './components/NewPartners.vue'
import TeamCard from './components/TeamCard.vue'

export default {
	components: {
		NewPartners,
		TeamCard
	},
	data() {
		return {
			hasInitialized: false
		}
	},
	onShow() {
		const shouldRefresh = this.hasInitialized
		this.hasInitialized = true
		if (!shouldRefresh) return

		this.$nextTick(() => {
			if (this.$refs.teamCard && typeof this.$refs.teamCard.refresh === 'function') {
				this.$refs.teamCard.refresh()
			}
			if (this.$refs.newPartners && typeof this.$refs.newPartners.loadTeamMembers === 'function') {
				this.$refs.newPartners.loadTeamMembers()
			}
		})
	}
}
</script>

<style scoped>
.page-container {
	padding: 24rpx;
	min-height: 100vh;
	background: linear-gradient(180deg, #f3f0ff 0%, #f8fafc 100%);
}

.hero-card {
	margin-bottom: 24rpx;
	padding: 34rpx 36rpx;
	border-radius: 32rpx;
	background: linear-gradient(135deg, #fffbeb 0%, #fff7ed 56%, #ffffff 100%);
	box-shadow: 0 12rpx 32rpx rgba(245, 158, 11, 0.12);
	display: flex;
	flex-direction: column;
	gap: 14rpx;
}

.hero-kicker {
	font-size: 22rpx;
	font-weight: 700;
	letter-spacing: 4rpx;
	color: #b45309;
}

.hero-title {
	font-size: 42rpx;
	font-weight: 800;
	color: #1f2937;
}

.hero-desc {
	font-size: 24rpx;
	line-height: 1.7;
	color: #92400e;
}

.partners-shell {
	margin-top: 8rpx;
	padding: 28rpx 28rpx 8rpx;
	border-radius: 32rpx;
	background: #ffffff;
	box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.05);
}

.partners-shell-header {
	margin-bottom: 20rpx;
}

.partners-shell-title {
	display: block;
	font-size: 30rpx;
	font-weight: 700;
	color: #0f172a;
}

.partners-shell-desc {
	display: block;
	margin-top: 8rpx;
	font-size: 22rpx;
	line-height: 1.6;
	color: #64748b;
}
</style>
