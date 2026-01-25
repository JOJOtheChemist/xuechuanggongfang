<template>
	<view class="page-root">
		<view class="app-container">
			<view class="header">
				<text class="header-title">写成长日志</text>
				<view class="header-actions">
					<button class="secondary-btn" @tap="goToHistory">历史记录</button>
					<button class="primary-btn" @tap="saveLog" :style="saveBtnStyle">{{ saveBtnText }}</button>
				</view>
			</view>

			<view class="content">
				<view class="input-group">
					<view class="section-label"><view class="dot"></view> 今日进展</view>
					<textarea class="input-area" placeholder="做成了什么？成交了谁？" v-model="logData.progress"></textarea>
				</view>
				<view class="input-group">
					<view class="section-label"><view class="dot"></view> 困难思考</view>
					<textarea class="input-area" placeholder="遇到的卡点、复盘..." v-model="logData.difficulties"></textarea>
				</view>
				<view class="input-group">
					<view class="section-label"><view class="dot"></view> 明日计划</view>
					<textarea class="input-area mini" placeholder="明天最重要的 2~3 件事" v-model="logData.plan"></textarea>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			logData: {
				progress: '',
				difficulties: '',
				plan: ''
			},
			saveBtnText: '保存',
			saveBtnStyle: {}
		}
	},
	methods: {
		goToHistory() {
			uni.navigateTo({
				url: '/pages/growth-log/list'
			})
		},
		async saveLog() {
			if (!this.logData.progress && !this.logData.difficulties && !this.logData.plan) {
				uni.showToast({ title: '请填写内容', icon: 'none' })
				return
			}

			const token = uni.getStorageSync('token')
			if (!token) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				return
			}

			const content = [
				this.logData.progress ? `【今日进展】${this.logData.progress}` : '',
				this.logData.difficulties ? `【困难思考】${this.logData.difficulties}` : '',
				this.logData.plan ? `【明日计划】${this.logData.plan}` : ''
			].filter(Boolean).join('\n')

			try {
				this.saveBtnText = "保存中..."
				const growthService = uniCloud.importObject('growth-log-service')
				const res = await growthService.addLog({
					_token: token,
					title: '成长日志 ' + this.formatDate(Date.now()),
					content: content
				})

				if (res.code === 0) {
					this.saveBtnText = "已保存"
					this.saveBtnStyle = { background: "#10B981" }
					
					setTimeout(() => {
						uni.showToast({ title: '保存成功', icon: 'success' })
						uni.navigateBack()
					}, 1000)
				} else {
					uni.showToast({ title: res.message || '保存失败', icon: 'none' })
					this.saveBtnText = "保存"
				}
			} catch (e) {
				console.error('Save log failed', e)
				uni.showToast({ title: '保存异常', icon: 'none' })
				this.saveBtnText = "保存"
			}
		},
		formatDate(ts) {
			const d = new Date(ts)
			return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
		}
	}
}
</script>

<style scoped>
.page-root {
	flex: 1;
	display: flex;
	flex-direction: row;
	justify-content: center;
	min-height: 100vh;
	background-color: #F3F0FF;
}

.app-container {
	flex: 1;
	width: 100%;
	max-width: 750rpx;
	background-color: #F3F0FF;
	display: flex;
	flex-direction: column;
}

.header {
	padding: 40rpx 32rpx;
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.header-title {
	font-size: 36rpx;
	font-weight: 800;
	color: #4C1D95;
}

.header-actions {
	display: flex;
	gap: 16rpx;
}

.content {
	padding: 0 32rpx 60rpx;
}

.secondary-btn {
	background: #EDE9FE;
	color: #6D28D9;
	border: none;
	padding: 0 32rpx;
	height: 64rpx;
	line-height: 64rpx;
	border-radius: 999px;
	font-size: 26rpx;
	font-weight: 600;
	margin: 0;
}
.secondary-btn::after { border: none; }

.primary-btn {
	background: linear-gradient(135deg, #8B5CF6, #7C3AED);
	color: white;
	border: none;
	padding: 0 40rpx;
	height: 64rpx;
	line-height: 64rpx;
	border-radius: 999px;
	font-size: 26rpx;
	font-weight: 600;
	margin: 0;
	box-shadow: 0 8rpx 20rpx rgba(139, 92, 246, 0.25);
}
.primary-btn::after { border: none; }

.input-group {
	margin-bottom: 32rpx;
	background-color: #fff;
	padding: 30rpx;
	border-radius: 32rpx;
	box-shadow: 0 8rpx 24rpx rgba(148, 163, 184, 0.1);
}

.section-label {
	font-size: 26rpx;
	color: #7C3AED;
	font-weight: 700;
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-bottom: 20rpx;
}

.dot {
	width: 12rpx;
	height: 12rpx;
	background-color: #C4B5FD;
	border-radius: 50%;
}

.input-area {
	width: 100%;
	background-color: #F9FAFB;
	border: 2rpx solid #F3F4F6;
	border-radius: 24rpx;
	padding: 24rpx;
	font-size: 28rpx;
	color: #374151;
	line-height: 1.6;
	height: 240rpx;
	box-sizing: border-box;
}

.input-area.mini {
	height: 180rpx;
}
</style>
