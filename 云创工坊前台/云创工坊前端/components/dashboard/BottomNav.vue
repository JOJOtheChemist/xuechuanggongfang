<template>
	<view class="nav">
		<view class="nav-inner">
			<view class="nav-side">
				<view class="nav-item" :class="{ 'nav-item-active': active === 'home' }" @tap="goHome">
					<image class="nav-icon-img" src="/static/icons/nav-home.svg" mode="aspectFit" />
					<text class="nav-text" :class="{ 'nav-text-active': active === 'home' }">广场</text>
				</view>
				<view class="nav-item" :class="{ 'nav-item-active': active === 'business' }" @tap="goBusiness">
					<image class="nav-icon-img" src="/static/icons/nav-chat.svg" mode="aspectFit" />
					<text class="nav-text" :class="{ 'nav-text-active': active === 'business' }">学习</text>
				</view>
			</view>
			<view class="nav-center-btn">
				<image class="nav-center-icon-img" src="/static/icons/nav-plus.svg" mode="aspectFit" />
			</view>
			<view class="nav-side">
				<view class="nav-item" :class="{ 'nav-item-active': active === 'volunteer' }" @tap="goVolunteer">
					<image class="nav-icon-img" src="/static/icons/nav-volunteer.svg" mode="aspectFit" />
					<text class="nav-text" :class="{ 'nav-text-active': active === 'volunteer' }">志愿</text>
				</view>
				<view class="nav-item" :class="{ 'nav-item-active': active === 'tasks' }" @tap="goTasks">
					<image class="nav-icon-img" src="/static/icons/nav-chart.svg" mode="aspectFit" />
					<text class="nav-text" :class="{ 'nav-text-active': active === 'tasks' }">创业</text>
				</view>
				<view class="nav-item" :class="{ 'nav-item-active': active === 'profile' }" @tap="goProfile">
					<image class="nav-icon-img" src="/static/icons/nav-user.svg" mode="aspectFit" />
					<text class="nav-text" :class="{ 'nav-text-active': active === 'profile' }">我的</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'BottomNav',
		props: {
			active: {
				type: String,
				default: 'home'
			}
		},
		methods: {
			goVolunteer() {
				if (this.active !== 'volunteer') {
					uni.switchTab({
						url: '/pages/volunteer/index'
					})
				}
			},
			goHome() {
				if (this.active !== 'home') {
					uni.switchTab({
						url: '/pages/dashboard/index'
					})
				}
			},
			goTasks() {
				if (this.active !== 'tasks') {
					uni.switchTab({
						url: '/pages/task-center/index'
					})
				}
			},
			goBusiness() {
				if (this.active !== 'business') {
					uni.switchTab({
						url: '/pages/business/index'
					})
				}
			},
			goProfile() {
				if (this.active !== 'profile') {
					uni.switchTab({
						url: '/pages/profile/index'
					})
				}
			}
		}
	}
</script>

<style scoped>
	.nav {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		padding: 0 32rpx 0;
		box-sizing: border-box;
		z-index: 999;
	}

	.nav-inner {
		height: 120rpx;
		border-radius: 32rpx 32rpx 0 0;
		background-color: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(20rpx);
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		display: flex;
		padding: 0 20rpx;
		box-shadow: 0 -12rpx 30rpx rgba(15, 23, 42, 0.15);
	}

	.nav-side {
		display: flex;
		align-items: center;
		flex: 1;
		min-width: 0;
	}

	.nav-item {
		align-items: center;
		justify-content: center;
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}

	.nav-icon-img {
		width: 36rpx;
		height: 36rpx;
		margin-bottom: 4rpx;
		opacity: 0.5;
		transition: opacity 0.2s;
	}
	
	.nav-item-active .nav-icon-img {
		opacity: 1;
	}

	.nav-text {
		font-size: 18rpx;
		color: #6b7280;
		max-width: 100%;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.nav-text-active {
		color: #4f46e5;
		font-weight: 600;
	}

	.nav-center-btn {
		width: 96rpx;
		height: 96rpx;
		border-radius: 48rpx;
		background-color: #0f172a;
		align-items: center;
		justify-content: center;
		display: flex;
		margin-bottom: 40rpx;
		box-shadow: 0 16rpx 40rpx rgba(15, 23, 42, 0.5);
		border-width: 6rpx;
		border-color: #f1f5f9;
		border-style: solid;
	}

	.nav-center-icon-img {
		width: 60rpx;
		height: 60rpx;
	}
</style>
