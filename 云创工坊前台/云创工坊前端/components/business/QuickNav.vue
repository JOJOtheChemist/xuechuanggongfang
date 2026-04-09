<template>
  <view class="quick-nav-container">
    <view class="grid-container">
      <view
        v-for="(item, index) in menuItems"
        :key="index"
        class="nav-card"
        hover-class="nav-card-hover"
        @click="handleCardClick(item, index)"
      >
        <view v-if="hasArticles(item)" class="tag-badge">有干货</view>
        <view class="icon-circle" :class="item.theme">
          <!-- SVG 渲染 -->
          <image 
            v-if="item.svgDataUri" 
            :src="item.svgDataUri" 
            class="icon-svg" 
            mode="aspectFit"
          />
        </view>
        <view class="main-title">{{ item.title }}</view>
        <view class="sub-title">{{ item.subTitle }}</view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: "QuickNav",
  props: {
    businessData: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      menuItems: [
        {
          "title": "考公",
          "subTitle": "公考培优",
          "theme": "theme-red",
          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11m16-11v11M8 14v3m4-3v3m4-3v3"/></svg>`
        },
        {
          "title": "考编",
          "subTitle": "考编特训",
          "theme": "theme-orange",
          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`
        },
        {
          "title": "考研",
          "subTitle": "考研菁英",
          "theme": "theme-purple",
          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`
        },
        {
          "title": "就业",
          "subTitle": "定向就业",
          "theme": "theme-blue",
          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`
        },
        {
          "title": "教资",
          "subTitle": "教师资格证",
          "theme": "theme-orange",
          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`
        },
        {
          "title": "升学",
          "subTitle": "升学规划",
          "theme": "theme-cyan",
          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`
        },
        {
          "title": "四六级",
          "subTitle": "英语四六级",
          "theme": "theme-purple",
          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`
        },
        {
          "title": "专升本",
          "subTitle": "专升本",
          "theme": "theme-cyan",
          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>`
        },
        {
          "title": "计算机",
          "subTitle": "计算机二级",
          "theme": "theme-blue",
          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`
        },
        {
          "title": "驾校",
          "subTitle": "驾校报名",
          "theme": "theme-green",
          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`
        },
        {
          "title": "勤工",
          "subTitle": "勤工俭学",
          "theme": "theme-green",
          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.7-3.7a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0l-3.7 3.7z"></path><path d="M11 7L2 16l1 1 5 5 9-9"></path><line x1="18" y1="2" x2="22" y2="6"></line><line x1="15" y1="10" x2="18" y2="13"></line></svg>`
        },
        {
          "title": "棉被",
          "subTitle": "新生棉被",
          "theme": "theme-pink",
          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v9"></path></svg>`
        },
        {
          "title": "考证",
          "subTitle": "应急人社考证",
          "theme": "theme-purple",
          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="12" cy="10" r="2"></circle><path d="M8 16v-1a4 4 0 0 1 8 0v1"></path></svg>`
        },
        {
          "title": "动态",
          "subTitle": "相关动态",
          "theme": "theme-orange",
          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8"></path><path d="M15 18h-5"></path><path d="M10 6h8v4h-8V6Z"></path></svg>`
        },
        {
          "title": "新人",
          "subTitle": "分享赚积分",
          "theme": "theme-red",
          "svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-7 24 24 0 0 1 7 7c0 2-3 3-3 3"></path><polyline points="15 12 12 15 9 12"></polyline></svg>`
        }
      ]
    };
  },
  created() {
    this.processSvgs();
  },
  methods: {
    processSvgs() {
      const themeColors = {
        'theme-red': '#EF4444',
        'theme-purple': '#8B5CF6',
        'theme-blue': '#3B82F6',
        'theme-green': '#10B981',
        'theme-orange': '#F97316',
        'theme-pink': '#EC4899',
        'theme-cyan': '#06B6D4'
      };

      this.menuItems = this.menuItems.map(item => {
        const color = themeColors[item.theme] || '#333333';
        // Inject stroke color
        let svg = item.svg;
        
        // 简单替换：如果 svg 标签里没有 stroke，就加上。如果有，不确定位置。
        // 但原始 svg 都是 <svg ...>... content ...</svg>
        // 大部分 icon 是 stroke 风格，没有 fill。
        // 原始 CSS: stroke: currentColor; fill: none; stroke-width: 2;
        
        // 我们需要把这些样式内联进去，因为 image src 里的 svg 不受外部 css 控制
        // 替换 <svg ...> 为 <svg stroke="color" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ...>
        
        svg = svg.replace('<svg', `<svg stroke="${color}" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`);
        
        // Encode SVG
        const encoded = encodeURIComponent(svg);
        const dataUri = `data:image/svg+xml;charset=utf-8,${encoded}`;
        
        return {
          ...item,
          svgDataUri: dataUri
        };
      });
    },
    handleCardClick(item, index) {
      this.$emit('click', { item, index });
    },
    hasArticles(navItem) {
      if (!this.businessData || !this.businessData.length) return false;
      const found = this.businessData.find(bItem =>
        bItem.short === navItem.title ||
        bItem.title === navItem.title ||
        bItem.title.includes(navItem.title)
      );
      return found && found.hasArticles;
    }
  }
};
</script>

<style scoped>
/* --- 全局设置 --- */
.quick-nav-container {
  width: 100%;
  padding: 20rpx;
  box-sizing: border-box;
}

/* --- 栅格布局 --- */
.grid-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx; /* Reduced gap */
  padding-bottom: 0; /* Removed bottom padding entirely */
}

/* --- 单个卡片样式 --- */
.nav-card {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 16rpx 0; /* Aggressively reduced vertical padding */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.02), 
              0 0 0 1rpx rgba(0, 0, 0, 0.01); 
  transition: all 0.2s ease;
  position: relative;
}

/* 恢复误删的标签样式 */
.tag-badge {
  position: absolute;
  top: 0;
  right: 0;
  background: linear-gradient(135deg, #ff4d4f, #f5222d);
  color: #fff;
  font-size: 16rpx;
  font-weight: 600;
  padding: 2rpx 8rpx;
  border-top-right-radius: 32rpx;
  border-bottom-left-radius: 12rpx;
  z-index: 10;
  box-shadow: -1rpx 1rpx 2rpx rgba(0,0,0,0.1);
}

.nav-card-hover {
  transform: scale(0.98);
  background-color: #FAFAFA;
}

/* --- 核心：淡雅圆底区域 --- */
.icon-circle {
  width: 56rpx; /* Further reduced from 64rpx */
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx; /* Tighter spacing */
  transition: transform 0.2s;
}

/* SVG 图标通用样式 */
.icon-svg {
  width: 32rpx; /* Reduced from 40rpx */
  height: 32rpx;
}

/* --- 文字区域 --- */
.main-title {
  font-size: 30rpx; /* Slightly reduced */
  font-weight: 700;
  color: #333333;
  margin-bottom: 4rpx;
  letter-spacing: 0.6rpx;
  margin-top: -16rpx;
  position: relative;
  z-index: 2;
}

.sub-title {
  font-size: 22rpx; /* Increased from 20rpx */
  color: #999999;
  font-weight: 400;
  margin-top: 2rpx;
}

/* --- 颜色主题 --- */
/* 注意：这里只控制背景色，前景色(icon颜色)已在 SVG 生成时处理 */
.theme-red { background-color: #FEF2F2; }
.theme-purple { background-color: #F3F0FF; }
.theme-blue { background-color: #EFF6FF; }
.theme-green { background-color: #ECFDF5; }
.theme-orange { background-color: #FFF7ED; }
.theme-pink { background-color: #FDF2F8; }
.theme-cyan { background-color: #ECFEFF; }

</style>
