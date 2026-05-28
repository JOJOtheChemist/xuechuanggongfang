<template>
	<view class="hardcoded-card-group">
		<view
			v-for="card in visibleCards"
			:key="card.id"
			class="hardcoded-card"
			:class="card.themeClass"
			hover-class="hardcoded-card-hover"
			@tap="$emit('select', card)"
		>
			<view class="hardcoded-card-head">
				<view
					v-if="resolveVisualMode(card) === 'avatar'"
					class="hardcoded-card-avatar-shell"
				>
					<image class="hardcoded-card-avatar" :src="card.avatarUrl" mode="aspectFill" />
				</view>
				<view
					v-else-if="resolveVisualMode(card) === 'cover'"
					class="hardcoded-card-cover-shell"
				>
					<image class="hardcoded-card-cover" :src="card.coverImageUrl" mode="aspectFill" />
				</view>
				<view
					v-else
					class="hardcoded-card-cover-shell hardcoded-card-cover-shell-fallback"
				>
					<text class="hardcoded-card-cover-fallback-text">{{ resolveFallbackLabel(card) }}</text>
				</view>

				<view class="hardcoded-card-copy">
					<view class="hardcoded-card-title-row">
						<text class="hardcoded-card-title">{{ card.title }}</text>
						<text v-if="card.badge" class="hardcoded-card-badge">{{ card.badge }}</text>
					</view>
					<text v-if="card.summary" class="hardcoded-card-summary">{{ card.summary }}</text>
					<view v-if="card.tags && card.tags.length" class="hardcoded-card-tags">
						<text
							v-for="tag in card.tags"
							:key="tag"
							class="hardcoded-card-tag"
						>
							{{ tag }}
						</text>
					</view>
				</view>
			</view>

			<view class="hardcoded-card-footer">
				<text v-if="card.meta" class="hardcoded-card-meta">{{ card.meta }}</text>
				<view class="hardcoded-card-button">
					<text class="hardcoded-card-button-text">{{ card.buttonText }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'ChatXiaochunluHardcodedCards',
	props: {
		cards: {
			type: Array,
			default: () => []
		}
	},
	computed: {
		visibleCards() {
			return Array.isArray(this.cards) ? this.cards.filter(Boolean) : []
		}
	},
	methods: {
		resolveVisualMode(card = {}) {
			if (card.avatarUrl) return 'avatar'
			if (card.coverImageUrl) return 'cover'
			return 'fallback'
		},
		resolveFallbackLabel(card = {}) {
			const label = String(card.visualLabel || card.badge || card.title || '').trim()
			return label.slice(0, 4) || '入口'
		}
	}
}
</script>

<style scoped>
.hardcoded-card-group {
	display: flex;
	flex-direction: column;
	gap: 14rpx;
	padding: 18rpx 0 0;
	width: 100%;
	box-sizing: border-box;
}

.hardcoded-card {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
	padding: 20rpx 22rpx;
	border-radius: 28rpx;
	background: linear-gradient(135deg, rgba(255, 250, 244, 0.98), rgba(252, 238, 220, 0.94));
	border: 1rpx solid rgba(220, 178, 129, 0.34);
	box-shadow: 0 16rpx 28rpx rgba(203, 157, 102, 0.12);
}

.hardcoded-card-xiaochunlu {
	background: linear-gradient(135deg, rgba(255, 246, 235, 0.98), rgba(255, 225, 188, 0.94));
	border-color: rgba(230, 175, 110, 0.32);
	box-shadow: 0 16rpx 28rpx rgba(214, 152, 77, 0.12);
}

.hardcoded-card-article {
	background: linear-gradient(135deg, rgba(249, 255, 250, 0.98), rgba(235, 248, 239, 0.94));
	border-color: rgba(150, 198, 161, 0.3);
	box-shadow: 0 16rpx 28rpx rgba(122, 176, 133, 0.1);
}

.hardcoded-card-gaokao {
	background: linear-gradient(135deg, rgba(241, 248, 255, 0.98), rgba(223, 236, 252, 0.94));
	border-color: rgba(123, 167, 213, 0.28);
	box-shadow: 0 16rpx 28rpx rgba(112, 155, 200, 0.12);
}

.hardcoded-card-hover {
	transform: translateY(2rpx) scale(0.995);
}

.hardcoded-card-head {
	display: flex;
	align-items: center;
	gap: 16rpx;
}

.hardcoded-card-avatar-shell {
	width: 84rpx;
	height: 84rpx;
	border-radius: 24rpx;
	overflow: hidden;
	background: rgba(255, 255, 255, 0.88);
	box-shadow: 0 10rpx 20rpx rgba(0, 0, 0, 0.08);
	flex-shrink: 0;
}

.hardcoded-card-avatar {
	display: block;
	width: 100%;
	height: 100%;
}

