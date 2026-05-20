<template>
	<view>
		<view class="profile-summary-image-group">
			<block v-for="item in profileSummaryImages" :key="item.id">
				<view v-if="item.id === 'coin-balance'" class="profile-coin-balance-card">
					<view class="profile-coin-balance-main">
						<image
							class="profile-summary-image"
							:src="item.url"
							mode="widthFix"
						/>
						<view class="profile-coin-balance-overlay">
							<view class="profile-coin-balance-main-metric">
								<text class="profile-coin-balance-main-value">
									{{ formatCoinAmount(coinStats.currentBalance) }}
								</text>
							</view>
							<view class="profile-coin-balance-sub-row">
								<view class="profile-coin-balance-sub-metric">
									<text class="profile-coin-balance-sub-value">
										+{{ formatCoinAmount(coinStats.todayIncome) }}
									</text>
								</view>
								<view class="profile-coin-balance-sub-metric">
									<text class="profile-coin-balance-sub-value">
										{{ formatCoinAmount(coinStats.totalIncome) }}
									</text>
								</view>
							</view>
						</view>
						<view class="profile-coin-entry-wrap">
							<view class="profile-coin-entry-button history" @tap="$emit('coin-history')">
								<image
									class="profile-coin-entry-image history"
									:src="coinHistoryEntryImageUrl"
									mode="widthFix"
								/>
							</view>
							<view class="profile-coin-entry-button withdraw" @tap="$emit('coin-withdraw')">
								<view class="profile-coin-entry-card withdraw">
									<view class="profile-coin-entry-icon wallet">
										<view class="profile-coin-entry-wallet-top"></view>
										<view class="profile-coin-entry-wallet-body">
											<view class="profile-coin-entry-wallet-slot"></view>
										</view>
									</view>
									<text class="profile-coin-entry-label">提现</text>
								</view>
							</view>
							<view class="profile-coin-entry-button" @tap="$emit('coin-exchange')">
								<view class="profile-coin-entry-card exchange">
									<view class="profile-coin-entry-icon gift">
										<view class="profile-coin-entry-gift-bow left"></view>
										<view class="profile-coin-entry-gift-bow right"></view>
										<view class="profile-coin-entry-gift-box">
											<view class="profile-coin-entry-gift-ribbon vertical"></view>
											<view class="profile-coin-entry-gift-ribbon horizontal"></view>
										</view>
									</view>
									<text class="profile-coin-entry-label">兑换积分</text>
								</view>
							</view>
						</view>
					</view>
				</view>
				<view v-else-if="item.id === 'annual-coin-stats'" class="profile-annual-coin-card">
					<view class="profile-annual-coin-main">
						<image
							class="profile-summary-image"
							:src="item.url"
							mode="widthFix"
						/>
						<view class="profile-annual-coin-overlay">
							<view class="profile-annual-coin-stat-item">
								<text class="profile-annual-coin-stat-value">{{ annualCoinStats.userIncome }}</text>
							</view>
							<view class="profile-annual-coin-stat-item">
								<text class="profile-annual-coin-stat-value">{{ annualCoinStats.teamIncome }}</text>
							</view>
							<view class="profile-annual-coin-stat-item">
								<text class="profile-annual-coin-stat-value">{{ annualCoinStats.companyIncome }}</text>
							</view>
							<view class="profile-annual-coin-stat-item">
								<text class="profile-annual-coin-stat-value">{{ annualCoinTarget }}</text>
							</view>
						</view>
						<view v-if="annualCoinStats.loading" class="profile-annual-coin-loading-overlay">
							<text class="profile-annual-coin-loading-text">统计中...</text>
						</view>
					</view>
				</view>
				<view v-else-if="item.id === 'points-balance'" class="profile-points-balance-card">
					<view class="profile-points-balance-main">
						<image
							class="profile-summary-image"
							:src="item.url"
							mode="widthFix"
						/>
						<view class="profile-points-balance-overlay">
							<view class="profile-points-balance-value-wrap">
								<text class="profile-points-balance-value">
									{{ pointsBalance || 0 }}
								</text>
							</view>
							<view class="profile-points-balance-actions">
								<view
									class="profile-points-balance-action image-button"
									@tap="$emit('points-center')"
								>
									<image
										class="profile-points-balance-action-image"
										:src="pointsLedgerEntryImageUrl"
										mode="widthFix"
									/>
								</view>
								<view
									class="profile-points-balance-action primary"
									@tap="$emit('points-center')"
								>
									<text class="profile-points-balance-action-text">充值</text>
								</view>
							</view>
						</view>
					</view>
				</view>
				<image
					v-else
					class="profile-summary-image"
					:src="item.url"
					mode="widthFix"
				/>
			</block>
		</view>
	</view>
