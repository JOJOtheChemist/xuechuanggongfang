<template>
	<view v-if="visible" class="modal-overlay" @tap="handleClose">
		<view class="modal" @tap.stop>
			<text class="title">{{ title }}</text>

			<view class="slot-wrap">
				<slot name="extra"></slot>
			</view>

			<input
				v-model="password"
				type="text"
				password
				:placeholder="placeholder"
				class="input"
			/>

			<view class="actions">
				<button class="btn-primary" @tap="handleConfirm">{{ confirmText }}</button>
				<button class="btn-cancel" @tap="handleClose">{{ cancelText }}</button>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'AdminPasswordDialog',
	props: {
		visible: {
			type: Boolean,
			default: false
		},
		title: {
			type: String,
			default: '管理员验证'
		},
		placeholder: {
			type: String,
			default: '请输入管理员密码'
		},
		confirmText: {
			type: String,
			default: '确认'
		},
		cancelText: {
			type: String,
			default: '取消'
		}
	},
	data() {
		return {
			password: ''
		}
	},
	watch: {
		visible(next) {
			if (!next) {
				this.resetForm()
			}
		}
	},
	methods: {
		handleClose() {
			this.$emit('close')
		},
		handleConfirm() {
			this.$emit('confirm', (this.password || '').trim())
		},
		resetForm() {
			this.password = ''
		}
	}
}
</script>

<style scoped>
.modal-overlay {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 100;
	padding: 0 40rpx;
	box-sizing: border-box;
}

.modal {
	width: 100%;
	max-width: 620rpx;
	background: #fff;
	border-radius: 24rpx;
	padding: 34rpx;
	box-sizing: border-box;
}

.title {
	display: block;
	font-size: 32rpx;
	font-weight: 700;
	text-align: center;
	margin-bottom: 20rpx;
}

.slot-wrap {
	margin-bottom: 12rpx;
}

.input {
	width: 100%;
	height: 74rpx;
	border: 2rpx solid #e6e6e6;
	border-radius: 10rpx;
	padding: 0 18rpx;
	box-sizing: border-box;
	font-size: 26rpx;
	margin-bottom: 14rpx;
}

.actions {
	margin-top: 6rpx;
}

.btn-primary,
.btn-cancel {
	width: 100%;
	height: 74rpx;
	line-height: 74rpx;
	border: none;
	border-radius: 10rpx;
	font-size: 28rpx;
}

.btn-primary {
	background: #ff5722;
	color: #fff;
}

.btn-cancel {
	background: transparent;
	color: #9a9a9a;
	margin-top: 12rpx;
}
</style>
