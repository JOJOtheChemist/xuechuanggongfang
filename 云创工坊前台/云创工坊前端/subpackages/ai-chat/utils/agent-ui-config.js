import { DEFAULT_AGENT_ID } from './chat-auth.js'

const AGENT_UI_CONFIGS = {
	[DEFAULT_AGENT_ID]: {
		assistantName: '云南志愿填报顾问',
		assistantRole: '高考志愿顾问',
		quickPrompts: [
			'我这个分数能报哪样学校',
			'帮我按冲稳保搭一下志愿',
			'云南这几所学校到底怎么比'
		],
		composerPlaceholder: '直接输入分数、位次、科类、城市或专业方向'
	},
	'xiaochunlu-campus-startup-mentor': {
		assistantName: '小春鹿',
		assistantRole: '校园创业小导师',
		quickPrompts: [
			'主菜单学习里有什么',
			'主菜单创业里怎么开始',
			'19.9校园合伙人怎么加入'
		],
		composerPlaceholder: '直接问我主菜单学习、主菜单创业，或 19.9 校园合伙人怎么开始'
	},
	'xiaochunlu-ai-v2': {
		assistantName: '小春鹿咨询',
		assistantRole: '高考志愿顾问',
		quickPrompts: [
			'我这个分数在云南怎么报',
			'帮我按冲稳保看看学校',
			'怕滑档该怎么填更稳'
		],
		composerPlaceholder: '直接输入分数、位次、科类、城市或专业方向'
	}
}

export function getAgentUiConfig(agentId) {
	const normalizedAgentId = String(agentId || '').trim()
	return AGENT_UI_CONFIGS[normalizedAgentId] || AGENT_UI_CONFIGS[DEFAULT_AGENT_ID]
}
