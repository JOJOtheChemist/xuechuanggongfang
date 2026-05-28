<template>
	<view class="page-root">
		<view class="nav-bar">
			<view class="back-btn" @tap="goBack">
				<text class="back-arrow">←</text>
			</view>
			<text class="nav-title">校园合伙人</text>
		</view>

		<view class="content">
			<scroll-view
				scroll-y
				class="list-scroll"
				:lower-threshold="120"
				:refresher-enabled="true"
				:refresher-triggered="refreshing"
				@scrolltolower="loadMore"
				@refresherrefresh="handleRefresh"
			>
				<view v-if="loading" class="list-loading">
					<text class="loading-text">加载中...</text>
				</view>
				<view v-else-if="!list.length" class="list-empty">
					<text class="list-empty-text">暂无合伙人</text>
				</view>
				<block v-else>
					<view class="member-card" v-for="(member, index) in list" :key="getMemberUserId(member) || index">
						<view class="meta">
							<view class="name-row">
								<text class="title">{{ formatMemberName(member) }}</text>
								<view class="name-flags">
									<text :class="['badge', isAdmin(member) ? 'admin-badge' : 'member-badge']">
										{{ formatMemberRole(member) }}
									</text>
									<text class="tag-item" v-if="isAdmin(member)">带队领袖</text>
									<text class="tag-item" v-else>活跃伙伴</text>
									<text class="badge-status">已认证</text>
								</view>
							</view>
							<text class="summary">{{ member.joined_at || member.create_date ? '加入时间: ' + formatDate(member.joined_at || member.create_date) : '菁英合伙人' }}</text>

							<team-member-contact-card
								:name-text="getVisibleMemberName(member)"
								:phone-text="getVisibleMemberPhone(member)"
								:can-view-contacts="Boolean(access && access.canViewContacts)"
							/>
							<team-member-contact-actions
								v-if="access && access.canViewContacts"
								:member="member"
								:revealed="isMemberRevealed(member)"
								@toggle-reveal="handleRevealContact"
								@copy="copyMemberContact"
							/>
							<view v-if="canShowManageButtons" class="member-manage-row">
								<button
									v-if="canPromoteMember(member)"
									class="manage-btn manage-btn-primary"
									size="mini"
									:disabled="actionLoadingUserId === getMemberUserId(member)"
									@tap.stop="handleSetLeader(member)"
								>
									{{ actionLoadingUserId === getMemberUserId(member) ? '处理中...' : '设为团长' }}
								</button>
								<button
									v-if="canRemoveMember(member)"
									class="manage-btn manage-btn-danger"
									size="mini"
									:disabled="actionLoadingUserId === getMemberUserId(member)"
									@tap.stop="handleRemoveMember(member)"
								>
									{{ actionLoadingUserId === getMemberUserId(member) ? '处理中...' : '删除团员' }}
								</button>
							</view>
						</view>
						<view class="thumb-container">
							<view class="thumb-wrap">
								<image
									class="thumb"
									:src="normalizeAvatarUrl(member.avatar_url || member.avatar, defaultAvatar)"
									mode="aspectFill"
								/>
								<view class="thumb-status-badge">开单中</view>
							</view>
						</view>
					</view>
				</block>
				<view v-if="!loading && list.length" class="load-more-state">
					<text v-if="loadingMore" class="load-more-text">正在加载更多成员...</text>
					<text v-else-if="hasMore" class="load-more-text">上滑继续查看更多成员</text>
					<text v-else class="load-more-text">团队成员已全部加载完成</text>
				</view>
			</scroll-view>
		</view>

	</view>
</template>

