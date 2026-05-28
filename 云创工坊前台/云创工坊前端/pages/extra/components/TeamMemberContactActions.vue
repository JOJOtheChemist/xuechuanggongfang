<template>
	<view class="contact-actions-wrap">
		<view class="contact-actions">
			<button
				class="contact-btn contact-btn-secondary"
				size="mini"
				@tap.stop="emitToggleReveal"
			>
				{{ revealed ? '隐藏' : '明文' }}
			</button>
			<button
				class="contact-btn contact-btn-primary"
				size="mini"
				@tap.stop="emitCopy"
			>
				复制
			</button>
		</view>
	</view>
</template>

<script>
export default {
	name: 'TeamMemberContactActions',
	props: {
		member: {
			type: Object,
			default() {
				return {}
			}
		},
		revealed: {
			type: Boolean,
			default: false
		}
	},
	methods: {
		emitToggleReveal() {
			this.$emit('toggle-reveal', this.member)
		},
		emitCopy() {
			this.$emit('copy', this.member)
		}
	}
}
</script>

<style scoped>
.contact-actions-wrap {
	margin-top: 16rpx;
}

.contact-actions {
	display: flex;
	gap: 12rpx;
	position: relative;
	z-index: 5;
}

.contact-btn {
	margin: 0;
	padding: 0 22rpx;
	height: 58rpx;
	line-height: 58rpx;
	border-radius: 999rpx;
	font-size: 22rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 1;
	box-sizing: border-box;
	min-width: 0;
	position: relative;
	z-index: 6;
}

.contact-btn::after {
	border: none;
}

.contact-btn-secondary {
	background: #ffffff;
	color: #c2410c;
	border: 1rpx solid #fed7aa;
}

.contact-btn-primary {
	background: #f97316;
	color: #ffffff;
}
</style>
