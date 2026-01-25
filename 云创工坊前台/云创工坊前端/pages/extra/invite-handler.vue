<template>
	<view class="handler-container">
		<view class="loading-box">
			<view class="spinner"></view>
			<text class="loading-text">正在处理邀请...</text>
		</view>
		<!-- Unified Debug Footer -->
		<!-- Hidden recruitment debug tags
		<view class="global-debug" style="margin-top: 40rpx; padding-bottom: 60rpx; font-size: 20rpx; color: #ccc; text-align: center; display: flex; flex-direction: column; gap: 6rpx;">
			<text>UID: {{ global_uid || '未登录' }}</text>
			<text>终身: {{ global_lifetime_inviter }}</text>
			<text>团队: {{ global_team_inviter }}</text>
			<text>业务: {{ global_business_inviter }}</text>
		</view>
		-->
	</view>
</template>

<script>
	export default {
		data() {
			return {
				scene: '',
				inviterId: '',
				businessId: '',
				isTeamInvite: false,
				isHandling: false
			}
		},
		onLoad(options) {
			console.log('[InviteHandler] 页面加载, 原始参数 options:', JSON.stringify(options))
			
			// 1. 优先解析 scene (包含业务ID等核心信息)
			if (options.scene) {
				const decodedScene = decodeURIComponent(options.scene)
				console.log('[InviteHandler] 收到 scene 参数, 开始解析:', decodedScene)
				this.scene = decodedScene
				this.parseScene(this.scene)
				return 
			}
			
			// 2. 兜底: 从URL参数直接获取 (通常是测试或特定跳转)
			if (options.inviter_id) {
				console.log('[InviteHandler] 未发现 scene, 从URL参数直接获取 inviter_id:', options.inviter_id)
				this.inviterId = options.inviter_id
				this.isTeamInvite = options.type !== 'business'
				
				// 立即存储到缓存(双重保险)
				uni.setStorageSync('pending_team_invite', {
					inviter: options.inviter_id,
					type: this.isTeamInvite ? 'team_invite' : 'business_invite',
					timestamp: Date.now(),
					source: 'url_param_direct'
				})
				
				this.processInvite()
				return
			}
			
			// 3. 兜底: 延时跳转首页
			console.log('[InviteHandler] 无有效邀请参数，跳转首页')
			setTimeout(() => {
				uni.switchTab({ url: '/pages/dashboard/index' })
			}, 1000)
		},
		methods: {
			async parseScene(scene) {
				console.log('[InviteHandler] 开始解析 scene:', scene)
				
				try {
					let tempInviterId = ''
					// 0. 优先检测短邀请码 c=XXXXXX
					if (scene.indexOf('c=') !== -1) {
						let inviteCode = ''
						if (scene.indexOf(',') !== -1) {
							// 组合格式 b=1,c=XYZ
							scene.split(',').forEach(part => {
								const kv = part.split('=')
								if (kv.length === 2 && kv[0] === 'c') inviteCode = kv[1]
								if (kv.length === 2 && kv[0] === 'b') this.businessId = kv[1]
							})
						} else if (scene.indexOf('c=') === 0) {
							// 纯短码格式 c=XYZ
							inviteCode = scene.substring(2)
							this.isTeamInvite = true // 默认无业务ID即为团队邀请
						}

						if (inviteCode) {
							console.log('[InviteHandler] 识别到短邀请码:', inviteCode)
							uni.showLoading({ title: '解析邀请中...' })
							const service = uniCloud.importObject('business-service')
							const res = await service.resolveInviteCode(inviteCode)
							uni.hideLoading()
							
							if (res && res.code === 0 && res.data) {
								console.log('[InviteHandler] 短码解析成功, 真实UID:', res.data.inviter_id)
								this.inviterId = res.data.inviter_id
								this.processInvite()
								return // 解析成功直接进入流程
							} else {
								throw new Error('短码解析无效')
							}
						}
					}
					
					// 1. 团队邀请 i=uid (旧版兼容)
					if (scene.indexOf('i=') === 0 && scene.indexOf('b=') === -1) {
						this.inviterId = scene.substring(2)
						this.isTeamInvite = true
					} 
					// 2. 业务邀请 b=xx,i=uid (旧版兼容)
					else if (scene.indexOf('b=') !== -1 && scene.indexOf('i=') !== -1) {
						scene.split(',').forEach(part => {
							const kv = part.split('=')
							if (kv.length === 2) {
								if (kv[0] === 'b') this.businessId = kv[1]
								if (kv[0] === 'i') this.inviterId = kv[1]
							}
						})
						this.isTeamInvite = false
					}
					// 3. 旧格式 tid=xxx
					else if (scene.indexOf('tid=') !== -1) {
						this.isTeamInvite = true
						const parts = scene.split('&')
						parts.forEach(p => {
							const kv = p.split('=')
							if (kv[0] === 'inviter') this.inviterId = kv[1]
						})
					}
	
					if (this.inviterId) {
						// [双重保险] 解析成功后立即存储到缓存
						uni.setStorageSync('pending_team_invite', {
							inviter: this.inviterId,
							type: this.isTeamInvite ? 'team_invite' : 'business_invite',
							timestamp: Date.now(),
							source: 'scene_parsed'
						})
						console.log('[InviteHandler] scene解析成功，已存储到缓存, inviterId:', this.inviterId)
						
						this.processInvite()
					} else {
						throw new Error('未识别到有效邀请ID')
					}
				} catch (e) {
					console.error('[InviteHandler] 解析失败或异常:', e)
					this.handleParseError(scene) // 统一错误处理
				}
			},
			
			handleParseError(scene) {
				// [DEBUG] 解析失败时给予明确反馈，不再默默跳转
				uni.showModal({
					title: '邀请码解析异常',
					content: `原始Scene: ${scene}\n请截图反馈给客服`,
					showCancel: true,
					cancelText: '返回首页',
					confirmText: '手动输入',
					success: (res) => {
						if (res.confirm) {
							uni.showModal({
								title: '调试模式',
								editable: true,
								placeholderText: '请输入 i=uid 格式',
								success: (inputRes) => {
									if (inputRes.confirm && inputRes.content) {
										this.parseScene(inputRes.content)
									} else {
										uni.switchTab({ url: '/pages/dashboard/index' })
									}
								}
							})
						} else {
							uni.switchTab({ url: '/pages/dashboard/index' })
						}
					}
				})
			},

			processInvite() {
				if (this.isHandling) return
				this.isHandling = true

				console.log('[InviteHandler] 准备显示弹窗 - inviterId:', this.inviterId)

				uni.showModal({
					title: '发现邀请',
					content: `检测到来自用户[${this.inviterId.substr(-6)}]的${this.isTeamInvite ? '团队' : '业务'}邀请，是否立即查看？`,
					confirmText: '立即查看',
					cancelText: '取消',
					success: (res) => {
						if (res.confirm) {
							this.executeNavigation()
						}
					}
				})
			},

			async executeNavigation() {
				const token = uni.getStorageSync('token')

				// [双重保险] 确保缓存存储(带时间戳)
				uni.setStorageSync('pending_inviter_id', this.inviterId)
				if (this.isTeamInvite) {
					uni.setStorageSync('pending_team_invite', {
						inviter: this.inviterId,
						type: 'team_invite',
						timestamp: Date.now(),
						source: 'execute_navigation'
					})
					console.log('[InviteHandler] 团队邀请缓存已更新')
				} else if (this.businessId) {
					uni.setStorageSync('pending_business_invite', {
						inviter: this.inviterId,
						businessId: this.businessId,
						type: 'business_invite',
						timestamp: Date.now(),
						source: 'execute_navigation'
					})
					console.log('[InviteHandler] 业务邀请缓存已更新')
				}

				if (token) {
					console.log('[InviteHandler] 检测到 Token, 开启【即时补录】并跳转目标页')
					
					// [NEW] 立即补录绑定，确保只要扫了码，即便不填表也能记录拉新
					try {
						const userCenter = uniCloud.importObject('user-center')
						// 这里用 await 确保后端记录成功，或者不带 await 追求极致跳转速度（建议带，防止跳转太快导致请求取消）
						await userCenter.bindInviter({ 							_token: token,  // [FIX] 添加 token 参数
							inviterId: this.inviterId 
						})
						console.log('[InviteHandler] 即时补录指令已发出')
					} catch (bindErr) {
						console.error('[InviteHandler] 即时补录失败:', bindErr)
					}

					if (this.isTeamInvite) {
						console.log('[InviteHandler] 跳转团队页 url: /pages/extra/join-team-confirm?inviter_id=' + this.inviterId)
						setTimeout(() => {
							uni.redirectTo({
								url: `/pages/extra/join-team-confirm?inviter_id=${this.inviterId}`,
								fail: (err) => console.error('[InviteHandler] redirectTo 团队页失败:', err)
							})
						}, 150)
					} else {
						// [NEW] 新人板块 (id: 12) 不跳转问卷，改为导向“简介/功能”介绍页
						if (String(this.businessId) === '12') {
							console.log('[InviteHandler] 检测到新人板块(12)，跳转简介页')
							setTimeout(() => {
								uni.redirectTo({
									url: '/pages/extra/functions',
									fail: (err) => console.error('[InviteHandler] redirectTo 简介页失败:', err)
								})
							}, 150)
							return
						}

						console.log('[InviteHandler] 跳转业务页 url: /pages/extra/signup/index?id=' + this.businessId)
						setTimeout(() => {
							uni.redirectTo({
								url: `/pages/extra/signup/index?id=${this.businessId}&inviter_id=${this.inviterId}`,
								fail: (err) => console.error('[InviteHandler] redirectTo 业务页失败:', err)
							})
						}, 150)
					}
				} else {
					console.log('[InviteHandler] 未检测到 Token, 跳转登录页接力')
					let loginUrl = `/pages/auth/login/index?inviter_id=${this.inviterId}`
					if (this.isTeamInvite) {
						loginUrl += '&type=team'
					} else {
						loginUrl += `&type=business&scene=${encodeURIComponent(this.scene)}`
					}
					
					console.log('[InviteHandler] 登录页 URL:', loginUrl)
					
					// 增加一个小延时，确保 App.vue 的初始 reLaunch 已经完全沉淀
					setTimeout(() => {
						uni.redirectTo({
							url: loginUrl,
							success: () => console.log('[InviteHandler] 成功跳转至登录页'),
							fail: (err) => console.error('[InviteHandler] redirectTo 登录页失败:', err)
						})
					}, 150)
				}
			}
		},
	}
</script>

<style scoped>
	.handler-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		background-color: #F3F0FF;
	}

	.loading-box {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.spinner {
		width: 80rpx;
		height: 80rpx;
		border: 8rpx solid #E9D5FF;
		border-top: 8rpx solid #7C3AED;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 30rpx;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.loading-text {
		color: #7C3AED;
		font-size: 28rpx;
		font-weight: 500;
	}
</style>
