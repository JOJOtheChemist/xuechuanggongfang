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
          />
        </view>
        <view class="column">
          <forum-post-card
            v-for="item in rightColumnPosts"
            :key="item.id"
            :post="item"
            @open="goDetail"
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
  </view>
</template>

<script>
import ForumHeader from './components/ForumHeader.vue'
import ForumPostCard from './components/ForumPostCard.vue'
import ForumSchoolPopup from './components/ForumSchoolPopup.vue'
import { verifyAdminPassword } from '@/common/admin-auth'

export default {
  components: {
    ForumHeader,
    ForumPostCard,
    ForumSchoolPopup
  },
  data() {
    return {
      activeTab: 'local',
      currentSchool: '',
      schoolOptions: [],
      showSchoolPopup: false,
      posts: [],
      page: 1,
      pageSize: 10,
      hasMore: true,
      loading: false,
      loadingMore: false,
      refreshingFromEvent: false
    }
  },
  computed: {
    visiblePosts() {
      if (this.activeTab !== 'local') {
        return this.posts
      }
      const targetSchool = this.normalizeSchoolDisplay(this.currentSchool || '神秘学校')
      return this.posts.filter((item) => {
        return this.normalizeSchoolDisplay(item && item.school) === targetSchool
      })
    },
    leftColumnPosts() {
      return this.visiblePosts.filter((item, index) => index % 2 === 0)
    },
    rightColumnPosts() {
      return this.visiblePosts.filter((item, index) => index % 2 === 1)
    }
  },
  onLoad() {
    this.registerEvents()
    this.refreshList()
  },
  onShow() {
    if (typeof this.$mp.page.getTabBar === 'function' && this.$mp.page.getTabBar()) {
      this.$mp.page.getTabBar().setData({
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
      if (safe.toLowerCase() === 'campus' || safe === '其他') return '神秘学校'
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
        const params = {
          tab: this.activeTab,
          school: this.activeTab === 'local' ? this.currentSchool : '',
          page: this.page,
          pageSize: this.pageSize
        }

        const token = this.getToken()
        if (token) params._token = token

        const res = await forumService.getPostList(params)
        if (!res || res.code !== 0) {
          throw new Error((res && res.message) || '加载失败')
        }

        const data = res.data || {}
        const rawList = Array.isArray(data.list) ? data.list : []
        const normalizedList = rawList.map((item) => {
          const nextItem = Object.assign({}, item)
          nextItem.school = this.normalizeSchoolDisplay(item && item.school)
          return nextItem
        })

        let nextList = normalizedList
        if (this.activeTab === 'local') {
          const targetSchool = this.normalizeSchoolDisplay(
            this.currentSchool || data.current_school || '神秘学校'
          )
          nextList = normalizedList.filter((item) => {
            return this.normalizeSchoolDisplay(item && item.school) === targetSchool
          })
        }

        this.posts = reset ? nextList : this.posts.concat(nextList)
        this.hasMore = !!data.has_more

        const rawOptions = Array.isArray(data.school_options) ? data.school_options : []
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
          if (!this.currentSchool && data.current_school) {
            this.currentSchool = this.normalizeSchoolDisplay(data.current_school)
          }
          if (!this.currentSchool && this.schoolOptions.length > 0) {
            this.currentSchool = this.normalizeSchoolDisplay(this.schoolOptions[0])
          }
        }
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
      if (target === '神秘学校' || target === '其他' || target.toLowerCase() === 'campus') {
        uni.showToast({ title: '“神秘学校”不可删除', icon: 'none' })
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
          this.currentSchool = '神秘学校'
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
  background: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 14rpx 32rpx rgba(37, 99, 235, 0.35);
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
</style>
