<template>
	<view class="goal-card-container">
		<!-- 顶部状态卡片组 -->
		<view class="stats-row">
			<view class="stat-card done">
				<view class="card-head">
					<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
					<text>本月已完成</text>
				</view>
				<view>
					<text class="card-num">{{ stats.total_completed }}</text><text class="num-unit">单</text>
				</view>
			</view>

			<view class="stat-card pending">
				<view class="card-head">
					<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
					<text>本月待完成</text>
				</view>
				<view class="card-bottom">
					<view>
						<text class="card-num">{{ stats.total_target }}</text><text class="num-unit">单</text>
					</view>
					<view class="plan-btn" @click="openModal">
						<svg class="btn-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
						<text>制定计划</text>
					</view>
				</view>
			</view>
		</view>


	</view>
</template>

<script>
	export default {
		name: 'GoalCard',
		data() {
			return {
				loading: false,
				goals: [], // Loaded from backend
				stats: {
					total_target: 0,
					total_completed: 0 // Currently purely placeholder until order logic exists
				},
				colors: ['red', 'orange', 'purple', 'blue', 'green'] // Cycle through these
			}
		},
		mounted() {
			this.loadGoals()
		},

		methods: {
			async loadGoals() {
				this.loading = true
				try {
					const token = uni.getStorageSync('token')
					if (!token) {
						this.loading = false
						return
					}
					const userId = uni.getStorageSync('userId')
					// The user specifically asked to pass UID, although usually token is enough. 
					// I will pass _token as per the cloud function expectation.
					
					const goalService = uniCloud.importObject('goal-service')
					const now = new Date()
					const res = await goalService.getMonthGoals({
						_token: token, // Pass token manually
						user_id: userId, // Pass uid as requested by user ("put the uid in")
						year: now.getFullYear(),
						month: now.getMonth() + 1
					})
					
					if (res.code === 0 && res.data) {
						this.stats = res.data.stats || this.stats
						
						// Process goals and assign colors
						this.goals = (res.data.goals || []).map((g, index) => ({
							...g,
							label: g.title,
							theme: this.colors[index % this.colors.length], // Cycle colors
							value: g.target_value || '', // Ensure empty string for input if null
							unit: '单' // Default unit
						}))
					}
				} catch (e) {
					console.error('Failed to load goals', e)
				} finally {
					this.loading = false
				}
			},
			openModal() {
				// Navigate to subpackage page
				uni.navigateTo({
					url: '/pages/extra/goal-setting'
				})
			},

		}
	}
</script>

