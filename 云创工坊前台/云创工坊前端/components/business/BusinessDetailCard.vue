<template>
	<view class="business-card-wrapper">
		<view v-if="item" class="detail-card">
			<view class="detail-decor" />
			<view class="detail-content">
				<view class="detail-main">
					<business-detail-info 
						:item="item" 
						:tag="tag"
						@view-detail="handleViewDetail"
						@qr-tap="handleQrTap"
					/>
					<business-detail-qr 
						ref="qrComp"
						:item="item"
						@show-modal="openQrcodeModal"
					/>
				</view>

				<!-- 文章列表：当前业务板块下的热门文章 -->
				<view v-if="item.hasArticles">
					<article-list 
						:articles="item.articles || []" 
						:category-id="categoryId"
						:is-logged-in="isLoggedIn"
						:loaded="!!item.articlesLoaded"
					/>
					<view class="view-all-wrap">
						<button class="view-all-btn" @tap="handleShowAll">查看全部文章</button>
					</view>
				</view>
			</view>
		</view>

		<!-- 二维码放大弹窗：放在外面避免被 card 的 overflow:hidden 遮挡 -->
		<view v-if="showQrcodeModal" class="qr-modal" :class="{ active: showQrcodeModal }" @tap="closeQrcodeModal">
			<view class="qr-card-large" @tap.stop="">
				<view class="close-qr" @tap="closeQrcodeModal">×</view>
				<view class="qr-modal-title">扫码邀请新用户</view>
				<view class="qr-image-placeholder">
					<image v-if="qrModalUrl" class="qr-image-large" :src="qrModalUrl" mode="aspectFit" />
					<view v-else class="loading-qr">
						<text>二维码加载中...</text>
					</view>
				</view>
				<button class="save-img-btn" @tap="saveQrcode">保存二维码图片</button>
			</view>
		</view>
	</view>
</template>

