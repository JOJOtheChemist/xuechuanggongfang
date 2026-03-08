<template>
	<view class="page">
		<!-- 顶部用户信息 -->
		<view class="user-header">
			<image class="user-avatar" :src="userAvatar" mode="aspectFill" />
			<view class="user-info">
				<text class="user-nickname">{{ userNickname || '未登录用户' }}</text>
				<view v-if="userUid" class="brand-tagline-badge" @tap="goToIntro">
					<text class="tagline-text">学在校园 · 创在工坊</text>
					<text class="tagline-arrow">></text>
				</view>
				<text v-if="userUid" class="user-uid">UID: {{ userUid }}</text>
			</view>
			<!-- 临时入口：数据更新 -->
			<view style="margin-left: auto; background: #ff4d4f; padding: 4px 8px; border-radius: 4px;" @tap="goToUpdate">
				<text style="color: #fff; font-size: 10px; font-weight: bold;">修复数据</text>
			</view>
		</view>
	<view class="page-body">
			<!-- <dashboard-header /> -->
			<scroll-view class="main-scroll" scroll-y="true">
			<view class="section-list">
					<!-- Brand Hero Section -->
					<view class="brand-hero-card" @tap="goToIntro">
						<view class="hero-card-content">
							<view class="hero-main-title">
								<text class="hero-tagline">学在校园 · 创在工坊</text>
								<view class="hero-arrow-box">
									<text class="hero-arrow">进入简介</text>
									<text class="hero-arrow-icon">></text>
								</view>
							</view>
							<text class="hero-subtext">连接菁英，开启你的校园学创之旅</text>
						</view>
						<view class="hero-bg-glow"></view>
					</view>

					<!-- 广告 banner 区域 -->
					<view class="ad-banner-container">
						<!-- Corrupted block removed -->
						<swiper
							class="ad-banner-swiper"
							:indicator-dots="banners.length > 1"
							:autoplay="banners.length > 0"
							:interval="3000"
							:circular="true"
						>
							<swiper-item v-for="item in banners" :key="item._id">
								<image
									class="ad-banner-image"
									:src="item.image_url"
									mode="widthFix"
								/>
							</swiper-item>
						</swiper>
					</view>
                    <!-- Unified Debug Footer (Inside Scroll) -->
                    <!-- Hidden recruitment debug tags
                    <view class="global-debug" style="margin-top: 40rpx; padding-bottom: 60rpx; font-size: 20rpx; color: #ccc; text-align: center; display: flex; flex-direction: column; gap: 6rpx;">
                        <text>UID: {{ global_uid || '未登录' }}</text>
                        <text>终身: {{ global_lifetime_inviter }}</text>
                        <text>团队: {{ global_team_inviter }}</text>
                        <text>业务: {{ global_business_inviter }}</text>
                    </view>
                    -->

				</view>
			</scroll-view>
		</view>
	</view>
</template>

<script>
	import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
	import TargetProgressCard from '@/components/dashboard/TargetProgressCard.vue'