<style scoped>
	.goal-card-container {
		width: 100%;
		margin-bottom: 24rpx;
	}

	.stats-row {
		display: flex;
		gap: 24rpx;
	}

	.stat-card {
		flex: 1;
		background: white;
		border-radius: 40rpx;
		padding: 32rpx;
		box-shadow: 0 8rpx 30rpx rgba(139, 92, 246, 0.05);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		position: relative;
		overflow: hidden;
		min-height: 200rpx;
	}

	.card-head {
		display: flex;
		align-items: center;
		gap: 12rpx;
		font-size: 26rpx;
		color: #6B7280;
		font-weight: 600;
		margin-bottom: 16rpx;
	}

	.icon-svg {
		width: 32rpx;
		height: 32rpx;
	}

	.card-num {
		font-size: 56rpx;
		font-weight: 800;
		line-height: 1.1;
	}

	.num-unit {
		font-size: 24rpx;
		font-weight: 500;
		margin-left: 4rpx;
		color: #9CA3AF;
	}

	/* Done Card */
	.stat-card.done .card-head { color: #059669; }
	.stat-card.done .card-num { color: #10B981; }
	.stat-card.done::after {
		content: '';
		position: absolute;
		right: -20rpx;
		bottom: -20rpx;
		width: 120rpx;
		height: 120rpx;
		border-radius: 50%;
		background: rgba(16, 185, 129, 0.08);
		pointer-events: none;
	}

	/* Pending Card */
	.stat-card.pending .card-head { color: #D97706; }
	.stat-card.pending .card-num { color: #F59E0B; margin-bottom: 12rpx; }

	.card-bottom {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
	}

	/* Plan Button */
	.plan-btn {
		background: #FFF7ED;
		color: #D97706;
		border: 1px solid #FFEDD5;
		border-radius: 999rpx;
		padding: 12rpx 24rpx;
		font-size: 24rpx;
		font-weight: 600;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8rpx;
		transition: all 0.2s;
		white-space: nowrap; /* Prevent wrapping */
		flex-shrink: 0; /* Prevent shrinking */
	}
	.btn-icon {
		width: 24rpx;
		height: 24rpx;
	}

	/* Modal */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(5px);
		z-index: 999;
		display: flex;
		justify-content: center;
		align-items: flex-end;
		opacity: 0;
		visibility: hidden;
		transition: all 0.3s;
	}
	.modal-overlay.active {
		opacity: 1;
		visibility: visible;
	}

	.modal-card {
		background: #ffffff;
		width: 100%;
		border-top-left-radius: 64rpx;
		border-top-right-radius: 64rpx;
		padding: 48rpx;
		box-shadow: 0 -20rpx 80rpx rgba(0, 0, 0, 0.1);
		transform: translateY(100%);
		transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
		max-height: 85vh;
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
	}
	.modal-overlay.active .modal-card {
		transform: translateY(0);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 40rpx;
		flex-shrink: 0;
	}

	.modal-title {
		font-size: 36rpx;
		font-weight: 800;
		color: #1F2937;
	}

	.modal-subtitle {
		font-size: 24rpx;
		color: #9CA3AF;
		margin-top: 4rpx;
	}

	.close-btn {
		background: #F3F4F6;
		width: 64rpx;
		height: 64rpx;
		border-radius: 50%;
		font-size: 40rpx;
		color: #6B7280;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.goals-scroll-area {
		height: 600rpx; /* Fixed height or responsive */
		flex-grow: 1;
		margin-bottom: 40rpx;
	}

	.goals-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 24rpx;
		padding-bottom: 20rpx;
	}

	.goal-item {
		background: #F9FAFB;
		border-radius: 32rpx;
		padding: 24rpx;
		border: 2rpx solid transparent;
		transition: all 0.2s;
	}

	.goal-label {
		display: flex;
		align-items: center;
		gap: 12rpx;
		font-size: 26rpx;
		font-weight: 600;
		color: #4B5563;
		margin-bottom: 16rpx;
	}

	.icon-box {
		width: 48rpx;
		height: 48rpx;
		border-radius: 12rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 28rpx;
		font-weight: bold;
	}
	.theme-red { background: #FEF2F2; color: #EF4444; }
	.theme-blue { background: #EFF6FF; color: #3B82F6; }
	.theme-purple { background: #F3F0FF; color: #8B5CF6; }
	.theme-orange { background: #FFF7ED; color: #F97316; }
	.theme-green { background: #ECFDF5; color: #10B981; }

	.goal-input-group {
		display: flex;
		align-items: center;
		background: white;
		border: 2rpx solid #E5E7EB;
		border-radius: 16rpx;
		padding: 0 16rpx;
		height: 72rpx;
	}

	.goal-input {
		flex: 1;
		border: none;
		outline: none;
		font-size: 32rpx;
		font-weight: 700;
		color: #1F2937;
		text-align: right;
		height: 100%;
	}

	.goal-unit {
		font-size: 24rpx;
		color: #9CA3AF;
		margin-left: 8rpx;
	}

	.save-btn {
		width: 100%;
		background: linear-gradient(135deg, #8B5CF6, #6D28D9);
		color: white;
		border: none;
		padding: 28rpx;
		border-radius: 999rpx;
		font-size: 32rpx;
		font-weight: 700;
		box-shadow: 0 8rpx 30rpx rgba(124, 58, 237, 0.3);
		flex-shrink: 0;
		text-align: center;
	}
	.save-btn:active {
		transform: scale(0.98);
	}
</style>
