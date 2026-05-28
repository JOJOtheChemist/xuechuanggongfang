<template>
	<view class="update-page">
		<scroll-view class="update-scroll" scroll-y>
			<view class="update-shell">
				<view class="update-banner-card">
					<image class="update-banner-image" :src="bannerUrl" mode="widthFix" />
				</view>

				<view class="update-summary-card">
					<view class="update-summary-row">
						<text class="update-summary-label">当前版本</text>
						<text class="update-summary-value">{{ currentVersion }}</text>
					</view>
					<view class="update-summary-row">
						<text class="update-summary-label">最新版本</text>
						<text class="update-summary-value">{{ latestVersion }}</text>
					</view>
					<text v-if="showUpdateHint" class="update-summary-tip">{{ updateTip }}</text>
				</view>

				<update-guide-steps />
			</view>
		</scroll-view>
	</view>
</template>

<script>
import UpdateGuideSteps from './components/UpdateGuideSteps.vue'
import {
	CURRENT_APP_VERSION,
	DEFAULT_UPDATE_BANNER_URL,
	DEFAULT_UPDATE_TIP,
	fetchRemoteAppVersionInfo,
	readCachedAppVersionInfo,
	shouldShowUpdateHint
} from '@/utils/app-version'

export default {
	components: {
		UpdateGuideSteps
	},
	data() {
		return {
			currentVersion: CURRENT_APP_VERSION,
			latestVersion: CURRENT_APP_VERSION,
			updateTip: DEFAULT_UPDATE_TIP,
			bannerUrl: DEFAULT_UPDATE_BANNER_URL
		}
	},
	computed: {
		showUpdateHint() {
			return shouldShowUpdateHint(this.currentVersion, this.latestVersion)
		}
	},
	onLoad(options = {}) {
		const currentVersion = String(options.currentVersion || '').trim()
		const latestVersion = String(options.latestVersion || '').trim()

		if (currentVersion) {
			this.currentVersion = currentVersion
		}
		if (latestVersion) {
			this.latestVersion = latestVersion
		}

		this.loadAppVersionInfo()
	},
	methods: {
		async loadAppVersionInfo() {
			const cachedInfo = readCachedAppVersionInfo()
			this.currentVersion = cachedInfo.currentVersion || this.currentVersion
			this.latestVersion = cachedInfo.latestVersion || this.latestVersion
			this.updateTip = cachedInfo.updateTip || this.updateTip
			this.bannerUrl = cachedInfo.bannerUrl || this.bannerUrl

			const latestInfo = await fetchRemoteAppVersionInfo()
			this.currentVersion = latestInfo.currentVersion || this.currentVersion
			this.latestVersion = latestInfo.latestVersion || this.latestVersion
			this.updateTip = latestInfo.updateTip || this.updateTip
			this.bannerUrl = latestInfo.bannerUrl || this.bannerUrl
		}
	}
}
</script>

<style scoped>
	.update-page {
		min-height: 100vh;
		background:
			radial-gradient(circle at top right, rgba(251, 191, 36, 0.18), transparent 32%),
			linear-gradient(180deg, #fffaf3 0%, #f8fafc 36%, #ffffff 100%);
	}

	.update-scroll {
		height: 100vh;
	}

	.update-shell {
		padding: 28rpx 24rpx 40rpx;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 24rpx;
	}

	.update-banner-card,
	.update-summary-card {
		border-radius: 28rpx;
		background: #ffffff;
		box-shadow: 0 18rpx 48rpx rgba(15, 23, 42, 0.08);
		overflow: hidden;
	}

	.update-banner-image {
		display: block;
		width: 100%;
	}

	.update-summary-card {
		padding: 30rpx 28rpx;
		display: flex;
		flex-direction: column;
		gap: 18rpx;
	}

	.update-summary-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20rpx;
	}

	.update-summary-label {
		font-size: 26rpx;
		color: #6b7280;
	}

	.update-summary-value {
		font-size: 30rpx;
		font-weight: 700;
		color: #111827;
	}

	.update-summary-tip {
		font-size: 24rpx;
		line-height: 1.7;
		color: #ea580c;
	}
</style>
