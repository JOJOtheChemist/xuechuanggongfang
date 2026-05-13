<template>
  <view class="page-container">
    <view class="card">
      <view class="title">我的提现收款码</view>
      <view class="subtitle">上传微信或支付宝收款码，方便管理员打款</view>
      
      <view class="qr-box" @tap="uploadQrcode">
        <image v-if="paymentQrcode" :src="paymentQrcode" mode="widthFix" class="qr-img" />
        <view v-else class="placeholder">
          <text class="plus">+</text>
          <text class="tip">点击上传</text>
        </view>
      </view>
      
      <view class="actions">
        <button class="btn upload" @tap="uploadQrcode">{{ paymentQrcode ? '更换收款码' : '上传收款码' }}</button>
        <button class="btn save" @tap="saveQrcode" v-if="paymentQrcode">保存到相册</button>
      </view>
    </view>
  </view>
</template>

<script>
import { getHttpService } from '@/utils/http-services'
import { uploadImageWithPresign } from '@/utils/presigned-upload'

export default {
  data() {
    return {
      paymentQrcode: ''
    }
  },
  onShow() {
    this.checkLoginAndLoad()
  },
  methods: {
    checkLoginAndLoad() {
      const token = uni.getStorageSync('token')
      if (!token) {
        uni.showToast({
          title: '未登录',
          icon: 'none'
        })
        return
      }
      this.loadQrcode()
    },
    async loadQrcode() {
      try {
        const token = uni.getStorageSync('token')
        const userCenter = getHttpService('user-center')
        const res = await userCenter.getPaymentQrcode({ _token: token })
        if (res.code === 0 && res.data) {
          this.paymentQrcode = res.data.payment_qrcode || ''
        } else {
             console.error('Failed to get qrcode', res)
        }
      } catch (e) {
        console.error(e)
        // uni.showToast({ title: '加载失败', icon: 'none' }) // Fail silently or show unobtrusive error
      }
    },
    uploadQrcode() {
      uni.chooseImage({
        count: 1,
        success: (res) => {
          const tempFilePath = res.tempFilePaths[0]
          uni.showLoading({ title: '图片处理中...' })
          
          // 压缩图片
          uni.compressImage({
            src: tempFilePath,
            quality: 70, // 设置压缩质量为70%
            success: (compressRes) => {
              const compressedPath = compressRes.tempFilePath
              uni.showLoading({ title: '正在上传...' })
              this.directUpload(compressedPath)
            },
            fail: (err) => {
              console.error('压缩失败', err)
              // 压缩失败则直接上传原图
              this.directUpload(tempFilePath)
            }
          })
        }
      })
    },
    // 兜底直接上传
    async directUpload(filePath) {
      uni.showLoading({ title: '正在上传...' })
      try {
        const uploadResult = await uploadImageWithPresign({
          scene: 'payment-qrcode',
          filePath,
          token: uni.getStorageSync('token'),
          fileNamePrefix: 'payment-qrcode'
        })

        this.paymentQrcode = uploadResult.url

        const token = uni.getStorageSync('token')
        const userCenter = getHttpService('user-center')
        const updateRes = await userCenter.updatePaymentQrcode({ url: this.paymentQrcode, _token: token })
        if (!updateRes || updateRes.code !== 0) {
          throw new Error((updateRes && updateRes.message) || '保存失败')
        }

        uni.showToast({ title: '更新成功', icon: 'success' })
      } catch (e) {
        console.error(e)
        uni.showToast({ title: (e && e.message) || '上传失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    saveQrcode() {
      if (!this.paymentQrcode) return
      uni.downloadFile({
        url: this.paymentQrcode,
        success: (res) => {
          if (res.statusCode === 200) {
            uni.saveImageToPhotosAlbum({
              filePath: res.tempFilePath,
              success: () => uni.showToast({ title: '保存成功', icon: 'success' }),
              fail: () => uni.showToast({ title: '保存失败', icon: 'none' })
            })
          }
        },
        fail: () => uni.showToast({ title: '下载失败', icon: 'none' })
      })
    }
  }
}
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background-color: #f3f4f6;
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.card {
  width: 100%;
  background: white;
  border-radius: 24rpx;
  padding: 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 16rpx;
}

.subtitle {
  font-size: 26rpx;
  color: #6b7280;
  margin-bottom: 48rpx;
}

.qr-box {
  width: 500rpx;
  min-height: 500rpx;
  background: #f9fafb;
  border: 4rpx dashed #e5e7eb;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 48rpx;
  overflow: hidden;
}

.qr-img {
  width: 100%;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.plus {
  font-size: 64rpx;
  color: #9ca3af;
  margin-bottom: 16rpx;
}

.tip {
  font-size: 28rpx;
  color: #9ca3af;
}

.actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.btn {
  width: 100%;
  border-radius: 999rpx;
  font-size: 30rpx;
  font-weight: 600;
  padding: 20rpx 0;
}

.btn.upload {
  background: #4f46e5;
  color: white;
}

.btn.save {
  background: #eef2ff;
  color: #4f46e5;
}
</style>
