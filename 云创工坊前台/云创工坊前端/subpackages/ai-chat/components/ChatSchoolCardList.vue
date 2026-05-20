<template>
	<view v-if="cards.length" class="school-card-group">
		<view
			v-for="card in cards"
			:key="card.id"
			class="school-card"
			hover-class="school-card-hover"
			@tap="handleSelect(card)"
		>
			<view class="school-card-head">
				<view class="school-card-brand">
					<image
						v-if="card.logoUrl"
						class="school-card-logo"
						:src="card.logoUrl"
						mode="aspectFill"
					/>
					<view v-else class="school-card-logo-fallback">
						<text class="school-card-logo-fallback-text">{{ resolveInitial(card.title) }}</text>
					</view>
				</view>
				<view class="school-card-copy">
					<view class="school-card-title-row">
						<text class="school-card-title">{{ card.title }}</text>
						<text v-if="card.riskBucket" class="school-card-badge">{{ resolveRiskLabel(card.riskBucket) }}</text>
					</view>
					<text v-if="card.summary" class="school-card-summary">{{ card.summary }}</text>
				</view>
			</view>

			<view v-if="resolveMetaTags(card).length" class="school-card-tags">
				<text
					v-for="tag in resolveMetaTags(card)"
					:key="`${card.id}-${tag}`"
					class="school-card-tag"
				>{{ tag }}</text>
			</view>

			<view v-if="card.majorPreview && card.majorPreview.length" class="school-card-major-row">
				<text class="school-card-major-label">专业方向</text>
				<text class="school-card-major-text">{{ card.majorPreview.join('、') }}</text>
			</view>

			<view class="school-card-footer">
				<text class="school-card-footer-text">点击查看学校详情</text>
			</view>
		</view>
	</view>
</template>

<script>
function normalizeText(value) {
	return String(value || '').trim()
}

export default {
	name: 'ChatSchoolCardList',
	props: {
		cards: {
			type: Array,
			default: () => []
		}
	},
	methods: {
		handleSelect(card) {
			this.$emit('select', card)
		},
		resolveInitial(title) {
			const text = normalizeText(title).replace(/[()（）]/g, '')
			return text.slice(0, 2) || '学校'
		},
		resolveRiskLabel(value) {
			const normalized = normalizeText(value).toLowerCase()
			if (normalized === 'hard') return '冲'
			if (normalized === 'stable') return '稳'
			if (normalized === 'safe') return '保'
			if (normalized === 'supplement') return '征集'
			return value
		},
		resolveMetaTags(card) {
			const tags = [
				card.area || card.location || card.city,
				card.schoolLevel,
				card.ownershipType,
				card.schoolType,
				card.referenceScore !== null && card.referenceScore !== undefined ? `参考分 ${card.referenceScore}` : '',
				card.strategyLabel
			]
			return tags.filter((item) => normalizeText(item)).slice(0, 5)
		}
	}
}
</script>

<style scoped>
.school-card-group {
	display: flex;
	flex-direction: column;
	gap: 18rpx;
}

.school-card {
	padding: 24rpx;
	border-radius: 28rpx;
	background: linear-gradient(180deg, #f8fbff 0%, #eef5ff 100%);
	border: 1rpx solid rgba(121, 152, 214, 0.2);
	box-shadow: 0 14rpx 30rpx rgba(88, 118, 175, 0.08);
}

.school-card-hover {
	transform: translateY(-2rpx);
	box-shadow: 0 18rpx 34rpx rgba(88, 118, 175, 0.12);
}

.school-card-head {
	display: flex;
	align-items: center;
	gap: 18rpx;
}

.school-card-brand {
	width: 76rpx;
	height: 76rpx;
	flex-shrink: 0;
}

.school-card-logo,
.school-card-logo-fallback {
	width: 100%;
	height: 100%;
	border-radius: 22rpx;
}

.school-card-logo-fallback {
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, #dceaff, #a9c6ff);
}

.school-card-logo-fallback-text {
	font-size: 24rpx;
	font-weight: 700;
	color: #264071;
}

.school-card-copy {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.school-card-title-row {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.school-card-title {
	flex: 1;
	font-size: 28rpx;
	font-weight: 700;
	color: #1f3158;
}

.school-card-badge {
	padding: 4rpx 12rpx;
	border-radius: 999rpx;
	font-size: 20rpx;
	font-weight: 700;
	color: #fff;
	background: linear-gradient(135deg, #f39b38, #ef6a4f);
}

.school-card-summary {
	font-size: 22rpx;
	line-height: 1.6;
	color: rgba(31, 49, 88, 0.72);
}

.school-card-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 10rpx;
	margin-top: 16rpx;
}

.school-card-tag {
	padding: 8rpx 14rpx;
	border-radius: 999rpx;
	font-size: 20rpx;
	color: #46618f;
	background: rgba(255, 255, 255, 0.9);
}

.school-card-major-row {
	margin-top: 16rpx;
	display: flex;
	flex-direction: column;
	gap: 6rpx;
}

.school-card-major-label {
	font-size: 20rpx;
	font-weight: 700;
	color: #4a628d;
}

.school-card-major-text {
	font-size: 22rpx;
	line-height: 1.6;
	color: #2f4671;
}

.school-card-footer {
	margin-top: 18rpx;
	display: flex;
	justify-content: flex-end;
}

.school-card-footer-text {
	font-size: 20rpx;
	font-weight: 700;
	color: #5677b9;
}
</style>
