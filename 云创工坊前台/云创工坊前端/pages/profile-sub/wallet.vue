<template>
	<view class="page-container">
		<wallet-card @showHistory="showHistoryPopup = true" />
		<wallet-history-popup v-if="showHistoryPopup" :visible="showHistoryPopup" @close="showHistoryPopup = false" />
	</view>
</template>

<script>
import WalletCard from '@/components/profile/WalletCard.vue'
import WalletHistoryPopup from '@/components/profile/WalletHistoryPopup.vue'

export default {
	components: {
		WalletCard,
		WalletHistoryPopup
	},
	data() {
		return {
			showHistoryPopup: false
		}
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
