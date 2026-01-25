<template>
	<view class="business-grid">
		<view
			v-for="(item, index) in items"
			:key="item.id"
			class="grid-item"
			:class="{ 'grid-item-active': index === activeIndex }"
			@tap="handleSelect(index)"
		>
			<view class="grid-icon" :style="{ backgroundColor: item.bgColor }">
				<text class="grid-icon-text">{{ item.short }}</text>
				<!-- 有干货标记 -->
				<view v-if="item.hasArticles" class="articles-badge">
					<text class="badge-text">有干货</text>
				</view>
			</view>
			<text class="grid-title">{{ item.title }}</text>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'BusinessGrid',
		props: {
			items: {
				type: Array,
				default: () => []
			},
			activeIndex: {
				type: Number,
				default: 0
			}
		},
		methods: {
			handleSelect(index) {
				this.$emit('select', index)
			}
		}
	}
</script>

<style scoped>
	.business-grid {
		flex-direction: row;
		flex-wrap: wrap;
		display: flex;
		margin-bottom: 24rpx;
	}

	.grid-item {
		width: 33.33%;
		padding: 16rpx 8rpx;
		box-sizing: border-box;
		align-items: center;
		justify-content: center;
		display: flex;
		flex-direction: column;
		border-radius: 24rpx;
		background-color: #ffffff;
		border: 2rpx solid transparent;
		transition: all 0.3s ease;
	}

	.grid-item-active {
		background-color: #eef2ff;
		border-color: #6667ab;
		transform: scale(1.02);
	}

	.grid-icon {
		width: 80rpx;
		height: 80rpx;
		border-radius: 40rpx;
		align-items: center;
		justify-content: center;
		display: flex;
		margin-bottom: 12rpx;
		position: relative;
	}

	.grid-icon-text {
		font-size: 22rpx;
		color: #0f172a;
		font-weight: 600;
	}

	/* 有干货徽章 */
	.articles-badge {
		position: absolute;
		top: -16rpx;
		right: -32rpx;
		background-color: #34d399;
		padding: 4rpx 10rpx;
		border-radius: 20rpx;
		box-shadow: 0 4rpx 12rpx rgba(52, 211, 153, 0.4);
	}

	.badge-text {
		font-size: 18rpx;
		color: #000000;
		font-weight: 700;
		line-height: 1;
	}

	.grid-title {
		font-size: 22rpx;
		color: #4b5563;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		width: 100%;
	}
</style>
