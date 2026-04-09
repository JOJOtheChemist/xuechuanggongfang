<template>
  <view class="forum-page">
    <forum-header
      :active-tab="activeTab"
      :current-school="currentSchool"
      @change-tab="handleTabChange"
      @open-school-popup="openSchoolPopup"
    />

    <scroll-view
      class="post-scroll"
      scroll-y
      @scrolltolower="handleReachBottom"
    >
      <view v-if="loading && posts.length === 0" class="state-card">
        <text class="state-text">加载中...</text>
      </view>

      <view v-else-if="posts.length === 0" class="state-card">
        <text class="state-title">暂无动态</text>
        <text class="state-text">发布第一条校园动态，和同学一起交流吧</text>
      </view>

      <view v-else class="waterfall">
        <view class="column">
          <forum-post-card
            v-for="item in leftColumnPosts"
            :key="item.id"
            :post="item"
            @open="goDetail"
            @longpress="handlePostLongPress"
          />
        </view>
        <view class="column">
          <forum-post-card
            v-for="item in rightColumnPosts"
            :key="item.id"
            :post="item"
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

      <view class="bottom-space"></view>
    </scroll-view>

    <view class="fab-btn" @tap="goPublish">
      <text class="fab-icon">+</text>
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
  </view>
</template>

<script>
import ForumHeader from '@/components/forum/ForumHeader.vue'
import ForumPostCard from '@/components/forum/ForumPostCard.vue'
import ForumSchoolPopup from '@/components/forum/ForumSchoolPopup.vue'
import AdminPasswordDialog from '@/components/common/AdminPasswordDialog.vue'
import { verifyAdminPassword } from '@/common/admin-auth'

const DEFAULT_HOME_SCHOOL = '云南大学'
const MYSTERY_SCHOOL = '神秘学校'

export default {
  components: {
    ForumHeader,
    ForumPostCard,
    ForumSchoolPopup,
    AdminPasswordDialog
  },
  data() {
    return {
      activeTab: 'local',
      currentSchool: DEFAULT_HOME_SCHOOL,
      schoolOptions: [],
      showSchoolPopup: false,
      posts: [],
      page: 1,
      pageSize: 10,
      hasMore: true,
      loading: false,
      loadingMore: false,
      refreshingFromEvent: false,
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
    pendingDeletePostTitle() {
      return this.getPostDisplayTitle(this.pendingDeletePost)
    }
  },
  onLoad() {
    this.registerEvents()
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
    normalizeSchoolDisplay(name) {
      const safe = String(name || '').trim()
      if (!safe) return ''
      if (safe.toLowerCase() === 'campus' || safe === '其他') return MYSTERY_SCHOOL
      return safe
    },
    getToken() {
      return uni.getStorageSync('token') || ''
    },
    registerEvents() {
      uni.$on('forum-post-created', this.handlePostCreated)
    },
    unregisterEvents() {
      uni.$off('forum-post-created', this.handlePostCreated)
    },
    handlePostCreated() {
      this.refreshingFromEvent = true
    },
    async refreshList() {
      this.page = 1
      this.hasMore = true
      this.loading = true
      await this.fetchPosts(true)
      this.loading = false
    },
    async handleReachBottom() {
      if (!this.hasMore || this.loadingMore || this.loading) return
      this.page += 1
      this.loadingMore = true
      await this.fetchPosts(false)
      this.loadingMore = false
    },
    async fetchPosts(reset) {
      try {
        const forumService = uniCloud.importObject('forum-service')
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
          const rawOptions = Array.isArray(payload.school_options) ? payload.school_options : []
          if (rawOptions.length > 0) {
            const mapped = []
            const set = new Set()
            rawOptions.forEach((item) => {
              const school = this.normalizeSchoolDisplay(item)
              if (!school || set.has(school)) return
              set.add(school)
              mapped.push(school)
            })
            this.schoolOptions = mapped
          }

          if (this.activeTab === 'local') {
            if (!this.currentSchool && payload.current_school) {
              this.currentSchool = this.normalizeSchoolDisplay(payload.current_school)
            }
            if (!this.currentSchool && this.schoolOptions.length > 0) {
              this.currentSchool = this.normalizeSchoolDisplay(this.schoolOptions[0])
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
      } catch (error) {
        console.error('[forum] fetchPosts failed:', error)
        if (reset) {
          this.posts = []
          this.hasMore = false
        }
        uni.showToast({
          title: error.message || '加载失败',
          icon: 'none'
        })
      }
    },
    async handleTabChange(tab) {
      if (this.activeTab === tab) return
      this.activeTab = tab
      await this.refreshList()
    },
    async handleSchoolChange(school) {
      const targetSchool = this.normalizeSchoolDisplay(school)
      if (!targetSchool || this.currentSchool === targetSchool) return
      this.currentSchool = targetSchool
      this.activeTab = 'local'
      await this.refreshList()
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
        const forumService = uniCloud.importObject('forum-service')
        const token = this.getToken()
        const params = { school: schoolName }
        if (token) params._token = token

        const res = await forumService.addSchool(params)
        if (!res || res.code !== 0) {
          throw new Error((res && res.message) || '添加学校失败')
        }

        const addedSchool = this.normalizeSchoolDisplay((res.data && res.data.school) || schoolName)
        const options = Array.isArray(res.data && res.data.school_options) ? res.data.school_options : []
        if (options.length > 0) {
          const mapped = []
          const set = new Set()
          options.forEach((item) => {
            const school = this.normalizeSchoolDisplay(item)
            if (!school || set.has(school)) return
            set.add(school)
            mapped.push(school)
          })
          this.schoolOptions = mapped
        } else if (this.schoolOptions.indexOf(addedSchool) === -1) {
          this.schoolOptions.unshift(addedSchool)
        }

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
        const forumService = uniCloud.importObject('forum-service')
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
          this.schoolOptions = options
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
        const forumService = uniCloud.importObject('forum-service')
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
    goDetail(post) {
      if (!post || !post.id) return
      uni.navigateTo({
        url: `/subpackages/forum/detail?id=${encodeURIComponent(post.id)}`
      })
    },
    goPublish() {
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
  min-height: 100vh;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
}

.post-scroll {
  flex: 1;
  height: 0;
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

.waterfall {
  display: flex;
  justify-content: space-between;
  padding: 18rpx 20rpx 0;
}

.column {
  width: 348rpx;
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
  right: 30rpx;
  bottom: calc(120rpx + env(safe-area-inset-bottom));
  width: 94rpx;
  height: 94rpx;
  border-radius: 50%;
  background: #0f172a;
  border: 4rpx solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 14rpx 32rpx rgba(15, 23, 42, 0.35);
  z-index: 50;
}

.fab-icon {
  color: #ffffff;
  font-size: 56rpx;
  font-weight: 300;
  margin-top: -4rpx;
}

.bottom-space {
  height: 180rpx;
}

.delete-post-tip {
  display: block;
  font-size: 24rpx;
  color: #64748b;
  margin-bottom: 8rpx;
}
</style>
