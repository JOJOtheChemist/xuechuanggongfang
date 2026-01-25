<template>
	<view class="detail-left">
		<view class="detail-header">
			<view class="detail-title-wrap">
				<text class="detail-tag">{{ tag }}</text>
				<text class="detail-title">{{ item.title }}</text>
			</view>
		</view>
		<text class="detail-desc">{{ item.desc }}</text>
		<view class="detail-action">
			<button class="action-btn" @tap="handleViewDetail">
				{{ item.type === 'share' ? '立即分享' : (item.type === 'consult' ? '立即咨询' : '立即报名') }}
			</button>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'BusinessDetailInfo',
		props: {
			item: {
				type: Object,
				required: true
			},
			tag: {
				type: String,
				default: ''
			}
		},
		methods: {
			handleViewDetail() {
				if (this.item.type === 'share') {
					this.$emit('qr-tap')
					return
				}
				this.$emit('view-detail')
			}
		}
	}
</script>

<style scoped>
	.detail-left {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.detail-header {
		flex-direction: row;
		align-items: flex-start;
		justify-content: space-between;
		display: flex;
		margin-bottom: 16rpx;
	}

	.detail-title-wrap {
		flex-direction: column;
		display: flex;
	}

	.detail-tag {
		font-size: 18rpx;
		color: #4f46e5;
		background-color: #eef2ff;
		padding: 4rpx 14rpx;
		border-radius: 999rpx;
		margin-bottom: 10rpx;
		font-weight: 600;
	}

	.detail-title {
		font-size: 32rpx;
		color: #0f172a;
		font-weight: 700;
	}

	.detail-desc {
		font-size: 24rpx;
		line-height: 1.7;
		color: #4b5563;
		margin-bottom: 24rpx;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		overflow: hidden;
	}

	.detail-action {
		width: 100%;
		margin-top: auto;
		padding-bottom: 4rpx;
	}

	.action-btn {
		width: 100%;
		background-color: #6667ab;
		color: #ffffff;
		font-size: 24rpx;
		font-weight: 600;
		padding: 16rpx 24rpx;
		border-radius: 16rpx;
		border: none;
		box-shadow: 0 8rpx 24rpx rgba(102, 103, 171, 0.3);
		line-height: 1.5;
	}

	.action-btn::after {
		border: none;
	}
</style>
