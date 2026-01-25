<template>
	<view class="section">
		<view class="section-header row">
			<view class="section-title-bar accent" />
			<text class="section-title-text">知识库</text>
			<view class="section-header-spacer" />
			<text class="section-subtitle-text">赋能成长</text>
		</view>
		<view class="grid">
			<!-- 销售话术 -->
			<view class="grid-item" @tap="goList('cat_kb_001', '销售话术')">
				<view class="grid-img bg-blue">
					<image class="grid-icon" src="/static/icons/stats-orders.svg" mode="aspectFit" />
				</view>
				<view class="grid-text">
					<text class="grid-title">销售话术</text>
					<text class="grid-sub">Top Sales 实战总结</text>
				</view>
			</view>
			<!-- 市场分析报告 -->
			<view class="grid-item" @tap="goList('cat_kb_002', '市场分析报告')">
				<view class="grid-img bg-purple">
					<image class="grid-icon" src="/static/icons/nav-chart.svg" mode="aspectFit" />
				</view>
				<view class="grid-text">
					<text class="grid-title">市场分析报告</text>
					<text class="grid-sub">Q3 季度数据洞察</text>
				</view>
			</view>
			<!-- 成功案例 -->
			<view class="grid-item" @tap="goList('cat_kb_003', '成功案例')">
				<view class="grid-img bg-orange">
					<image class="grid-icon" src="/static/icons/hot-activity.svg" mode="aspectFit" />
				</view>
				<view class="grid-text">
					<text class="grid-title">成功案例</text>
					<text class="grid-sub">经典成交复盘</text>
				</view>
			</view>
			<!-- 培训资料 -->
			<view class="grid-item" @tap="goList('cat_kb_004', '培训资料')">
				<view class="grid-img bg-green">
					<image class="grid-icon" src="/static/icons/hot-learning.svg" mode="aspectFit" />
				</view>
				<view class="grid-text">
					<text class="grid-title">培训资料</text>
					<text class="grid-sub">新人入职必读</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'KnowledgeSection',
	methods: {
		goList(categoryId, title) {
			uni.navigateTo({
				url: `/pages/article/list?categoryId=${categoryId}&title=${encodeURIComponent(title)}`
			})
		}
	}
}
</script>

<style scoped>
.section {
	margin-bottom: 24rpx;
}

.section-header {
	margin-bottom: 24rpx;
	align-items: center;
	display: flex;
}

.section-header.row {
	flex-direction: row;
}

.section-title-bar {
	width: 6rpx;
	height: 32rpx;
	border-radius: 4rpx;
	background-color: #6667ab;
	margin-right: 12rpx;
}

.section-title-bar.accent {
	background-color: #ffbe98;
}

.section-title-text {
	font-size: 26rpx;
	font-weight: 700;
	color: #1f2937;
}

.section-header-spacer {
	flex: 1;
}

.section-subtitle-text {
	font-size: 20rpx;
	color: #9ca3af;
}

.grid {
	flex-direction: row;
	flex-wrap: wrap;
	display: flex;
	margin-left: -12rpx;
	margin-right: -12rpx;
}

.grid-item {
	width: calc(50% - 24rpx);
	background-color: #ffffff;
	border-radius: 24rpx;
	padding: 12rpx;
	margin: 0 12rpx 24rpx;
	box-sizing: border-box;
	box-shadow: 0 4rpx 16rpx rgba(148, 163, 184, 0.1);
}

.grid-img {
	height: 120rpx;
	border-radius: 16rpx;
	background-color: #f3f4f6;
	align-items: center;
	justify-content: center;
	display: flex;
	position: relative;
	margin-bottom: 8rpx;
}

.grid-img.bg-blue { background-color: #EFF6FF; }
.grid-img.bg-purple { background-color: #F3F0FF; }
.grid-img.bg-orange { background-color: #FFF7ED; }
.grid-img.bg-green { background-color: #ECFDF5; }

.grid-icon {
	width: 64rpx;
	height: 64rpx;
}

.grid-text {
	padding: 8rpx 4rpx 0;
}

.grid-title {
	font-size: 22rpx;
	font-weight: 700;
	color: #111827;
}

.grid-sub {
	margin-top: 4rpx;
	font-size: 18rpx;
	color: #9ca3af;
}
</style>
