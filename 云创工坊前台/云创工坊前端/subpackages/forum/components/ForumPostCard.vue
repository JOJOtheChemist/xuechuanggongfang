<template>
  <view class="post-card" @tap="handleTap" @longpress="handleLongPress">
    <image v-if="coverImage" class="cover" :src="coverImage" mode="aspectFill" />

    <view class="post-body">
      <view class="post-title">{{ displayTitle }}</view>

      <view class="meta-row">
        <view class="user-row">
          <image class="avatar" :src="post.user_avatar || avatarUrl" mode="aspectFill" />
          <text class="username">{{ post.user_name || '同学' }}</text>
        </view>
        <view
          class="like-row"
          :class="{ active: !!post.is_liked }"
          @tap.stop="handleLikeTap"
        >
          <image
            class="like-icon"
            :src="post.is_liked ? likeActiveIcon : likeIcon"
            mode="aspectFit"
          />
          <text class="like-count">{{ formatCount(post.like_count) }}</text>
        </view>
      </view>

      <view class="extra-row">
        <text class="school">{{ displaySchool }}</text>
        <text class="time">{{ formatRelativeTime(post.create_date) }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import {
	FORUM_LIKE_ACTIVE_ICON_URL,
	FORUM_LIKE_ICON_URL
} from '@/utils/cloud-static-assets'

export default {
  name: 'ForumPostCard',
  props: {
    post: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      suppressTapOnce: false,
      suppressTapTimer: null,
      likeIcon: FORUM_LIKE_ICON_URL,
      likeActiveIcon: FORUM_LIKE_ACTIVE_ICON_URL
    }
  },
  beforeDestroy() {
    if (this.suppressTapTimer) {
      clearTimeout(this.suppressTapTimer)
      this.suppressTapTimer = null
    }
  },
  computed: {
    coverImage() {
      if (Array.isArray(this.post.images) && this.post.images.length > 0) {
        return this.post.images[0]
      }
      return ''
    },
    avatarUrl() {
      const seed = encodeURIComponent(this.post.user_name || 'campus-user')
      return `https://api.dicebear.com/7.x/thumbs/svg?seed=${seed}`
    },
    displayTitle() {
      const title = String(this.post.title || '').trim()
      if (title) return title

      const text = String(this.post.content || '').trim().replace(/\s+/g, ' ')
      if (!text) return '未命名动态'
      return text
    },
    displaySchool() {
      const school = String(this.post.school || '').trim()
      if (!school) return '未知学校'
      if (school.toLowerCase() === 'campus' || school === '其他') return '神秘学校'
      return school
    }
  },
  methods: {
    handleTap() {
      if (this.suppressTapOnce) {
        this.suppressTapOnce = false
        if (this.suppressTapTimer) {
          clearTimeout(this.suppressTapTimer)
          this.suppressTapTimer = null
        }
        return
      }
      this.$emit('open', this.post)
    },
    handleLongPress() {
      // Avoid opening detail immediately after a long-press gesture.
      this.suppressTapOnce = true
      if (this.suppressTapTimer) {
        clearTimeout(this.suppressTapTimer)
      }
      this.suppressTapTimer = setTimeout(() => {
        this.suppressTapOnce = false
        this.suppressTapTimer = null
      }, 450)
      this.$emit('longpress', this.post)
    },
    handleLikeTap() {
      this.$emit('like', this.post)
    },
    formatCount(value) {
      const num = Number(value || 0)
      if (num >= 10000) {
        return `${(num / 10000).toFixed(1)}w`
      }
      return String(num)
    },
    formatRelativeTime(ts) {
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
      return `${date.getMonth() + 1}-${date.getDate()}`
    }
  }
}
</script>

<style scoped>
.post-card {
  border-radius: 18rpx;
  overflow: hidden;
  background: #ffffff;
  margin-bottom: 14rpx;
  box-shadow: 0 8rpx 30rpx rgba(15, 23, 42, 0.06);
}

.cover {
  width: 100%;
  height: 240rpx;
  background: #e2e8f0;
}

.post-body {
  padding: 10rpx 14rpx 12rpx;
}

.post-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta-row {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.user-row {
  display: flex;
  align-items: center;
  min-width: 0;
}

.avatar {
  width: 34rpx;
  height: 34rpx;
  border-radius: 50%;
  background: #e2e8f0;
}

.username {
  margin-left: 8rpx;
  font-size: 20rpx;
  color: #334155;
  max-width: 150rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.like-row {
  min-height: 48rpx;
  display: flex;
  align-items: center;
  column-gap: 6rpx;
  padding: 6rpx 8rpx;
  margin: -6rpx -8rpx -6rpx 0;
  border-radius: 999rpx;
}

.like-icon {
  width: 30rpx;
  height: 30rpx;
  flex-shrink: 0;
}

.like-count {
  font-size: 22rpx;
  color: #64748b;
}

.like-row.active .like-count {
  color: #ef4444;
}

.extra-row {
  margin-top: 8rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.school {
  font-size: 18rpx;
  color: #6366f1;
}

.time {
  font-size: 18rpx;
  color: #94a3b8;
}
</style>
