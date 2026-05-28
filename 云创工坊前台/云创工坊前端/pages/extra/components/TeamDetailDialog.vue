<template>
	<view v-if="visible" class="dialog-mask" @tap="handleClose">
		<view class="dialog-card" @tap.stop>
			<view class="dialog-head">
				<text class="dialog-title">团队详情</text>
				<text class="dialog-close" @tap="handleClose">×</text>
			</view>

			<scroll-view scroll-y class="dialog-scroll">
				<team-summary-card
					:team="team"
					:crown-icon-url="crownIconUrl"
					:member-icon-url="memberIconUrl"
					:coin-icon-url="coinIconUrl"
					:dialog-mode="true"
				/>

				<view class="section-shell">
					<view class="section-title-row">
						<view class="section-accent"></view>
						<text class="section-title">团队介绍</text>
					</view>
					<text class="section-content">{{ teamDescription }}</text>
				</view>

				<view class="section-shell">
					<view class="section-title-row">
						<view class="section-accent"></view>
						<text class="section-title">团队风采图</text>
					</view>
					<image
						v-if="teamShowcaseImage"
						class="showcase-image"
						:src="teamShowcaseImage"
						mode="widthFix"
					/>
					<view v-else class="showcase-placeholder">
						<text class="showcase-placeholder-text">暂无</text>
					</view>
				</view>
			</scroll-view>

			<button class="join-btn" @tap="handleAction">{{ actionText }}</button>
		</view>
	</view>
</template>

<script>
import TeamSummaryCard from './TeamSummaryCard.vue'

function firstNonEmptyValue(candidates = []) {
	for (let index = 0; index < candidates.length; index += 1) {
		const value = String(candidates[index] || '').trim()
		if (value) {
			return value
		}
	}
	return ''
}

export default {
	name: 'TeamDetailDialog',
	components: {
		TeamSummaryCard
	},
	props: {
		visible: {
			type: Boolean,
			default: false
		},
		team: {
			type: Object,
			default: () => ({})
		},
		crownIconUrl: {
			type: String,
			default: ''
		},
		memberIconUrl: {
			type: String,
			default: ''
		},
		coinIconUrl: {
			type: String,
			default: ''
		},
		actionText: {
			type: String,
			default: '立即加入团队'
		}
	},
	computed: {
		teamDescription() {
			return String((this.team && this.team.description) || '').trim() || '暂无团队介绍'
		},
		teamShowcaseImage() {
			const safeTeam = this.team && typeof this.team === 'object' ? this.team : {}
			const extraPayload = safeTeam.extra_payload && typeof safeTeam.extra_payload === 'object'
				? safeTeam.extra_payload
				: {}

			return firstNonEmptyValue([
				safeTeam.showcase_image,
				safeTeam.showcaseImage,
				safeTeam.style_image_url,
				safeTeam.styleImageUrl,
				safeTeam.cover_url,
				safeTeam.coverUrl,
				safeTeam.image_url,
				safeTeam.imageUrl,
				extraPayload.showcase_image,
				extraPayload.showcaseImage,
				extraPayload.style_image_url,
				extraPayload.styleImageUrl,
				extraPayload.cover_url,
				extraPayload.coverUrl,
				extraPayload.image_url,
				extraPayload.imageUrl
			])
		}
	},
	methods: {
		handleClose() {
			this.$emit('close')
		},
		handleAction() {
			this.$emit('action', this.team)
		}
	}
}
</script>

<style scoped>
.dialog-mask {
	position: fixed;
	inset: 0;
	background: rgba(15, 23, 42, 0.45);
	display: flex;
	align-items: flex-end;
	justify-content: center;
	z-index: 99;
	padding: 32rpx 24rpx;
	box-sizing: border-box;
}

.dialog-card {
	width: 100%;
	max-width: 702rpx;
	max-height: 86vh;
	background: #ffffff;
	border-radius: 32rpx;
	padding: 28rpx 24rpx 24rpx;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
}

.dialog-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 20rpx;
}

.dialog-title {
	font-size: 34rpx;
	font-weight: 700;
	color: #111827;
}

.dialog-close {
	font-size: 48rpx;
	line-height: 1;
	color: #94a3b8;
	padding: 0 6rpx;
}

.dialog-scroll {
	flex: 1;
	min-height: 0;
}

.section-shell {
	margin-top: 24rpx;
}

.section-title-row {
	display: flex;
	align-items: center;
	margin-bottom: 16rpx;
}

.section-accent {
	width: 8rpx;
	height: 28rpx;
	border-radius: 999rpx;
	background: #58b8ff;
	margin-right: 12rpx;
}

.section-title {
	font-size: 28rpx;
	font-weight: 700;
	color: #0f172a;
}

.section-content {
	font-size: 26rpx;
	line-height: 1.7;
	color: #64748b;
}

.showcase-image {
	display: block;
	width: 100%;
	border-radius: 24rpx;
	background: #f8fafc;
}

.showcase-placeholder {
	height: 240rpx;
	border-radius: 24rpx;
	background: #f8fafc;
	display: flex;
	align-items: center;
	justify-content: center;
}

.showcase-placeholder-text {
	font-size: 26rpx;
	color: #94a3b8;
}

.join-btn {
	margin-top: 24rpx;
	height: 88rpx;
	line-height: 88rpx;
	border-radius: 999rpx;
	border: none;
	background: linear-gradient(180deg, #58b8ff 0%, #2d8fff 100%);
	color: #ffffff;
	font-size: 30rpx;
	font-weight: 600;
}
</style>
