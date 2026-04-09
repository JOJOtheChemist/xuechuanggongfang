<template>
  <view class="publish-page">
    <view class="form-card">
      <view class="school-row">
        <text class="label">选择学校</text>
        <picker mode="selector" :range="schoolOptions" :value="selectedSchoolIndex" @change="handleSchoolChange">
          <view class="school-pill">
            <text class="school-text">{{ selectedSchool || '选择学校' }}</text>
            <text class="school-arrow">▾</text>
          </view>
        </picker>
      </view>

      <input
        class="title-input"
        v-model="title"
        maxlength="50"
        placeholder="请输入动态标题（最多50字）"
        placeholder-class="input-placeholder"
      />
      <text class="count-text">{{ title.length }}/50</text>

      <textarea
        class="content-input"
        v-model="content"
        maxlength="1000"
        placeholder="分享你在校园里的见闻、经验和想法..."
        placeholder-class="input-placeholder"
      />
      <text class="count-text">{{ content.length }}/1000</text>

      <view class="images-grid">
        <view class="img-item" v-for="(img, index) in images" :key="img + index">
          <image class="img" :src="img" mode="aspectFill" @tap="previewImage(index)" />
          <view class="delete-btn" @tap.stop="removeImage(index)">×</view>
        </view>

        <view v-if="images.length < 9" class="img-uploader" @tap="chooseImages">
          <text class="uploader-plus">+</text>
          <text class="uploader-text">添加图片</text>
        </view>
      </view>
    </view>

    <button class="publish-btn" :disabled="submitting || uploading" @tap="submitPost">
      {{ submitButtonText }}
    </button>

    <ForumContentSafetyNotice
      :visible="safetyNoticeVisible"
      :message="safetyNoticeMessage"
      @close="closeSafetyNotice"
    />
  </view>
</template>

<script>
import ForumContentSafetyNotice from './components/ForumContentSafetyNotice.vue'
import {
  CONTENT_SECURITY_SERVICE_UNAVAILABLE_MESSAGE,
  extractRequestErrorMessage,
  isContentSecurityViolation,
  normalizeContentSafetyMessage
} from '@/utils/contentSafety.js'

