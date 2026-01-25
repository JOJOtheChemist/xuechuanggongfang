<template>
	<view class="page-container">
		<activity-feed />
	</view>
</template>

<script>
import ActivityFeed from '@/components/profile/ActivityFeed.vue'

export default {
	components: {
		ActivityFeed
	}
}
</script>

<style scoped>
.page-container {
	padding: 24rpx;
	min-height: 100vh;
	background-color: #F3F0FF;
}
</style>
