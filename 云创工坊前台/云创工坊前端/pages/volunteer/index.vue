<template>
	<view class="page-root"></view>
</template>

<script>
const VOLUNTEER_ENTRY_PATH = '/subpackages/volunteer/guide-redirect'

export default {
	data() {
		return {
			hasRedirected: false
		}
	},
	onLoad() {
		this.redirectToVolunteerEntry()
	},
	onShow() {
		this.redirectToVolunteerEntry()
	},
	methods: {
		redirectToVolunteerEntry() {
			if (this.hasRedirected) return
			this.hasRedirected = true

			uni.redirectTo({
				url: VOLUNTEER_ENTRY_PATH,
				fail: () => {
					uni.reLaunch({
						url: VOLUNTEER_ENTRY_PATH
					})
				}
			})
		}
	}
}
</script>

<style scoped>
.page-root {
	min-height: 100vh;
	background: #ffffff;
}
</style>
