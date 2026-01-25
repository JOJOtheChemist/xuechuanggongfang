<template>
	<view class="page-container">
		<profile-achievements />
		<annual-coin-stats style="margin-top: 24rpx;"/>
	</view>
</template>

<script>
import ProfileAchievements from '@/components/profile/ProfileAchievements.vue'
import AnnualCoinStats from '@/components/profile/AnnualCoinStats.vue'

export default {
	components: {
		ProfileAchievements,
		AnnualCoinStats
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
