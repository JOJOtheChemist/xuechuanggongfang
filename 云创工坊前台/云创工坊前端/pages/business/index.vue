<template>
	<view class="page-root">
		<!-- 增加 render guard，防止初始渲染阻塞 switchTab -->
		<view v-if="pageMounted" class="app-container">
			<!-- 用户信息栏 -->
			<view class="user-info-bar">
				<image 
					v-if="userInfo.avatar" 
					class="user-avatar" 
					:src="userInfo.avatar" 
					mode="aspectFill"
				/>
				<view v-else class="user-avatar-placeholder">
					<text class="placeholder-text">👤</text>
				</view>
				<view class="user-info-text">
					<text class="user-nickname">{{ userInfo.nickname || '未登录' }}</text>
					<text class="user-uid">UID: {{ userInfo.uid || '-' }}</text>
				</view>
			</view>
			
			<scroll-view class="app-main" scroll-y="true">
				<view class="section-list">
					<quick-nav 
						:business-data="businessItems" 
						@click="handleQuickNavClick" 
					/>
				<view class="detail-section" id="detail-card-anchor">
					<!-- 直接展示详情卡片，不再使用弹窗 -->
					<business-detail-card
						v-if="activeItem"
						:item="activeItem"
						:tag="activeTag"
						:category-id="activeCategoryId"
						:is-logged-in="isLoggedIn"
						@show-all="openAllArticlesSheet"
					/>
				</view>

                    <!-- Unified Debug Footer (Inside Scroll) -->
                    <!-- Hidden recruitment debug tags
                    <view class="global-debug" style="margin-top: 40rpx; padding-bottom: 60rpx; font-size: 20rpx; color: #ccc; text-align: center; display: flex; flex-direction: column; gap: 6rpx;">
                        <text>UID: {{ global_uid || '未登录' }}</text>
                        <text>终身: {{ global_lifetime_inviter }}</text>
                        <text>团队: {{ global_team_inviter }}</text>
                        <text>业务: {{ global_business_inviter }}</text>
                    </view>
                    -->

			</view> <!-- End of section-list -->
			</scroll-view>
		</view>
		
		<!-- 加载占位 -->
		<view v-else class="loading-placeholder">
			<view v-if="showReload" class="reload-box" @tap="retryLoading">
				<text>加载超时，点击重试</text>
			</view>
			<text v-else>加载中...</text>
		</view>
	</view>
</template>

<script>
	import BusinessDetailCard from '@/components/business/BusinessDetailCard.vue'
	import QuickNav from '@/components/business/QuickNav.vue'


