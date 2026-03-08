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
  </view>
</template>

<script>
export default {
  data() {
    return {
      title: '',
      content: '',
      images: [],
      schoolOptions: [],
      selectedSchool: '',
      submitting: false,
      uploading: false
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
    extractFileId(uploadRes) {
      if (uploadRes && uploadRes.fileID) return uploadRes.fileID
      if (uploadRes && Array.isArray(uploadRes.success) && uploadRes.success[0] && uploadRes.success[0].fileID) {
        return uploadRes.success[0].fileID
      }
      return ''
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
        if (filePaths.length === 0) return

        this.uploading = true
        const uid = uni.getStorageSync('userId') || 'anonymous'

        for (let i = 0; i < filePaths.length; i += 1) {
          const filePath = filePaths[i]
          uni.showLoading({ title: `上传图片 ${i + 1}/${filePaths.length}` })

          const uploadRes = await uniCloud.uploadFile({
            filePath,
            cloudPath: `forum-posts/${uid}/${Date.now()}-${i}.jpg`
          })

          const fileID = this.extractFileId(uploadRes)
          if (!fileID) {
            throw new Error('上传成功但未返回文件地址')
          }
          this.images.push(fileID)
        }
      } catch (error) {
        console.error('[forum][publish] chooseImages failed:', error)
        uni.showToast({ title: error.message || '上传失败', icon: 'none' })
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
          throw new Error((res && res.message) || '发布失败')
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
        uni.showToast({ title: error.message || '发布失败', icon: 'none' })
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
  border-radius: 18rpx;
  padding: 24rpx;
}

.school-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.label {
  font-size: 28rpx;
  color: #0f172a;
  font-weight: 600;
}

.school-pill {
  height: 62rpx;
  border-radius: 999rpx;
  border: 1rpx solid #dbeafe;
  background: #eff6ff;
  padding: 0 22rpx;
  display: flex;
  align-items: center;
  column-gap: 8rpx;
}

.school-text {
  font-size: 24rpx;
  color: #1d4ed8;
}

.school-arrow {
  font-size: 20rpx;
  color: #1d4ed8;
}

.content-input {
  width: 100%;
  min-height: 260rpx;
  margin-top: 22rpx;
  font-size: 28rpx;
  line-height: 1.6;
}

.title-input {
  width: 100%;
  height: 80rpx;
  margin-top: 22rpx;
  padding: 0 20rpx;
  box-sizing: border-box;
  border-radius: 14rpx;
  background: #f8fafc;
  border: 1rpx solid #e2e8f0;
  font-size: 28rpx;
  color: #0f172a;
}

.input-placeholder {
  color: #94a3b8;
}

.count-text {
  margin-top: 10rpx;
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: #94a3b8;
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
  background: #e2e8f0;
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
  background: rgba(15, 23, 42, 0.7);
  color: #ffffff;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.img-uploader {
  border: 2rpx dashed #cbd5e1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #64748b;
  background: #f8fafc;
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
  background: #2563eb;
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 700;
  box-shadow: 0 12rpx 26rpx rgba(37, 99, 235, 0.28);
}

.publish-btn[disabled] {
  opacity: 0.65;
}
</style>
