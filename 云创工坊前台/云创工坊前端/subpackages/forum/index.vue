<template>
  <view class="forum-page">
    <view class="forum-hero-shell">
      <image class="forum-hero-image" :src="heroImageUrl" mode="aspectFill" />
      <forum-header
        class="forum-hero-overlay"
        :active-tab="activeTab"
        :current-school="currentSchool"
        @change-tab="handleTabChange"
        @open-school-popup="openSchoolPopup"
      />
    </view>

    <scroll-view
      class="post-scroll"
      scroll-y
      @scrolltolower="handleReachBottom"
    >
      <view v-if="loading && posts.length === 0" class="state-card">
        <text class="state-text">加载中...</text>
      </view>

      <view v-else-if="loadErrorMessage" class="state-card">
        <text class="state-title">加载失败</text>
        <text class="state-text">{{ loadErrorMessage }}</text>
        <view class="state-action" @tap="refreshList">
          <text class="state-action-text">重新加载</text>
        </view>
      </view>

      <view v-else-if="posts.length === 0" class="state-card">
        <text class="state-title">暂无动态</text>
        <text class="state-text">发布第一条校园动态，和同学一起交流吧</text>
      </view>

      <view v-else class="feed-shell">
        <view class="waterfall">
          <view class="column">
            <forum-post-card
              v-for="item in leftColumnPosts"
              :key="item.id"
              :post="item"
              @like="togglePostLike"
              @open="goDetail"
              @longpress="handlePostLongPress"
            />
          </view>
          <view class="column">
            <forum-post-card
              v-for="item in rightColumnPosts"
              :key="item.id"
              :post="item"
              @like="togglePostLike"
              @open="goDetail"
              @longpress="handlePostLongPress"
            />
          </view>
        </view>

        <view v-if="loadingMore" class="loading-more">
          <text>加载更多中...</text>
        </view>
        <view v-else-if="posts.length > 0 && !hasMore" class="loading-more done">
          <text>已经到底了</text>
        </view>
      </view>

      <view class="bottom-space"></view>
    </scroll-view>

    <view class="fab-btn" @tap="goPublish">
      <image
        v-if="resolvedPublishButtonImageUrl"
        class="fab-image"
        :src="resolvedPublishButtonImageUrl"
        mode="aspectFit"
        @error="handlePublishButtonImageError"
      />
      <view v-else class="fab-fallback">
        <text class="fab-fallback-icon">+</text>
        <text class="fab-fallback-text">发布动态</text>
      </view>
    </view>

    <forum-school-popup
      :visible="showSchoolPopup"
      :current-school="currentSchool"
      :schools="schoolOptions"
      @close="closeSchoolPopup"
      @select-school="handleSchoolSelect"
      @add-school="handleAddSchool"
      @delete-school="handleDeleteSchool"
    />

    <admin-password-dialog
      :visible="showDeletePostDialog"
      title="删除动态"
      placeholder="请输入管理员密码"
      confirm-text="验证并删除"
      @close="closeDeletePostDialog"
      @confirm="handleDeletePostConfirm"
    >
      <template #extra>
        <text class="delete-post-tip">将删除：{{ pendingDeletePostTitle }}</text>
      </template>
    </admin-password-dialog>

    <forum-publish-profile-dialog
      :visible="showPublishProfileDialog"
      :loading="savingPublishProfile"
      :initial-value="publishProfileForm"
      @close="closePublishProfileDialog"
      @confirm="handlePublishProfileConfirm"
    />

    <bottom-nav active="forum" />
  </view>
</template>

