<template>
	<view class="app-header">
		<view class="header-left">
			<text class="header-title">{{ title }}</text>
			<text class="header-subtitle">{{ subtitle }}</text>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'BusinessHeader',
		props: {
			title: {
				type: String,
				default: '学习中心'
			},
			subtitle: {
				type: String,
				default: '探索更多校园服务与机会'
			}
		}
	}
</script>

<style scoped>
	.app-header {
		padding: 48rpx 40rpx 24rpx;
		flex-direction: row;
		align-items: flex-end;
		justify-content: space-between;
		display: flex;
		background-color: #f8fafc;
	}

	.header-left {
		flex-direction: column;
		display: flex;
	}

	.header-title {
		font-size: 34rpx;
		font-weight: 800;
		color: #0f172a;
	}

	.header-subtitle {
		margin-top: 8rpx;
		font-size: 20rpx;
		color: #9ca3af;
	}
</style>
