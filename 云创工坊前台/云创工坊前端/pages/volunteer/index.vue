<template>
	<view class="page-root"></view>
</template>

<script>
const DEFAULT_VOLUNTEER_ENTRY_PATH = '/subpackages/volunteer/guide-redirect'
const DIRECT_SCORE_ENTRY_PATH = '/subpackages/volunteer/index'

function normalizeText(value) {
	return String(value || '').trim()
}

function encodeQuery(options = {}) {
	return Object.keys(options).reduce((pairs, key) => {
		const value = options[key]
		if (value === undefined || value === null || value === '') {
			return pairs
		}

		pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
		return pairs
	}, []).join('&')
}

export default {
	data() {
		return {
			hasRedirected: false,
			entryOptions: {}
		}
	},
	onLoad(options = {}) {
		this.entryOptions = Object.assign({}, options)
		this.redirectToVolunteerEntry()
	},
	onShow() {
		this.redirectToVolunteerEntry()
	},
	methods: {
		resolveVolunteerEntryUrl() {
			const options = this.entryOptions || {}
			const entry = normalizeText(options.entry)
			const source = normalizeText(options.source)
			const businessId = normalizeText(options.businessId)
			const hasInvite = Boolean(normalizeText(options.inviter_id) || normalizeText(options.referrer))
			const shouldOpenDirectScore =
				entry === 'direct_score' ||
				source === 'volunteer_unlock' ||
				businessId === 'admission_unlock' ||
				hasInvite

			const basePath = shouldOpenDirectScore ? DIRECT_SCORE_ENTRY_PATH : DEFAULT_VOLUNTEER_ENTRY_PATH
			const queryString = encodeQuery(options)
			return queryString ? `${basePath}?${queryString}` : basePath
		},
		redirectToVolunteerEntry() {
			if (this.hasRedirected) return
			this.hasRedirected = true
			const targetUrl = this.resolveVolunteerEntryUrl()

			uni.redirectTo({
				url: targetUrl,
				fail: () => {
					uni.reLaunch({
						url: targetUrl
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
