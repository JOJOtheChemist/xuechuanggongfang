<template>
	<view class="access-card" :class="variantClassName">
		<view class="access-card-head">
			<text v-if="badgeText" class="access-card-badge">{{ badgeText }}</text>
			<text v-if="captionText" class="access-card-caption">{{ captionText }}</text>
		</view>

		<text class="access-card-title">{{ titleText }}</text>
		<text class="access-card-description">{{ descriptionText }}</text>

		<view v-if="showFooter" class="access-card-footer">
			<view v-if="showActionValue" class="access-card-action" @tap="$emit('action')">
				{{ actionTextValue }}
			</view>
			<text v-if="hintText" class="access-card-hint">{{ hintText }}</text>
		</view>
	</view>
</template>

<script>
export default {
	name: 'ChatAccessPromptCard',
	props: {
		variant: {
			type: String,
			default: 'default'
		},
		badge: {
			type: String,
			default: ''
		},
		caption: {
			type: String,
			default: ''
		},
		title: {
			type: String,
			default: ''
		},
		description: {
			type: String,
			default: ''
		},
		actionText: {
			type: String,
			default: '查看详情'
		},
		showAction: {
			type: Boolean,
			default: true
		},
		hint: {
			type: String,
			default: ''
		}
	},
	computed: {
		variantText() {
			return String(this.variant || 'default').trim() || 'default'
		},
		variantClassName() {
			return `access-card-${this.variantText}`
		},
		badgeText() {
			return String(this.badge || '').trim()
		},
		captionText() {
			return String(this.caption || '').trim()
		},
		titleText() {
			return String(this.title || '').trim()
		},
		descriptionText() {
			return String(this.description || '').trim()
		},
		actionTextValue() {
			return String(this.actionText || '查看详情').trim() || '查看详情'
		},
		hintText() {
			return String(this.hint || '').trim()
		},
		showActionValue() {
			return this.showAction
		},
		showFooter() {
			return this.showActionValue || !!this.hintText
		}
	}
}
</script>

<style scoped>
.access-card {
	position: relative;
	overflow: hidden;
	padding: 24rpx;
	border-radius: 28rpx;
	background: linear-gradient(180deg, rgba(12, 16, 28, 0.96), rgba(8, 11, 20, 0.94));
	border: 1rpx solid rgba(255, 215, 0, 0.28);
	box-shadow: 0 20rpx 42rpx rgba(0, 0, 0, 0.26);
}

.access-card-power {
	border-color: rgba(255, 170, 64, 0.42);
	background: linear-gradient(180deg, rgba(28, 18, 10, 0.96), rgba(14, 12, 10, 0.94));
}

.access-card-head,
.access-card-title,
.access-card-description,
.access-card-footer {
	position: relative;
	z-index: 1;
}

.access-card-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 18rpx;
}

.access-card-badge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 8rpx 16rpx;
	border-radius: 999rpx;
	background: rgba(255, 215, 0, 0.14);
	color: #ffd56a;
	font-size: 20rpx;
	line-height: 1;
	font-weight: 800;
	letter-spacing: 0.4rpx;
}

.access-card-power .access-card-badge {
	background: rgba(255, 170, 64, 0.16);
	color: #ffbd6a;
}

.access-card-caption {
	flex: 1;
	font-size: 22rpx;
	line-height: 1.4;
	color: rgba(255, 255, 255, 0.58);
	text-align: right;
}

.access-card-title {
	display: block;
	margin-top: 18rpx;
	font-size: 32rpx;
	line-height: 1.35;
	font-weight: 800;
	color: rgba(255, 255, 255, 0.94);
}

.access-card-description {
	display: block;
	margin-top: 10rpx;
	font-size: 24rpx;
	line-height: 1.58;
	color: rgba(255, 255, 255, 0.68);
}

.access-card-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20rpx;
	margin-top: 20rpx;
}

.access-card-action {
	flex-shrink: 0;
	min-width: 168rpx;
	height: 72rpx;
	padding: 0 24rpx;
	border-radius: 999rpx;
	background: #ffd700;
	color: #050505;
	font-size: 26rpx;
	font-weight: 800;
	line-height: 72rpx;
	text-align: center;
	box-shadow: 0 12rpx 24rpx rgba(255, 215, 0, 0.18);
}

.access-card-power .access-card-action {
	background: #ffb04a;
	box-shadow: 0 12rpx 24rpx rgba(255, 176, 74, 0.18);
}

.access-card-action:active {
	transform: scale(0.98);
}

.access-card-hint {
	flex: 1;
	font-size: 22rpx;
	line-height: 1.5;
	color: rgba(255, 255, 255, 0.48);
	text-align: right;
}
</style>