<script>
	import ArticleList from '@/components/business/ArticleList.vue'
	import BusinessDetailInfo from '@/components/business/BusinessDetailInfo.vue'
	import BusinessDetailQr from '@/components/business/BusinessDetailQr.vue'
	
	export default {
		name: 'BusinessDetailCard',
		components: {
			ArticleList,
			BusinessDetailInfo,
			BusinessDetailQr
		},
		props: {
			item: {
				type: Object,
				default: null
			},
			tag: {
				type: String,
				default: ''
			},
			categoryId: {
				type: String,
				default: ''
			},
			isLoggedIn: {
				type: Boolean,
				default: false
			}
		},
		data() {
			return {
				// 简单的管理员密码（与文章组件保持一致）
				ADMIN_PASSWORD: 'hyy199877',
				showQrcodeModal: false,
				qrModalUrl: ''
			}
		},
		methods: {
			handleShowAll() {
				this.$emit('show-all', { 
					categoryId: this.categoryId,
					title: this.item ? this.item.title : ''
				})
			},
			handleViewDetail() {
				if (!this.item || !this.item.id) {
					uni.showToast({ title: '请先选择业务板块', icon: 'none' })
					return
				}
				
				// 先检查是否已登录
				const token = uni.getStorageSync('token')
				if (!token) {
					uni.showToast({ title: '请先登录', icon: 'none' })
					setTimeout(() => {
						uni.reLaunch({ url: '/pages/auth/login/index' })
					}, 800)
					return
				}

				// [NEW] 如果是新人分享板块 (id: 12)，则不跳转报名页，改为跳转简介页
				if (String(this.item.id) === '12') {
					uni.navigateTo({
						url: '/pages/extra/functions'
					})
					return
				}

				const category = encodeURIComponent(this.item.title || '')
				const userInfo = uni.getStorageSync('userInfo') || {}
				const inviterId = encodeURIComponent(uni.getStorageSync('userId') || '')
				const inviterName = encodeURIComponent(userInfo.nickname || userInfo.username || '')
				// 传递 type 参数供报名页判断展示哪些字段
				const type = this.item.type || 'signup'
				uni.navigateTo({
					url: `/pages/extra/signup/index?id=${this.item.id}&category=${category}&referrer=${inviterId}&referrerName=${inviterName}&type=${type}`
				})
			},
			handleQrTap() {
				if (this.$refs.qrComp) {
					this.$refs.qrComp.handleQrTap()
				}
			},
			openQrcodeModal(url) {
				this.qrModalUrl = url
				this.showQrcodeModal = true
			},
			closeQrcodeModal() {
				this.showQrcodeModal = false
			},
			saveQrcode() {
				if (!this.qrModalUrl) return
				uni.showLoading({ title: '正在保存...' })
				uni.downloadFile({
					url: this.qrModalUrl,
					success: (res) => {
						if (res.statusCode === 200) {
							uni.saveImageToPhotosAlbum({
								filePath: res.tempFilePath,
								success: () => {
									uni.hideLoading()
									uni.showToast({ title: '保存成功', icon: 'success' })
								},
								fail: (err) => {
									uni.hideLoading()
									console.error('保存失败', err)
									uni.showToast({ title: '保存失败', icon: 'none' })
								}
							})
						}
					},
					fail: (err) => {
						uni.hideLoading()
						uni.showToast({ title: '下载失败', icon: 'none' })
					}
				})
			},
			// 一键将所有文章设置为 5 积分（把免费文章改为 5）
			async handleSetAllToFive() {
				const token = uni.getStorageSync('token')
				if (!token) {
					uni.showToast({ title: '请先登录', icon: 'none' })
					return
				}
				// 管理员简单校验
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
								const details = (result.data && result.data.details) || []
								const lines = details.map(d => `《${d.title}》已变为 ${d.newPrice} 积分`)
								const content = lines.length ? lines.join('\n') : '没有发现需要更新为 5 积分的文章'
								if (this.item && Array.isArray(this.item.articles)) {
									this.item.articles = this.item.articles.map(a => ({
										...a,
										pricePoints: (a.pricePoints && a.pricePoints > 0) ? a.pricePoints : 5
									}))
								}
								uni.showModal({ title: '批量设置完成', content, showCancel: false })
							} else {
								uni.showModal({ title: '操作失败', content: (result && result.message) || '未知错误', showCancel: false })
							}
						} catch (e) {
							uni.hideLoading()
							console.error('[BusinessDetailCard] 批量设置失败', e)
							uni.showModal({ title: '操作失败', content: e.message || '网络错误', showCancel: false })
						}
					}
				})
			}
		}
	}
</script>

<style scoped>
	.business-card-wrapper {
		width: 100%;
		position: relative;
	}

	.detail-card {
		background-color: #ffffff;
		border-radius: 32rpx;
		padding: 32rpx 28rpx;
		margin: 0 20rpx;
		box-shadow: 0 16rpx 40rpx rgba(15, 23, 42, 0.16);
		border: 2rpx solid #e5e7eb;
		position: relative;
		overflow: hidden;
	}

	.detail-decor {
		position: absolute;
		right: -120rpx;
		top: -120rpx;
		width: 260rpx;
		height: 260rpx;
		border-radius: 130rpx;
		background-image: linear-gradient(135deg, #e0e7ff, #ffffff);
		opacity: 0.8;
	}

	.detail-content {
		position: relative;
		z-index: 1;
	}

	.detail-main {
		display: flex;
		flex-direction: row;
		gap: 24rpx;
		margin-top: 12rpx;
	}

	.view-all-wrap {
		margin-top: 12rpx;
		margin-bottom: 40rpx;
	}

	.view-all-btn {
		width: 100%;
		background: #4f46e5;
		color: #fff;
		border-radius: 12rpx;
		padding: 16rpx 0;
		font-size: 26rpx;
	}

	/* 弹窗样式 */
	.qr-modal {
		position: fixed;
		top: 0; left: 0; right: 0; bottom: 0;
		background: rgba(0,0,0,0.4);
		backdrop-filter: blur(8rpx);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
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
	.qr-modal-title {
		text-align: center;
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
	}
	.qr-image-large {
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
		line-height: 1;
	}
</style>
