<template>
	<view class="team-join-list">
		<view v-if="loading" class="list-loading">
			<text class="loading-text">加载中...</text>
		</view>
		<view v-else-if="!displayTeams.length" class="list-empty">
			<text class="list-empty-text">{{ emptyText }}</text>
		</view>
		<view
			v-else
			v-for="(team, index) in displayTeams"
			:key="team.renderKey"
			class="team-card-shell"
			@tap="openTeamDetail(index)"
		>
			<team-summary-card
				:team="team"
				:crown-icon-url="crownIconUrl"
				:member-icon-url="memberIconUrl"
				:coin-icon-url="coinIconUrl"
			/>
		</view>

		<team-detail-dialog
			:visible="showTeamDetailDialog"
			:team="activeTeam"
			:crown-icon-url="crownIconUrl"
			:member-icon-url="memberIconUrl"
			:coin-icon-url="coinIconUrl"
			@close="closeTeamDetail"
			@join="handleJoinFromDialog"
		/>
	</view>
</template>

<script>
import { getHttpService } from '@/utils/http-services'
import TeamDetailDialog from './TeamDetailDialog.vue'
import TeamSummaryCard from './TeamSummaryCard.vue'

const TEAM_DEFAULT_AVATAR_URLS = Object.freeze([
	'https://xuechuang.xyz/oss/share-assets/xuechuang/team/avatars/default/team-avatar-default-1-v1.webp',
	'https://xuechuang.xyz/oss/share-assets/xuechuang/team/avatars/default/team-avatar-default-2-v1.webp',
	'https://xuechuang.xyz/oss/share-assets/xuechuang/team/avatars/default/team-avatar-default-3-v1.webp'
])

