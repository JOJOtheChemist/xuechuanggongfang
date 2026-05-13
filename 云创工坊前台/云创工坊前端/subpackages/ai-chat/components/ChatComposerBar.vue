<template>
	<view class="composer-shell">
		<textarea
			class="composer-input"
			:value="value"
			:disabled="inputDisabled"
			:maxlength="500"
			:placeholder="placeholder"
			placeholder-style="font-size: 30rpx; color: rgba(22, 63, 53, 0.45);"
			confirm-type="send"
			auto-height
			cursor-spacing="28"
			@input="handleInput"
			@confirm="handleConfirm"
			@keydown="handleKeydown"
			@compositionstart="handleCompositionStart"
			@compositionend="handleCompositionEnd"
		></textarea>
		<view class="composer-send" :class="{ 'composer-send-disabled': inputDisabled || !trimmedValue }" @tap="emitSubmit">
			<text class="composer-send-text">{{ loading ? '...' : sendIcon }}</text>
		</view>
	</view>
</template>

<script>
export default {
	name: 'ChatComposerBar',
	props: {
		value: {
			type: String,
			default: ''
		},
		placeholder: {
			type: String,
			default: '问点什么...'
		},
		sendIcon: {
			type: String,
			default: '↑'
		},
		loading: {
			type: Boolean,
			default: false
		},
		disabled: {
			type: Boolean,
			default: false
		}
	},
	data() {
		return {
			isComposing: false,
			lastCompositionEndAt: 0
		}
	},
	computed: {
		trimmedValue() {
			return String(this.value || '').trim()
		},
		inputDisabled() {
			return !!(this.disabled || this.loading)
		}
	},
	methods: {
		handleInput(event) {
			this.$emit('input', event && event.detail ? event.detail.value : '')
		},
		handleCompositionStart() {
			this.isComposing = true
		},
		handleCompositionEnd() {
			this.isComposing = false
			this.lastCompositionEndAt = Date.now()
		},
		isEnterEvent(event) {
			const detail = event && event.detail ? event.detail : {}
			const keyCode = Number(detail.keyCode || event.keyCode || event.which || 0)
			return event.key === 'Enter' || event.code === 'Enter' || event.code === 'NumpadEnter' || keyCode === 13
		},
		shouldBlockSubmit(event) {
			const detail = event && event.detail ? event.detail : {}
			const keyCode = Number(detail.keyCode || event.keyCode || event.which || 0)
			if (this.isComposing || event.isComposing || keyCode === 229) {
				return true
			}
			return Date.now() - this.lastCompositionEndAt < 80
		},
		handleKeydown(event) {
			if (!this.isEnterEvent(event)) {
				return
			}
			if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
				return
			}
			if (this.shouldBlockSubmit(event)) {
				return
			}
			if (typeof event.preventDefault === 'function') {
				event.preventDefault()
			}
			this.emitSubmit()
		},
		handleConfirm(event) {
			if (this.shouldBlockSubmit(event)) {
				return
			}
			this.emitSubmit()
		},
		emitSubmit() {
			if (this.inputDisabled || !this.trimmedValue) {
				return
			}
			this.$emit('submit', this.trimmedValue)
		}
	}
}
</script>

<style scoped>
.composer-shell {
	display: flex;
	align-items: flex-end;
	gap: 18rpx;
	min-height: 104rpx;
	padding: 14rpx 14rpx 14rpx 28rpx;
	box-sizing: border-box;
	border-radius: 36rpx;
	background: #fffdf6;
	border: 1rpx solid rgba(31, 122, 103, 0.14);
	box-shadow: 0 18rpx 36rpx rgba(22, 63, 53, 0.12);
}

.composer-input {
	flex: 1;
	font-size: 30rpx;
	line-height: 1.5;
	color: #163f35;
	background: transparent;
	border: none;
	outline: none;
	min-height: 44rpx;
	min-width: 0;
}

.composer-input[disabled] {
	color: rgba(22, 63, 53, 0.42);
}

.composer-send {
	width: 72rpx;
	height: 72rpx;
	border-radius: 999rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #ffd700;
	box-shadow: 0 18rpx 30rpx rgba(255, 215, 0, 0.24);
}

.composer-send-disabled {
	opacity: 0.4;
	box-shadow: none;
}

.composer-send-text {
	font-size: 34rpx;
	font-weight: 800;
	color: #050505;
	line-height: 1;
}
</style>
