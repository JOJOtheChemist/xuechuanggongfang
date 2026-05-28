<template>
	<view class="page-root">
		<scroll-view class="page-scroll" scroll-y>
			<view class="top-hero">
				<image class="top-hero-image" src="/pages/extra/static/team/team-center-hero.jpg" mode="widthFix" />
				<view class="hero-back-hit" @tap="goBack"></view>
			</view>

			<view class="page-content">
				<view v-if="myTeam" class="section-card">
					<view class="section-head">
						<view class="section-title-row">
							<view class="section-title-accent"></view>
							<text class="section-title">我的团队</text>
						</view>
					</view>
					<view class="my-team-card-shell" @tap="openMyTeamDetail">
						<team-summary-card
							:team="myTeam"
							:crown-icon-url="crownIconUrl"
							:member-icon-url="memberIconUrl"
							:coin-icon-url="coinIconUrl"
						/>
					</view>
				</view>

				<view class="section-card team-list-shell">
					<view class="section-head">
						<view class="section-title-row">
							<view class="section-title-accent"></view>
							<text class="section-title">全部团队</text>
						</view>
					</view>
					<team-join-list
						ref="teamJoinList"
						list-title=""
						empty-text="暂时还没有可展示的团队"
					/>
				</view>
			</view>
		</scroll-view>

		<team-detail-dialog
			:visible="showMyTeamDetailDialog"
			:team="myTeam"
			:crown-icon-url="crownIconUrl"
			:member-icon-url="memberIconUrl"
			:coin-icon-url="coinIconUrl"
			@close="closeMyTeamDetail"
			@join="closeMyTeamDetail"
		/>
	</view>
</template>

<script>
import { getHttpService } from '@/utils/http-services'
import TeamDetailDialog from './components/TeamDetailDialog.vue'
import TeamJoinList from './components/TeamJoinList.vue'
import TeamSummaryCard from './components/TeamSummaryCard.vue'

const TEAM_DEFAULT_AVATAR_URLS = Object.freeze([
	'https://xuechuang.xyz/oss/share-assets/xuechuang/team/avatars/default/team-avatar-default-1-v1.webp',
	'https://xuechuang.xyz/oss/share-assets/xuechuang/team/avatars/default/team-avatar-default-2-v1.webp',
	'https://xuechuang.xyz/oss/share-assets/xuechuang/team/avatars/default/team-avatar-default-3-v1.webp'
])

