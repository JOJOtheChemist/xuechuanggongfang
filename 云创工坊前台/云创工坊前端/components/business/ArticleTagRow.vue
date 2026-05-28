<template>
	<view v-if="safeTags.length" class="article-tag-row">
		<text
			v-for="tag in safeTags"
			:key="tag"
			class="article-tag-chip"
		>
			{{ tag }}
		</text>
	</view>
</template>

<script>
	export default {
		name: 'ArticleTagRow',
		props: {
			teamName: {
				type: String,
				default: ''
			},
			tags: {
				type: Array,
				default: () => []
			},
			max: {
				type: Number,
				default: 2
			}
		},
		computed: {
			safeTags() {
				const normalized = Array.isArray(this.tags)
					? this.tags
						.map(tag => (typeof tag === 'string' ? tag.trim() : ''))
						.filter(Boolean)
					: []
				return Array.from(new Set(normalized)).slice(0, Math.max(0, this.max))
			}
		}
	}
</script>

<style scoped>
	.article-tag-row {
		display: flex;
		flex-wrap: wrap;
		gap: 8rpx;
		margin-bottom: 10rpx;
	}

	.article-tag-chip {
		padding: 6rpx 12rpx;
		border-radius: 999rpx;
		font-size: 18rpx;
		line-height: 1;
		color: #7c2d12;
		background: #ffedd5;
		border: 1rpx solid #fdba74;
	}
</style>