export default {
  components: {
    ForumContentSafetyNotice
  },
  data() {
    return {
      title: '',
      content: '',
      images: [],
      schoolOptions: [],
      selectedSchool: '',
      submitting: false,
      uploading: false,
      safetyNoticeVisible: false,
      safetyNoticeMessage: ''
    }
  },
  computed: {
    selectedSchoolIndex() {
      const index = this.schoolOptions.findIndex(item => item === this.selectedSchool)
      return index >= 0 ? index : 0
    },
    submitButtonText() {
      if (this.uploading) return '图片上传中...'
      if (this.submitting) return '发布中...'
      return '发布动态'
    }
  },
  onLoad() {
    this.ensureLoginOnEntry()
    this.loadSchoolOptions()
  },
  methods: {
    getToken() {
      return uni.getStorageSync('token') || ''
    },
    ensureLoginOnEntry() {
      const token = this.getToken()
      if (token) return true

      uni.showModal({
        title: '请先登录',
        content: '发布动态需要先登录。',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            uni.navigateTo({ url: '/pages/auth/login/index' })
          } else {
            uni.navigateBack()
          }
        }
      })
      return false
    },
    async loadSchoolOptions() {
      const token = this.getToken()
      if (!token) return

      try {
        const forumService = uniCloud.importObject('forum-service')
        const res = await forumService.getSchoolList({ _token: token })
        if (!res || res.code !== 0) {
          throw new Error((res && res.message) || '加载学校失败')
        }

        const data = res.data || {}
        const options = Array.isArray(data.school_options) ? data.school_options : []
        const currentSchool = data.current_school || ''

        if (currentSchool && options.indexOf(currentSchool) === -1) {
          options.unshift(currentSchool)
        }

        this.schoolOptions = options
        this.selectedSchool = currentSchool || options[0] || ''
      } catch (error) {
        console.error('[forum][publish] loadSchoolOptions failed:', error)
        uni.showToast({ title: error.message || '加载学校失败', icon: 'none' })
      }
    },
    handleSchoolChange(event) {
      const index = Number(event && event.detail ? event.detail.value : -1)
      this.selectedSchool = this.schoolOptions[index] || this.selectedSchool
    },
    closeSafetyNotice() {
      this.safetyNoticeVisible = false
      this.safetyNoticeMessage = ''
    },
    showSafetyNotice(message) {
      this.safetyNoticeMessage = normalizeContentSafetyMessage(message, '发布失败')
      this.safetyNoticeVisible = true
    },
    showFailureMessage(message, fallback = '操作失败') {
      const normalized = normalizeContentSafetyMessage(message, fallback)
      if (
        isContentSecurityViolation(normalized)
        || normalized === CONTENT_SECURITY_SERVICE_UNAVAILABLE_MESSAGE
      ) {
        this.showSafetyNotice(normalized)
        return
      }
      uni.showToast({ title: normalized, icon: 'none' })
    },
    getUploadFileName(filePath, tempFile, index) {
      const tempName = tempFile && (tempFile.name || tempFile.fileName)
      if (tempName) return String(tempName).replace(/[\\/]/g, '_')

      const cleanPath = String(filePath || '').split('?')[0]
      let pathName = cleanPath.split('/').pop() || ''
      try {
        pathName = decodeURIComponent(pathName)
      } catch (error) {
        pathName = pathName || ''
      }
      const extMatch = pathName.match(/\.(jpe?g|png|webp|gif)$/i)
      if (pathName && extMatch) return pathName.replace(/[\\/]/g, '_')

      const ext = extMatch ? extMatch[0].toLowerCase() : '.jpg'
      return `forum-post-${Date.now()}-${index}${ext}`
    },
    inferImageContentType(fileName) {
      const safeName = String(fileName || '').toLowerCase()
      if (safeName.endsWith('.png')) return 'image/png'
      if (safeName.endsWith('.webp')) return 'image/webp'
      if (safeName.endsWith('.gif')) return 'image/gif'
      return 'image/jpeg'
    },
    getLocalFileInfo(filePath) {
      return new Promise((resolve, reject) => {
        uni.getFileInfo({
          filePath,
          success: resolve,
          fail: reject
        })
      })
    },
    readLocalFile(filePath) {
      return new Promise((resolve, reject) => {
        const fileManager = typeof uni.getFileSystemManager === 'function'
          ? uni.getFileSystemManager()
          : typeof wx !== 'undefined' && typeof wx.getFileSystemManager === 'function'
            ? wx.getFileSystemManager()
            : null

        if (!fileManager || typeof fileManager.readFile !== 'function') {
          reject(new Error('当前平台不支持读取图片文件'))
          return
        }

        fileManager.readFile({
          filePath,
          success: (res) => resolve(res.data),
          fail: reject
        })
      })
    },
    async getUploadFileMeta(filePath, tempFile, index) {
      const fileName = this.getUploadFileName(filePath, tempFile, index)
      let fileSize = Number(tempFile && tempFile.size) || 0
      if (!fileSize) {
        const info = await this.getLocalFileInfo(filePath)
        fileSize = Number(info && info.size) || 0
      }

      if (!fileSize) {
        throw new Error('无法读取图片大小')
      }

      return {
        fileName,
        fileSize,
        contentType: this.inferImageContentType(fileName)
      }
    },
    uploadPresignedFile(uploadInfo, fileBuffer, contentType) {
      return new Promise((resolve, reject) => {
        const uploadUrl = uploadInfo && (uploadInfo.upload_url || uploadInfo.uploadUrl)
        if (!uploadUrl) {
          reject(new Error('后端未返回图片上传地址'))
          return
        }

        const headers = Object.assign({}, uploadInfo.headers || {})
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = contentType
        }

        uni.request({
          url: uploadUrl,
          method: uploadInfo.method || 'PUT',
          data: fileBuffer,
          header: headers,
          success: (res) => {
            const statusCode = Number(res && res.statusCode) || 0
            if (statusCode >= 200 && statusCode < 300) {
              resolve(res)
              return
            }
            reject(new Error(`图片上传失败（${statusCode}）`))
          },
          fail: reject
        })
      })
    },
    extractUploadedImageUrl(uploadInfo) {
      const file = uploadInfo && uploadInfo.file ? uploadInfo.file : {}
      return (
        file.public_url
        || file.publicUrl
        || (uploadInfo && uploadInfo.public_url)
        || (uploadInfo && uploadInfo.publicUrl)
        || ''
      )
    },
    async uploadForumImage(forumService, filePath, tempFile, index) {
      const meta = await this.getUploadFileMeta(filePath, tempFile, index)
      const presignRes = await forumService.createUploadPresign({
        _token: this.getToken(),
        scene: 'forum-post-image',
        fileName: meta.fileName,
        contentType: meta.contentType,
        fileSize: meta.fileSize
      })

      if (!presignRes || presignRes.code !== 0 || !presignRes.data) {
        throw new Error((presignRes && presignRes.message) || '创建上传地址失败')
      }

      const fileBuffer = await this.readLocalFile(filePath)
      await this.uploadPresignedFile(presignRes.data, fileBuffer, meta.contentType)

      const imageUrl = this.extractUploadedImageUrl(presignRes.data)
      if (!imageUrl) {
        throw new Error('上传成功但未返回图片地址')
      }

      return imageUrl
    },
    async chooseImages() {
      if (this.uploading) return

      try {
        const chooseRes = await uni.chooseImage({
          count: 9 - this.images.length,
          sizeType: ['compressed'],
          sourceType: ['album', 'camera']
        })

        const filePaths = Array.isArray(chooseRes.tempFilePaths) ? chooseRes.tempFilePaths : []
        const tempFiles = Array.isArray(chooseRes.tempFiles) ? chooseRes.tempFiles : []
        if (filePaths.length === 0) return

        this.uploading = true
        const forumService = uniCloud.importObject('forum-service')

        for (let i = 0; i < filePaths.length; i += 1) {
          const filePath = filePaths[i]
          uni.showLoading({ title: `上传图片 ${i + 1}/${filePaths.length}` })

          const imageUrl = await this.uploadForumImage(forumService, filePath, tempFiles[i], i)
          this.images.push(imageUrl)
        }
      } catch (error) {
        console.error('[forum][publish] chooseImages failed:', error)
        const message = extractRequestErrorMessage(error, '上传失败')
        this.showFailureMessage(message, '上传失败')
      } finally {
        this.uploading = false
        uni.hideLoading()
      }
    },
    removeImage(index) {
      this.images.splice(index, 1)
    },
    previewImage(index) {
      if (this.images.length === 0) return
      uni.previewImage({
        current: this.images[index] || this.images[0],
        urls: this.images
      })
    },
    async submitPost() {
      if (this.submitting || this.uploading) return

      const token = this.getToken()
      if (!token) {
        this.ensureLoginOnEntry()
        return
      }

      const safeContent = String(this.content || '').trim()
      const safeTitle = String(this.title || '').trim()
      if (!safeTitle) {
        uni.showToast({ title: '请输入标题', icon: 'none' })
        return
      }
      if (!safeContent && this.images.length === 0) {
        uni.showToast({ title: '请输入文字或上传图片', icon: 'none' })
        return
      }

      this.submitting = true
      try {
        const forumService = uniCloud.importObject('forum-service')
        const res = await forumService.createPost({
          _token: token,
          title: safeTitle,
          school: this.selectedSchool,
          content: safeContent,
          images: this.images
        })

        if (!res || res.code !== 0 || !res.data || !res.data.id) {
          throw new Error(normalizeContentSafetyMessage((res && res.message) || '发布失败', '发布失败'))
        }

        uni.$emit('forum-post-created', { id: res.data.id })
        uni.showToast({ title: '发布成功', icon: 'success' })

        setTimeout(() => {
          uni.redirectTo({
            url: `/subpackages/forum/detail?id=${encodeURIComponent(res.data.id)}`
          })
        }, 400)
      } catch (error) {
        console.error('[forum][publish] submitPost failed:', error)
        const message = extractRequestErrorMessage(error, '发布失败', {
          assumeContentViolationOn400: true
        })
        this.showFailureMessage(message, '发布失败')
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style scoped>
.publish-page {
  min-height: 100vh;
  background: #f8fafc;
  padding: 24rpx;
  box-sizing: border-box;
}

.form-card {
  background: #ffffff;
  border: 1rpx solid #f1e7ff;
  border-radius: 18rpx;
  padding: 24rpx;
  box-shadow: 0 10rpx 28rpx rgba(24, 16, 35, 0.06);
}

.school-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.label {
  font-size: 28rpx;
  color: #17111f;
  font-weight: 600;
}

.school-pill {
  height: 62rpx;
  border-radius: 999rpx;
  border: 1rpx solid #e9d5ff;
  background: #faf5ff;
  padding: 0 22rpx;
  display: flex;
  align-items: center;
  column-gap: 8rpx;
}

.school-text {
  font-size: 24rpx;
  color: #5b21b6;
}

.school-arrow {
  font-size: 20rpx;
  color: #c084fc;
}

.content-input {
  width: 100%;
  min-height: 260rpx;
  margin-top: 22rpx;
  padding: 22rpx 20rpx;
  box-sizing: border-box;
  border-radius: 18rpx;
  background: #ffffff;
  border: 1rpx solid #efe7ff;
  font-size: 28rpx;
  line-height: 1.6;
  color: #17111f;
}

.title-input {
  width: 100%;
  height: 80rpx;
  margin-top: 22rpx;
  padding: 0 20rpx;
  box-sizing: border-box;
  border-radius: 18rpx;
  background: #ffffff;
  border: 1rpx solid #efe7ff;
  font-size: 28rpx;
  color: #17111f;
}

.input-placeholder {
  color: #a7a1b5;
}

.count-text {
  margin-top: 10rpx;
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: #a7a1b5;
}

.images-grid {
  margin-top: 22rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.img-item,
.img-uploader {
  width: 210rpx;
  height: 210rpx;
  border-radius: 14rpx;
  overflow: hidden;
  position: relative;
}

.img-item {
  background: #f3eefb;
}

.img {
  width: 100%;
  height: 100%;
}

.delete-btn {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: rgba(8, 5, 13, 0.76);
  color: #ffffff;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.img-uploader {
  border: 2rpx dashed #c084fc;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #d8b4fe;
  background: #faf5ff;
}

.uploader-plus {
  font-size: 48rpx;
  line-height: 1;
}

.uploader-text {
  margin-top: 6rpx;
  font-size: 23rpx;
}

.publish-btn {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: calc(26rpx + env(safe-area-inset-bottom));
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 14rpx;
  border: none;
  background: #8b5cf6;
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 700;
  box-shadow: none;
}

.publish-btn[disabled] {
  opacity: 0.65;
}
</style>