</template>

<script>
import { getCachedImageSync, resolveCachedImages } from '@/utils/remote-image-cache'

const COIN_HISTORY_ENTRY_IMAGE_URL = 'https://xuechuang.xyz/oss/share-assets/admission/admin/images/0/2026/05/13/6d5fa40b-c05d-4255-af7a-123f72ca6e11.png'
const POINTS_LEDGER_ENTRY_IMAGE_URL = 'https://xuechuang.xyz/oss/share-assets/admission/admin/images/0/2026/05/13/6d5fa40b-c05d-4255-af7a-123f72ca6e11.png'
const PROFILE_SUMMARY_IMAGES = [
	{
		id: 'coin-balance',
		url: 'https://xuechuang.xyz/oss/share-assets/xuechuang/profile/summary/profile-coin-balance-v1.png'
	},
	{
		id: 'annual-coin-stats',
		url: 'https://xuechuang.xyz/oss/share-assets/xuechuang/profile/summary/profile-annual-coin-stats-v1.png'
	},
	{
		id: 'points-balance',
		url: 'https://xuechuang.xyz/oss/share-assets/xuechuang/profile/summary/profile-points-balance-v1.png'
	}
]
const PROFILE_SUMMARY_ENTRY_FIELDS = Object.freeze([
	['coinHistoryEntryImageUrl', COIN_HISTORY_ENTRY_IMAGE_URL],
	['pointsLedgerEntryImageUrl', POINTS_LEDGER_ENTRY_IMAGE_URL]
])

export default {
	name: 'ProfileSummaryPanels',
	props: {
		coinStats: {
			type: Object,
			default: () => ({})
		},
		annualCoinStats: {
			type: Object,
			default: () => ({})
		},
		pointsBalance: {
			type: [Number, String],
			default: 0
		}
	},
	data() {
		return {
			profileSummaryImages: PROFILE_SUMMARY_IMAGES.map((item) => ({
				...item,
				url: getCachedImageSync(item.url) || item.url
			})),
			coinHistoryEntryImageUrl: getCachedImageSync(COIN_HISTORY_ENTRY_IMAGE_URL) || COIN_HISTORY_ENTRY_IMAGE_URL,
			pointsLedgerEntryImageUrl: getCachedImageSync(POINTS_LEDGER_ENTRY_IMAGE_URL) || POINTS_LEDGER_ENTRY_IMAGE_URL
		}
	},
	created() {
		this.cacheStaticImages()
	},
	computed: {
		annualCoinTarget() {
			return Math.max(0, Math.floor(Number(this.annualCoinStats.annualTarget || this.annualCoinStats.annual_target || 0)))
		}
	},
	methods: {
		async cacheStaticImages() {
			const originalSummaryUrls = PROFILE_SUMMARY_IMAGES.map((item) => item.url).filter(Boolean)
			const entryUrls = PROFILE_SUMMARY_ENTRY_FIELDS.map(([, url]) => url).filter(Boolean)
			const urls = [...originalSummaryUrls, ...entryUrls]
			if (!urls.length) return

			try {
				const cachedUrls = await resolveCachedImages(urls)
				const cachedUrlMap = {}
				urls.forEach((url, index) => {
					cachedUrlMap[url] = cachedUrls[index] || url
				})

				this.profileSummaryImages = PROFILE_SUMMARY_IMAGES.map((item) => ({
					...item,
					url: cachedUrlMap[item.url] || item.url
				}))

				PROFILE_SUMMARY_ENTRY_FIELDS.forEach(([field, url]) => {
					const nextUrl = cachedUrlMap[url] || url
					if (nextUrl && this[field] !== nextUrl) {
						this[field] = nextUrl
					}
				})
			} catch (error) {
				console.warn('[ProfileSummaryPanels] cache static images failed', error)
			}
		},
		formatCoinAmount(value) {
			const numericValue = Number(value)
			if (!Number.isFinite(numericValue)) {
				return '0'
			}

			const fixed = numericValue.toFixed(2)
			const [integerPart, decimalPart] = fixed.split('.')
			const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

			if (!decimalPart || decimalPart === '00') {
				return formattedInteger
			}

			return `${formattedInteger}.${decimalPart.replace(/0+$/, '')}`
		}
	}
}
</script>

