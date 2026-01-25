<template>
	<view class="partners">
		<view class="partners-header">
			<text class="partners-title">新增校园合伙人</text>
			<view class="partners-count">
				<text class="partners-count-text">{{ memberCount }}</text>
			</view>
		</view>

		<scroll-view class="partners-scroll" scroll-x="true" show-scrollbar="false">
			<view class="partners-row">
				<view class="partner-item" @tap="showInviteQrcode">
					<view class="partner-add">
						<text class="partner-add-icon">＋</text>
					</view>
					<text class="partner-name">邀请</text>
				</view>

				<view v-for="item in list" :key="item.id" class="partner-item" @tap="openMemberPopup(item)">
                    <view style="position: relative;">
                        <image class="partner-avatar" :src="item.avatar" mode="aspectFill" />
                        <view class="status-badge">开单中</view>
                    </view>
					<text class="partner-name">{{ item.name }}</text>
				</view>
			</view>
		</scroll-view>

		<!-- 邀请二维码弹窗 (Big Code Style) -->
		<view class="qr-modal" :class="{ active: showQrcodeModal }" @tap="closeQrcodeModal" v-if="showQrcodeModal">
			<view class="qr-card-large" @tap.stop>
				<view class="close-qr" @tap="closeQrcodeModal">×</view>
				
				<view class="qr-modal-title">扫码加入团队</view>
				
				<view class="qr-image-placeholder">
					<image v-if="qrcodeUrl" :src="qrcodeUrl" mode="aspectFit" class="qr-image" />
					<view v-else class="loading-qr">
						<text>二维码生成中...</text>
					</view>
				</view>

				<button class="save-img-btn" @tap="savePoster">保存海报图片</button>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'NewPartners',
		components: {},
		data() {
			return {
				list: [],
				memberCount: '0',
				teamId: '',
				showMemberPopup: false,
				currentMember: {},
				showQrcodeModal: false,
				qrcodeUrl: ''
			}
		},
		async mounted() {
			// 1. 先从本地缓存读取，提升首屏速度
			this.loadFromCache()
			// 2. 再从服务端拉一次最新数据并更新缓存
			await this.loadTeamMembers()
		},
		methods: {
			loadFromCache() {
				try {
					const cached = uni.getStorageSync('dashboard_new_partners') || {}
					if (!cached || !Array.isArray(cached.list) || !cached.teamId) return

					this.teamId = cached.teamId
					this.list = cached.list
					this.memberCount = String(this.list.length)
				} catch (e) {
					console.error('[NewPartners] 读取缓存失败:', e)
				}
			},
			async loadTeamMembers() {
				try {
					const token = uni.getStorageSync('token')
					if (!token) {
						this.list = []
						this.memberCount = '0'
						return
					}

					// 先获取当前用户所在团队信息
					const teamService = uniCloud.importObject('team-service')
					const myTeamRes = await teamService.getMyTeam({ _token: token })

					if (!myTeamRes || myTeamRes.code !== 0 || !myTeamRes.data || !myTeamRes.data.team_id) {
						return
					}

					const teamId = myTeamRes.data.team_id
					this.teamId = teamId

					// 再根据团队ID获取团队成员列表
					const membersRes = await teamService.getTeamMembers({
						teamId,
						_token: token
					})

					if (!membersRes || membersRes.code !== 0 || !Array.isArray(membersRes.data)) {
						return
					}

					// 根据加入时间排序：新人在左边，旧人在右（join_team_date 越大越靠左）
					const sorted = membersRes.data.slice().sort((a, b) => {
						const aj = a.team_info && a.team_info.join_team_date ? a.team_info.join_team_date : 0
						const bj = b.team_info && b.team_info.join_team_date ? b.team_info.join_team_date : 0
						return bj - aj
					})

					this.list = sorted.map(item => ({
						id: item._id,
						name: item.nickname || item.username || '未命名',
						avatar: item.avatar || 'https://vkceyugu.cdn.bspapp.com/VKCEYUGU-uni-id-avatar/default-avatar.png'
					}))

					this.memberCount = String(this.list.length)

					// 写入本地缓存，方便下次首页秒开
					uni.setStorageSync('dashboard_new_partners', {
						teamId: this.teamId,
						list: this.list
					})
				} catch (e) {
					console.error('[NewPartners] 加载团队成员失败:', e)
				}
			},
			// 预留给后续 SSE / 轮询实时更新的入口
			applyIncrementalUpdate(newMemberList) {
				if (!Array.isArray(newMemberList)) return

				// 合并去重后重新排序
				const map = {}
				;[...this.list, ...newMemberList].forEach(item => {
					if (!item || !item.id) return
					map[item.id] = item
				})
				this.list = Object.values(map)
				this.memberCount = String(this.list.length)

				uni.setStorageSync('dashboard_new_partners', {
					teamId: this.teamId,
					list: this.list
				})
			},
            openMemberPopup(member) {
                // Navigate to subpackage page with member data
                uni.navigateTo({
                    url: `/pages/extra/team-member-detail?data=${encodeURIComponent(JSON.stringify(member))}`
                })
            },
			// 显示邀请二维码
			async showInviteQrcode() {
				const token = uni.getStorageSync('token')
				if (!token) {
					uni.showToast({ title: '请先登录', icon: 'none' })
					return
				}
				
				this.showQrcodeModal = true
				this.qrcodeUrl = ''
				
				try {
					const teamService = uniCloud.importObject('team-service')
					const result = await teamService.generateInviteQrcode({ _token: token })
					
					if (result.code === 0) {
						this.qrcodeUrl = result.data.qrcode_url
					} else {
						uni.showToast({
							title: result.message || '生成失败',
							icon: 'none'
						})
						this.showQrcodeModal = false
					}
				} catch (error) {
					console.error('生成二维码失败:', error)
					uni.showToast({ title: '生成失败', icon: 'none' })
					this.showQrcodeModal = false
				}
			},
			// 保存海报
			savePoster() {
				if (!this.qrcodeUrl) {
					uni.showToast({ title: '二维码未加载', icon: 'none' })
					return
				}
				
				uni.downloadFile({
					url: this.qrcodeUrl,
					success: (res) => {
						if (res.statusCode === 200) {
							uni.saveImageToPhotosAlbum({
								filePath: res.tempFilePath,
								success: () => {
									uni.showToast({ title: '保存成功', icon: 'success' })
								},
								fail: () => {
									uni.showToast({ title: '保存失败', icon: 'none' })
								}
							})
						}
					},
					fail: () => {
						uni.showToast({ title: '下载失败', icon: 'none' })
					}
				})
			},
			// 关闭二维码弹窗
			closeQrcodeModal() {
				this.showQrcodeModal = false
				this.qrcodeUrl = ''
			}
		}
	}
