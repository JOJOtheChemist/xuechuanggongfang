<template>
  <view class="detail-page">
    <scroll-view class="detail-scroll" scroll-y @scrolltolower="loadMoreComments">
      <view v-if="loading" class="state-card">
        <text class="state-text">加载中...</text>
      </view>

      <view v-else-if="!post" class="state-card">
        <text class="state-title">动态不存在</text>
      </view>

      <view v-else>
        <swiper v-if="post.images && post.images.length > 0" class="post-swiper" circular :indicator-dots="post.images.length > 1">
          <swiper-item v-for="(img, index) in post.images" :key="img + index">
            <image
              class="post-image"
              :src="img"
              :mode="getImageMode(img)"
              @tap="previewImage(index)"
            />
          </swiper-item>
        </swiper>

        <view class="post-card">
          <view class="author-row">
            <view class="author-main">
              <image class="avatar" :src="post.user_avatar" mode="aspectFill" />
              <view class="author-text">
                <text class="author-name">{{ post.user_name }}</text>
                <text class="author-sub">{{ displaySchool }} · {{ formatTime(post.create_date) }}</text>
              </view>
            </view>
          </view>

          <text class="post-title">{{ displayTitle }}</text>
          <text class="post-content">{{ post.content }}</text>

          <view class="stats-row">
            <view class="stat-btn" :class="{ active: post.is_liked }" @tap="toggleLike">
              <text>{{ post.is_liked ? '❤ 已赞' : '♡ 点赞' }}</text>
              <text class="stat-num">{{ post.like_count || 0 }}</text>
            </view>
            <view class="stat-btn" @tap="focusCommentInput">
              <text>💬 评论</text>
              <text class="stat-num">{{ post.comment_count || 0 }}</text>
            </view>
            <view class="stat-btn">
              <text>👀 浏览</text>
              <text class="stat-num">{{ post.view_count || 0 }}</text>
            </view>
          </view>
        </view>

        <view class="comment-card">
          <text class="section-title">全部评论</text>

          <view v-if="comments.length === 0" class="comment-empty">
            <text>还没有评论，来抢沙发吧</text>
          </view>

          <view v-else>
            <view v-for="item in comments" :key="item.id" class="comment-item">
              <image class="comment-avatar" :src="item.user_avatar" mode="aspectFill" />
              <view class="comment-main">
                <view class="comment-head">
                  <text class="comment-name">{{ item.user_name }}</text>
                  <text class="comment-time">{{ formatTime(item.create_date) }}</text>
                </view>
                <text class="comment-content">{{ item.content }}</text>
              </view>
            </view>
          </view>

          <view v-if="commentsLoading" class="comment-state">
            <text>评论加载中...</text>
          </view>
          <view v-else-if="comments.length > 0 && !commentsHasMore" class="comment-state done">
            <text>没有更多评论了</text>
          </view>
        </view>
      </view>

      <view class="bottom-space" :style="bottomSpaceStyle"></view>
    </scroll-view>

    <view class="comment-bar" :style="commentBarStyle">
      <input
        ref="commentInput"
        class="comment-input"
        v-model="commentText"
        :focus="commentInputFocus"
        :adjust-position="false"
        :cursor-spacing="24"
        maxlength="300"
        placeholder="写下你的评论..."
        confirm-type="send"
        @focus="handleInputFocus"
        @blur="handleInputBlur"
        @keyboardheightchange="handleKeyboardHeightChange"
        @confirm="submitComment"
      />
      <button class="send-btn" :disabled="sendingComment" @tap="submitComment">
        {{ sendingComment ? '发送中' : '发送' }}
      </button>
    </view>

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
      postId: '',
      post: null,
      loading: true,
      comments: [],
      commentsPage: 1,
      commentsPageSize: 20,
      commentsHasMore: true,
      commentsLoading: false,
      commentText: '',
      sendingComment: false,
      commentInputFocus: false,
      keyboardHeight: 0,
      imageModeMap: {},
      safetyNoticeVisible: false,
      safetyNoticeMessage: ''
    }
  },
  computed: {
    displayTitle() {
      if (!this.post) return ''

      const title = String(this.post.title || '').trim()
      if (title) return title

      const content = String(this.post.content || '').trim().replace(/\s+/g, ' ')
      if (!content) return '未命名动态'
      if (content.length <= 20) return content
      return `${content.slice(0, 20)}...`
    },
    displaySchool() {
      const school = String((this.post && this.post.school) || '').trim()
      if (!school) return '未知学校'
      if (school.toLowerCase() === 'campus' || school === '其他') return '神秘学校'
      return school
    },
    commentBarStyle() {
      return {
        bottom: `${this.keyboardHeight}px`
      }
    },
    bottomSpaceStyle() {
      return {
        height: `${140 + this.keyboardHeight}px`
      }
    }
  },
  onLoad(options) {
    this.postId = options && options.id ? String(options.id) : ''
    if (!this.postId) {
      this.loading = false
      return
    }

    this.loadDetail()
    this.resetComments()
  },
  methods: {
    getToken() {
      return uni.getStorageSync('token') || ''
    },
    async loadDetail() {
      this.loading = true
      try {
        const forumService = uniCloud.importObject('forum-service')
        const params = { postId: this.postId }
        const token = this.getToken()
        if (token) params._token = token

        const res = await forumService.getPostDetail(params)
        if (!res || res.code !== 0 || !res.data) {
          throw new Error((res && res.message) || '加载失败')
        }

        this.post = res.data
        this.detectPostImageModes()
      } catch (error) {
        console.error('[forum][detail] loadDetail failed:', error)
        uni.showToast({ title: error.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    detectPostImageModes() {
      this.imageModeMap = {}
      const images = this.post && Array.isArray(this.post.images) ? this.post.images : []
      if (images.length === 0) return

      images.forEach((src) => {
        if (!src) return
        uni.getImageInfo({
          src,
          success: (info) => {
            const width = Number(info && info.width) || 0
            const height = Number(info && info.height) || 0
            const mode = height > width ? 'aspectFit' : 'aspectFill'
            this.$set(this.imageModeMap, src, mode)
          },
          fail: () => {
            this.$set(this.imageModeMap, src, 'aspectFill')
          }
        })
      })
    },
    getImageMode(src) {
      return this.imageModeMap[src] || 'aspectFill'
    },
    async resetComments() {
      this.commentsPage = 1
      this.commentsHasMore = true
      this.comments = []
      await this.loadComments(true)
    },
    async loadMoreComments() {
      if (!this.commentsHasMore || this.commentsLoading || !this.postId) return
      this.commentsPage += 1
      await this.loadComments(false)
    },
    async loadComments(reset) {
      if (this.commentsLoading) return
      this.commentsLoading = true
      try {
        const forumService = uniCloud.importObject('forum-service')
        const res = await forumService.getCommentList({
          postId: this.postId,
          page: this.commentsPage,
          pageSize: this.commentsPageSize
        })

        if (!res || res.code !== 0) {
          throw new Error((res && res.message) || '加载评论失败')
        }

        const data = res.data || {}
        const list = Array.isArray(data.list) ? data.list : []
        this.comments = reset ? list : this.comments.concat(list)
        this.commentsHasMore = !!data.has_more
      } catch (error) {
        console.error('[forum][detail] loadComments failed:', error)
        if (!reset) {
          this.commentsPage -= 1
        }
        uni.showToast({ title: error.message || '加载评论失败', icon: 'none' })
      } finally {
        this.commentsLoading = false
      }
    },
    ensureLogin(actionText) {
      const token = this.getToken()
      if (token) return token

      uni.showModal({
        title: '请先登录',
        content: `${actionText}需要先登录。`,
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            uni.navigateTo({ url: '/pages/auth/login/index' })
          }
        }
      })

      return ''
    },
    closeSafetyNotice() {
      this.safetyNoticeVisible = false
      this.safetyNoticeMessage = ''
    },
    showSafetyNotice(message) {
      this.safetyNoticeMessage = normalizeContentSafetyMessage(message, '操作失败')
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
    focusCommentInput() {
      this.commentInputFocus = true
    },
    handleInputFocus() {
      this.commentInputFocus = true
    },
    handleInputBlur() {
      this.commentInputFocus = false
      this.keyboardHeight = 0
    },
    handleKeyboardHeightChange(event) {
      const height = Number(event && event.detail ? event.detail.height : 0)
      this.keyboardHeight = height > 0 ? height : 0
    },
    async toggleLike() {
      if (!this.post) return
      const token = this.ensureLogin('点赞')
      if (!token) return

      try {
        const forumService = uniCloud.importObject('forum-service')
        const res = await forumService.toggleLike({
          _token: token,
          postId: this.post.id
        })

        if (!res || res.code !== 0 || !res.data) {
          throw new Error((res && res.message) || '点赞失败')
        }

        this.post.is_liked = !!res.data.liked
        this.post.like_count = Number(res.data.like_count || 0)
      } catch (error) {
        console.error('[forum][detail] toggleLike failed:', error)
        uni.showToast({ title: error.message || '点赞失败', icon: 'none' })
      }
    },
    async submitComment() {
      if (this.sendingComment || !this.post) return

      const safeText = String(this.commentText || '').trim()
      if (!safeText) {
        uni.showToast({ title: '请输入评论内容', icon: 'none' })
        return
      }

      const token = this.ensureLogin('评论')
      if (!token) return

      this.sendingComment = true
      try {
        const forumService = uniCloud.importObject('forum-service')
        const res = await forumService.createComment({
          _token: token,
          postId: this.post.id,
          content: safeText
        })

        if (!res || res.code !== 0 || !res.data) {
          throw new Error((res && res.message) || '评论失败')
        }

        this.commentText = ''
        this.comments.unshift(res.data)
        this.post.comment_count = Number(this.post.comment_count || 0) + 1
        this.commentInputFocus = false
        this.keyboardHeight = 0
        uni.hideKeyboard()
        uni.showToast({ title: '评论成功', icon: 'success' })
      } catch (error) {
        console.error('[forum][detail] submitComment failed:', error)
        const message = extractRequestErrorMessage(error, '评论失败', {
          assumeContentViolationOn400: true
        })
        this.showFailureMessage(message, '评论失败')
      } finally {
        this.sendingComment = false
      }
    },
    previewImage(index) {
      if (!this.post || !Array.isArray(this.post.images) || this.post.images.length === 0) return
      uni.previewImage({
        current: this.post.images[index] || this.post.images[0],
        urls: this.post.images
      })
    },
    formatTime(ts) {
      const value = Number(ts || 0)
      if (!value) return ''

      const diff = Date.now() - value
      const minute = 60 * 1000
      const hour = 60 * minute
      const day = 24 * hour

      if (diff < minute) return '刚刚'
      if (diff < hour) return `${Math.floor(diff / minute)}分钟前`
      if (diff < day) return `${Math.floor(diff / hour)}小时前`
      if (diff < 7 * day) return `${Math.floor(diff / day)}天前`

      const date = new Date(value)
      const month = date.getMonth() + 1
      const dayNum = date.getDate()
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${month}-${dayNum} ${hours}:${minutes}`
    }
  }
}
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  background: #f8fafc;
}

.detail-scroll {
  height: 100vh;
}

.state-card {
  margin: 30rpx 24rpx;
  background: #ffffff;
  border-radius: 18rpx;
  padding: 40rpx 28rpx;
}

.state-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #0f172a;
}

.state-text {
  display: block;
  font-size: 26rpx;
  color: #64748b;
}

.post-swiper {
  width: 100%;
  height: 520rpx;
  background: #ffffff;
}

.post-image {
  width: 100%;
  height: 520rpx;
  background: #ffffff;
}

.post-card {
  background: #ffffff;
  margin: 20rpx 24rpx 0;
  border-radius: 18rpx;
  padding: 24rpx;
}

.author-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.author-main {
  display: flex;
  align-items: center;
}

.avatar {
  width: 76rpx;
  height: 76rpx;
  border-radius: 50%;
  background: #e2e8f0;
}

.author-text {
  margin-left: 14rpx;
}

.author-name {
  display: block;
  font-size: 28rpx;
  color: #0f172a;
  font-weight: 700;
}

.author-sub {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #64748b;
}

.post-title {
  margin-top: 20rpx;
  display: block;
  color: #0f172a;
  font-size: 34rpx;
  font-weight: 700;
  line-height: 1.4;
}

.post-content {
  margin-top: 14rpx;
  display: block;
  color: #1e293b;
  font-size: 30rpx;
  line-height: 1.6;
  white-space: pre-wrap;
}

.stats-row {
  margin-top: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-btn {
  flex: 1;
  height: 66rpx;
  margin-right: 12rpx;
  border-radius: 14rpx;
  border: 1rpx solid #e2e8f0;
  background: #f8fafc;
  color: #334155;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 8rpx;
}

.stat-btn:last-child {
  margin-right: 0;
}

.stat-btn.active {
  border-color: #fecdd3;
  background: #fff1f2;
  color: #e11d48;
}

.stat-num {
  font-weight: 700;
}

.comment-card {
  margin: 20rpx 24rpx 0;
  border-radius: 18rpx;
  background: #ffffff;
  padding: 22rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #0f172a;
}

.comment-empty {
  padding: 28rpx 0;
  color: #64748b;
  font-size: 24rpx;
}

.comment-item {
  display: flex;
  padding: 22rpx 0;
  border-bottom: 1rpx solid #f1f5f9;
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #e2e8f0;
}

.comment-main {
  margin-left: 14rpx;
  flex: 1;
}

.comment-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comment-name {
  color: #0f172a;
  font-size: 24rpx;
  font-weight: 600;
}

.comment-time {
  font-size: 21rpx;
  color: #94a3b8;
}

.comment-content {
  margin-top: 8rpx;
  display: block;
  color: #334155;
  font-size: 25rpx;
  line-height: 1.45;
  white-space: pre-wrap;
}

.comment-state {
  text-align: center;
  padding-top: 14rpx;
  color: #64748b;
  font-size: 22rpx;
}

.comment-state.done {
  color: #94a3b8;
}

.comment-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 110rpx;
  padding: 14rpx 24rpx calc(14rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
  display: flex;
  align-items: center;
  background: #ffffff;
  border-top: 1rpx solid #f1f5f9;
  z-index: 50;
  transition: bottom 0.2s ease;
}

.comment-input {
  flex: 1;
  height: 68rpx;
  border-radius: 999rpx;
  background: #f1f5f9;
  padding: 0 24rpx;
  font-size: 25rpx;
}

.send-btn {
  margin-left: 14rpx;
  height: 68rpx;
  line-height: 68rpx;
  border-radius: 999rpx;
  padding: 0 32rpx;
  border: none;
  background: #2563eb;
  color: #ffffff;
  font-size: 24rpx;
}

.send-btn[disabled] {
  opacity: 0.6;
}

.bottom-space {
  height: 140px;
  transition: height 0.2s ease;
}
</style>