export default {
	components: {
		TeamDetailDialog,
		TeamJoinList,
		TeamSummaryCard
	},
	data() {
		return {
			hasInitialized: false,
			myTeam: null,
			showMyTeamDetailDialog: false,
			crownIconUrl: '/pages/extra/static/team/team-crown.png',
			memberIconUrl: '/pages/extra/static/team/team-members.png',
			coinIconUrl: '/pages/extra/static/team/team-coin.png'
		}
	},
	async onShow() {
		this.hasInitialized = true
		await this.refreshPanels()
	},
	methods: {
		goBack() {
			uni.navigateBack()
		},
		normalizeAvatarUrl(url, fallback = '') {
			const normalized = String(url || '').trim()
			return normalized || fallback
		},
		getDefaultTeamAvatar(team = {}) {
			const rawTeamId = String(team.team_id || team.id || team._id || '').trim()
			const explicitDefault = this.normalizeAvatarUrl(team.default_avatar_url, '')
			if (explicitDefault) {
				return explicitDefault
			}

			const numericTeamId = Number(rawTeamId)
			if (Number.isInteger(numericTeamId) && numericTeamId > 0) {
				return TEAM_DEFAULT_AVATAR_URLS[(numericTeamId - 1) % TEAM_DEFAULT_AVATAR_URLS.length]
			}

			const raw = String(rawTeamId || team.team_name || '').trim()
			let hash = 0
			for (let index = 0; index < raw.length; index += 1) {
				hash = (hash * 31 + raw.charCodeAt(index)) >>> 0
			}
			return TEAM_DEFAULT_AVATAR_URLS[hash % TEAM_DEFAULT_AVATAR_URLS.length]
		},
		resolveTeamAvatar(team = {}) {
			return this.normalizeAvatarUrl(
				team.resolvedAvatar || team.avatar || team.avatar_url,
				this.getDefaultTeamAvatar(team)
			)
		},
		buildTeamSummaryCardData(team = {}, detail = {}) {
			const mergedTeam = Object.assign({}, team || {}, detail || {})
			const rawTeamId = String(mergedTeam.team_id || mergedTeam.id || mergedTeam._id || '').trim()
			const resolvedAvatar = this.resolveTeamAvatar(mergedTeam)

			return {
				team_id: rawTeamId,
				id: rawTeamId,
				_id: rawTeamId,
				team_name: mergedTeam.team_name || '未命名团队',
				member_count: mergedTeam.member_count || 0,
				team_level: mergedTeam.team_level || '',
				description: String(mergedTeam.description || '').trim(),
				team_year_income: mergedTeam.team_year_income || mergedTeam.month_team_sales || 0,
				avatar: this.normalizeAvatarUrl(mergedTeam.avatar || mergedTeam.avatar_url, ''),
				avatar_url: this.normalizeAvatarUrl(mergedTeam.avatar_url || mergedTeam.avatar, ''),
				resolvedAvatar,
				default_avatar_url: this.getDefaultTeamAvatar(Object.assign({}, mergedTeam, { team_id: rawTeamId })),
				showcase_image: mergedTeam.showcase_image || mergedTeam.showcaseImage || '',
				style_image_url: mergedTeam.style_image_url || mergedTeam.styleImageUrl || '',
				cover_url: mergedTeam.cover_url || mergedTeam.coverUrl || '',
				image_url: mergedTeam.image_url || mergedTeam.imageUrl || '',
				extra_payload: mergedTeam.extra_payload && typeof mergedTeam.extra_payload === 'object' ? mergedTeam.extra_payload : {}
			}
		},
		openMyTeamDetail() {
			if (!this.myTeam) return
			this.showMyTeamDetailDialog = true
		},
		closeMyTeamDetail() {
			this.showMyTeamDetailDialog = false
		},
		async loadMyTeam() {
			const token = uni.getStorageSync('token')
			if (!token) {
				this.myTeam = null
				this.closeMyTeamDetail()
				return
			}

			try {
				const teamService = getHttpService('team-service')
				const [result, listResult] = await Promise.all([
					teamService.getMyTeam({ _token: token }),
					teamService.getTeamList({
						page: 1,
						pageSize: 100,
						_token: token
					})
				])
				if (result && result.code === 0 && result.data) {
					const teamId = result.data.team_id || result.data.id
					const matchedListItem =
						listResult &&
						listResult.code === 0 &&
						listResult.data &&
						Array.isArray(listResult.data.list)
							? listResult.data.list.find((item) => String(item.team_id || item.id || '') === String(teamId)) || null
							: null
					let teamDetail = {}
					if (teamId) {
						try {
							const detailResult = await teamService.getTeamDetail({ team_id: teamId, _token: token })
							if (detailResult && detailResult.code === 0 && detailResult.data) {
								teamDetail = detailResult.data
							}
						} catch (detailError) {
							console.warn('[team-center] load my team detail failed:', detailError)
						}
					}
					const summarySource = matchedListItem || result.data
					const detailSource = Object.assign({}, teamDetail, {
						team_year_income:
							matchedListItem && matchedListItem.team_year_income !== undefined && matchedListItem.team_year_income !== null
								? matchedListItem.team_year_income
								: teamDetail.team_year_income,
						month_team_sales:
							matchedListItem && matchedListItem.month_team_sales !== undefined && matchedListItem.month_team_sales !== null
								? matchedListItem.month_team_sales
								: teamDetail.month_team_sales
					})
					this.myTeam = this.buildTeamSummaryCardData(summarySource, detailSource)
					return
				}
			} catch (error) {
				console.error('[team-center] load my team failed:', error)
			}

			this.myTeam = null
			this.closeMyTeamDetail()
		},
		async refreshPanels() {
			await new Promise((resolve) => this.$nextTick(resolve))

			const tasks = [this.loadMyTeam()]
			if (this.$refs.teamJoinList && typeof this.$refs.teamJoinList.refresh === 'function') {
				tasks.push(this.$refs.teamJoinList.refresh())
			}

			if (!tasks.length) {
				return
			}

			await Promise.allSettled(tasks)
		}
	}
}
</script>

<style scoped>
.page-root {
	height: 100vh;
	background: #ffffff;
}

.page-scroll {
	height: 100%;
	background: #ffffff;
}

.top-hero {
	position: relative;
	width: 100%;
	background: #dfeeff;
}

.top-hero-image {
	display: block;
	width: 100%;
	height: auto;
}

.hero-back-hit {
	position: absolute;
	left: 20rpx;
	top: 18rpx;
	width: 96rpx;
	height: 96rpx;
	z-index: 2;
}

.page-content {
	padding: 20rpx 24rpx 28rpx;
	box-sizing: border-box;
}

.section-card {
	padding: 0;
	border-radius: 0;
	background: transparent;
	box-shadow: none;
}

.team-list-shell {
	margin-top: 28rpx;
}

.section-head {
	margin-bottom: 20rpx;
}

.my-team-card-shell {
	margin-bottom: 16rpx;
}

.section-title-row {
	display: flex;
	align-items: center;
}

.section-title-accent {
	width: 8rpx;
	height: 30rpx;
	margin-right: 12rpx;
	border-radius: 999rpx;
	background: #2589ff;
}

.section-title {
	font-size: 34rpx;
	line-height: 1.3;
	font-weight: 700;
	color: #12233d;
}
</style>