const STATIC_BUSINESS_ITEMS = [
	{
		id: 1,
		title: '四六级',
		short: '四六级',
		bgColor: '#dbeafe',
		desc: '大学英语四、六级备考规划、真题解析与高分技巧，配套词汇与听力练习资料。',
		hasArticles: true,
		type: 'consult'
	},
	{
		id: 2,
		title: '考公',
		short: '考公',
		bgColor: '#fee2e2',
		desc: '最新公考资讯与题库，结合名师课程，帮助你高效备考，稳步上岸。',
		hasArticles: true,
		type: 'consult'
	},
	{
		id: 16,
		title: '考编',
		short: '考编',
		bgColor: '#ffedd5',
		desc: '汇集各地事业编考试公告、岗位分析与备考资料，助你顺利入编。',
		hasArticles: true,
		type: 'consult'
	},
	{
		id: 4,
		title: '考研',
		short: '考研',
		bgColor: '#e0e7ff',
		desc: '提供全程备考规划、院校专业分析与复试指导，帮你构建系统化学习路径。',
		hasArticles: true,
		type: 'consult'
	},
	{
		id: 9,
		title: '就业',
		short: '就业',
		bgColor: '#ccfbf1',
		desc: '为有定向就业需求的同学提供岗位信息、面试机会与用人单位对接通道。',
		hasArticles: true,
		type: 'consult'
	},
	{
		id: 6,
		title: '教资',
		short: '教资',
		bgColor: '#ffe4e6',
		desc: '教师资格证报考指南、备考资料与面试技巧，覆盖笔试与面试全流程。',
		hasArticles: true,
		type: 'consult'
	},
	{
		id: 15,
		title: '升学',
		short: '升学',
		bgColor: '#bae6fd',
		desc: '为有升学意向的同学提供测评、志愿规划与备考服务，支持一对一定制方案与专属班主任跟踪。',
		hasArticles: true,
		type: 'consult'
	},
	{
		id: 5,
		title: '专升本',
		short: '专升本',
		bgColor: '#fef3c7',
		desc: '为专科生量身打造的升学路径，提供报考指南、备考资料与院校分析，助力升学梦想。',
		hasArticles: true,
		type: 'consult'
	},
	{
		id: 11,
		title: '计算机',
		short: '计算机',
		bgColor: '#e0f2fe',
		desc: '计算机一级、二级考试大纲解析、真题训练与高频考点梳理，适合零基础快速入门。',
		hasArticles: true,
		type: 'consult'
	},
	{
		id: 14,
		title: '棉被品类',
		short: '棉被',
		bgColor: '#fce7f3',
		desc: '精选优质新生棉被，厂家直供，舒适保暖，支持送货到寝，让你的校园生活更温暖。',
		hasArticles: false,
		type: 'consult'
	},
	{
		id: 3,
		title: '驾校',
		short: '驾校',
		bgColor: '#dcfce7',
		desc: '提供专业驾考咨询服务，在学创工坊报名咨询，省心报考，高效拿证。',
		hasArticles: false,
		type: 'signup'
	},
	{
		id: 7,
		title: '勤工俭学',
		short: '勤工',
		bgColor: '#cffafe',
		desc: '覆盖校内勤工俭学、校外兼职与企业实习，多重审核保障岗位真实可靠。',
		hasArticles: false,
		type: 'signup'
	},
	{
		id: 13,
		title: '考证',
		short: '考证',
		bgColor: '#f3e8ff',
		desc: '应急人社考证一站式服务，提供报名咨询、考前培训与证书领取全流程支持。',
		hasArticles: true,
		type: 'signup'
	},
	{
		id: 12,
		title: '新人分享',
		short: '分享',
		bgColor: '#fee2ff',
		desc: '邀请好友加入学创工坊，共享优质校园服务资源，完成分享可获得积分奖励。',
		hasArticles: false,
		type: 'share'
	},
	{
		id: 10,
		title: '相关动态',
		short: '动态',
		bgColor: '#ffedd5',
		desc: '实时同步校园周边与职场干货动态，聚合最新政策、备考资讯与学创要闻，助你精准掌握一手资讯，走在成长的最前沿。',
		hasArticles: true,
		type: 'share'
	}
]

	export default {
	    components: {
	        BusinessDetailCard,
	        QuickNav,
	    },
    data() {
        return {
            pageMounted: false, // 页面是否已挂载
            showReload: false, // 加载超时显示重试
            // showPopup: false, // [REMOVED] 不再需要弹窗
            isLoggedIn: false,
            
            userInfo: {
                avatar: '',
                nickname: '',
                uid: ''
            },
            businessItems: [], // 初始为空，减少传输量
            activeIndex: 0,
            tags: ['热门推荐', '官方认证', '限时优惠', '新上线'],
            // 业务板块 id 与文章分类 category_id 的映射
            articleCategories: {
                1: 'cat_001', // 四六级 -> 志愿填报 (兼用，或独立)
                2: 'cat_002', // 考公
                16: 'cat_009', // 考编
                11: 'cat_007', // 计算机
                4: 'cat_004', // 考研
                5: 'cat_005', // 专升本
                6: 'cat_006', // 教资
                10: 'cat_010', // 动态
                15: 'cat_015',  // 升学
                9: 'cat_013',  // 就业
                13: 'cat_014'  // 考证
            },
            // 简单管理员密码（与其他处保持一致）
            ADMIN_PASSWORD: 'hyy199877'
        }
    },
	onShow() {
		this.showReload = false
		this.isLoggedIn = !!uni.getStorageSync('token')
		
		// 延迟渲染页面内容，确保 switchTab 动画流畅完成
		setTimeout(() => {
			this.pageMounted = true
			
			// 容错处理：确保 businessItems 即使为空也不报错，并尝试恢复
			try {
				if (!this.businessItems || this.businessItems.length === 0) {
					this.businessItems = JSON.parse(JSON.stringify(STATIC_BUSINESS_ITEMS)) || []
				}
			} catch (e) {
				console.error('Init businessItems failed', e)
				this.businessItems = []
			}
			
			this.$nextTick(() => {
				this.loadUserInfo()
				
				// 安全调用加载文章
				try {
					this.loadActiveArticles()
				} catch (e) {
					console.error('loadActiveArticles failed', e)
				}
			})
		}, 800) // 增加到 800ms，确保绝对不会白屏
		
		// 超时容错：如果3秒还没加载好，显示重试按钮
		setTimeout(() => {
			if (!this.pageMounted || this.businessItems.length === 0) {
				this.showReload = true
			}
		}, 3000)
		
		const page =
			(this.$mp && this.$mp.page) ||
			(typeof getCurrentPages === 'function' ? getCurrentPages().slice(-1)[0] : null)
		const tabBar = page && typeof page.getTabBar === 'function' ? page.getTabBar() : null

		if (tabBar && typeof tabBar.setData === 'function') {
			tabBar.setData({
				selected: 1
			})
		}
	},

	computed: {
		activeItem() {
			return this.businessItems[this.activeIndex] || null
		},
		activeTag() {
			if (!this.businessItems.length) return ''
			const baseIndex = this.activeIndex % this.tags.length
			return this.tags[baseIndex]
		},
		activeCategoryId() {
			const current = this.activeItem
			if (!current) return ''
			return this.articleCategories[current.id] || ''
		}
	},
		methods: {
			retryLoading() {
				this.showReload = false
				this.pageMounted = false
				this.onShow() // Re-trigger onShow logic
			},
			openAllArticlesSheet(payload) {
				console.log('Open all articles page', payload)
				const categoryId = payload.categoryId || ''
				const title = payload.title || ''
				uni.navigateTo({
					url: `/pages/article/list?categoryId=${categoryId}&title=${encodeURIComponent(title)}`
				})
			},
			
			// 加载用户信息
			loadUserInfo() {
				try {
					const storedUserInfo = uni.getStorageSync('userInfo')
					const userId = uni.getStorageSync('userId')
					const token = uni.getStorageSync('token')
					this.isLoggedIn = !!token
					
					if (storedUserInfo) {
						this.userInfo = {
							avatar: storedUserInfo.avatar || '',
							nickname: storedUserInfo.nickname || '用户',
							uid: userId || storedUserInfo.uid || ''
						}
					}
				} catch (e) {
					console.error('[business] 加载用户信息失败', e)
				}
			},
			handleQuickNavClick({ item, index }) {
				console.log('QuickNav clicked:', item.title);
				
				// 尝试匹配 businessItems
				const foundIndex = this.businessItems.findIndex(bItem => 
					bItem.short === item.title || 
					bItem.title === item.title || 
					bItem.title.includes(item.title)
				);
				
				if (foundIndex !== -1) {
					// 选中并加载数据
					this.handleSelect(foundIndex);
					
					// [NEW] 选中后平滑滚动到底部
					setTimeout(() => {
						uni.createSelectorQuery().in(this).select('#detail-card-anchor').boundingClientRect(data => {
							if (data) {
								uni.pageScrollTo({
									scrollTop: data.top, // 简单滚动，实际可能有偏移需要调整，或者让 scroll-view 滚动
									duration: 300
								})
							}
						}).exec()
					}, 200)
				} else {
					uni.showToast({
						title: '即将开放',
						icon: 'none'
					});
				}
			},
			// closePopup() { // [REMOVED]
			// 	this.showPopup = false;
			// },
			handleSelect(index) {
				this.activeIndex = index
				// 懒加载当前选中的业务板块文章
				this.loadActiveArticles()
			},
			getToken() {
				return uni.getStorageSync('token')
			},
			
			// 一键将所有免费（<=0）文章设为5积分
			async handleSetAllToFive() {
				const token = this.getToken()
				if (!token) {
					uni.showToast({ title: '请先登录', icon: 'none' })
					return
				}
				uni.showModal({
					title: '管理员验证',
					editable: true,
					placeholderText: '请输入管理员密码',
					success: async (res) => {
						if (!res.confirm) return
						if ((res.content || '') !== this.ADMIN_PASSWORD) {
							uni.showToast({ title: '密码错误', icon: 'none' })
							return
						}
						try {
							uni.showLoading({ title: '执行中...' })
							const updater = uniCloud.importObject('update-article-prices')
							const result = await updater.updateAllArticlePrices()
							uni.hideLoading()
							if (result && result.code === 0) {
								// 本地把已加载的所有文章的免费项改为5
								this.businessItems = this.businessItems.map(b => {
									if (Array.isArray(b.articles)) {
										b.articles = b.articles.map(a => ({
											...a,
											pricePoints: (a.pricePoints && a.pricePoints > 0) ? a.pricePoints : 5
										}))
									}
									return b
								})
								// 弹出逐条提示
								const details = (result.data && result.data.details) || []
								const lines = details.map(d => `《${d.title}》已变为 ${d.newPrice} 积分`)
								uni.showModal({ title: '批量设置完成', content: lines.join('\n') || '没有需要更新的文章', showCancel: false })
							} else {
								uni.showModal({ title: '操作失败', content: (result && result.message) || '未知错误', showCancel: false })
							}
						} catch (e) {
							uni.hideLoading()
							console.error('[business] 批量设置失败', e)
							uni.showModal({ title: '操作失败', content: e.message || '网络错误', showCancel: false })
						}
					}
				})
			},
			
			// 懒加载当前选中的业务板块下的文章
			async loadActiveArticles() {
				const current = this.activeItem
				if (!current || !current.hasArticles) return
				if (current.articles && current.articles.length) return

				const idx = this.businessItems.findIndex(item => item.id === current.id)
				if (idx === -1) return

				this.$set(this.businessItems[idx], 'articlesLoading', true)
				this.$set(this.businessItems[idx], 'articlesLoaded', false)
				this.$set(this.businessItems[idx], 'articlesError', '')

				const categoryId = this.articleCategories[current.id]
				if (!categoryId) {
					this.$set(this.businessItems[idx], 'articles', [])
					this.$set(this.businessItems[idx], 'articlesLoaded', true)
					this.$set(this.businessItems[idx], 'articlesLoading', false)
					return
				}

				try {
					const articleService = uniCloud.importObject('article-service')
					const token = uni.getStorageSync('token')
					const params = {
						category_id: categoryId,
						limit: 3
					}
					if (token) {
						params._token = token
					}
					this.isLoggedIn = !!token

					const result = await articleService.getHotArticles(params)
					console.log('[business] loadActiveArticles getHotArticles result', current.id, result)

					if (!result || result.code !== 0 || !result.data) {
						const errorMsg = (result && (result.message || result.msg)) || '加载失败'
						this.$set(this.businessItems[idx], 'articles', [])
						this.$set(this.businessItems[idx], 'articlesError', errorMsg)
						return
					}

					const rawList = Array.isArray(result.data.list)
						? result.data.list
						: Array.isArray(result.data)
							? result.data
							: []

					const mapped = rawList.map(a => ({
						id: a.id || a._id,
						title: a.title,
						summary: a.summary || a.desc || '',
						image: a.image || a.cover_image || a.cover || a.cover_url || a.thumb || '',
						pricePoints: typeof a.price_points === 'number' ? a.price_points : 5,
						unlocked: a.unlocked || false
					}))

					this.$set(this.businessItems[idx], 'articles', mapped)
					this.$set(this.businessItems[idx], 'articlesError', '')
				} catch (e) {
					console.error('[business] 加载当前板块文章失败', e)
					this.$set(this.businessItems[idx], 'articles', [])
					this.$set(this.businessItems[idx], 'articlesError', e.message || '加载失败')
				} finally {
					this.$set(this.businessItems[idx], 'articlesLoaded', true)
					this.$set(this.businessItems[idx], 'articlesLoading', false)
				}
			}
		},
		onLoad() {
			// 加载用户信息
			this.loadUserInfo()
		}
}
</script>

