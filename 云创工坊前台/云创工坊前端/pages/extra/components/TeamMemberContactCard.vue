<template>
	<view class="contact-panel">
		<view class="contact-inline">
			<view class="contact-item">
				<text class="contact-label">姓名</text>
				<text class="contact-value">{{ nameText || '未填写' }}</text>
			</view>
			<view class="contact-item contact-item-phone">
				<text class="contact-label">手机号</text>
				<text class="contact-value">{{ phoneText || '未填写' }}</text>
			</view>
			<view v-if="!canViewContacts" class="contact-item contact-item-status">
				<text class="contact-status">仅团长可查看</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'TeamMemberContactCard',
	props: {
		nameText: {
			type: String,
			default: ''
		},
		phoneText: {
			type: String,
			default: ''
		},
		canViewContacts: {
			type: Boolean,
			default: false
		}
	}
}
</script>

<style scoped>
.contact-panel {
	margin-top: 18rpx;
	padding-top: 6rpx;
}

.contact-inline {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	gap: 12rpx;
	white-space: nowrap;
}

.contact-item {
	display: flex;
	align-items: center;
	min-width: 0;
	flex: 1;
	gap: 6rpx;
}

.contact-item-phone {
	justify-content: flex-end;
	text-align: right;
}

.contact-label {
	flex-shrink: 0;
	color: #64748b;
	font-weight: 600;
	font-size: 22rpx;
}

.contact-value {
	min-width: 0;
	flex: 1;
	color: #0f172a;
	font-size: 26rpx;
	overflow: hidden;
	text-overflow: ellipsis;
}

.contact-item-status {
	flex: 0 0 auto;
	margin-left: 8rpx;
	justify-content: flex-end;
}

.contact-status {
	font-size: 22rpx;
	color: #c2410c;
	background: #fff1e6;
	padding: 6rpx 14rpx;
	border-radius: 999rpx;
	white-space: nowrap;
}
</style>