<script>
import { getCurrentUserToken, getHttpService } from '@/utils/http-services'
import { getCachedImageSync, resolveCachedImage } from '@/utils/remote-image-cache'
import {
  getForumPublishProfileStateFromCache,
  saveForumPublishProfile,
  syncForumPublishProfileState
} from '@/utils/forum-publish-profile'
import {
  DEFAULT_HOME_SCHOOL,
  getForumSchoolOptions,
  MYSTERY_SCHOOL,
  normalizeForumSchoolName,
  sanitizeForumSchoolSelection
} from '@/utils/forum-school-options'
import ForumHeader from './components/ForumHeader.vue'
import ForumPostCard from './components/ForumPostCard.vue'
import ForumPublishProfileDialog from './components/ForumPublishProfileDialog.vue'
import ForumSchoolPopup from './components/ForumSchoolPopup.vue'
import AdminPasswordDialog from '@/components/common/AdminPasswordDialog.vue'
import { verifyAdminPassword } from '@/common/admin-auth'

const PUBLISH_BUTTON_IMAGE_URL = 'https://xuechuang.xyz/oss/share-assets/xuechuang/forum/publish-button/publish-dynamic-button-v1.webp'
const FORUM_HERO_IMAGE_URL = 'https://xuechuang.xyz/oss/share-assets/xuechuang/forum/hero/campus-square-hero-v1.jpg'

function buildForumSchoolOptions(rawOptions = [], currentSchool = '') {
  const baseOptions = getForumSchoolOptions()
  const current = sanitizeForumSchoolSelection(currentSchool)
  if (!current || current === DEFAULT_HOME_SCHOOL) {
    return baseOptions
  }
  return [current, ...baseOptions.filter((item) => item !== current)]
}

