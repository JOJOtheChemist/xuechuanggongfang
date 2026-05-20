<template>
	<view class="page-root">
		<view class="status-bar"></view>
		<view class="nav-bar">
			<view class="back-btn" @tap="goBack">
				<text class="back-arrow">←</text>
			</view>
			<text class="nav-title">创业资料库</text>
		</view>

		<view class="page-content">
			<knowledge-section />
		</view>
	</view>
</template>

<script>
import KnowledgeSection from '../../components/tasks/KnowledgeSection.vue'

export default {
	name: 'TaskCenterKnowledgeHubPage',
	components: {
		KnowledgeSection
	},
	methods: {
		goBack() {
			uni.navigateBack()
		}
	}
}
</script>

<style scoped>
.page-root {
	min-height: 100vh;
	background: #f8fafc;
}

.status-bar {
	height: var(--status-bar-height);
	background: #ffffff;
}

.nav-bar {
	height: 88rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
	background: #ffffff;
	border-bottom: 1rpx solid #e2e8f0;
}

.back-btn {
	position: absolute;
	left: 0;
	top: 0;
	width: 88rpx;
	height: 88rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.back-arrow {
	font-size: 36rpx;
	font-weight: 700;
	color: #334155;
}

.nav-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #0f172a;
}

.page-content {
	padding: 24rpx;
}
</style>
