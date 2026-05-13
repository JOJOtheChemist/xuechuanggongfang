<template>
  <view v-if="validImages.length" class="section-card">
    <view class="section-head">
      <text class="section-title">校园图片</text>
      <text class="section-subtitle">{{ validImages.length }} 张</text>
    </view>

    <text class="section-tip">点击图片查看大图，长按可保存</text>

    <scroll-view class="gallery-scroll" scroll-x show-scrollbar="false">
      <view class="gallery-row">
        <image
          v-for="(image, index) in validImages"
          :key="image.renderKey"
          class="gallery-image"
          :src="image.publicUrl"
          mode="aspectFill"
          @tap="previewImage(index)"
        />
      </view>
    </scroll-view>
  </view>
</template>

<script>
export default {
  name: 'VolunteerDetailGallerySection',
  props: {
    galleryImages: {
      type: Array,
      default() {
        return []
      }
    }
  },
  computed: {
    validImages() {
      return (Array.isArray(this.galleryImages) ? this.galleryImages : [])
        .filter((item) => item && typeof item.publicUrl === 'string' && item.publicUrl.trim())
        .map((item, index) => {
          return Object.assign({}, item, {
            renderKey: `gallery-${index}`
          })
        })
    }
  },
  methods: {
    previewImage(index) {
      const urls = this.validImages.map((item) => item.publicUrl)
      if (!urls.length) return

      uni.previewImage({
        current: urls[index] || urls[0],
        urls
      })
    }
  }
}
</script>

<style scoped>
.section-card {
  padding: 28rpx;
  margin-bottom: 20rpx;
  border-radius: 28rpx;
  background: #f8fafc;
  box-shadow: 0 12rpx 28rpx rgba(15, 23, 42, 0.04);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.section-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #111827;
}

.section-subtitle {
  font-size: 26rpx;
  color: #6b7280;
}

.section-tip {
  display: block;
  margin-top: 12rpx;
  margin-bottom: 20rpx;
  font-size: 24rpx;
  color: #64748b;
}

.gallery-scroll {
  width: 100%;
}

.gallery-row {
  display: flex;
  gap: 18rpx;
}

.gallery-image {
  width: 360rpx;
  height: 228rpx;
  border-radius: 24rpx;
  background: #e2e8f0;
  flex-shrink: 0;
}
</style>
