<template>
	<view class="version-line" :class="{ 'version-line-clickable': showUpdateHint }" @tap="handleTap">
		<text class="version-line-text">
			当前版本 {{ safeCurrentVersion }}，最新版本 {{ safeLatestVersion }}<text v-if="showUpdateHint" class="version-line-link">，请及时更新，查看更新方法</text>
		</text>
	</view>
</template>

<script>
import { shouldShowUpdateHint } from '../../utils/app-version'

export default {
	name: 'ProfileVersionCard',
	props: {
		currentVersion: {
			type: String,
			default: ''
		},
		latestVersion: {
			type: String,
			default: ''
		},
		updateTip: {
			type: String,
			default: ''
		}
	},
	computed: {
		safeCurrentVersion() {
			return String(this.currentVersion || '').trim() || '--'
		},
		safeLatestVersion() {
			return String(this.latestVersion || '').trim() || '--'
		},
		showUpdateHint() {
			return shouldShowUpdateHint(this.safeCurrentVersion, this.safeLatestVersion)
		},
	},
	methods: {
		handleTap() {
			if (!this.showUpdateHint) return
			this.$emit('tap')
		}
	}
}
</script>

<style scoped>
	.version-line {
		margin-top: 8rpx;
		padding: 12rpx 6rpx 0;
	}

	.version-line-clickable {
		cursor: pointer;
	}

	.version-line-text {
		display: block;
		font-size: 24rpx;
		line-height: 1.7;
		color: #6b7280;
		text-align: center;
	}

	.version-line-link {
		color: #ea580c;
		font-weight: 600;
	}
</style>