.hardcoded-card-cover-shell {
	width: 148rpx;
	height: 96rpx;
	border-radius: 22rpx;
	overflow: hidden;
	background: rgba(255, 255, 255, 0.84);
	box-shadow: 0 10rpx 22rpx rgba(0, 0, 0, 0.08);
	flex-shrink: 0;
}

.hardcoded-card-cover {
	display: block;
	width: 100%;
	height: 100%;
}

.hardcoded-card-cover-shell-fallback {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 14rpx;
}

.hardcoded-card-cover-fallback-text {
	font-size: 24rpx;
	line-height: 1.3;
	font-weight: 800;
	color: rgba(113, 69, 33, 0.82);
	text-align: center;
}

.hardcoded-card-xiaochunlu .hardcoded-card-cover-fallback-text {
	color: rgba(122, 74, 22, 0.82);
}

.hardcoded-card-article .hardcoded-card-cover-fallback-text {
	color: rgba(32, 82, 49, 0.82);
}

.hardcoded-card-gaokao .hardcoded-card-cover-fallback-text {
	color: rgba(36, 74, 117, 0.82);
}

.hardcoded-card-copy {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 6rpx;
}

.hardcoded-card-title-row {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 10rpx;
}

.hardcoded-card-title {
	font-size: 29rpx;
	line-height: 1.36;
	font-weight: 800;
	color: #714521;
}

.hardcoded-card-xiaochunlu .hardcoded-card-title {
	color: #7a4a16;
}

.hardcoded-card-article .hardcoded-card-title {
	color: #2d6140;
}

.hardcoded-card-gaokao .hardcoded-card-title {
	color: #244a75;
}

.hardcoded-card-badge {
	padding: 5rpx 12rpx;
	border-radius: 999rpx;
	font-size: 19rpx;
	font-weight: 700;
	color: #9a612c;
	background: rgba(255, 255, 255, 0.76);
}

.hardcoded-card-xiaochunlu .hardcoded-card-badge {
	color: #98612a;
}

.hardcoded-card-article .hardcoded-card-badge {
	color: #48855b;
}

.hardcoded-card-gaokao .hardcoded-card-badge {
	color: #4f78a6;
}

.hardcoded-card-summary {
	font-size: 21rpx;
	line-height: 1.55;
	color: rgba(113, 69, 33, 0.78);
}

.hardcoded-card-xiaochunlu .hardcoded-card-summary {
	color: rgba(122, 74, 22, 0.78);
}

.hardcoded-card-article .hardcoded-card-summary {
	color: rgba(45, 97, 64, 0.74);
}

.hardcoded-card-gaokao .hardcoded-card-summary {
	color: rgba(36, 74, 117, 0.78);
}

.hardcoded-card-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 8rpx;
}

.hardcoded-card-tag {
	padding: 5rpx 11rpx;
	border-radius: 999rpx;
	font-size: 18rpx;
	line-height: 1.2;
	color: #8f5b28;
	background: rgba(255, 255, 255, 0.7);
}

.hardcoded-card-xiaochunlu .hardcoded-card-tag {
	color: #8f5b28;
}

.hardcoded-card-article .hardcoded-card-tag {
	color: #4c835d;
}

.hardcoded-card-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}

.hardcoded-card-meta {
	flex: 1;
	min-width: 0;
	font-size: 19rpx;
	line-height: 1.45;
	color: rgba(113, 69, 33, 0.72);
}

.hardcoded-card-xiaochunlu .hardcoded-card-meta {
	color: rgba(122, 74, 22, 0.72);
}

.hardcoded-card-article .hardcoded-card-meta {
	color: rgba(45, 97, 64, 0.68);
}

.hardcoded-card-gaokao .hardcoded-card-meta {
	color: rgba(36, 74, 117, 0.72);
}

.hardcoded-card-button {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 14rpx 22rpx;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #efb064, #d7893d);
	box-shadow: 0 10rpx 22rpx rgba(198, 131, 62, 0.22);
	flex-shrink: 0;
}

.hardcoded-card-xiaochunlu .hardcoded-card-button {
	background: linear-gradient(135deg, #f0b46b, #df9340);
	box-shadow: 0 10rpx 22rpx rgba(207, 136, 54, 0.22);
}

.hardcoded-card-article .hardcoded-card-button {
	background: linear-gradient(135deg, #7dc190, #5ba870);
	box-shadow: 0 10rpx 22rpx rgba(95, 163, 112, 0.18);
}

.hardcoded-card-gaokao .hardcoded-card-button {
	background: linear-gradient(135deg, #75b0eb, #538fce);
	box-shadow: 0 10rpx 22rpx rgba(82, 131, 187, 0.22);
}

.hardcoded-card-button-text {
	font-size: 23rpx;
	font-weight: 800;
	color: #ffffff;
}
</style>
