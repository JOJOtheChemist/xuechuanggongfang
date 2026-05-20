<template>
	<view class="guide-page">
		<scroll-view class="guide-scroll" scroll-y>
			<view class="guide-shell">
				<guide-hero-image
					:src="guideImageUrl"
					:button-src="guideButtonImageUrl"
					@tap="goToAiChat"
				/>

				<guide-action-button :image-src="scoreButtonImageUrl" @primary="goToScorePage" />

				<guide-article-section
					:articles="articles"
					:loaded="articlesLoaded"
					title="高考资讯精选"
				/>
			</view>
		</scroll-view>
		<bottom-nav active="volunteer" />
	</view>
</template>

<script>
import { getHttpService } from '@/utils/http-services'
import { extractArticleId } from '@/utils/article-navigation'
import { getCachedImageSync, resolveCachedImages } from '@/utils/remote-image-cache'
import { getStaticAssetUrl } from '@/utils/cloud-static-assets'
import GuideHeroImage from './components/GuideHeroImage.vue'
import GuideActionButton from './components/GuideActionButton.vue'
import GuideArticleSection from './components/GuideArticleSection.vue'

const GUIDE_IMAGE_URL = getStaticAssetUrl('/static/volunteer-guide/guide-hero-service.jpg')
const GUIDE_HERO_BUTTON_URL = getStaticAssetUrl('/static/volunteer-guide/free-consult-button.png')
const GUIDE_SCORE_BUTTON_URL = getStaticAssetUrl('/static/volunteer-guide/score-entry-button.png')
const GUIDE_CATEGORY_ID = 'cat_015'
const GUIDE_ARTICLES_CACHE_KEY = 'gaokao_guide_articles_cache_v1'
const GUIDE_ARTICLES_CACHE_TTL = 6 * 60 * 60 * 1000
const GUIDE_STATIC_IMAGE_URLS = Object.freeze([
	GUIDE_IMAGE_URL,
	GUIDE_HERO_BUTTON_URL,
	GUIDE_SCORE_BUTTON_URL
].filter(Boolean))

function isTooEarlyStorageError(error) {
	const message = String(
		(error && (error.errMsg || error.message || error.errorMessage))
		|| ''
	).toLowerCase()

	return message.indexOf('too early') !== -1 || message.indexOf('too eayly') !== -1
}

function readCachedGuideArticles() {
	try {
		const cache = uni.getStorageSync(GUIDE_ARTICLES_CACHE_KEY)
		if (!cache || typeof cache !== 'object') return []
		if (Number(cache.expiresAt || 0) <= Date.now()) return []
		return Array.isArray(cache.articles)
			? cache.articles.filter((item) => item && typeof item === 'object' && item.title)
			: []
	} catch (error) {
		if (!isTooEarlyStorageError(error)) {
			console.warn('[guide-redirect] 读取文章缓存失败', error)
		}

		return []
	}
}

function writeCachedGuideArticles(articles) {
	try {
		uni.setStorageSync(GUIDE_ARTICLES_CACHE_KEY, {
			articles: Array.isArray(articles) ? articles : [],
			savedAt: Date.now(),
			expiresAt: Date.now() + GUIDE_ARTICLES_CACHE_TTL
		})
	} catch (error) {
		if (!isTooEarlyStorageError(error)) {
			console.warn('[guide-redirect] 写入文章缓存失败', error)
		}
	}
}

function buildFallbackArticles(imageUrl) {
	return [
		{
			id: '',
			title: '高考查分后第一时间要做什么',
			summary: '整理位次、分数线和意向院校名单，先把基础判断做对，再进入志愿筛选。',
			image: imageUrl,
			pricePoints: 0,
			unlocked: true
		},
		{
			id: '',
			title: 'AI 志愿填报怎么结合院校专业一起看',
			summary: '先看分数，再看院校层次与专业匹配度，最后用冲稳保思路做分层选择。',
			image: imageUrl,
			pricePoints: 0,
			unlocked: true
		},
		{
			id: '',
			title: '高考志愿常见误区与避坑提醒',
			summary: '不要只盯学校名气，也要结合地区、专业前景、调剂风险和个人兴趣一起判断。',
			image: imageUrl,
			pricePoints: 0,
			unlocked: true
		}
	]
}

