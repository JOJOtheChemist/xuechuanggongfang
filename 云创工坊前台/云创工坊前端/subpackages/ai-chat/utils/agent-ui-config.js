import { DEFAULT_AGENT_ID } from './chat-auth.js'

const AGENT_UI_CONFIGS = {
	[DEFAULT_AGENT_ID]: {
		assistantName: '云南高考资讯助手',
		assistantRole: '高考志愿顾问',
		quickPrompts: [
			'我这个分数怎么选学校',
			'帮我看看志愿怎么填',
			'云南这几所学校怎么比'
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
	}
}

export function getAgentUiConfig(agentId) {
	const normalizedAgentId = String(agentId || '').trim()
	return AGENT_UI_CONFIGS[normalizedAgentId] || AGENT_UI_CONFIGS[DEFAULT_AGENT_ID]
}