<style scoped>
.page-root {
	flex: 1;
	display: flex;
	flex-direction: row;
	justify-content: center;
	min-height: 100vh;
	background-color: #F3F0FF;
}

.app-container {
	flex: 1;
	width: 100%;
	max-width: 750rpx;
	background-color: #F3F0FF;
	box-shadow: 0 20rpx 60rpx rgba(15, 23, 42, 0.35);
	position: relative;
	display: flex;
	flex-direction: column;
}

.user-info-bar {
	display: flex;
	align-items: center;
	padding: 48rpx 32rpx 24rpx;
	background-color: #F3F0FF;
	border-bottom: 1rpx solid #e5e7eb;
	display: none; /* Hiding user info as requested */
}

	.user-avatar {
		width: 80rpx;
		height: 80rpx;
		border-radius: 40rpx;
		margin-right: 16rpx;
		background-color: #e5e7eb;
		display: none; /* Hidden requested by user */
	}

	.user-avatar-placeholder {
		width: 80rpx;
		height: 80rpx;
		border-radius: 40rpx;
		margin-right: 16rpx;
		background-color: #e5e7eb;
		display: flex;
		align-items: center;
		justify-content: center;
		display: none; /* Hidden requested by user */
	}

	.placeholder-text {
		font-size: 40rpx;
	}

	.user-info-text {
		display: flex;
		flex-direction: column;
		gap: 4rpx;
	}

	.user-nickname {
		font-size: 28rpx;
		font-weight: 600;
		color: #0f172a;
	}

	.user-uid {
		font-size: 22rpx;
		color: #64748b;
	}

	.app-main {
		flex: 1;
	}

	.section-list {
		padding: 24rpx 24rpx 200rpx;
		box-sizing: border-box;
	}

	/* --- 详情展示区样式 --- */
	.detail-section {
		margin-top: 12rpx; /* Reduced from 32rpx */
		min-height: 200rpx; /* 预留高度，避免闪烁 */
	}
.admin-actions {
	margin-top: 12rpx;
	margin-bottom: 12rpx;
	text-align: right;
}
.admin-btn {
	background-color: #f97316;
	color: #fff;
	font-size: 22rpx;
	padding: 12rpx 18rpx;
	border-radius: 12rpx;
	border: none;
}
.admin-btn::after { border: none; }

.loading-placeholder {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100vh;
	color: #999;
	font-size: 24rpx;
}
</style>
