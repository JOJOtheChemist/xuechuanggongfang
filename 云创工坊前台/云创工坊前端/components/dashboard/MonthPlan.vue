<template>
	<view class="plan-todo-card">
		<!-- 1. 头部标题 -->
		<view class="card-header">
			<view class="header-title">
				<!-- <svg class="header-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg> -->
				<text class="header-icon">🚩</text>
				<text>本月重点计划</text>
			</view>
			<view class="header-date">{{ currentMonth }}月</view>
		</view>

		<!-- 2. 计划列表 -->
		<view class="todo-list">
			<view
				v-for="(item, index) in plans"
				:key="index"
				class="todo-item"
				:class="{ checked: item.completed }"
				@click="toggleTodo(index)"
			>
				<!-- 左侧：业务图标圆底 -->
				<view class="item-icon-box" :class="item.themeClass">
					<!-- 使用 v-html 或条件渲染 SVG，由于 uni-app 对 v-html 支持有限且 svg 复杂，这里简化处理，或者使用 image/iconfont。
						 为了保持原样，这里尽量还原 SVG 结构，但 uni-app view 中直接写 svg 标签可能需要注意兼容性。
						 推荐方案：如果是在小程序环境，建议用 image 或 iconfont。
						 这里尝试直接嵌入 svg 代码（H5/App/部分小程序支持），为了稳妥，我把 SVG 路径作为数据渲染或者硬编码结构。
					-->
					<!-- 这里为了还原度，针对每个 item 硬编码 SVG 是最直接的，或者把 svg path 放在数据里 -->
					<!-- 动态图标 -->
					<image 
						v-if="item.iconUri" 
						:src="item.iconUri" 
						class="item-icon-svg" 
						mode="aspectFit"
					/>
					<text v-else style="font-size: 28rpx; font-weight: bold;">{{ item.title.charAt(0) }}</text>
				</view>

				<!-- 中间：文字信息 -->
				<view class="item-content">
					<text class="item-title">{{ item.title }}</text>
					<view class="target-pill">
						<text>目标</text>
						<text class="target-num">{{ item.target }}</text>
						<text>{{ item.unit }}</text>
					</view>
				</view>

				<!-- 右侧：复选框 -->
				<view class="checkbox">
					<!-- 使用 uni-icons 或者 svg -->
					<svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'MonthPlan',
		data() {
			return {
				currentMonth: 12,
				plans: [],
				// Copied from QuickNav.vue to reuse icons
				menuItems: [
			        {
			          "title": "考公",
			          "subTitle": "公考培优",
			          "theme": "theme-red",
			          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11m16-11v11M8 14v3m4-3v3m4-3v3"/></svg>`
			        },
			        {
			          "title": "考编",
			          "subTitle": "考编特训",
			          "theme": "theme-orange",
			          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`
			        },
			        {
			          "title": "考研",
			          "subTitle": "考研菁英",
			          "theme": "theme-purple",
			          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`
			        },
			        {
			          "title": "就业",
			          "subTitle": "定向就业",
			          "theme": "theme-blue",
			          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`
			        },
			        {
			          "title": "教资",
			          "subTitle": "教师资格证",
			          "theme": "theme-orange",
			          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`
			        },
			        {
			          "title": "升学",
			          "subTitle": "升学规划",
			          "theme": "theme-cyan",
			          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`
			        },
			        {
			          "title": "四六级",
			          "subTitle": "英语四六级",
			          "theme": "theme-purple",
			          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"></path></svg>`
			        },
			        {
			          "title": "专升本",
			          "subTitle": "专升本",
			          "theme": "theme-cyan",
			          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>`
			        },
			        {
			          "title": "计算机",
			          "subTitle": "计算机二级",
			          "theme": "theme-blue",
			          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`
			        },
			        {
			          "title": "驾校",
			          "subTitle": "驾校报名",
			          "theme": "theme-green",
			          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`
			        },
			        {
			          "title": "勤工",
			          "subTitle": "勤工俭学",
			          "theme": "theme-green",
			          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.7-3.7a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0l-3.7 3.7z"></path><path d="M11 7L2 16l1 1 5 5 9-9"></path><line x1="18" y1="2" x2="22" y2="6"></line><line x1="15" y1="10" x2="18" y2="13"></line></svg>`
			        },
			        {
			          "title": "棉被",
			          "subTitle": "新生棉被",
			          "theme": "theme-pink",
			          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v9"></path></svg>`
			        },
			        {
			          "title": "考证",
			          "subTitle": "应急人社考证",
			          "theme": "theme-purple",
			          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="12" cy="10" r="2"></circle><path d="M8 16v-1a4 4 0 0 1 8 0v1"></path></svg>`
			        },
			        {
			          "title": "动态",
			          "subTitle": "相关动态",
			          "theme": "theme-orange",
			          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8"></path><path d="M15 18h-5"></path><path d="M10 6h8v4h-8V6Z"></path></svg>`
			        },
			        {
			          "title": "新人",
			          "subTitle": "分享赚积分",
			          "theme": "theme-red",
			          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-7 24 24 0 0 1 7 7c0 2-3 3-3 3"></path><polyline points="15 12 12 15 9 12"></polyline></svg>`
			        }
			      ]
			}
		},
		mounted() {
			this.processSvgs() // Pre-process icons
			const now = new Date()
			this.currentMonth = now.getMonth() + 1
			this.loadGoals()
		},
		methods: {
		    processSvgs() {
		      const themeColors = {
		        'theme-red': '#EF4444',
		        'theme-purple': '#8B5CF6',
		        'theme-blue': '#3B82F6',
		        'theme-green': '#10B981',
		        'theme-orange': '#F97316',
		        'theme-pink': '#EC4899',
		        'theme-cyan': '#06B6D4'
		      };
		
		      this.menuItems = this.menuItems.map(item => {
		        const color = themeColors[item.theme] || '#333333';
		        let svg = item.svg;
		        svg = svg.replace('<svg', `<svg stroke="${color}" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`);
		        const encoded = encodeURIComponent(svg);
		        const dataUri = `data:image/svg+xml;charset=utf-8,${encoded}`;
		        return {
		          ...item,
		          svgDataUri: dataUri
		        };
		      });
		    },
			async loadGoals() {
				const token = uni.getStorageSync('token')
				if (!token) {
					this.plans = []
					return
				}

				try {
					const goalService = uniCloud.importObject('goal-service')
					const year = new Date().getFullYear()
					
					const res = await goalService.getMonthGoals({
						_token: token,
						year,
						month: this.currentMonth
					})

					if (res.code === 0 && res.data && res.data.goals) {
						// Filter goals that have a target set (> 0)
						const validGoals = res.data.goals.filter(g => Number(g.target_value) > 0)
						
						// Take top 3
						this.plans = validGoals.slice(0, 3).map((item, index) => {
							const target = Number(item.target_value)
							const completedCount = Number(item.completed_value) || 0
							const isCompleted = completedCount >= target

							// Find matching icon from menuItems
							const matchedIcon = this.menuItems.find(m => 
								m.title === item.title || 
								(item.title && item.title.includes(m.title))
							)

							// Fallback if no match
							// Rotate themes
							const themes = ['theme-green', 'theme-purple', 'theme-red']
							const defaultTheme = themes[index % themes.length]
							
							const themeClass = matchedIcon ? matchedIcon.theme : defaultTheme
							const iconUri = matchedIcon ? matchedIcon.svgDataUri : ''
							
							// Simple heuristic for unit
							const unit = (item.title && (item.title.includes('人') || item.title.includes('拉新'))) ? '人' : '单'

							return {
								title: item.title,
								target: target,
								unit: unit,
								themeClass: themeClass,
								iconUri: iconUri, // Valid data URI for image src
								completed: isCompleted
							}
						})
					}
				} catch (e) {
					console.error('[MonthPlan] 获取目标失败:', e)
				}
			},
			toggleTodo(index) {
				// Optional: View details or interact? For now, read-only status toggle is weird if driven by real data.
				// But user might want to manually check it off? 
				// The prompt says "Load real goals". Real goals are driven by data.
				// So clicking shouldn't probably toggle completion unless we update server.
				// For now, I'll disable manual toggle to avoid confusion with real data state.
				// this.plans[index].completed = !this.plans[index].completed;
			}
		}
	}