export default {
		components: {
			DashboardHeader,
			TargetProgressCard
		},
	data() {
		return {
			userAvatar: 'https://vkceyugu.cdn.bspapp.com/VKCEYUGU-uni-id-avatar/default-avatar.png',
			userNickname: '',
			userUid: '',
			banners: [] // Banner 图片列表
		}
	},
	onShow() {
		this.loadUserInfo()
		this.loadBanners()
		if (typeof this.$mp.page.getTabBar === 'function' && this.$mp.page.getTabBar()) {
			this.$mp.page.getTabBar().setData({
				selected: 2
			})
		}
	},
	methods: {
		async loadUserInfo() {
		try {
			// 1. Try generic storage first
			let cached = uni.getStorageSync('userInfo') || {}
			let userId = uni.getStorageSync('userId') || uni.getStorageSync('uni_id') || ''
			
			// 2. Try fetching fresh info from cloud (like ProfileHeader does)
			const token = uni.getStorageSync('token') || uni.getStorageSync('uni_id_token')
			if (token) {
				try {
					const userCenter = uniCloud.importObject('user-center')
					const res = await userCenter.getUserInfo({ _token: token })
					if (res && res.code === 0 && res.data) {
						cached = res.data
						// Update storage for consistency
						uni.setStorageSync('userInfo', cached) 
						if (cached.uid) userId = cached.uid
					}
				} catch (err) {
					console.error('[dashboard] fetch user info failed', err)
					// Handle token expiration - clear invalid tokens
					if (err.message && (err.message.includes('需要重新登录') || err.message.includes('TokenExpired') || err.message.includes('token已过期'))) {
						console.log('[dashboard] Token expired, clearing...')
						uni.removeStorageSync('token')
						uni.removeStorageSync('uni_id_token')
						// Clear cached user info as well
						cached = {}
						userId = ''
					}
				}
			} else {
				console.log('[dashboard] No token found, running in guest mode')
			}

			this.userAvatar = cached.avatar || this.userAvatar
			this.userNickname = cached.nickname || cached.username || ''
			this.userUid = cached.uid || cached._id || userId
			
			console.log('[dashboard] Final userUid:', this.userUid)
		} catch (e) {
			console.error('[dashboard] loadUserInfo failed:', e)
		}
	},
		async loadBanners() {
		console.log('[dashboard] 开始加载 banners...')
		// Safely get token
		let token = ''
		try {
			token = uni.getStorageSync('token')
		} catch(e) { console.error('Storage error', e) }
		
		console.log('[dashboard] token:', token ? '已登录' : '未登录')
		
		let bannerList = []
		
		try {
			if (!token) {
				// 没有登录时也尝试加载 banner，但是用数据库直接查询
				console.log('[dashboard] 未登录，使用数据库直接查询')
				const db = uniCloud.database()
				try {
					const res = await db
						.collection('banners')
						.where({
							status: 'online'
						})
						.orderBy('sort_order', 'asc')
						.limit(10)
						.get()
	
					console.log('[dashboard] 数据库查询结果:', res)
					bannerList = (res.result && res.result.data) || []
				} catch (e) {
					console.error('[dashboard] 加载 banner 失败（未登录）', e)
					// Fallback: If DB query fails, show fail-safe defaults if needed, or just empty
					bannerList = []
				}
			} else {
				// 登录后使用云函数加载
				console.log('[dashboard] 已登录，使用云函数加载')
				try {
					const dashboardService = uniCloud.importObject('dashboard-service')
					const res = await dashboardService.getBanners({ _token: token, limit: 10 })
	
					console.log('[dashboard] 云函数返回:', res)
					if (res && res.code === 0 && res.data) {
						bannerList = res.data
					} else {
						console.log('[dashboard] 云函数返回结果异常')
						bannerList = []
					}
				} catch (e) {
					console.error('[dashboard] 加载 banner 失败', e)
					// If token expired during banner load, clear it and don't retry
					if (e.message && (e.message.includes('需要重新登录') || e.message.includes('token已过期') || e.message.includes('TokenExpired'))) {
						console.log('[dashboard] Token expired while loading banners, clearing...')
						uni.removeStorageSync('token')
						uni.removeStorageSync('uni_id_token')
					}
					bannerList = []
				}
			}
			
			// 转换 fileID 为临时 URL
			if (bannerList && bannerList.length > 0) {
				const fileIDs = bannerList
					.filter(item => item && item.image_url)
					.map(item => item.image_url)
					.filter(url => url && typeof url === 'string' && url.startsWith('cloud://'))
				
				console.log('[dashboard] 需要转换的 fileIDs:', fileIDs)
				
				if (fileIDs.length > 0) {
					try {
						const result = await uniCloud.getTempFileURL({
							fileList: fileIDs
						})
						
						console.log('[dashboard] getTempFileURL 结果:', result)
						
						if (result && result.fileList) {
							const urlMap = {}
							result.fileList.forEach(file => {
								if(file.fileID) {
									// console.log('[dashboard] fileID:', file.fileID, '-> tempURL:', file.tempFileURL)
									urlMap[file.fileID] = file.tempFileURL
								}
							})
							
							bannerList = bannerList.map(item => ({
								...item,
								image_url: urlMap[item.image_url] || item.image_url
							}))
							
							console.log('[dashboard] 转换后的 bannerList:', bannerList)
						}
					} catch (e) {
						console.error('[dashboard] 转换 fileID 失败:', e)
					}
				}
			}
		} catch (outerErr) {
			console.error('[dashboard] loadBanners critical error', outerErr)
		}
		
	this.banners = bannerList || []
	// console.log('[dashboard] banners 数量:', this.banners.length)
	// console.log('[dashboard] banners 数据:', this.banners)
	},
	goToUpdate() {
		uni.showLoading({ title: '刷新数据...' })
		this.loadUserInfo()
		this.loadBanners()
		setTimeout(() => {
			uni.hideLoading()
			uni.showToast({ title: '刷新成功', icon: 'none' })
		}, 800)
	},
	goToIntro() {
		uni.navigateTo({
			url: '/pages/extra/functions'
		})
	}
	}
	}
</script>

