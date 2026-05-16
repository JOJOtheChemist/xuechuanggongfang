<template>
	<view class="guide-article-card">
		<guide-article-list
			:articles="articles"
			:loaded="loaded"
			:title="title"
		/>
	</view>
</template>

<script>
import GuideArticleList from './GuideArticleList.vue'

export default {
	name: 'GuideArticleSection',
	components: {
		GuideArticleList
	},
	props: {
		articles: {
			type: Array,
			default: () => []
		},
		loaded: {
			type: Boolean,
			default: false
		},
		title: {
			type: String,
			default: '高考资讯精选'
		}
	}
}
</script>

<style scoped>
.guide-article-card {
	padding: 0 24rpx 0;
}
</style>
