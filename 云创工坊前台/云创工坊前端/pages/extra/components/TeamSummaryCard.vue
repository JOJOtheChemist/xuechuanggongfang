<template>
	<view class="team-summary-card" :class="{ 'team-summary-card-dialog': dialogMode }">
		<view class="thumb-container">
			<image v-if="teamAvatar" :src="teamAvatar" class="thumb" mode="aspectFill" :webp="true" />
			<view v-else class="thumb empty-thumb">
				<text class="thumb-icon">👥</text>
			</view>
		</view>

		<view class="meta">
			<view class="team-name-row">
				<text class="team-name">{{ displayTeamName }}</text>
				<image class="team-crown-icon" :src="crownIconUrl" mode="aspectFit" />
			</view>

			<view class="member-count-row">
				<image class="member-icon" :src="memberIconUrl" mode="aspectFit" />
				<text class="member-count">{{ displayMemberCount }}</text>
			</view>
		</view>

		<view class="sales-panel">
			<text class="sales-label">年度团队收益</text>
			<view class="sales-value-row">
				<text class="sales-value">{{ displayTeamIncome }}</text>
				<image class="coin-icon" :src="coinIconUrl" mode="aspectFit" />
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'TeamSummaryCard',
	props: {
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
		dialogMode: {
			type: Boolean,
			default: false
		}
	},
	computed: {
		displayTeamName() {
			return String((this.team && this.team.team_name) || '未命名团队').trim()
		},
		displayMemberCount() {
			if (this.team && this.team.displayMemberCount !== undefined && this.team.displayMemberCount !== null) {
				return String(this.team.displayMemberCount)
			}
			const count = Number(this.team && this.team.member_count)
			if (!Number.isFinite(count) || count < 0) {
				return '0'
			}
			return String(Math.round(count))
		},
		displayTeamIncome() {
			if (this.team && this.team.displayTeamIncome !== undefined && this.team.displayTeamIncome !== null) {
				return String(this.team.displayTeamIncome)
			}
			const amount = Number(
				this.team && this.team.team_year_income !== undefined && this.team.team_year_income !== null
					? this.team.team_year_income
					: this.team && this.team.month_team_sales
			)
			const roundedAmount = Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0
			return String(roundedAmount).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
		},
		teamAvatar() {
			return String(
				(this.team && (this.team.resolvedAvatar || this.team.avatar || this.team.avatar_url || this.team.default_avatar_url)) || ''
			).trim()
		}
	}
}
</script>

<style scoped>
.team-summary-card {
	display: flex;
	align-items: center;
	padding: 26rpx 28rpx;
	border-radius: 28rpx;
	background: #ffffff;
	box-shadow: 0 14rpx 34rpx rgba(15, 23, 42, 0.08);
}

.team-summary-card-dialog {
	box-shadow: 0 10rpx 26rpx rgba(15, 23, 42, 0.06);
}

.thumb-container {
	width: 108rpx;
	height: 108rpx;
	margin-right: 24rpx;
	border-radius: 50%;
	overflow: hidden;
	flex-shrink: 0;
	background: rgba(255, 255, 255, 0.28);
	box-shadow: 0 8rpx 18rpx rgba(117, 71, 39, 0.12);
}

.thumb {
	width: 100%;
	height: 100%;
}

.empty-thumb {
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(255, 255, 255, 0.24);
}

.thumb-icon {
	font-size: 34rpx;
}

.meta {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: flex-start;
}

.team-name-row {
	display: flex;
	align-items: center;
	max-width: 100%;
}

.team-name {
	max-width: 360rpx;
	font-size: 30rpx;
	line-height: 1.25;
	font-weight: 400;
	color: #111827;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.team-crown-icon {
	width: 34rpx;
	height: 34rpx;
	margin-left: 10rpx;
	flex-shrink: 0;
}

.member-count-row {
	display: flex;
	align-items: center;
	margin-top: 14rpx;
	margin-left: 18rpx;
}

.member-icon {
	width: 32rpx;
	height: 28rpx;
	margin-right: 10rpx;
	flex-shrink: 0;
}

.member-count {
	font-size: 40rpx;
	line-height: 1.2;
	font-weight: 600;
	color: #7b8798;
}

.sales-panel {
	flex-shrink: 0;
	display: flex;
	align-items: flex-end;
	justify-content: center;
	flex-direction: column;
	padding-top: 20rpx;
}

.sales-label {
	font-size: 22rpx;
	line-height: 1.2;
	color: #9ca3af;
	margin-bottom: 10rpx;
}

.sales-value-row {
	display: flex;
	align-items: center;
}

.sales-value {
	font-size: 46rpx;
	line-height: 1.2;
	font-weight: 700;
	color: #58b8ff;
	text-align: right;
}

.coin-icon {
	width: 34rpx;
	height: 28rpx;
	margin-left: 10rpx;
	flex-shrink: 0;
}
</style>