<script>
import { getHttpService } from '@/utils/http-services'
import TeamMemberContactCard from './components/TeamMemberContactCard.vue'
import TeamMemberContactActions from './components/TeamMemberContactActions.vue'
export default {
	components: {
		TeamMemberContactCard,
		TeamMemberContactActions
	},
	data() {
		return {
			loading: false,
			loadingMore: false,
			list: [],
			teamId: '',
			defaultAvatar: 'https://vkceyugu.cdn.bspapp.com/VKCEYUGU-uni-id-avatar/default-avatar.png',
			page: 1,
			pageSize: 20,
			total: 0,
			hasMore: false,
			refreshing: false,
			access: {
				canViewContacts: false,
				isLeader: false,
				viewerRole: 'member'
			},
			isXuechuangWebpage: false,
			revealedMembers: {},
			actionLoadingUserId: ''
		}
	},
	computed: {
		canManageMembers() {
			return Boolean(this.access && (this.access.canManageMembers || this.access.isLeader))
		},
		canShowManageButtons() {
			return this.canManageMembers && this.isXuechuangWebpage
		}
	},
	onLoad(options) {
		const incomingTeamId = String(
			(options && (options.teamId || options.team_id || options.id)) || ''
		).trim()
		if (incomingTeamId) {
			this.teamId = incomingTeamId
		}
		this.loadData(true)
	},
	created() {
		this.isXuechuangWebpage = this.detectXuechuangWebpage()
	},
	onShow() {
		if (!this.loading && !this.loadingMore && !this.list.length) {
			this.loadData(true)
		}
	},
	onPullDownRefresh() {
		this.refreshList().finally(() => {
			uni.stopPullDownRefresh()
		})
	},
	methods: {
		detectXuechuangWebpage() {
			// #ifdef H5
			const hostname = typeof window !== 'undefined'
				? String((window.location && window.location.hostname) || '')
				: ''
				.trim()
				.toLowerCase()
			return hostname === 'xuechuang.xyz' || hostname.endsWith('.xuechuang.xyz')
			// #endif
			return false
		},
		goBack() {
			uni.navigateBack()
		},
		extractListPayload(res) {
			const data = res && res.data
			if (Array.isArray(data)) {
				return {
					list: data,
					total: data.length,
					page: 1,
					pageSize: data.length || this.pageSize
				}
			}

			if (data && Array.isArray(data.list)) {
				return {
					list: data.list,
					total: Number(data.total || 0),
					page: Number(data.page || this.page),
					pageSize: Number(data.pageSize || this.pageSize),
					hasMore: data.hasMore !== undefined ? Boolean(data.hasMore) : data.has_more,
					access: data.access || null
				}
			}

			return {
				list: [],
				total: 0,
				page: this.page,
				pageSize: this.pageSize
			}
		},
		updatePagination(payload, reset = false) {
			const incomingList = Array.isArray(payload.list) ? payload.list : []
			this.total = Number(payload.total || 0)

			if (reset) {
				this.list = incomingList
			} else {
				const seen = new Set(this.list.map(item => String(item && (item.id || item._id || item.user_id || ''))))
				const merged = this.list.slice()
				incomingList.forEach(item => {
					const key = String(item && (item.id || item._id || item.user_id || ''))
					if (!key || !seen.has(key)) {
						if (key) seen.add(key)
						merged.push(item)
					}
				})
				this.list = merged
			}

			const resolvedPageSize = Number(payload.pageSize || this.pageSize || 20)
			const resolvedPage = Number(payload.page || this.page || 1)
			this.pageSize = resolvedPageSize
			this.page = resolvedPage
			if (payload.access && typeof payload.access === 'object') {
				this.access = Object.assign({}, this.access, payload.access)
			}

			if (this.total > 0) {
				this.hasMore = payload.hasMore !== undefined
					? Boolean(payload.hasMore)
					: this.list.length < this.total
				return
			}

			if (incomingList.length === 0) {
				this.hasMore = false
				return
			}

			this.hasMore = incomingList.length >= resolvedPageSize
		},
		async loadData(reset = false) {
			const token = uni.getStorageSync('token')
			if (!token) return

			if (!this.teamId) {
				await this.ensureTeamId(token)
			}
			if (!this.teamId) {
				if (reset) {
					this.list = []
					this.total = 0
					this.hasMore = false
				}
				return
			}
			if (!reset && (!this.hasMore || this.loadingMore || this.loading)) return

			if (reset) {
				this.loading = true
				this.page = 1
				this.total = 0
				this.hasMore = false
			} else {
				this.loadingMore = true
			}

			const requestPage = reset ? 1 : this.page + 1
			try {
				const teamService = getHttpService('team-service')
				const res = await teamService.getTeamMembers({ 
					teamId: this.teamId, 
					page: requestPage,
					pageSize: this.pageSize,
					_token: token 
				})

				if (res && res.code === 0) {
					const payload = this.extractListPayload(res)
					this.updatePagination(payload, reset)
				} else {
					uni.showToast({
						title: (res && res.message) || '获取成员失败',
						icon: 'none'
					})
				}
			} catch (e) {
				console.error('获取成员列表失败', e)
				uni.showToast({ title: '获取成员列表失败', icon: 'none' })
			} finally {
				if (reset) {
					this.loading = false
				} else {
					this.loadingMore = false
				}
			}
		},
		async ensureTeamId(token) {
			if (this.teamId) return this.teamId
			try {
				const teamService = getHttpService('team-service')
				const res = await teamService.getMyTeam({ _token: token })
				const teamId = String(
					(res && res.data && (res.data.team_id || res.data.teamId)) || ''
				).trim()
				if (teamId) {
					this.teamId = teamId
				}
				return this.teamId
			} catch (error) {
				console.error('[team-member-list] ensure team id failed:', error)
				return ''
			}
		},
		loadMore() {
			this.loadData(false)
		},
		async refreshList() {
			if (this.loading || this.loadingMore) return
			await this.loadData(true)
		},
		handleRefresh() {
			if (this.refreshing) return
			this.refreshing = true
			this.refreshList().finally(() => {
				this.refreshing = false
			})
		},
		getMemberUserId(member) {
			return String(member && (member.user_id || member.userId || member.id || member._id || '')).trim()
		},
		isAdmin(member) {
			const roleList = Array.isArray(member.role) ? member.role : []
			return member.position === '队长' || roleList.includes('admin') || (member.team_info && member.team_info.position === '队长')
		},
		canPromoteMember(member) {
			return this.canManageMembers && !this.isAdmin(member)
		},
		canRemoveMember(member) {
			return this.canManageMembers && !this.isCurrentUser(member) && !this.isAdmin(member)
		},
		isCurrentUser(member) {
			const currentUserId = String(uni.getStorageSync('userId') || '').trim()
			return !!currentUserId && currentUserId === this.getMemberUserId(member)
		},
		formatDate(timestamp) {
			if (!timestamp) return ''
			const date = new Date(timestamp)
			return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
		},
		formatMemberName(member) {
			if (!member) return '未命名用户'
			const realName = member.profile && member.profile.real_name
			const baseName = member.public_name || member.nickname || realName || member.username
			if (baseName) return baseName

			const id = member.id || member._id || member.user_id || ''
			return '用户' + id.slice(-4)
		},
		formatMemberRole(member) {
			if (member.position) {
				return member.position
			}
			if (member.team_info && member.team_info.position) {
				return member.team_info.position
			}
			const roleList = Array.isArray(member.role) ? member.role : []
			const roleMap = {
				admin: '管理员',
				senior_partner: '高级校园合伙人',
				partner: '校园合伙人',
				team_member: '成员',
				user: '高级校园合伙人'
			}
			for (const key of ['senior_partner', 'partner', 'team_member', 'admin', 'user']) {
				if (roleList.includes(key)) return roleMap[key]
			}
			return '高级校园合伙人'
		},
		isMemberRevealed(member) {
			const userId = this.getMemberUserId(member)
			if (!userId) return false
			return !!this.revealedMembers[userId]
		},
		getRawMemberName(member) {
			const profile = member && member.profile && typeof member.profile === 'object'
				? member.profile
				: {}
			return String(
				(member && (
					member.real_name ||
					member.realName ||
					profile.real_name ||
					profile.realName ||
					member.masked_real_name ||
					profile.masked_real_name ||
					member.public_name ||
					member.nickname ||
					profile.nickname ||
					member.username
				)) || ''
			).trim()
		},
		getRawMemberPhone(member) {
			const profile = member && member.profile && typeof member.profile === 'object'
				? member.profile
				: {}
			return String(
				(member && (
					member.phone ||
					member.mobile ||
					profile.phone ||
					profile.mobile ||
					member.masked_phone ||
					profile.masked_phone
				)) || ''
			).trim()
		},
		maskMemberName(value) {
			const text = String(value || '').trim()
			if (!text) return ''
			if (text.length === 1) return `${text}*`
			if (text.length === 2) return `${text.slice(0, 1)}*`
			return `${text.slice(0, 1)}**${text.slice(-1)}`
		},
		maskMemberPhone(value) {
			const text = String(value || '').trim().replace(/\s+/g, '')
			if (!text) return ''
			if (/^1\d{10}$/.test(text)) {
				return `${text.slice(0, 3)}****${text.slice(-4)}`
			}
			if (text.length <= 4) return `${text.slice(0, 1)}***`
			return `${text.slice(0, Math.min(3, text.length - 2))}***${text.slice(-2)}`
		},
		getVisibleMemberName(member) {
			const rawName = this.getRawMemberName(member)
			if (!rawName) return '未填写'
			return this.isMemberRevealed(member) ? rawName : this.maskMemberName(rawName)
		},
		getVisibleMemberPhone(member) {
			const rawPhone = this.getRawMemberPhone(member)
			if (!rawPhone) return '未填写'
			return this.isMemberRevealed(member) ? rawPhone : this.maskMemberPhone(rawPhone)
		},
		async handleRevealContact(member) {
			if (!this.access || !this.access.canViewContacts) {
				uni.showToast({
					title: '仅团长可以查看',
					icon: 'none'
				})
				return
			}
			const userId = this.getMemberUserId(member)
			if (!userId) return
			const nextVisible = !this.revealedMembers[userId]
			this.revealedMembers = Object.assign({}, this.revealedMembers, {
				[userId]: nextVisible
			})
		},
		copyText(value, emptyMessage = '暂无可复制内容', options = {}) {
			const text = String(value || '').trim()
			if (!text) {
				uni.showToast({ title: emptyMessage, icon: 'none' })
				return
			}
			const showCopiedValue = Boolean(options && options.showCopiedValue)
			const copiedValueLabel = String(options && options.copiedValueLabel || '已复制内容').trim()
			uni.setClipboardData({
				data: text,
				showToast: false,
				success: () => {
					return
				},
				fail: (error) => {
					uni.showModal({
						title: '复制失败',
						content: String(error && (error.errMsg || error.message) || '写入剪贴板失败').trim(),
						showCancel: false,
						confirmText: '知道了'
					})
				}
			})
		},
		copyMemberContact(member) {
			const rawName = this.getRawMemberName(member)
			const rawPhone = this.getRawMemberPhone(member)
			if (!rawName && !rawPhone) {
				uni.showToast({
					title: '该成员暂无可复制信息',
					icon: 'none'
				})
				return
			}
			const copyValue = `姓名：${rawName || '未填写'}\n手机号：${rawPhone || '未填写'}`
			this.copyText(copyValue, '该成员暂无可复制信息', {
				showCopiedValue: true,
				copiedValueLabel: '姓名和手机号'
			})
		},
		async handleSetLeader(member) {
			const memberUserId = this.getMemberUserId(member)
			if (!memberUserId) {
				uni.showToast({ title: '成员标识缺失', icon: 'none' })
				return
			}

			const confirmRes = await new Promise(resolve => {
				uni.showModal({
					title: '设置团长',
					content: `确认将【${this.formatMemberName(member)}】设为新团长吗？`,
					success: resolve,
					fail: () => resolve({ confirm: false })
				})
			})
			if (!confirmRes.confirm) return

			const token = uni.getStorageSync('token')
			if (!token) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				return
			}

			this.actionLoadingUserId = memberUserId
			try {
				const teamService = getHttpService('team-service')
				const res = await teamService.setTeamLeader({
					teamId: this.teamId,
					memberUserId,
					leaderUserId: memberUserId,
					_token: token
				})
				if (!res || res.code !== 0) {
					throw new Error((res && res.message) || '设置团长失败')
				}

				uni.showToast({ title: '设置成功', icon: 'success' })
				await this.refreshList()
			} catch (error) {
				console.error('[team-member-list] set leader failed:', error)
				uni.showToast({
					title: error.message || '设置团长失败',
					icon: 'none'
				})
			} finally {
				this.actionLoadingUserId = ''
			}
		},
		async handleRemoveMember(member) {
			const memberUserId = this.getMemberUserId(member)
			if (!memberUserId) {
				uni.showToast({ title: '成员标识缺失', icon: 'none' })
				return
			}

			const confirmRes = await new Promise(resolve => {
				uni.showModal({
					title: '删除团员',
					content: `确认将【${this.formatMemberName(member)}】移出团队吗？`,
					confirmColor: '#ef4444',
					success: resolve,
					fail: () => resolve({ confirm: false })
				})
			})
			if (!confirmRes.confirm) return

			const token = uni.getStorageSync('token')
			if (!token) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				return
			}

			this.actionLoadingUserId = memberUserId
			try {
				const teamService = getHttpService('team-service')
				const res = await teamService.removeTeamMember({
					teamId: this.teamId,
					memberUserId,
					_token: token
				})
				if (!res || res.code !== 0) {
					throw new Error((res && res.message) || '删除团员失败')
				}

				uni.showToast({ title: '删除成功', icon: 'success' })
				await this.refreshList()
			} catch (error) {
				console.error('[team-member-list] remove member failed:', error)
				uni.showToast({
					title: error.message || '删除团员失败',
					icon: 'none'
				})
			} finally {
				this.actionLoadingUserId = ''
			}
		}
	}
}
</script>