<style scoped>
	.page {
		flex: 1;
		display: flex;
		flex-direction: column;
		height: 100vh;
		background-color: #F3F0FF;
	}

	.user-header {
		padding: 32rpx 24rpx 16rpx;
		flex-direction: row;
		align-items: center;
		display: flex;
		background-color: #ffffff;
		border-bottom-width: 2rpx;
		border-bottom-color: #e5e7eb;
		border-bottom-style: solid;
		display: none; /* Hiding user info as requested */
	}

	.user-avatar {
		width: 80rpx;
		height: 80rpx;
		border-radius: 40rpx;
		margin-right: 20rpx;
		background-color: #e5e7eb;
	}

	.user-info {
		flex-direction: column;
		display: flex;
	}

	.user-nickname {
		font-size: 30rpx;
		font-weight: 700;
		color: #0f172a;
	}

	.brand-tagline-badge {
		display: inline-flex;
		align-items: center;
		background: rgba(255, 255, 255, 0.15);
		backdrop-filter: blur(4px);
		padding: 6rpx 16rpx;
		border-radius: 999rpx;
		margin: 8rpx 0;
		border: 1rpx solid rgba(255, 255, 255, 0.2);
	}
	
	.tagline-text {
		font-size: 20rpx;
		color: #ffffff;
		font-weight: 600;
		letter-spacing: 1rpx;
	}
	
	.tagline-arrow {
		font-size: 16rpx;
		color: rgba(255, 255, 255, 0.8);
		margin-left: 8rpx;
	}
	
	.user-uid {
		font-size: 20rpx;
		color: rgba(255, 255, 255, 0.6);
	}

	.page-body {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.main-scroll {
		flex: 1;
	}

	.section-list {
		padding: 24rpx 24rpx 160rpx;
		box-sizing: border-box;
	}

	.target-banner {
		width: 100%;
		border-radius: 24rpx;
		overflow: hidden;
		margin-bottom: 24rpx;
	}

	.ad-banner-container {
		margin-bottom: 24rpx;
	}

.ad-banner-swiper {
		width: 100%;
		height: 360rpx;
		border-radius: 24rpx;
		overflow: hidden;
		background-color: #ffffff;
	}

	.ad-banner-image {
		width: 100%;
		border-radius: 24rpx;
		overflow: hidden;
		display: block;
	}

	/* Brand Hero Card Styles */
	.brand-hero-card {
		margin-bottom: 32rpx;
		background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
		border-radius: 32rpx;
		padding: 40rpx;
		position: relative;
		overflow: hidden;
		box-shadow: 0 20rpx 40rpx rgba(99, 102, 241, 0.2);
	}

	.hero-card-content {
		position: relative;
		z-index: 10;
	}

	.hero-main-title {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12rpx;
	}

	.hero-tagline {
		font-size: 40rpx;
		font-weight: 800;
		color: #ffffff;
		letter-spacing: 2rpx;
	}

	.hero-arrow-box {
		display: flex;
		align-items: center;
		background: rgba(255, 255, 255, 0.2);
		padding: 6rpx 16rpx;
		border-radius: 999rpx;
		backdrop-filter: blur(4px);
	}

	.hero-arrow {
		font-size: 20rpx;
		color: #ffffff;
		font-weight: 600;
	}

	.hero-arrow-icon {
		font-size: 20rpx;
		color: #ffffff;
		margin-left: 6rpx;
	}

	.hero-subtext {
		font-size: 24rpx;
		color: rgba(255, 255, 255, 0.9);
		font-weight: 500;
		letter-spacing: 1rpx;
	}

	.hero-bg-glow {
		position: absolute;
		width: 300rpx;
		height: 300rpx;
		background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
		top: -100rpx;
		right: -100rpx;
		z-index: 1;
	}

	/* Order Management Card */
	.order-mgmt-card {
		background-color: #ffffff;
		border-radius: 24rpx;
		padding: 24rpx 32rpx;
		margin-bottom: 32rpx;
		display: flex;
		justify-content: space-between;
		align-items: center;
		box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.03);
		border: 1rpx solid #e5e7eb;
	}

	.mgmt-content {
		display: flex;
		align-items: center;
	}

	.mgmt-icon-box {
		width: 80rpx;
		height: 80rpx;
		background-color: #EEF2FF;
		border-radius: 20rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 24rpx;
	}

	.mgmt-icon-text {
		font-size: 32rpx;
		color: #4F46E5;
		font-weight: 700;
	}

	.mgmt-text {
		display: flex;
		flex-direction: column;
	}

	.mgmt-title {
		font-size: 30rpx;
		font-weight: 700;
		color: #1f2937;
		margin-bottom: 4rpx;
	}

	.mgmt-desc {
		font-size: 24rpx;
		color: #6b7280;
	}

	.mgmt-arrow {
		font-size: 32rpx;
		color: #9ca3af;
		font-weight: 600;
	}
</style>