</script>

<style scoped>
	/* --- 组件容器 --- */
	.plan-todo-card {
		background: #ffffff;
		width: 100%;
		/* max-width: 360px; 在大屏下不要限制过死，保持 full width */
		border-radius: 24rpx;
		padding: 30rpx; /* 20px -> 30rpx approx or keep consistent with other cards */
		padding: 24rpx; /* adjusted to match other cards usually */
		box-shadow: 0 10rpx 30rpx rgba(139, 92, 246, 0.08);
		display: flex;
		flex-direction: column;
		gap: 16rpx;
		margin-bottom: 24rpx;
		box-sizing: border-box;
	}

	/* 1. 头部标题 */
	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-left: 8rpx;
	}

	.header-title {
		font-size: 32rpx; /* 16px */
		font-weight: 800;
		color: #1F2937;
		display: flex; align-items: center; gap: 12rpx;
	}
	
	.header-icon {
		font-size: 32rpx;
	}

	.header-date {
		font-size: 24rpx; /* 12px */
		color: #9CA3AF;
		background: #F3F4F6;
		padding: 8rpx 16rpx; /* 4px 8px */
		border-radius: 12rpx; /* 6px */
		font-weight: 500;
	}

	/* 2. 计划列表 */
	.todo-list {
		display: flex;
		flex-direction: column;
		gap: 20rpx; /* 10px */
	}

	/* 单个计划项 */
	.todo-item {
		display: flex;
		align-items: center;
		padding: 24rpx; /* 12px */
		background: #FAFAFA;
		border: 2rpx solid transparent; /* 1px */
		border-radius: 32rpx; /* 16px */
		/* cursor: pointer; mobile doesn't need cursor */
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		position: relative;
		overflow: hidden;
	}

	.todo-item:active {
		transform: scale(0.98);
		background: #F3F0FF;
	}

	/* 左侧：业务图标圆底 */
	.item-icon-box {
		width: 72rpx; /* 36px */
		height: 72rpx; /* 36px */
		border-radius: 20rpx; /* 10px */
		display: flex; align-items: center; justify-content: center;
		flex-shrink: 0;
		margin-right: 24rpx; /* 12px */
		transition: all 0.3s;
	}

	.item-icon-svg {
		width: 36rpx;
		height: 36rpx;
	}
	
	/* 颜色主题 - Copied from QuickNav to match */
	.theme-red { background: #FEF2F2; color: #EF4444; }
	.theme-purple { background: #F3F0FF; color: #8B5CF6; }
	.theme-blue { background: #EFF6FF; color: #3B82F6; }
	.theme-green { background: #ECFDF5; color: #10B981; }
	.theme-orange { background: #FFF7ED; color: #F97316; }
	.theme-pink { background: #FDF2F8; color: #EC4899; }
	.theme-cyan { background: #ECFEFF; color: #06B6D4; }

	/* 中间：文字信息 */
	.item-content { flex-grow: 1; display: flex; flex-direction: column; gap: 6rpx; /* 3px */ }
	
	.item-title { font-size: 28rpx; /* 14px */ font-weight: 700; color: #374151; transition: color 0.3s; }
	
	/* 目标胶囊 */
	.target-pill {
		font-size: 22rpx; /* 11px */
		color: #6B7280;
		display: flex; align-items: center; gap: 8rpx;
	}
	.target-num { color: #7C3AED; font-weight: 700; }

	/* 右侧：复选框 */
	.checkbox {
		width: 44rpx; /* 22px */
		height: 44rpx; /* 22px */
		border-radius: 50%;
		border: 4rpx solid #D1D5DB; /* 2px */
		display: flex; align-items: center; justify-content: center;
		flex-shrink: 0;
		transition: all 0.3s;
		background: white;
	}

	.check-icon { 
		width: 28rpx; /* 14px */
		height: 28rpx; /* 14px */
		color: white; 
		opacity: 0; transform: scale(0.5); 
		transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); 
	}

	/* --- 已完成状态 (Checked) --- */
	.todo-item.checked {
		background: #F9FAFB; /* 变灰 */
		opacity: 0.8;
	}

	/* 图标变灰 */
	.todo-item.checked .item-icon-box {
		background: #E5E7EB; color: #9CA3AF;
		filter: grayscale(100%);
	}

	/* 文字删除线 */
	.todo-item.checked .item-title {
		color: #9CA3AF;
		text-decoration: line-through;
	}
	.todo-item.checked .target-pill { opacity: 0.6; }

	/* 复选框变绿 */
	.todo-item.checked .checkbox {
		background: #10B981;
		border-color: #10B981;
	}
	.todo-item.checked .check-icon {
		opacity: 1; transform: scale(1);
	}
</style>