<style scoped>
.page-root {
	height: 100vh;
	display: flex;
	flex-direction: column;
	background-color: #f8fafc;
}

.nav-bar {
	height: 88rpx;
	padding-top: var(--status-bar-height);
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
	background-color: #ffffff;
	border-bottom: 1rpx solid #e2e8f0;
	z-index: 10;
}

.back-btn {
	position: absolute;
	left: 0;
	bottom: 0;
	height: 88rpx;
	width: 88rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.back-arrow {
	font-size: 36rpx;
	font-weight: bold;
	color: #334155;
}

.nav-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #0f172a;
}

.content {
	flex: 1;
	display: flex;
	flex-direction: column;
	height: 0;
}

.list-scroll {
	flex: 1;
	height: 100%;
}

.list-loading,
.list-empty {
	padding: 80rpx 0;
	text-align: center;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.loading-text, .list-empty-text {
	font-size: 24rpx;
	color: #94a3b8;
}

.load-more-state {
	padding: 28rpx 24rpx 40rpx;
	display: flex;
	justify-content: center;
}

.load-more-text {
	font-size: 24rpx;
	color: #94a3b8;
}

.member-card {
	display: flex;
	background: #fff;
	border: 1rpx solid #e2e8f0;
	border-radius: 20rpx;
	padding: 24rpx;
	margin: 24rpx;
	margin-bottom: 0;
	box-shadow: 0 10rpx 30rpx rgba(15, 23, 42, 0.04);
}

.member-card:last-child {
	margin-bottom: 40rpx;
}

.meta {
	flex: 1;
	min-width: 0;
	margin-right: 24rpx;
	display: flex;
	flex-direction: column;
}

.name-row {
	display: flex;
	align-items: center;
	flex-wrap: nowrap;
	margin-bottom: 8rpx;
	gap: 12rpx;
}

.title {
	flex-shrink: 0;
	max-width: 280rpx;
	font-weight: 600;
	font-size: 30rpx;
	color: #0f172a;
	line-height: 1.4;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.name-flags {
	display: flex;
	flex: 1;
	min-width: 0;
	align-items: center;
	gap: 8rpx;
	overflow: hidden;
}

.summary {
	font-size: 24rpx;
	color: #64748b;
	line-height: 1.5;
	margin-bottom: 12rpx;
}

.tag-item {
	font-size: 18rpx;
	color: #475569;
	background: #f1f5f9;
	padding: 4rpx 12rpx;
	border-radius: 8rpx;
	white-space: nowrap;
}

.badges {
	margin-top: auto;
}

.member-manage-row {
	display: flex;
	gap: 12rpx;
	margin-top: 16rpx;
	flex-wrap: wrap;
}

.manage-btn {
	margin: 0;
	padding: 0 22rpx;
	height: 58rpx;
	line-height: 58rpx;
	border-radius: 999rpx;
	font-size: 22rpx;
}

.manage-btn::after {
	border: none;
}

.manage-btn-primary {
	background: linear-gradient(135deg, #f59e0b, #fb7185);
	color: #ffffff;
}

.manage-btn-danger {
	background: #fee2e2;
	color: #b91c1c;
}

.badge {
	font-size: 18rpx;
	padding: 2rpx 10rpx;
	border-radius: 6rpx;
	white-space: nowrap;
}

.admin-badge {
	color: #ffffff;
	background: #4f46e5;
}

.member-badge {
	color: #64748b;
	background: #f1f5f9;
}

.badge-status {
	font-size: 18rpx;
	padding: 4rpx 12rpx;
	border-radius: 8rpx;
	font-weight: 500;
	background: #ecfdf5;
	color: #059669;
	white-space: nowrap;
}

.thumb-container {
	flex-shrink: 0;
}

.thumb-wrap {
	position: relative;
	padding-bottom: 24rpx;
}

.thumb {
	width: 120rpx;
	height: 120rpx;
	border-radius: 60rpx;
	background: #f1f5f9;
}

.thumb-status-badge {
	position: absolute;
	left: 50%;
	bottom: 10rpx;
	transform: translateX(-50%);
	padding: 6rpx 14rpx;
	border-radius: 999rpx;
	background: linear-gradient(90deg, #f59e0b, #ea580c);
	color: #ffffff;
	font-size: 18rpx;
	line-height: 1;
	font-weight: 600;
	white-space: nowrap;
	border: 2rpx solid #ffffff;
	box-shadow: 0 6rpx 14rpx rgba(234, 88, 12, 0.18);
}

</style>
