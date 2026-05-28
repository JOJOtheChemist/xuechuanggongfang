<template>
	<scroll-view scroll-y class="page-scroll">
		<view class="page-container">
			<view class="section-card">
				<view class="section-head">
					<text class="section-title">我的团队</text>
					<text class="section-desc">查看当前团队信息与邀请入口</text>
				</view>
				<team-card ref="teamCard" />
			</view>

			<view class="section-card team-list-card">
				<view class="section-head">
					<text class="section-title">全部团队</text>
					<text class="section-desc">浏览团队详情，也可以直接发起加入</text>
				</view>
				<team-join-list
					ref="teamJoinList"
					list-title=""
					empty-text="暂时还没有可展示的团队"
				/>
			</view>
		</view>
	</scroll-view>
</template>

<script>
import TeamCard from '@/pages/extra/components/TeamCard.vue'
import TeamJoinList from '@/pages/extra/components/TeamJoinList.vue'

export default {
	components: {
		TeamCard,
		TeamJoinList
	},
	onShow() {
		this.$nextTick(() => {
			if (this.$refs.teamCard && typeof this.$refs.teamCard.refresh === 'function') {
				this.$refs.teamCard.refresh()
			}
			if (this.$refs.teamJoinList && typeof this.$refs.teamJoinList.refresh === 'function') {
				this.$refs.teamJoinList.refresh()
			}
		})
	}
}
</script>

<style scoped>
.page-scroll {
	height: 100vh;
	background: linear-gradient(180deg, #f4f0ff 0%, #f7f5ff 42%, #ffffff 100%);
}

.page-container {
	min-height: 100vh;
	padding: 24rpx;
	box-sizing: border-box;
}

.section-card {
	padding: 28rpx 24rpx;
	border-radius: 28rpx;
	background: rgba(255, 255, 255, 0.92);
	box-shadow: 0 16rpx 36rpx rgba(91, 72, 139, 0.08);
}

.team-list-card {
	margin-top: 24rpx;
}

.section-head {
	margin-bottom: 20rpx;
	display: flex;
	flex-direction: column;
}

.section-title {
	font-size: 34rpx;
	line-height: 1.3;
	font-weight: 700;
	color: #20123a;
}

.section-desc {
	margin-top: 8rpx;
	font-size: 24rpx;
	line-height: 1.5;
	color: #7b6f99;
}
</style>
