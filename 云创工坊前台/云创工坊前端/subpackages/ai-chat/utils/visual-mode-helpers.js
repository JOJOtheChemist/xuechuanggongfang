import { getCachedImageSync } from '@/utils/remote-image-cache'

export const VISUAL_INTRO_SECTION_KEYS = ['mascot', 'topics', 'guess', 'suggestions']

export function normalizeVisualIntroSectionImageUrls(value = {}) {
	return VISUAL_INTRO_SECTION_KEYS.reduce((result, key) => {
		result[key] = String((value && value[key]) || '').trim()
		return result
	}, {})
}

export function getCachedVisualIntroSectionImageUrls(imageUrls = {}) {
	const normalizedImageUrls = normalizeVisualIntroSectionImageUrls(imageUrls)
	return VISUAL_INTRO_SECTION_KEYS.reduce((result, key) => {
		const source = normalizedImageUrls[key]
		result[key] = source ? getCachedImageSync(source) || '' : ''
		return result
	}, {})
}

export function resolveVisualIntroSectionImageUrls(imageUrls = {}, cachedImageUrls = {}) {
	const normalizedImageUrls = normalizeVisualIntroSectionImageUrls(imageUrls)
	const normalizedCachedImageUrls = normalizeVisualIntroSectionImageUrls(cachedImageUrls)
	return VISUAL_INTRO_SECTION_KEYS.reduce((result, key) => {
		result[key] = normalizedCachedImageUrls[key] || normalizedImageUrls[key] || ''
		return result
	}, {})
}

export function resolveVisualImageUrl(sourceUrl = '', cachedUrl = '') {
	return String(cachedUrl || sourceUrl || '').trim()
}

export function resolveDefaultTopicKey(topics = []) {
	const firstTopic = Array.isArray(topics) ? topics[0] : null
	return String(firstTopic && firstTopic.topicKey ? firstTopic.topicKey : '').trim()
}

export function createVisualPromptBatches(prompts = [], batchSize = 6, maxBatches = 3) {
	const pool = Array.isArray(prompts) ? prompts.slice(0, batchSize * maxBatches) : []
	const batches = []
	for (let index = 0; index < pool.length; index += batchSize) {
		const batch = pool.slice(index, index + batchSize)
		if (batch.length) {
			batches.push(batch)
		}
	}
	return batches.slice(0, maxBatches)
}
