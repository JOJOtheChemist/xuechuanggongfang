<template>
	<view class="section">
		<view class="incentive-list">
			<view class="badge-card">
				<view class="badge-header">
					<text class="badge-title">积分徽章</text>
					<view v-if="totalPoints !== null" class="current-points">
						<text class="points-label">历史累计积分</text>
						<text class="points-value">{{ totalPoints }}</text>
					</view>
				</view>
				<scroll-view class="badge-scroll" scroll-x="true" show-scrollbar="false">
					<view class="badge-row">
						<view
							v-for="badge in badgeList"
							:key="badge.level"
							class="badge-item"
							:class="{ dim: !badge.unlocked }"
						>
							<view
								class="badge-circle"
								:class="{ gray: !badge.unlocked }"
							>
								<image class="badge-image" :src="badge.imageUrl" mode="aspectFill" />
							</view>
							<text class="badge-level">Lv.{{ badge.level }}</text>
							<text class="badge-text">{{ badge.name }}</text>
							<text class="badge-unlock-info" :class="{ unlocked: badge.unlocked }">
								{{ badge.unlocked ? '已获得' : badge.min + '分解锁' }}
							</text>
						</view>
					</view>
				</scroll-view>
			</view>
		</view>
	</view>
</template>

<script>
import { getUserBadgeData } from '../../utils/points-api'
import { getCachedImageSync, resolveCachedImages } from '@/utils/remote-image-cache'

const BADGE_IMAGE_BASE_URL = 'https://xuechuang.xyz/oss/share-assets/xuechuang/profile/badges'
const BADGE_CONFIG = [
	{ level: 1, name: '校园新人徽章', min: 0, max: 200, imageUrl: `${BADGE_IMAGE_BASE_URL}/campus-newcomer-badge-v1.png` },
	{ level: 2, name: '活力社员徽章', min: 201, max: 500, imageUrl: `${BADGE_IMAGE_BASE_URL}/active-member-badge-v1.png` },
	{ level: 3, name: '校园达人徽章', min: 501, max: 1500, imageUrl: `${BADGE_IMAGE_BASE_URL}/campus-expert-badge-v1.png` },
	{ level: 4, name: '校园领袖徽章', min: 1501, max: 3500, imageUrl: `${BADGE_IMAGE_BASE_URL}/campus-leader-badge-v1.png` },
	{ level: 5, name: '校园合伙人徽章', min: 3501, max: Infinity, imageUrl: `${BADGE_IMAGE_BASE_URL}/campus-partner-badge-v1.png` }
]

function createBadgeConfig() {
	return BADGE_CONFIG.map(badge => ({
		...badge,
		remoteImageUrl: badge.imageUrl,
		imageUrl: getCachedImageSync(badge.imageUrl)
	}))
}

export default {
	name: 'IncentiveSystem',
	data() {
		return {
			loading: false,
			totalPoints: null,
			badgeConfig: createBadgeConfig()
		}
	},
	computed: {
		badgeList() {
			if (this.totalPoints === null) return []
			return this.badgeConfig.map(badge => ({
				...badge,
				unlocked: this.totalPoints >= badge.min
			}))
		}
	},
	methods: {
		async loadBadgeImages() {
			try {
				const remoteUrls = this.badgeConfig.map(badge => badge.remoteImageUrl || badge.imageUrl)
				const cachedUrls = await resolveCachedImages(remoteUrls)

				this.badgeConfig = this.badgeConfig.map((badge, index) => ({
					...badge,
					imageUrl: cachedUrls[index] || badge.imageUrl
				}))
			} catch (error) {
				console.warn('[IncentiveSystem] 预热徽章图片失败', error)
			}
		},
		async loadBadgeData() {
			try {
				const token = uni.getStorageSync('token')
				if (!token) {
					this.totalPoints = 0
					return
				}

				const res = await getUserBadgeData()

				if (res && res.code === 0 && res.data) {
					this.totalPoints = res.data.total_points || res.data.totalPoints || 0
				}
			} catch (e) {
				console.error('[IncentiveSystem] 获取徽章数据失败', e)
				this.totalPoints = 0
			}
		}
	},
	created() {
		this.loadBadgeImages()
		this.loadBadgeData()
	}
}
</script>

<style scoped>
.section {
	margin-bottom: 0;
}

.incentive-list {
	flex-direction: column;
	display: flex;
	row-gap: 0;
}

.badge-card {
	border-radius: var(--profile-card-radius, 20rpx);
	background-color: #ffffff;
	padding: 24rpx 24rpx 20rpx;
}

	.badge-header {
		margin-bottom: 18rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16rpx;
	}

	.badge-title {
		font-size: 22rpx;
		font-weight: 700;
		color: #111827;
		flex-shrink: 0;
	}

	.current-points {
		padding: 10rpx 16rpx;
		background-color: #f3f4f6;
		border-radius: 999rpx;
		display: flex;
		align-items: baseline;
		justify-content: center;
		gap: 8rpx;
	}

	.points-label {
		font-size: 18rpx;
		color: #6b7280;
	}

	.points-value {
		font-size: 24rpx;
	font-weight: 700;
	color: #2563eb;
}

.badge-scroll {
	width: 100%;
}

.badge-row {
	flex-direction: row;
	display: flex;
}

.badge-item {
	width: 140rpx;
	align-items: center;
	display: flex;
	flex-direction: column;
	margin-right: 16rpx;
}

.badge-item:last-child {
	margin-right: 0;
}

	.badge-circle {
		width: 108rpx;
		height: 108rpx;
		border-radius: 54rpx;
		margin-bottom: 8rpx;
		position: relative;
		overflow: hidden;
		background: #f8fafc;
		box-shadow: 0 10rpx 24rpx rgba(245, 158, 11, 0.16);
	}

	.badge-image {
		width: 100%;
		height: 100%;
		display: block;
	}

.badge-level {
	font-size: 18rpx;
	font-weight: 700;
	color: #64748b;
	margin-bottom: 6rpx;
}

	.badge-circle.gray {
		background: #eef2f7;
		box-shadow: none;
	}

.badge-circle.gray .badge-image {
	opacity: 0.38;
}

.badge-item.dim {
	opacity: 0.4;
}

.badge-text {
	font-size: 18rpx;
	color: #374151;
	font-weight: 600;
	margin-bottom: 4rpx;
	text-align: center;
	word-break: break-all;
}

.badge-unlock-info {
	font-size: 16rpx;
	color: #9ca3af;
	text-align: center;
}

	.badge-unlock-info.unlocked {
		color: #16a34a;
		font-weight: 600;
	}
	</style>