export default {
  components: {
    ForumHeader,
    ForumPostCard,
    ForumPublishProfileDialog,
    ForumSchoolPopup,
    AdminPasswordDialog
  },
  data() {
    return {
      activeTab: 'local',
      heroImageUrl: getCachedImageSync(FORUM_HERO_IMAGE_URL),
      publishButtonImageUrl: getCachedImageSync(PUBLISH_BUTTON_IMAGE_URL),
      publishButtonImageLoadFailed: false,
      currentSchool: DEFAULT_HOME_SCHOOL,
      schoolOptions: [],
      showSchoolPopup: false,
      posts: [],
      loadErrorMessage: '',
      page: 1,
      pageSize: 10,
      hasMore: true,
      loading: false,
      loadingMore: false,
      refreshingFromEvent: false,
      showPublishProfileDialog: false,
      savingPublishProfile: false,
      pendingPublishAfterProfileSave: false,
      likingPostIds: {},
      publishProfileForm: {
        school: '',
        phone: '',
        studentId: ''
      },
      showDeletePostDialog: false,
      deletingPost: false,
      pendingDeletePost: null
    }
  },
  computed: {
    visiblePosts() {
      if (this.activeTab !== 'local') {
        return this.posts
      }
      const targetSchool = this.normalizeSchoolDisplay(this.currentSchool || DEFAULT_HOME_SCHOOL)
      return this.posts.filter((item) => {
        return this.normalizeSchoolDisplay(item && item.school) === targetSchool
      })
    },
    leftColumnPosts() {
      return this.visiblePosts.filter((item, index) => index % 2 === 0)
    },
    rightColumnPosts() {
      return this.visiblePosts.filter((item, index) => index % 2 === 1)
    },
    resolvedPublishButtonImageUrl() {
      if (this.publishButtonImageLoadFailed) return ''
      return this.publishButtonImageUrl
    },
    pendingDeletePostTitle() {
      return this.getPostDisplayTitle(this.pendingDeletePost)
    }
  },
  onLoad() {
    this.registerEvents()
    this.syncHeroImage()
    this.syncPublishButtonImage()
    this.refreshList()
  },
  onShow() {
    const page =
      (this.$mp && this.$mp.page) ||
      (typeof getCurrentPages === 'function' ? getCurrentPages().slice(-1)[0] : null)
    const tabBar = page && typeof page.getTabBar === 'function' ? page.getTabBar() : null

    if (tabBar && typeof tabBar.setData === 'function') {
      tabBar.setData({
        selected: 0
      })
    }

    if (this.refreshingFromEvent) {
      this.refreshingFromEvent = false
      this.refreshList()
    }
  },
  onUnload() {
    this.unregisterEvents()
  },
  methods: {
    async syncHeroImage() {
      try {
        const cachedUrl = await resolveCachedImage(FORUM_HERO_IMAGE_URL)
        if (cachedUrl) {
          this.heroImageUrl = cachedUrl
        }
      } catch (error) {
        console.warn('[forum] 头图缓存失败', error)
      }
    },
    async syncPublishButtonImage() {
      try {
        const cachedUrl = await resolveCachedImage(PUBLISH_BUTTON_IMAGE_URL)
        if (cachedUrl) {
          this.publishButtonImageLoadFailed = false
          this.publishButtonImageUrl = cachedUrl
        }
      } catch (error) {
        console.warn('[forum] 发布按钮图片缓存失败', error)
      }
    },
    normalizeSchoolDisplay(name) {
      return normalizeForumSchoolName(name)
    },
    getToken() {
      return getCurrentUserToken()
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
            uni.navigateTo({
              url: '/pages/auth/login/index'
            })
          }
        }
      })

      return ''
    },
    registerEvents() {
      uni.$on('forum-post-created', this.handlePostCreated)
      uni.$on('forum-post-liked', this.handlePostLiked)
      uni.$on('forum-post-commented', this.handlePostCommented)
    },
    unregisterEvents() {
      uni.$off('forum-post-created', this.handlePostCreated)
      uni.$off('forum-post-liked', this.handlePostLiked)
      uni.$off('forum-post-commented', this.handlePostCommented)
    },
    handlePostCreated() {
      this.refreshingFromEvent = true
    },
    handlePostLiked(payload = {}) {
      const targetId = String(payload.id || '').trim()
      if (!targetId) return

      const nextLiked = !!payload.is_liked
      const nextLikeCount = Number(payload.like_count || 0)
      this.posts = (Array.isArray(this.posts) ? this.posts : []).map((item) => {
        if (!item || String(item.id || '') !== targetId) return item
        return Object.assign({}, item, {
          is_liked: nextLiked,
          like_count: nextLikeCount
        })
      })
    },
    handlePostCommented(payload = {}) {
      const targetId = String(payload.id || '').trim()
      if (!targetId) return

      const nextCommentCount = Math.max(0, Number(payload.comment_count || 0))
      this.posts = (Array.isArray(this.posts) ? this.posts : []).map((item) => {
        if (!item || String(item.id || '') !== targetId) return item
        return Object.assign({}, item, {
          comment_count: nextCommentCount
        })
      })
    },
    async refreshList() {
      const previousPage = this.page
      const previousHasMore = this.hasMore
      this.page = 1
      this.hasMore = true
      this.loading = true
      try {
        const succeeded = await this.fetchPosts(true)
        if (!succeeded) {
          this.page = previousPage
          this.hasMore = previousHasMore
        }
        return succeeded
      } finally {
        this.loading = false
      }
    },
    async handleReachBottom() {
      if (!this.hasMore || this.loadingMore || this.loading) return
      const nextPage = this.page + 1
      this.page = nextPage
      this.loadingMore = true
      try {
        const succeeded = await this.fetchPosts(false)
        if (!succeeded) {
          this.page = Math.max(1, nextPage - 1)
        }
      } finally {
        this.loadingMore = false
      }
    },
    async fetchPosts(reset) {
      const previousPosts = Array.isArray(this.posts) ? this.posts.slice() : []
      const previousHasMore = !!this.hasMore
      const hadExistingPosts = previousPosts.length > 0

      try {
        const forumService = getHttpService('forum-service')
        const requestedSchool = this.activeTab === 'local'
          ? this.normalizeSchoolDisplay(this.currentSchool)
          : ''
        const params = {
          tab: this.activeTab,
          school: requestedSchool,
          page: this.page,
          pageSize: this.pageSize
        }

        const token = this.getToken()
        if (token) params._token = token

        const applySchoolMeta = (payload = {}) => {
          const nextSchoolOptions = buildForumSchoolOptions(
            [],
            sanitizeForumSchoolSelection(payload.current_school || this.currentSchool, DEFAULT_HOME_SCHOOL)
          )
          this.schoolOptions = nextSchoolOptions

          if (this.activeTab === 'local') {
            if (!this.currentSchool && payload.current_school) {
              this.currentSchool = sanitizeForumSchoolSelection(payload.current_school, DEFAULT_HOME_SCHOOL)
            }
            if (!this.currentSchool && this.schoolOptions.length > 0) {
              this.currentSchool = sanitizeForumSchoolSelection(this.schoolOptions[0], DEFAULT_HOME_SCHOOL)
            }
          }
        }

        let res = await forumService.getPostList(params)
        if (!res || res.code !== 0) {
          throw new Error((res && res.message) || '加载失败')
        }

        let data = res.data || {}
        applySchoolMeta(data)

        const shouldRetryLocalInitialFetch = reset &&
          this.activeTab === 'local' &&
          !requestedSchool &&
          !!this.currentSchool

        // 首次本校请求 school 为空时，拿到 current_school 后立即补拉一次列表，避免首屏空白。
        if (shouldRetryLocalInitialFetch) {
          const retryParams = Object.assign({}, params, { school: this.currentSchool })
          res = await forumService.getPostList(retryParams)
          if (!res || res.code !== 0) {
            throw new Error((res && res.message) || '加载失败')
          }
          data = res.data || {}
          applySchoolMeta(data)
        }

        const rawList = Array.isArray(data.list) ? data.list : []
        const normalizedList = rawList.map((item) => {
          const nextItem = Object.assign({}, item)
          nextItem.school = this.normalizeSchoolDisplay(item && item.school)
          return nextItem
        })

        let nextList = normalizedList
        if (this.activeTab === 'local') {
          const targetSchool = this.normalizeSchoolDisplay(
            this.currentSchool || data.current_school || DEFAULT_HOME_SCHOOL
          )
          nextList = normalizedList.filter((item) => {
            return this.normalizeSchoolDisplay(item && item.school) === targetSchool
          })
        }

        this.posts = reset ? nextList : this.posts.concat(nextList)
        this.hasMore = !!data.has_more
        this.loadErrorMessage = ''
        return true
      } catch (error) {
        console.error('[forum] fetchPosts failed:', error)
        if (reset && !hadExistingPosts) {
          this.posts = []
          this.hasMore = false
          this.loadErrorMessage = error.message || '加载失败'
        } else {
          this.posts = previousPosts
          this.hasMore = previousHasMore
        }
        uni.showToast({
          title: error.message || '加载失败',
          icon: 'none'
        })
        return false
      }
    },
    async handleTabChange(tab) {
      if (this.activeTab === tab) return
      const previousTab = this.activeTab
      this.activeTab = tab
      const succeeded = await this.refreshList()
      if (!succeeded) {
        this.activeTab = previousTab
      }
    },
    async handleSchoolChange(school) {
      const targetSchool = this.normalizeSchoolDisplay(school)
      if (!targetSchool || this.currentSchool === targetSchool) return
      const previousSchool = this.currentSchool
      const previousTab = this.activeTab
      this.currentSchool = targetSchool
      this.activeTab = 'local'
      const succeeded = await this.refreshList()
      if (!succeeded) {
        this.currentSchool = previousSchool
        this.activeTab = previousTab
      }
    },
    async handleSchoolSelect(school) {
      this.showSchoolPopup = false
      await this.handleSchoolChange(school)
    },
    openSchoolPopup() {
      this.showSchoolPopup = true
    },
    closeSchoolPopup() {
      this.showSchoolPopup = false
    },
    handlePublishButtonImageError() {
      this.publishButtonImageLoadFailed = true
    },
    async handleAddSchool(payload = {}) {
      const schoolName = String(payload.name || '').trim()
      const password = String(payload.password || '').trim()

      if (!schoolName) {
        uni.showToast({ title: '请输入学校名称', icon: 'none' })
        return
      }

      if (!verifyAdminPassword(password)) {
        uni.showToast({ title: '密码错误', icon: 'none' })
        return
      }

      try {
        const forumService = getHttpService('forum-service')
        const token = this.getToken()
        const params = { school: schoolName }
        if (token) params._token = token

        const res = await forumService.addSchool(params)
        if (!res || res.code !== 0) {
          throw new Error((res && res.message) || '添加学校失败')
        }

        const addedSchool = this.normalizeSchoolDisplay((res.data && res.data.school) || schoolName)
        this.schoolOptions = buildForumSchoolOptions([], addedSchool)

        this.currentSchool = addedSchool
        this.activeTab = 'local'
        this.showSchoolPopup = false
        uni.showToast({ title: '添加成功', icon: 'success' })
        await this.refreshList()
      } catch (error) {
        console.error('[forum] addSchool failed:', error)
        uni.showToast({
          title: error.message || '添加学校失败',
          icon: 'none'
        })
      }
    },
    async handleDeleteSchool(payload = {}) {
      const target = this.normalizeSchoolDisplay(payload.name)
      const password = String(payload.password || '').trim()
      if (!target) return
      if (target === MYSTERY_SCHOOL || target === '其他' || target.toLowerCase() === 'campus') {
        uni.showToast({ title: `“${MYSTERY_SCHOOL}”不可删除`, icon: 'none' })
        return
      }
      if (!password) {
        uni.showToast({ title: '请输入管理员密码', icon: 'none' })
        return
      }
      if (!verifyAdminPassword(password)) {
        uni.showToast({ title: '密码错误', icon: 'none' })
        return
      }

      try {
        const forumService = getHttpService('forum-service')
        const token = this.getToken()
        const params = { school: target }
        if (token) params._token = token

        const result = await forumService.deleteSchool(params)
        if (!result || result.code !== 0) {
          throw new Error((result && result.message) || '删除学校失败')
        }

        const options = Array.isArray(result.data && result.data.school_options)
          ? result.data.school_options
          : []
        if (options.length > 0) {
          this.schoolOptions = buildForumSchoolOptions([], this.currentSchool)
        }

        if (this.currentSchool === target) {
          this.currentSchool = DEFAULT_HOME_SCHOOL
        }

        this.activeTab = 'local'
        uni.showToast({ title: '删除成功', icon: 'success' })
        await this.refreshList()
      } catch (error) {
        console.error('[forum] deleteSchool failed:', error)
        uni.showToast({
          title: error.message || '删除学校失败',
          icon: 'none'
        })
      }
    },
    getPostDisplayTitle(post) {
      if (!post) return '该动态'
      const title = String(post.title || '').trim()
      if (title) return title
      const content = String(post.content || '').trim().replace(/\s+/g, ' ')
      if (!content) return '该动态'
      return content.length > 20 ? `${content.slice(0, 20)}...` : content
    },
    handlePostLongPress(post) {
      if (!post || !post.id) return
      uni.showActionSheet({
        itemList: ['删除'],
        itemColor: '#ef4444',
        success: (res) => {
          if (res.tapIndex === 0) {
            this.pendingDeletePost = post
            this.showDeletePostDialog = true
          }
        }
      })
    },
    closeDeletePostDialog() {
      if (this.deletingPost) return
      this.showDeletePostDialog = false
      this.pendingDeletePost = null
    },
    async handleDeletePostConfirm(password) {
      if (this.deletingPost) return

      const safePassword = String(password || '').trim()
      if (!safePassword) {
        uni.showToast({ title: '请输入管理员密码', icon: 'none' })
        return
      }
      if (!verifyAdminPassword(safePassword)) {
        uni.showToast({ title: '密码错误', icon: 'none' })
        return
      }

      const pendingPost = this.pendingDeletePost
      if (!pendingPost || !pendingPost.id) {
        uni.showToast({ title: '动态不存在', icon: 'none' })
        this.closeDeletePostDialog()
        return
      }

      this.deletingPost = true
      try {
        const forumService = getHttpService('forum-service')
        const token = this.getToken()
        const params = { postId: pendingPost.id, adminPassword: safePassword }
        if (token) params._token = token

        const result = await forumService.deletePost(params)
        if (!result || result.code !== 0) {
          throw new Error((result && result.message) || '删除动态失败')
        }

        this.showDeletePostDialog = false
        this.pendingDeletePost = null
        uni.showToast({ title: '删除成功', icon: 'success' })
        await this.refreshList()
      } catch (error) {
        console.error('[forum] deletePost failed:', error)
        uni.showToast({
          title: error.message || '删除动态失败',
          icon: 'none'
        })
      } finally {
        this.deletingPost = false
      }
    },
    async togglePostLike(post) {
      if (!post || !post.id) return

      const postId = String(post.id).trim()
      if (!postId || this.likingPostIds[postId]) return

      const token = this.ensureLogin('点赞')
      if (!token) return

      this.$set(this.likingPostIds, postId, true)
      try {
        const forumService = getHttpService('forum-service')
        const res = await forumService.toggleLike({
          _token: token,
          postId
        })

        if (!res || res.code !== 0 || !res.data) {
          throw new Error((res && res.message) || '点赞失败')
        }

        const liked = !!res.data.liked
        const likeCount = Math.max(0, Number(res.data.like_count || 0))

        this.posts = (Array.isArray(this.posts) ? this.posts : []).map((item) => {
          if (!item || String(item.id || '') !== postId) return item
          return Object.assign({}, item, {
            is_liked: liked,
            like_count: likeCount
          })
        })

        uni.$emit('forum-post-liked', {
          id: postId,
          is_liked: liked,
          like_count: likeCount
        })
      } catch (error) {
        console.error('[forum] togglePostLike failed:', error)
        uni.showToast({
          title: error.message || '点赞失败',
          icon: 'none'
        })
      } finally {
        this.$delete(this.likingPostIds, postId)
      }
    },
    goDetail(post) {
      if (!post || !post.id) return
      uni.navigateTo({
        url: `/subpackages/forum/detail?id=${encodeURIComponent(post.id)}`
      })
    },
    goPublish() {
      if (this.savingPublishProfile) return

      const token = this.getToken()
      if (!token) {
        uni.showModal({
          title: '请先登录',
          content: '发布动态需要先完成登录。',
          confirmText: '去登录',
          success: (res) => {
            if (res.confirm) {
              uni.navigateTo({
                url: '/pages/auth/login/index'
              })
            }
          }
        })
        return
      }

      this.ensurePublishProfileReady()
    },
    async ensurePublishProfileReady() {
      const cachedState = getForumPublishProfileStateFromCache()
      if (cachedState.complete) {
        this.openPublishEntry()
        return
      }

      const latestState = await syncForumPublishProfileState()
      if (latestState.complete) {
        this.openPublishEntry()
        return
      }

      this.pendingPublishAfterProfileSave = true
      this.openPublishProfileDialog(latestState.profile)
    },
    openPublishProfileDialog(profile = {}) {
      this.publishProfileForm = {
        school: String(profile.school || this.currentSchool || '').trim(),
        phone: String(profile.phone || '').trim(),
        studentId: String(profile.studentId || '').trim()
      }
      this.showPublishProfileDialog = true
    },
    closePublishProfileDialog() {
      if (this.savingPublishProfile) return
      this.showPublishProfileDialog = false
      this.pendingPublishAfterProfileSave = false
    },
    async handlePublishProfileConfirm(payload) {
      if (this.savingPublishProfile) return

      this.savingPublishProfile = true
      try {
        const result = await saveForumPublishProfile(payload)
        this.publishProfileForm = Object.assign({}, result.profile)
        this.currentSchool = this.normalizeSchoolDisplay(result.profile.school || this.currentSchool || DEFAULT_HOME_SCHOOL)
        this.currentSchool = sanitizeForumSchoolSelection(this.currentSchool, DEFAULT_HOME_SCHOOL)
        this.schoolOptions = buildForumSchoolOptions([], this.currentSchool)
        this.showPublishProfileDialog = false
        uni.showToast({
          title: '信息已保存',
          icon: 'success'
        })

        if (this.pendingPublishAfterProfileSave) {
          this.pendingPublishAfterProfileSave = false
          this.navigateToPublish()
        }
      } catch (error) {
        console.error('[forum] save publish profile failed:', error)
        uni.showToast({
          title: error.message || '保存失败',
          icon: 'none'
        })
      } finally {
        this.savingPublishProfile = false
      }
    },
    openPublishEntry() {
      uni.showActionSheet({
        itemList: ['快速发布动态'],
        success: (res) => {
          if (res.tapIndex !== 0) return
          this.navigateToPublish()
        }
      })
    },
    navigateToPublish() {
      uni.navigateTo({
        url: '/subpackages/forum/publish'
      })
    }
  }
}
</script>