export default {
	name: 'TeamJoinList',
	components: {
		TeamDetailDialog,
		TeamSummaryCard
	},
	props: {
		emptyText: {
			type: String,
			default: '暂无可加入的合伙人'
		}
	},
	data() {
		return {
			loading: false,
			list: [],
			showTeamDetailDialog: false,
			activeTeam: null,
			crownIconUrl: '/pages/extra/static/team/team-crown.png',
			memberIconUrl: '/pages/extra/static/team/team-members.png',
			coinIconUrl: '/pages/extra/static/team/team-coin.png'
		}
	},
	computed: {
		displayTeams() {
			return (Array.isArray(this.list) ? this.list : []).map((team, index) => {
				const safeTeam = team && typeof team === 'object' ? team : {}
				const fallbackKey = `${safeTeam.team_name || 'team'}-${safeTeam.leader_user_id || index}`
				return Object.assign({}, safeTeam, {
					renderKey: `team-${this.getTeamId(safeTeam) || fallbackKey}`,
					resolvedAvatar: this.resolveTeamAvatar(safeTeam),
					displayMemberCount: this.formatMemberCount(safeTeam.member_count),
					displayTeamIncome: this.formatCoinAmount(
						safeTeam.team_year_income !== undefined && safeTeam.team_year_income !== null
							? safeTeam.team_year_income
							: safeTeam.month_team_sales
					)
				})
			})
		}
	},
	mounted() {
		this.loadData()
	},
	methods: {
		refresh() {
			return this.loadData()
		},
		normalizeTeam(team) {
			const safeTeam = team && typeof team === 'object' ? team : {}
			const teamId = this.getTeamId(safeTeam)
			return Object.assign({}, safeTeam, {
				team_id: safeTeam.team_id || safeTeam.teamId || safeTeam.id || safeTeam._id || teamId || '',
				id: safeTeam.id || safeTeam.team_id || safeTeam.teamId || safeTeam._id || teamId || '',
				_id: safeTeam._id || safeTeam.team_id || safeTeam.teamId || safeTeam.id || teamId || '',
				avatar: safeTeam.avatar || safeTeam.avatar_url || '',
				default_avatar_url: safeTeam.default_avatar_url || '',
				month_team_sales: Number(safeTeam.month_team_sales || 0),
				team_year_income: Number(
					safeTeam.team_year_income !== undefined && safeTeam.team_year_income !== null
						? safeTeam.team_year_income
						: safeTeam.month_team_sales || 0
				),
				description: String(safeTeam.description || '').trim(),
				extra_payload: safeTeam.extra_payload && typeof safeTeam.extra_payload === 'object'
					? safeTeam.extra_payload
					: {}
			})
		},
		getTeamId(team) {
			if (!team || typeof team !== 'object') return ''
			const nestedTeam = team.team && typeof team.team === 'object' ? team.team : {}
			return String(
				team.team_id ||
				team.teamId ||
				team.id ||
				team._id ||
				nestedTeam.team_id ||
				nestedTeam.teamId ||
				nestedTeam.id ||
				nestedTeam._id ||
				''
			).trim()
		},
		getDefaultTeamAvatar(team) {
			const teamId = this.getTeamId(team)
			const explicitDefault = this.normalizeAvatarUrl(team && team.default_avatar_url, '')
			if (explicitDefault) {
				return explicitDefault
			}

			const numericTeamId = Number(teamId)
			if (Number.isInteger(numericTeamId) && numericTeamId > 0) {
				return TEAM_DEFAULT_AVATAR_URLS[(numericTeamId - 1) % TEAM_DEFAULT_AVATAR_URLS.length]
			}

			const raw = String(teamId || team.team_name || '').trim()
			let hash = 0
			for (let index = 0; index < raw.length; index += 1) {
				hash = (hash * 31 + raw.charCodeAt(index)) >>> 0
			}
			return TEAM_DEFAULT_AVATAR_URLS[hash % TEAM_DEFAULT_AVATAR_URLS.length]
		},
		normalizeAvatarUrl(url, fallback = '') {
			const normalized = String(url || '').trim()
			return normalized || fallback
		},
		resolveTeamAvatar(team) {
			return this.normalizeAvatarUrl(team && team.avatar, this.getDefaultTeamAvatar(team || {}))
		},
		formatMemberCount(value) {
			const count = Number(value)
			if (!Number.isFinite(count) || count < 0) {
				return '0'
			}
			return `${Math.round(count)}`
		},
		formatCoinAmount(value) {
			const amount = Number(value)
			const roundedAmount = Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0
			return String(roundedAmount).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
		},
		getJoinFeeValue(team) {
			const safeTeam = team && typeof team === 'object' ? team : {}
			const amount = Number(
				safeTeam.join_fee !== undefined ? safeTeam.join_fee : (
					safeTeam.joinFee !== undefined ? safeTeam.joinFee : 0
				)
			)
			if (!Number.isFinite(amount) || amount <= 0) {
				return 0
			}
			return Math.round((amount + Number.EPSILON) * 100) / 100
		},
		formatJoinFee(value) {
			const amount = this.getJoinFeeValue({ join_fee: value })
			if (!amount) {
				return ''
			}
			return amount.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
		},
		async loadData() {
			const token = uni.getStorageSync('token')
			if (!token) {
				this.list = []
				return
			}

			this.loading = true
			try {
				const teamService = getHttpService('team-service')
				const res = await teamService.getTeamList({
					page: 1,
					pageSize: 50,
					_token: token
				})

				if (res && res.code === 0 && res.data) {
					const rawList = Array.isArray(res.data.list) ? res.data.list : []
					this.list = rawList.map(item => this.normalizeTeam(item))
				} else {
					this.list = []
				}
			} catch (error) {
				console.error('[TeamJoinList] 获取团队列表失败:', error)
				this.list = []
			} finally {
				this.loading = false
			}
		},
		openTeamDetail(index) {
			const team = Array.isArray(this.displayTeams) ? this.displayTeams[index] : null
			if (!team) {
				uni.showToast({ title: '团队数据异常', icon: 'none' })
				return
			}
			this.activeTeam = team
			this.showTeamDetailDialog = true
		},
		closeTeamDetail() {
			this.showTeamDetailDialog = false
			this.activeTeam = null
		},
		handleJoinFromDialog(team) {
			this.closeTeamDetail()
			const index = this.displayTeams.findIndex(item => String(item.renderKey) === String(team && team.renderKey))
			if (index >= 0) {
				this.handleJoinTeamByIndex(index)
			}
		},
		async refreshTeamForJoin(index, fallbackTeam) {
			const token = uni.getStorageSync('token')
			if (!token) return this.normalizeTeam(fallbackTeam)

			try {
				const teamService = getHttpService('team-service')
				const res = await teamService.getTeamList({
					page: 1,
					pageSize: 50,
					_token: token
				})

				const remoteList = res && res.code === 0 && res.data && Array.isArray(res.data.list)
					? res.data.list.map(item => this.normalizeTeam(item))
					: []
				const fallbackName = String((fallbackTeam && fallbackTeam.team_name) || '').trim()
				let matchedTeam = remoteList[index] || null

				if ((!matchedTeam || !this.getTeamId(matchedTeam)) && fallbackName) {
					matchedTeam = remoteList.find(item => String(item.team_name || '').trim() === fallbackName) || matchedTeam
				}

				if (matchedTeam && this.getTeamId(matchedTeam)) {
					const nextList = Array.isArray(this.list) ? this.list.slice() : []
					nextList[index] = matchedTeam
					this.list = nextList
					return matchedTeam
				}
			} catch (error) {
				console.error('[TeamJoinList] 二次刷新团队列表失败:', error)
			}

			return this.normalizeTeam(fallbackTeam)
		},
		async handleJoinTeamByIndex(index) {
			const team = Array.isArray(this.list) ? this.list[index] : null
			if (!team) {
				uni.showToast({ title: '团队数据异常', icon: 'none' })
				return
			}

			let normalizedTeam = this.normalizeTeam(team)
			let teamId = this.getTeamId(normalizedTeam)
			if (!teamId) {
				normalizedTeam = await this.refreshTeamForJoin(index, normalizedTeam)
				teamId = this.getTeamId(normalizedTeam)
			}
			if (!teamId) {
				uni.showToast({ title: '团队ID缺失', icon: 'none' })
				return
			}

			const token = uni.getStorageSync('token')
			if (!token) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				return
			}

			const joinFee = this.getJoinFeeValue(normalizedTeam)
			const teamName = normalizedTeam.team_name || '该团队'
			const confirmContent = joinFee > 0
				? `确认加入【${teamName}】并支付 ${this.formatJoinFee(joinFee)} 元吗？`
				: `确认加入【${teamName}】吗？`
			const confirmRes = await new Promise(resolve => {
				uni.showModal({
					title: '确认加入合伙人',
					content: confirmContent,
					success: resolve,
					fail: () => resolve({ confirm: false })
				})
			})
			if (!confirmRes.confirm) return

			uni.setStorageSync('pending_join_team_snapshot', normalizedTeam)
			uni.navigateTo({
				url: `/pages/extra/join-team-confirm?team_id=${encodeURIComponent(teamId)}`
			})
		}
	}
}
</script>

<style scoped>
.team-join-list {
	display: flex;
	flex-direction: column;
}

.list-loading,
.list-empty {
	padding: 80rpx 0;
	text-align: center;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.loading-text,
.list-empty-text {
	font-size: 24rpx;
	color: #6f87a0;
}

.team-card-shell {
	margin-top: 20rpx;
}

.team-card-shell:first-of-type {
	margin-top: 0;
}
</style>
