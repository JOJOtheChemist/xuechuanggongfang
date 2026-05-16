<template>
		<view class="nav">
		<view class="nav-inner">
			<view class="nav-item" :class="{ 'nav-item-active': active === 'forum' }" @tap="goForum">
				<image class="nav-icon-img" :class="{ 'nav-icon-active': active === 'forum' }" :src="tabbarIcons.forum" mode="aspectFit" />
				<text class="nav-text" :class="{ 'nav-text-active': active === 'forum' }">广场</text>
			</view>

			<view class="nav-item" :class="{ 'nav-item-active': active === 'business' }" @tap="goBusiness">
				<image class="nav-icon-img" :class="{ 'nav-icon-active': active === 'business' }" :src="tabbarIcons.business" mode="aspectFit" />
				<text class="nav-text" :class="{ 'nav-text-active': active === 'business' }">学习</text>
			</view>

			<view class="nav-item" :class="{ 'nav-item-active': active === 'volunteer' }" @tap="goVolunteer">
				<image class="nav-icon-img" :class="{ 'nav-icon-active': active === 'volunteer' }" :src="tabbarIcons.volunteer" mode="aspectFit" />
				<text class="nav-text" :class="{ 'nav-text-active': active === 'volunteer' }">志愿</text>
			</view>

			<view class="nav-item" :class="{ 'nav-item-active': active === 'tasks' }" @tap="goTasks">
				<image class="nav-icon-img" :class="{ 'nav-icon-active': active === 'tasks' }" :src="tabbarIcons.tasks" mode="aspectFit" />
				<text class="nav-text" :class="{ 'nav-text-active': active === 'tasks' }">创业</text>
			</view>

			<view class="nav-item" :class="{ 'nav-item-active': active === 'profile' }" @tap="goProfile">
				<image class="nav-icon-img" :class="{ 'nav-icon-active': active === 'profile' }" :src="tabbarIcons.profile" mode="aspectFit" />
				<text class="nav-text" :class="{ 'nav-text-active': active === 'profile' }">我的</text>
			</view>
		</view>
	</view>
</template>

<script>
import { TABBAR_ICON_URLS } from '@/utils/cloud-static-assets'

const VOLUNTEER_PATH = '/subpackages/volunteer/guide-redirect'
const FORUM_PATH = '/subpackages/forum/index'

export default {
	name: 'BottomNav',
	props: {
		active: {
			type: String,
			default: 'volunteer'
		}
	},
	data() {
		return {
			tabbarIcons: TABBAR_ICON_URLS
		}
	},
	methods: {
		goForum() {
			if (this.active !== 'forum') {
				uni.reLaunch({
					url: FORUM_PATH
				})
			}
		},
		openVolunteerPage() {
			uni.navigateTo({
				url: VOLUNTEER_PATH,
				fail: () => {
					uni.reLaunch({
						url: VOLUNTEER_PATH
					})
				}
			})
		},
		goVolunteer() {
			if (this.active !== 'volunteer') {
				this.openVolunteerPage()
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
		background-color: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(10px);
		pointer-events: auto;
		z-index: 1000;
		padding-bottom: env(safe-area-inset-bottom);
	}

	.nav-inner {
		height: 120rpx;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		padding: 0 12rpx;
		box-shadow: 0 -4rpx 16rpx rgba(15, 23, 42, 0.08);
	}

	.nav-item {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
	}

	.nav-icon-img {
		width: 34rpx;
		height: 34rpx;
		margin-bottom: 10rpx;
		transition: filter 0.2s;
	}

	.nav-icon-active {
		filter: brightness(0) saturate(100%) invert(36%) sepia(91%) saturate(2386%) hue-rotate(210deg) brightness(94%) contrast(102%);
	}

	.nav-text {
		max-width: 100%;
		font-size: 28rpx;
		line-height: 1.2;
		color: #6b7280;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.nav-text-active {
		color: #2563eb;
		font-weight: 500;
	}
</style>
