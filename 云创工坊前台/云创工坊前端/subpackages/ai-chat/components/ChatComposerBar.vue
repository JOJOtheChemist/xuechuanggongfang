<template>
	<view class="composer-shell" :class="shellClassName">
		<image
			v-if="resolvedBackgroundImageUrl"
			class="composer-background-image"
			:src="resolvedBackgroundImageUrl"
			mode="widthFix"
			@error="handleBackgroundImageError"
		/>
		<view class="composer-content" :class="contentClassName">
		<textarea
			ref="composerInput"
			class="composer-input"
			:class="inputClassName"
			:value="value"
			:disabled="inputDisabled"
			:maxlength="500"
			:placeholder="placeholder"
			:placeholder-style="resolvedPlaceholderStyle"
			confirm-type="send"
			auto-height
			cursor-spacing="28"
			@input="handleInput"
			@confirm="handleConfirm"
			@focus="handleFocus"
			@blur="handleBlur"
			@compositionstart="handleCompositionStart"
			@compositionend="handleCompositionEnd"
		></textarea>
		<view
			class="composer-send"
			:class="[{ 'composer-send-disabled': inputDisabled || !trimmedValue }, sendClassName]"
			@tap="emitSubmit"
		>
			<text class="composer-send-text">{{ sendButtonText }}</text>
		</view>
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
		},
		displayMode: {
			type: String,
			default: 'default'
		},
		backgroundImageUrl: {
			type: String,
			default: ''
		},
		sendButtonImageUrl: {
			type: String,
			default: ''
		}
	},
	data() {
		return {
			isComposing: false,
			lastCompositionEndAt: 0,
			backgroundImageLoadFailed: false,
			isFocused: false,
			lastSubmitAt: 0
		}
	},
	mounted() {
		if (typeof window !== 'undefined' && window && typeof window.addEventListener === 'function') {
			window.addEventListener('keydown', this.handleGlobalKeydown, true)
		}
	},
	beforeDestroy() {
		if (typeof window !== 'undefined' && window && typeof window.removeEventListener === 'function') {
			window.removeEventListener('keydown', this.handleGlobalKeydown, true)
		}
	},
	computed: {
		trimmedValue() {
			return String(this.value || '').trim()
		},
		inputDisabled() {
			return !!(this.disabled || this.loading)
		},
		isGaokaoMode() {
			return this.displayMode === 'gaokao'
		},
		shellClassName() {
			if (!this.isGaokaoMode) return ''
			return {
				'composer-shell-gaokao': true,
				'composer-shell-gaokao-fallback': !this.resolvedBackgroundImageUrl
			}
		},
		contentClassName() {
			return this.isGaokaoMode && !this.resolvedBackgroundImageUrl
				? 'composer-content-gaokao-fallback'
				: ''
		},
		inputClassName() {
			if (!this.isGaokaoMode) return ''
			return {
				'composer-input-gaokao': true,
				'composer-input-gaokao-fallback': !this.resolvedBackgroundImageUrl
			}
		},
		sendClassName() {
			if (!this.isGaokaoMode) {
				return ''
			}
			return {
				'composer-send-gaokao': true,
				'composer-send-gaokao-fallback': !this.resolvedBackgroundImageUrl
			}
		},
		resolvedBackgroundImageUrl() {
			if (this.backgroundImageLoadFailed) return ''
			return this.backgroundImageUrl
		},
		resolvedPlaceholderStyle() {
			if (this.isGaokaoMode) {
				return 'font-size: 30rpx; color: rgba(120, 136, 168, 0.84);'
			}
			return 'font-size: 30rpx; color: rgba(22, 63, 53, 0.45);'
		},
		sendButtonText() {
			return this.loading ? '发送中' : '发送'
		}
	},
	watch: {
		backgroundImageUrl() {
			this.backgroundImageLoadFailed = false
		}
	},
	methods: {
		handleInput(event) {
			this.$emit('input', event && event.detail ? event.detail.value : '')
		},
		handleFocus() {
			this.isFocused = true
		},
		handleBlur() {
			this.isFocused = false
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
		handleGlobalKeydown(event) {
			if (!this.isFocused) {
				return
			}
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
		handleBackgroundImageError() {
			this.backgroundImageLoadFailed = true
		},
		emitSubmit() {
			if (this.inputDisabled || !this.trimmedValue) {
				return
			}
			if (Date.now() - this.lastSubmitAt < 300) {
				return
			}
			this.lastSubmitAt = Date.now()
			this.$emit('submit', this.trimmedValue)
		}
	}
}
</script>

<style scoped>
.composer-shell {
	position: relative;
	display: flex;
	align-items: stretch;
	min-height: 104rpx;
	box-sizing: border-box;
	border-radius: 36rpx;
	background: rgba(255, 255, 255, 0.9);
	border: 1rpx solid rgba(166, 183, 227, 0.35);
	box-shadow: 0 20rpx 40rpx rgba(76, 101, 161, 0.14);
	backdrop-filter: blur(18px);
	overflow: hidden;
}

.composer-shell-gaokao {
	display: block;
	min-height: 176rpx;
	padding: 0;
	border-radius: 0;
	background: transparent;
	border: none;
	box-shadow: none;
	backdrop-filter: none;
}

.composer-shell-gaokao-fallback {
	min-height: 104rpx;
	margin: 0 24rpx calc(24rpx + env(safe-area-inset-bottom, 0px));
	border-radius: 36rpx;
	background: rgba(255, 255, 255, 0.96);
	border: 1rpx solid rgba(166, 183, 227, 0.45);
	box-shadow: 0 20rpx 40rpx rgba(76, 101, 161, 0.14);
	backdrop-filter: blur(18px);
}

.composer-background-image {
	display: block;
	width: 100%;
}

.composer-content {
	display: flex;
	align-items: flex-end;
	gap: 18rpx;
	width: 100%;
	min-height: 104rpx;
	padding: 14rpx 14rpx 14rpx 28rpx;
	box-sizing: border-box;
}

.composer-shell-gaokao .composer-content {
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	padding: 28rpx 28rpx 60rpx 54rpx;
	min-height: 126rpx;
}

.composer-content-gaokao-fallback {
	position: relative !important;
	padding: 14rpx 14rpx 14rpx 28rpx !important;
	min-height: 104rpx !important;
}

.composer-input {
	flex: 1;
	font-size: 30rpx;
	line-height: 1.5;
	color: #24365f;
	background: transparent;
	border: none;
	outline: none;
	min-height: 44rpx;
	min-width: 0;
}

.composer-input-gaokao {
	padding-top: 10rpx;
	font-size: 30rpx;
	line-height: 1.5;
	color: #3e537f;
}

.composer-input-gaokao-fallback {
	padding-top: 0;
	color: #24365f;
}

.composer-input[disabled] {
	color: rgba(36, 54, 95, 0.42);
}

.composer-send {
	min-width: 112rpx;
	height: 72rpx;
	padding: 0 28rpx;
	box-sizing: border-box;
	border-radius: 24rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, #5a8bff, #7aa2ff);
	box-shadow: 0 18rpx 30rpx rgba(90, 139, 255, 0.24);
	flex-shrink: 0;
}

.composer-send-gaokao {
	min-width: 128rpx;
	height: 62rpx;
	padding: 0 28rpx;
	border-radius: 20rpx;
	background: linear-gradient(135deg, #3f74ff, #68a0ff);
	box-shadow: 0 16rpx 28rpx rgba(63, 116, 255, 0.26);
}

.composer-send-gaokao-fallback {
	height: 72rpx;
	border-radius: 24rpx;
	background: linear-gradient(135deg, #5a8bff, #7aa2ff);
	box-shadow: 0 18rpx 30rpx rgba(90, 139, 255, 0.24);
}

.composer-send-disabled {
	opacity: 0.4;
	box-shadow: none;
}

.composer-send-text {
	font-size: 28rpx;
	font-weight: 800;
	color: #ffffff;
	line-height: 1;
	letter-spacing: 2rpx;
}
</style>
