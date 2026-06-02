<template>
	<view class="gaokao-webview-page">
		<view class="gaokao-webview-header">
			<view class="gaokao-webview-header-left" @tap="goBack">
				<text class="gaokao-webview-back">返回</text>
			</view>
			<view class="gaokao-webview-header-center">
				<image
					v-if="avatar"
					class="gaokao-webview-user-avatar"
					:src="avatar"
					mode="aspectFill"
				/>
				<view v-else class="gaokao-webview-user-avatar gaokao-webview-user-avatar-fallback">
					<text>{{ initial }}</text>
				</view>
				<view class="gaokao-webview-user-meta">
					<text class="gaokao-webview-user-name">{{ nickname || '同学' }}</text>
					<text class="gaokao-webview-user-id">ID: {{ userId || 'guest' }}</text>
				</view>
			</view>
			<view class="gaokao-webview-header-right"></view>
		</view>
		<view v-if="!webviewUrl" class="gaokao-webview-tip">
			<text class="gaokao-webview-tip-title">未配置高考老师页面地址</text>
			<text class="gaokao-webview-tip-desc">请检查 WebView 页面 URL。</text>
		</view>
		<web-view
			v-else
			:src="webviewUrl"
			:webview-styles="webviewStyles"
		></web-view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			sessionId: '',
			userId: '',
			nickname: '',
			avatar: '',
			webviewUrl: '',
			webviewStyles: {
				progress: {
					color: '#FF3333'
				}
			}
		}
	},
	computed: {
		initial() {
			return (String(this.nickname || '我').trim().slice(0, 1) || '我').toUpperCase()
		}
	},
	onLoad(options = {}) {
		this.sessionId = String(options.sessionId || '').trim()
		this.userId = String(options.user_id || options.userId || '').trim()
		const storageUserInfo = uni.getStorageSync('userInfo') || {}
		this.nickname = String(
			options.nickname ||
			storageUserInfo.nickname ||
			storageUserInfo.username ||
			storageUserInfo.nickName ||
			storageUserInfo.name ||
			''
		).trim()
		this.avatar = String(
			options.avatar_url ||
			options.avatar ||
			storageUserInfo.avatar ||
			storageUserInfo.avatarUrl ||
			storageUserInfo.avatar_url ||
			storageUserInfo.headimgurl ||
			''
		).trim()
		this.webviewUrl = this.buildWebviewUrl()
	},
	methods: {
		buildWebviewUrl() {
			const baseUrl = 'https://xuechuang.xyz/chat'
			const query = [
				['from', 'xcx'],
				['mode', 'fresh'],
				['sessionId', this.sessionId],
				['user_id', this.userId]
			]
				.filter(([, value]) => String(value || '').trim())
				.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
				.join('&')
			return query ? `${baseUrl}?${query}` : baseUrl
		},
		goBack() {
			uni.navigateBack({
				fail: () => {
					uni.switchTab({
						url: '/pages/index/index'
					})
				}
			})
		}
	}
}
</script>

<style scoped>
.gaokao-webview-page {
	position: fixed;
	inset: 0;
	background: #f5f1e8;
	display: flex;
	flex-direction: column;
}

.gaokao-webview-header {
	position: relative;
	z-index: 10;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: calc(24rpx + env(safe-area-inset-top, 0px)) 24rpx 20rpx;
	background: linear-gradient(180deg, #fff8ef 0%, #f8efe2 100%);
	box-shadow: 0 8rpx 24rpx rgba(120, 82, 32, 0.08);
}

.gaokao-webview-header-left,
.gaokao-webview-header-right {
	width: 120rpx;
	display: flex;
	align-items: center;
}

.gaokao-webview-back {
	font-size: 28rpx;
	font-weight: 600;
	color: #6f4f28;
}

.gaokao-webview-header-center {
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 16rpx;
}

.gaokao-webview-user-avatar {
	width: 72rpx;
	height: 72rpx;
	border-radius: 999rpx;
	flex-shrink: 0;
	background: #eadcc4;
}

.gaokao-webview-user-avatar-fallback {
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 28rpx;
	font-weight: 700;
	color: #7a541d;
}

.gaokao-webview-user-meta {
	min-width: 0;
	display: flex;
	flex-direction: column;
}

.gaokao-webview-user-name {
	font-size: 28rpx;
	font-weight: 700;
	line-height: 1.3;
	color: #3d2b14;
}

.gaokao-webview-user-id {
	margin-top: 4rpx;
	font-size: 22rpx;
	line-height: 1.3;
	color: #8a7355;
}

.gaokao-webview-tip {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 40rpx;
	text-align: center;
}

.gaokao-webview-tip-title {
	font-size: 34rpx;
	font-weight: 700;
	color: #3d2b14;
}

.gaokao-webview-tip-desc {
	margin-top: 14rpx;
	font-size: 26rpx;
	line-height: 1.6;
	color: #7c6a52;
}

web-view {
	position: absolute;
	left: 0;
	right: 0;
	top: calc(116rpx + env(safe-area-inset-top, 0px));
	bottom: 0;
	width: 100%;
}
</style>