<style scoped>
.forum-page {
  height: 100vh;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.post-scroll {
  flex: 1;
  height: 0;
  margin-top: 20rpx;
  overflow: hidden;
}

.forum-hero-image {
  display: block;
  width: 100%;
  height: 400rpx;
  flex-shrink: 0;
}

.forum-hero-shell {
  position: relative;
  width: 100%;
  flex-shrink: 0;
}

.forum-hero-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 18rpx;
  z-index: 2;
}

.state-card {
  margin: 30rpx 24rpx;
  padding: 40rpx 28rpx;
  border-radius: 18rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 30rpx rgba(15, 23, 42, 0.04);
}

.state-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #0f172a;
  display: block;
}

.state-text {
  margin-top: 10rpx;
  font-size: 25rpx;
  color: #64748b;
  display: block;
}

.state-action {
  margin-top: 24rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 180rpx;
  height: 68rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #16a34a, #0f766e);
}

.state-action-text {
  font-size: 24rpx;
  font-weight: 600;
  color: #ffffff;
}

.feed-shell {
  margin: 0rpx 20rpx 0;
  padding: 14rpx 14rpx 20rpx;
  background: #ffffff;
}

.waterfall {
  display: flex;
  justify-content: flex-start;
  column-gap: 20rpx;
}

.column {
  flex: 1;
  min-width: 0;
}

.loading-more {
  padding: 20rpx 0;
  text-align: center;
  color: #64748b;
  font-size: 24rpx;
}

.loading-more.done {
  color: #94a3b8;
}

.fab-btn {
  position: fixed;
  left: 50%;
  bottom: calc(150rpx + env(safe-area-inset-bottom));
  width: 240rpx;
  height: 91rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateX(-50%);
  z-index: 50;
}

.fab-image {
  width: 100%;
  height: 100%;
}

.fab-fallback {
  width: 100%;
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #16a34a, #0f766e);
  box-shadow: 0 16rpx 40rpx rgba(13, 148, 136, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 10rpx;
}

.fab-fallback-icon {
  font-size: 42rpx;
  line-height: 1;
  font-weight: 600;
  color: #ffffff;
}

.fab-fallback-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #ffffff;
}

.bottom-space {
  height: 280rpx;
}

.delete-post-tip {
  display: block;
  font-size: 24rpx;
  color: #64748b;
  margin-bottom: 8rpx;
}
</style>
