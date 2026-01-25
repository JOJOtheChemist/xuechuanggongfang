<script>
	export default {
		globalData: {
			isHandlingInvite: false,
			lastHandledScene: '' // 记录上次处理的 scene，防止重复触发
		},
		onLaunch(options) {
			console.log('App Launch', options)
			// 处理通过团队邀请二维码进入小程序的场景
			this.handleInviteScene(options)
		},
		onShow(options) {
			console.log('App Show', options)
			// 从后台切回前台时，也尝试处理一次（防止漏掉）
			this.handleInviteScene(options)
		},
		onHide() {
			console.log('App Hide')
			// 不要在 onHide 立即重置，因为 reLaunch 会触发 onHide -> onShow
			// 状态的管理交给 handleInviteScene 内部或延时处理
		},
		methods: {
			// 解析团队邀请二维码带来的 scene，并临时保存到本地，供登录后自动加入团队使用
			handleInviteScene(options) {
				if (!options) return
				let scene = ''
				if (options.query && options.query.scene) {
					scene = decodeURIComponent(options.query.scene)
					console.log('[App] 从 query.scene 获取到值:', scene)
				} else if (options.scene && typeof options.scene === 'string') {
					scene = decodeURIComponent(options.scene)
					console.log('[App] 从 options.scene 获取到值:', scene)
				} else if (options.path && options.path.indexOf('scene=') !== -1) {
					// 兜底方案：从 path 字符串中强行截取 scene
					const pathParts = options.path.split('scene=')
					if (pathParts.length > 1) {
						scene = decodeURIComponent(pathParts[1].split('&')[0])
						console.log('[App] 从 path 字符串中截获 scene:', scene)
					}
				}

				if (!scene) return

				console.log('[App] 检测到 scene:', scene)

				let inviterId = ''
				let handled = false
				let shouldJumpTeam = false

				// Team invite scene
				if (scene.indexOf('i=') === 0) {
					const uid = scene.substring(2)
					console.log('[App] 解析团队邀请 scene - 提取的 inviterId:', uid)
					if (uid) {
						const data = { inviter: uid, type: 'team_invite' }
						uni.setStorageSync('pending_team_invite', data)
						console.log('[App] 已保存待处理团队邀请:', JSON.stringify(data))
						inviterId = uid
						handled = true
						shouldJumpTeam = true
					} else {
						console.warn('[App] 邀请人ID为空')
					}
				} else if (scene.indexOf('tid=') !== -1) {
					const parts = scene.split('&')
					const data = { type: 'team_invite' }
					parts.forEach(p => {
						const kv = p.split('=')
						if (kv.length === 2) {
							data[kv[0]] = kv[1]
						}
					})
					if (data.inviter) {
						inviterId = data.inviter
					}
					uni.setStorageSync('pending_team_invite', data)
					console.log('[App] 已保存旧格式团队邀请:', data)
					handled = true
					shouldJumpTeam = true
				}

				// Business invite scene b=xx,i=uid
				if (scene.indexOf('b=') !== -1) {
					const bizData = {}
					scene.split(',').forEach(part => {
						const kv = part.split('=')
						if (kv.length === 2) {
							const [key, value] = kv
							if (key === 'b') bizData.businessId = value
							if (key === 'i') {
								bizData.inviter = value
								if (!inviterId) inviterId = value
							}
						}
					})
					if (bizData.inviter) {
						bizData.type = 'business_invite'
						uni.setStorageSync('pending_business_invite', bizData)
						console.log('[App] 已保存业务邀请:', bizData)
						handled = true
					}
				}
				
				// [NEW] 检测短邀请码格式 c=XXXXXX
				if (scene.indexOf('c=') !== -1) {
					console.log('[App] 检测到短邀请码格式, 标记为有效邀请')
					handled = true
					// 短码需要异步解析，此处不仅行解析，直接放行跳转到 invite-handler 处理
				}

				console.log('[App] scene 解析结果 - inviterId:', inviterId, 'handled:', handled, 'shouldJumpTeam:', shouldJumpTeam)
				
				if (!handled) {
					console.log('[App] scene 未被识别，解析失败，scene 内容:', scene)
					return
				}

				// 防止重复跳转 (加上 scene 内容校验，彻底杜绝 reLaunch 导致的 onShow 循环)
				if (this.globalData.isHandlingInvite && this.globalData.lastHandledScene === scene) {
					console.log('[App] 正在处理中且 Scene 相同，跳过本次跳转请求')
					return
				}
				
				this.globalData.isHandlingInvite = true
				this.globalData.lastHandledScene = scene
				
				// 发现邀请码，立即跳转到专用处理页
			console.log('[App] 发现有效邀请，强制跳转至中转页 [invite-handler]')
			// 稍微延迟 300ms 执行跳转，给 App 生命周期一个更长的稳定期
			setTimeout(() => {
				// [双重保险] 同时传递 scene 和 inviterId 参数
				let handlerUrl = `/pages/extra/invite-handler?scene=${encodeURIComponent(scene)}`
				if (inviterId) {
					handlerUrl += `&inviter_id=${inviterId}`
				}
				uni.reLaunch({
					url: handlerUrl,
					success: () => {
						console.log('[App] 成功跳转至 invite-handler, inviterId:', inviterId)
					},
					fail: (err) => {
						console.error('[App] 跳转 invite-handler 失败:', err)
						// 只有在失败时，且过了较长时间才允许重试，防止暴力循环
						setTimeout(() => {
							this.globalData.isHandlingInvite = false
						}, 2000)
					}
				})
			}, 300)
			}
		}
	}
</script>

<style>
	/*每个页面公共css */
	page {
		background-color: #F3F0FF;
	}
</style>
