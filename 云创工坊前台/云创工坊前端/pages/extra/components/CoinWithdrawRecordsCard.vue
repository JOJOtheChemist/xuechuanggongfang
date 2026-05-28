<template>
	<view class="record-card">
		<view class="record-head">
			<text class="record-title">最近提现记录</text>
			<text class="record-refresh" @tap="$emit('refresh')">刷新</text>
		</view>

		<view v-if="loading" class="record-empty">加载中...</view>
		<view v-else-if="records.length === 0" class="record-empty">暂无提现记录</view>
		<view v-else>
			<view v-for="item in records" :key="item.id" class="record-item">
				<view class="record-row">
					<text class="record-amount">{{ item.amountText }}</text>
					<text class="record-status" :class="item.statusClass">{{ item.statusText }}</text>
				</view>
				<text v-if="item.transferStateText" class="record-substatus">{{ item.transferStateText }}</text>
				<text v-if="item.transferFailReason" class="record-fail-reason">{{ item.transferFailReason }}</text>
				<view v-if="item.canLaunchConfirm" class="record-action-row">
					<text class="record-action-tip">如果刚刚没完成微信零钱确认，可以再次拉起</text>
					<button class="record-action-btn" @tap="$emit('launch-confirm', item)">继续确认收款</button>
				</view>
				<text class="record-time">{{ item.timeText }}</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'CoinWithdrawRecordsCard',
	props: {
		loading: {
			type: Boolean,
			default: false
		},
		records: {
			type: Array,
			default: () => []
		}
	}
}
</script>

<style scoped>
.record-card {
	margin-top: 24rpx;
	background: #ffffff;
	border-radius: 24rpx;
	padding: 28rpx;
}

.record-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 14rpx;
}

.record-title {
	font-size: 28rpx;
	font-weight: 700;
	color: #111827;
}

.record-refresh {
	font-size: 22rpx;
	color: #2563eb;
}

.record-empty {
	padding: 18rpx 0;
	font-size: 24rpx;
	color: #6b7280;
}

.record-item {
	padding: 18rpx 0;
	border-top: 1px solid #eef2f7;
}

.record-item:first-child {
	border-top: none;
}

.record-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20rpx;
}

.record-amount {
	font-size: 30rpx;
	font-weight: 700;
	color: #111827;
}

.record-status {
	padding: 6rpx 16rpx;
	border-radius: 999rpx;
	font-size: 22rpx;
}

.status-pending {
	background: #fff7ed;
	color: #c2410c;
}

.status-approved {
	background: #eff6ff;
	color: #1d4ed8;
}

.status-transferred {
	background: #ecfdf5;
	color: #047857;
}

.status-rejected {
	background: #fef2f2;
	color: #b91c1c;
}

.record-substatus {
	display: block;
	margin-top: 10rpx;
	font-size: 22rpx;
	color: #475569;
}

.record-fail-reason {
	display: block;
	margin-top: 10rpx;
	font-size: 22rpx;
	line-height: 1.5;
	color: #b91c1c;
}

.record-action-row {
	margin-top: 12rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}

.record-action-tip {
	flex: 1;
	font-size: 20rpx;
	color: #64748b;
}

.record-action-btn {
	margin: 0;
	height: 64rpx;
	line-height: 64rpx;
	padding: 0 24rpx;
	border-radius: 999rpx;
	background: #dbeafe;
	color: #1d4ed8;
	font-size: 22rpx;
	font-weight: 600;
}

.record-action-btn::after {
	border: none;
}

.record-time {
	display: block;
	margin-top: 8rpx;
	font-size: 20rpx;
	color: #94a3b8;
}
</style>
