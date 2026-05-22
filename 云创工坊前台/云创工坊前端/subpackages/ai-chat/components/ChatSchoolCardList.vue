<template>
	<view v-if="cards.length" class="school-card-group">
		<view
			v-for="card in cards"
			:key="card.id"
			class="school-card"
			hover-class="school-card-hover"
			@tap="openSchool(card)"
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
				<view class="school-card-footer-actions">
					<view class="school-card-copy-button" hover-class="school-card-copy-button-hover" @tap.stop="copySchoolRoute(card)">
						<text class="school-card-copy-button-text">复制跳转 URL</text>
					</view>
					<view class="school-card-open-button" hover-class="school-card-open-button-hover" @tap.stop="openSchool(card)">
						<text class="school-card-open-button-text">查看详情</text>
					</view>
				</view>
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
		buildSchoolRoute(card = {}) {
			const institutionId = Number(card && card.institutionId)
			if (!Number.isFinite(institutionId) || institutionId <= 0) {
				return ''
			}

			const query = [`id=${encodeURIComponent(institutionId)}`]
			if (card.preview) query.push('preview=1')
			if (card.title) query.push(`name=${encodeURIComponent(card.title)}`)
			if (card.examType) query.push(`examType=${encodeURIComponent(card.examType)}`)
			if (card.subjectTrack) query.push(`subjectTrack=${encodeURIComponent(card.subjectTrack)}`)
			if (card.majorCategory) query.push(`majorCategory=${encodeURIComponent(card.majorCategory)}`)
			if (card.riskBucketParam) query.push(`riskBucket=${encodeURIComponent(card.riskBucketParam)}`)
			return `/subpackages/volunteer/detail?${query.join('&')}`
		},
		openSchool(card = {}) {
			const routeUrl = this.buildSchoolRoute(card)
			if (!routeUrl) {
				uni.showToast({ title: '学校信息不完整', icon: 'none' })
				return
			}

			uni.navigateTo({
				url: routeUrl,
				fail: (error) => {
					console.warn('[ChatSchoolCardList] navigateTo failed:', error, routeUrl, card)
					uni.redirectTo({
						url: routeUrl,
						fail: (redirectError) => {
							console.warn('[ChatSchoolCardList] redirectTo failed:', redirectError, routeUrl, card)
							uni.showToast({ title: '页面打开失败', icon: 'none' })
						}
					})
				}
			})
		},
		copySchoolRoute(card = {}) {
			const routeUrl = this.buildSchoolRoute(card)
			if (!routeUrl) {
				uni.showToast({ title: '学校信息不完整', icon: 'none' })
				return
			}

			uni.setClipboardData({
				data: routeUrl,
				success: () => {
					uni.showToast({ title: '跳转 URL 已复制', icon: 'none' })
				}
			})
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

.school-card-footer-actions {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.school-card-copy-button,
.school-card-open-button {
	padding: 12rpx 22rpx;
	border-radius: 999rpx;
}

.school-card-copy-button {
	background: rgba(255, 255, 255, 0.92);
	border: 1rpx solid rgba(86, 119, 185, 0.18);
}

.school-card-open-button {
	background: linear-gradient(135deg, #78a8ff, #5f82d8);
	box-shadow: 0 10rpx 18rpx rgba(95, 130, 216, 0.18);
}

.school-card-copy-button-hover,
.school-card-open-button-hover {
	transform: translateY(2rpx) scale(0.99);
}

.school-card-copy-button-text {
	font-size: 20rpx;
	font-weight: 700;
	color: #5677b9;
}

.school-card-open-button-text {
	font-size: 20rpx;
	font-weight: 700;
	color: #ffffff;
}
</style>