</script>

<style scoped>
	.partners {
		margin-bottom: 32rpx;
	}

	.partners-header {
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		display: flex;
		margin-bottom: 16rpx;
	}

	.partners-title {
		font-size: 28rpx;
		font-weight: bold;
		color: #1f2937;
	}

	.partners-count {
		padding: 4rpx 12rpx;
		border-radius: 999rpx;
		background-color: #e5e7eb;
	}

	.partners-count-text {
		font-size: 20rpx;
		color: #4b5563;
		font-weight: 600;
	}

	.partners-scroll {
		width: 100%;
	}

	.partners-row {
		flex-direction: row;
		align-items: center;
		display: flex;
	}

	.partner-item {
		align-items: center;
		margin-right: 24rpx;
		display: flex;
		flex-direction: column;
	}

	.partner-add {
		width: 80rpx;
		height: 80rpx;
		border-radius: 40rpx;
		border-width: 2rpx;
		border-color: #a5b4fc;
		border-style: dashed;
		align-items: center;
		justify-content: center;
		display: flex;
		background-color: #e0e7ff;
	}

	.partner-add-icon {
		font-size: 40rpx;
		color: #4f46e5;
	}

	.partner-avatar {
		width: 80rpx;
		height: 80rpx;
		border-radius: 40rpx;
		border-width: 2rpx;
		border-color: #ffffff;
		border-style: solid;
		background-color: #dbeafe;
		margin-bottom: 4rpx;
	}

	.partner-name {
		font-size: 20rpx;
		color: #6b7280;
		width: 130rpx;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

    .status-badge {
        position: absolute;
        bottom: 0; /* Align to bottom overlap */
        left: 50%;
        transform: translateX(-50%) translateY(20%); /* Center and push down slightly */
        background: linear-gradient(90deg, #F59E0B, #EA580C);
        color: white;
        font-size: 16rpx;
        padding: 2rpx 8rpx;
        border-radius: 99rpx;
        white-space: nowrap;
        border: 2rpx solid #ffffff;
        z-index: 10;
        font-weight: 600;
        box-shadow: 0 2rpx 4rpx rgba(234, 88, 12, 0.2);
    }

/* 二维码弹窗 (Big Code Style) */
.qr-modal {
	position: fixed;
	top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(0,0,0,0.4);
	backdrop-filter: blur(8rpx);
	z-index: 2000;
	display: flex;
	justify-content: center;
	align-items: center;
	opacity: 0;
	visibility: hidden;
	transition: all 0.3s;
}

.qr-modal.active {
	opacity: 1;
	visibility: visible;
}

.qr-card-large {
	width: 600rpx;
	background: white;
	border-radius: 48rpx;
	padding: 60rpx 40rpx;
	text-align: center;
	transform: scale(0.9);
	transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	position: relative;
}

.qr-modal.active .qr-card-large {
	transform: scale(1);
}

.qr-modal-title {
	font-size: 36rpx;
	font-weight: 800;
	color: #312E81;
	margin-bottom: 30rpx;
}

.qr-image-placeholder {
	width: 360rpx;
	height: 360rpx;
	background: #EEF2FF;
	margin: 0 auto 40rpx;
	border-radius: 24rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #4F46E5;
}

.qr-image {
	width: 100%;
	height: 100%;
}

.save-img-btn {
	background: linear-gradient(135deg, #6366f1, #4f46e5);
	color: white;
	border: none;
	padding: 24rpx 60rpx;
	border-radius: 999rpx;
	font-weight: 600;
	font-size: 28rpx;
	box-shadow: 0 8rpx 24rpx rgba(124, 58, 237, 0.3);
}

.close-qr {
	position: absolute;
	top: 30rpx; right: 30rpx;
	width: 60rpx; height: 60rpx;
	background: #F3F4F6;
	border-radius: 50%;
	display: flex; align-items: center; justify-content: center;
	color: #666;
	font-size: 40rpx;
}
</style>
