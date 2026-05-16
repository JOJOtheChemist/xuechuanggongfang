import { DEFAULT_AGENT_ID } from './chat-auth.js'

const XIAOCHUNLU_PRIMARY_AGENT_ID = 'xiaochunlu-ai-v2'
const AI_CHAT_AGENT_ID_ALIASES = {
	'xiaochunlu-campus-startup-mentor': XIAOCHUNLU_PRIMARY_AGENT_ID
}

export const XIAOCHUNLU_CHAT_TOP_IMAGE_URL =
	'https://xuechuang.xyz/oss/share-assets/xuechuang/ai-chat/backgrounds/xiaochunlu-chat-top-v1.webp'

export const XIAOCHUNLU_CHAT_INTRO_MASCOT_IMAGE_URL =
	'https://xuechuang.xyz/oss/share-assets/xuechuang/ai-chat/backgrounds/xiaochunlu-chat-intro-mascot-v1.webp'

export const XIAOCHUNLU_CHAT_INTRO_TOPICS_IMAGE_URL =
	'https://xuechuang.xyz/oss/share-assets/xuechuang/ai-chat/backgrounds/xiaochunlu-chat-intro-topics-v1.webp'

export const XIAOCHUNLU_CHAT_INTRO_GUESS_IMAGE_URL =
	'https://xuechuang.xyz/oss/share-assets/xuechuang/ai-chat/backgrounds/xiaochunlu-chat-intro-guess-v1.webp'

export const XIAOCHUNLU_CHAT_INTRO_SUGGESTIONS_IMAGE_URL =
	'https://xuechuang.xyz/oss/share-assets/xuechuang/ai-chat/backgrounds/xiaochunlu-chat-intro-suggestions-v1.webp'

export const GAOKAO_CHAT_TOP_IMAGE_URL =
	'https://xuechuang.xyz/oss/share-assets/xuechuang/ai-chat/backgrounds/gaokao-chat-top-v1.webp'

export const GAOKAO_CHAT_INTRO_MASCOT_IMAGE_URL =
	'https://xuechuang.xyz/oss/share-assets/xuechuang/ai-chat/backgrounds/gaokao-chat-intro-mascot-v1.webp'

export const GAOKAO_CHAT_INTRO_GUESS_IMAGE_URL =
	'https://xuechuang.xyz/oss/share-assets/xuechuang/ai-chat/backgrounds/gaokao-chat-intro-guess-v1.webp'

export const GAOKAO_CHAT_INTRO_SUGGESTIONS_IMAGE_URL =
	'https://xuechuang.xyz/oss/share-assets/xuechuang/ai-chat/backgrounds/gaokao-chat-intro-suggestions-v1.webp'

export const GAOKAO_CHAT_COMPOSER_IMAGE_URL =
	'https://xuechuang.xyz/oss/share-assets/xuechuang/ai-chat/backgrounds/gaokao-chat-composer-v1.webp'

export const GAOKAO_CHAT_SEND_BUTTON_IMAGE_URL =
	'https://xuechuang.xyz/oss/share-assets/xuechuang/ai-chat/backgrounds/gaokao-chat-send-button-v1.webp'

export function getAiChatVisualConfig(agentId) {
	const normalizedAgentId = String(agentId || '').trim()
	const resolvedAgentId = AI_CHAT_AGENT_ID_ALIASES[normalizedAgentId] || normalizedAgentId
	if (resolvedAgentId === XIAOCHUNLU_PRIMARY_AGENT_ID) {
		return {
			mode: 'xiaochunlu',
			topImageUrl: XIAOCHUNLU_CHAT_TOP_IMAGE_URL,
			introSectionImageUrls: {
				mascot: XIAOCHUNLU_CHAT_INTRO_MASCOT_IMAGE_URL,
				topics: XIAOCHUNLU_CHAT_INTRO_TOPICS_IMAGE_URL,
				guess: XIAOCHUNLU_CHAT_INTRO_GUESS_IMAGE_URL,
				suggestions: XIAOCHUNLU_CHAT_INTRO_SUGGESTIONS_IMAGE_URL
			},
			composerBackgroundImageUrl: '',
			composerSendButtonImageUrl: '',
			hideWelcomeMessage: true
		}
	}

	if (normalizedAgentId === DEFAULT_AGENT_ID) {
		return {
			mode: 'gaokao',
			topImageUrl: GAOKAO_CHAT_TOP_IMAGE_URL,
			introSectionImageUrls: {
				mascot: GAOKAO_CHAT_INTRO_MASCOT_IMAGE_URL,
				topics: '',
				guess: GAOKAO_CHAT_INTRO_GUESS_IMAGE_URL,
				suggestions: GAOKAO_CHAT_INTRO_SUGGESTIONS_IMAGE_URL
			},
			composerBackgroundImageUrl: GAOKAO_CHAT_COMPOSER_IMAGE_URL,
			composerSendButtonImageUrl: '',
			hideWelcomeMessage: true
		}
	}

	return {
		mode: 'default',
		topImageUrl: '',
		introSectionImageUrls: {
			mascot: '',
			topics: '',
			guess: '',
			suggestions: ''
		},
		composerBackgroundImageUrl: '',
		composerSendButtonImageUrl: '',
		hideWelcomeMessage: false
	}
}