<style scoped>
	.profile-summary-image-group {
		position: relative;
		z-index: 31;
		display: flex;
		flex-direction: column;
		gap: 20rpx;
		margin: 18rpx 0 0;
	}

	.profile-coin-balance-card {
		position: relative;
		padding: 0;
		border-radius: 28rpx;
		background: #ffffff;
		box-shadow: 0 10rpx 28rpx rgba(15, 23, 42, 0.06);
		overflow: hidden;
	}

	.profile-annual-coin-card {
		position: relative;
		padding: 0;
		margin-top: 4rpx;
		border-radius: 28rpx;
		background: #ffffff;
		box-shadow: 0 10rpx 28rpx rgba(15, 23, 42, 0.06);
		overflow: hidden;
	}

	.profile-points-balance-card {
		position: relative;
		padding: 0;
		border-radius: 28rpx;
		background: #ffffff;
		box-shadow: 0 10rpx 28rpx rgba(15, 23, 42, 0.06);
		overflow: hidden;
	}

	.profile-coin-balance-main,
	.profile-annual-coin-main,
	.profile-points-balance-main {
		position: relative;
		width: 100%;
	}

	.profile-coin-balance-overlay {
		position: absolute;
		top: 60rpx;
		left: 78rpx;
		right: 278rpx;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: flex-start;
		gap: 16rpx;
		z-index: 2;
	}

	.profile-annual-coin-overlay {
		position: absolute;
		top: 102rpx;
		left: 28rpx;
		right: 28rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
		z-index: 2;
	}

	.profile-points-balance-overlay {
		position: absolute;
		left: 54rpx;
		right: 46rpx;
		bottom: 40rpx;
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 24rpx;
		z-index: 2;
	}

	.profile-coin-entry-wrap {
		position: absolute;
		top: 34rpx;
		right: 36rpx;
		z-index: 3;
		display: flex;
		flex-direction: row;
		justify-content: flex-end;
		align-items: stretch;
		gap: 10rpx;
		width: 370rpx;
	}

	.profile-coin-entry-button {
		flex: 1 1 0;
		border-radius: 18rpx;
		overflow: hidden;
		display: block;
	}

	.profile-coin-entry-button.withdraw {
		transform: translateX(-10rpx);
	}

	.profile-coin-entry-button.history {
		display: flex;
		align-items: stretch;
	}

	.profile-coin-entry-image,
	.profile-summary-image {
		display: block;
		width: 100%;
	}

	.profile-coin-entry-card {
		height: 100%;
		min-height: 124rpx;
		padding: 18rpx 12rpx 14rpx;
		border-radius: 24rpx;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(246, 248, 255, 0.94) 100%),
			#ffffff;
		box-shadow:
			0 12rpx 26rpx rgba(31, 41, 55, 0.08),
			inset 0 1rpx 0 rgba(255, 255, 255, 0.92);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
	}

	.profile-coin-entry-card.withdraw {
		background:
			linear-gradient(180deg, rgba(255, 247, 237, 0.98) 0%, rgba(255, 255, 255, 0.94) 100%),
			#ffffff;
	}

	.profile-coin-entry-card.exchange {
		background:
			linear-gradient(180deg, rgba(239, 246, 255, 0.98) 0%, rgba(255, 255, 255, 0.94) 100%),
			#ffffff;
	}

	.profile-coin-entry-icon {
		position: relative;
		width: 48rpx;
		height: 48rpx;
		margin-bottom: 10rpx;
	}

	.profile-coin-entry-label {
		font-size: 22rpx;
		font-weight: 700;
		line-height: 1.2;
		color: #1f2937;
		text-align: center;
		white-space: nowrap;
	}

	.profile-coin-entry-wallet-top {
		position: absolute;
		top: 4rpx;
		left: 8rpx;
		width: 24rpx;
		height: 12rpx;
		border-radius: 8rpx 8rpx 4rpx 4rpx;
		background: linear-gradient(180deg, #ffd19a 0%, #ffb458 100%);
		box-shadow: 0 4rpx 10rpx rgba(255, 159, 64, 0.18);
	}

	.profile-coin-entry-wallet-body {
		position: absolute;
		left: 6rpx;
		right: 4rpx;
		bottom: 4rpx;
		height: 28rpx;
		border-radius: 10rpx;
		background: linear-gradient(180deg, #ffbd6e 0%, #ff9948 100%);
		box-shadow: 0 10rpx 16rpx rgba(255, 159, 64, 0.2);
	}

	.profile-coin-entry-wallet-slot {
		position: absolute;
		top: 9rpx;
		right: 5rpx;
		width: 12rpx;
		height: 10rpx;
		border-radius: 999rpx;
		background: rgba(255, 255, 255, 0.95);
	}

	.profile-coin-entry-wallet-slot::after {
		content: '';
		position: absolute;
		top: 3rpx;
		left: 4rpx;
		width: 4rpx;
		height: 4rpx;
		border-radius: 50%;
		background: #ff9948;
	}

	.profile-coin-entry-gift-bow {
		position: absolute;
		top: 1rpx;
		width: 16rpx;
		height: 14rpx;
		border: 4rpx solid #5b89ff;
		background: rgba(255, 255, 255, 0.5);
	}

	.profile-coin-entry-gift-bow.left {
		left: 6rpx;
		border-right: 0;
		border-radius: 12rpx 0 10rpx 10rpx;
		transform: rotate(-18deg);
	}

	.profile-coin-entry-gift-bow.right {
		right: 6rpx;
		border-left: 0;
		border-radius: 0 12rpx 10rpx 10rpx;
		transform: rotate(18deg);
	}

	.profile-coin-entry-gift-box {
		position: absolute;
		left: 6rpx;
		right: 6rpx;
		bottom: 5rpx;
		height: 26rpx;
		border-radius: 10rpx;
		background: linear-gradient(180deg, #7ca4ff 0%, #4d78f7 100%);
		box-shadow: 0 10rpx 16rpx rgba(77, 120, 247, 0.22);
	}

	.profile-coin-entry-gift-ribbon {
		position: absolute;
		background: rgba(255, 255, 255, 0.95);
	}

	.profile-coin-entry-gift-ribbon.vertical {
		top: 0;
		bottom: 0;
		left: 50%;
		width: 6rpx;
		transform: translateX(-50%);
	}

	.profile-coin-entry-gift-ribbon.horizontal {
		left: 0;
		right: 0;
		top: 10rpx;
		height: 6rpx;
	}

	.profile-coin-entry-image.history {
		width: 110%;
		max-width: none;
		margin-top: 10rpx;
		margin-bottom: -4rpx;
	}

	.profile-coin-balance-main-metric {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: flex-start;
		min-width: 0;
		padding-left: 6rpx;
	}

	.profile-coin-balance-main-value {
		font-size: 44rpx;
		font-weight: 800;
		line-height: 1;
		color: #111111;
		text-align: left;
	}

	.profile-annual-coin-stat-item {
		flex: 1 1 0;
		min-width: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.profile-annual-coin-stat-item:last-child {
		transform: translateX(-26rpx);
	}

	.profile-annual-coin-stat-value {
		font-size: 28rpx;
		font-weight: 700;
		line-height: 1.15;
		color: #111111;
		text-align: center;
	}

	.profile-coin-balance-sub-row {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: 42rpx;
		padding-left: 46rpx;
		transform: translateY(-18rpx);
		box-sizing: border-box;
	}

	.profile-coin-balance-sub-metric {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		justify-content: flex-start;
		min-width: 0;
	}

	.profile-coin-balance-sub-metric:first-child {
		transform: translateX(15rpx);
	}

	.profile-coin-balance-sub-metric:nth-child(2) {
		transform: translateX(110rpx);
	}

	.profile-coin-balance-sub-value {
		font-size: 28rpx;
		font-weight: 700;
		line-height: 1.1;
		color: #111111;
		text-align: left;
	}

	.profile-annual-coin-loading-overlay {
		position: absolute;
		right: 28rpx;
		bottom: 24rpx;
		z-index: 2;
	}

	.profile-annual-coin-loading-text {
		font-size: 20rpx;
		color: #111111;
		line-height: 1.2;
	}

	.profile-points-balance-value {
		font-size: 48rpx;
		font-weight: 800;
		line-height: 1;
		color: #111111;
		text-align: left;
	}

	.profile-points-balance-value-wrap {
		flex: 1 1 auto;
		min-width: 0;
		position: relative;
		left: 38rpx;
		top: 18rpx;
	}

	.profile-points-balance-actions {
		flex: 0 0 auto;
		display: flex;
		align-items: stretch;
		gap: 12rpx;
	}

	.profile-points-balance-action {
		min-height: 58rpx;
		padding: 0 22rpx;
		border-radius: 999rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		min-width: 94rpx;
		border: 1px solid rgba(17, 17, 17, 0.12);
		box-shadow: 0 8rpx 18rpx rgba(15, 23, 42, 0.08);
	}

	.profile-points-balance-action.primary {
		min-width: 110rpx;
		min-height: 62rpx;
		background: transparent;
		border-color: transparent;
		box-shadow: none;
		transform: translate(-30rpx, 22rpx);
	}

	.profile-points-balance-action.image-button {
		min-height: 0;
		min-width: 0;
		padding: 0;
		border: none;
		border-radius: 0;
		box-shadow: none;
		background: transparent;
		overflow: visible;
		position: relative;
		left: -22rpx;
		top: 18rpx;
	}

	.profile-points-balance-action-text {
		font-size: 22rpx;
		font-weight: 700;
		line-height: 1;
		letter-spacing: 2rpx;
		color: transparent;
	}

	.profile-points-balance-action-image {
		display: block;
		width: 132rpx;
	}
</style>
