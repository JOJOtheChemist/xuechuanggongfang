<template>
	<view class="page-container">
		<team-card />
	</view>
</template>

<script>
import TeamCard from '@/pages/extra/components/TeamCard.vue'

export default {
	components: {
		TeamCard
	},
    onShow() {
        // Trigger load if needed
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