export default {
	components: {
		GuideHeroImage,
		GuideActionButton,
		GuideArticleSection
	},
	data() {
		return {
			guideImageUrl: getCachedImageSync(GUIDE_IMAGE_URL) || GUIDE_IMAGE_URL,
			guideButtonImageUrl: getCachedImageSync(GUIDE_HERO_BUTTON_URL) || GUIDE_HERO_BUTTON_URL,
			scoreButtonImageUrl: getCachedImageSync(GUIDE_SCORE_BUTTON_URL) || GUIDE_SCORE_BUTTON_URL,
			articles: buildFallbackArticles(GUIDE_IMAGE_URL),
			articlesLoaded: false,
			articleImageSyncToken: 0,
			staticImageSyncToken: 0
		}
	},
	onLoad() {
		this.preloadGuideStaticImages()
		this.loadArticles()
	},
	onReady() {
		this.restoreCachedArticles()
	},
	onUnload() {
		this.articleImageSyncToken += 1
		this.staticImageSyncToken += 1
	},
	methods: {
		async preloadGuideStaticImages() {
			if (!GUIDE_STATIC_IMAGE_URLS.length) return

			const token = this.staticImageSyncToken + 1
			this.staticImageSyncToken = token

			try {
				const cachedUrls = await resolveCachedImages(GUIDE_STATIC_IMAGE_URLS)
				if (token !== this.staticImageSyncToken) return

				this.guideImageUrl = cachedUrls[0] || GUIDE_IMAGE_URL
				this.guideButtonImageUrl = cachedUrls[1] || GUIDE_HERO_BUTTON_URL
				this.scoreButtonImageUrl = cachedUrls[2] || GUIDE_SCORE_BUTTON_URL
			} catch (error) {
				console.warn('[guide-redirect] 预加载首屏图片失败', error)
			}
		},
		restoreCachedArticles() {
			if (this.articlesLoaded) return

			const cachedArticles = readCachedGuideArticles()
			if (!cachedArticles.length) return

			this.articles = cachedArticles
			this.articlesLoaded = true
			this.syncArticleImages(cachedArticles)
		},
		mapArticles(rawList) {
			const source = Array.isArray(rawList) ? rawList : []
			return source.map((item) => ({
				id: extractArticleId(item),
				targetUrl: item.targetUrl || item.target_url || '',
				title: item.title || '',
				summary: item.summary || item.desc || '高考志愿与查分资讯',
				image: item.image || item.cover_image || item.coverImageUrl || item.cover || this.guideImageUrl || GUIDE_IMAGE_URL,
				pricePoints: typeof item.price_points === 'number' ? item.price_points : 0,
				unlocked: !!item.unlocked
			})).filter((item) => item.title && (item.id || item.targetUrl))
		},
		applyArticles(sourceArticles, options = {}) {
			const nextArticles = Array.isArray(sourceArticles) ? sourceArticles : []
			const shouldCache = Boolean(options.persistCache)

			this.articles = nextArticles
			this.articlesLoaded = true

			if (shouldCache) {
				writeCachedGuideArticles(nextArticles)
			}

			this.syncArticleImages(nextArticles, { persistCache: shouldCache })
		},
		async syncArticleImages(sourceArticles, options = {}) {
			const list = Array.isArray(sourceArticles) ? sourceArticles : []
			const imageUrls = list.map((item) => item.image).filter(Boolean)
			if (!imageUrls.length) return

			const token = this.articleImageSyncToken + 1
			this.articleImageSyncToken = token

			try {
				const cachedImages = await resolveCachedImages(imageUrls)
				if (token !== this.articleImageSyncToken) return

				const nextArticles = list.map((item, index) => Object.assign({}, item, {
					image: cachedImages[index] || item.image
				}))

				this.articles = nextArticles
				if (options.persistCache) {
					writeCachedGuideArticles(nextArticles)
				}
			} catch (error) {
				console.warn('[guide-redirect] 同步文章图片失败', error)
			}
		},
		async loadArticles() {
			this.articlesLoaded = false
			try {
				const articleService = getHttpService('article-service')
				const token = uni.getStorageSync('token')
				const hotParams = {
					category_id: GUIDE_CATEGORY_ID,
					limit: 4
				}

				if (token) {
					hotParams._token = token
				}

				let rawList = []
				const hotResult = await articleService.getHotArticles(hotParams)
				if (hotResult && hotResult.code === 0 && hotResult.data && Array.isArray(hotResult.data.list) && hotResult.data.list.length > 0) {
					rawList = hotResult.data.list
				}

				if (!rawList.length) {
					const listParams = {
						categoryId: GUIDE_CATEGORY_ID,
						pageNum: 1,
						pageSize: 4
					}

					if (token) {
						listParams._token = token
					}

					const listResult = await articleService.getList(listParams)
					if (listResult && listResult.code === 0 && listResult.data && Array.isArray(listResult.data.list)) {
						rawList = listResult.data.list
					}
				}

				const mappedArticles = this.mapArticles(rawList)
				const sourceArticles = mappedArticles.length > 0
					? mappedArticles
					: buildFallbackArticles(this.guideImageUrl || GUIDE_IMAGE_URL)
				this.applyArticles(sourceArticles, {
					persistCache: mappedArticles.length > 0
				})
			} catch (error) {
				console.error('[guide-redirect] 加载文章失败', error)
				const fallbackArticles = buildFallbackArticles(this.guideImageUrl || GUIDE_IMAGE_URL)
				this.applyArticles(fallbackArticles)
			}
		},
		goToAiChat() {
			uni.navigateTo({
				url: '/subpackages/ai-chat/index?agentId=yunnan-gaokao-volunteer-consultant'
			})
		},
		goToScorePage() {
			uni.navigateTo({
				url: '/subpackages/volunteer/index'
			})
		}
	}
}
</script>

<style scoped>
.guide-page {
	min-height: 100vh;
	background: #ffffff;
}

.guide-scroll {
	height: 100vh;
	padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
	box-sizing: border-box;
}

.guide-shell {
	padding-bottom: 32rpx;
}
</style>
