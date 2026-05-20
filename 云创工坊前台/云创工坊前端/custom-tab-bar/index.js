const DASHBOARD_ENTRY_PATH = '/pages/dashboard/index'
const FORUM_SUBPACKAGE_PATH = '/subpackages/forum/index'
const VOLUNTEER_ENTRY_PATH = '/subpackages/volunteer/guide-redirect'
const NAV_PLUS_ICON_URL = '/static/icons/nav-plus.svg'
const TABBAR_ICON_URLS = {
  forum: '/static/tabbar/nav-forum-source.png',
  business: '/static/tabbar/nav-study-source.png',
  volunteer: '/static/tabbar/nav-volunteer-source.png',
  tasks: '/static/tabbar/nav-startup-source.png',
  profile: '/static/tabbar/nav-profile-source.png'
}

Component({
  data: {
    selected: 0,
    color: '#6b7280',
    selectedColor: '#2563eb',
    navPlusIconUrl: NAV_PLUS_ICON_URL,
    // 广场页自带悬浮发布按钮，这里保持普通五栏导航。
    showCenterPublish: false,
    list: [
      {
        pagePath: '/pages/dashboard/index',
        text: '广场',
        iconPath: TABBAR_ICON_URLS.forum
      },
      {
        pagePath: '/pages/business/index',
        text: '学习',
        iconPath: TABBAR_ICON_URLS.business
      },
      {
        pagePath: VOLUNTEER_ENTRY_PATH,
        text: '志愿',
        iconPath: TABBAR_ICON_URLS.volunteer
      },
      {
        pagePath: '/pages/task-center/index',
        text: '创业',
        iconPath: TABBAR_ICON_URLS.tasks
      },
      {
        pagePath: '/pages/profile/index',
        text: '我的',
        iconPath: TABBAR_ICON_URLS.profile
      }
    ]
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path
      if (url === DASHBOARD_ENTRY_PATH) {
        wx.reLaunch({
          url: FORUM_SUBPACKAGE_PATH,
          fail: () => {
            wx.navigateTo({ url: FORUM_SUBPACKAGE_PATH })
          }
        })
        return
      }
      if (url === VOLUNTEER_ENTRY_PATH) {
        wx.navigateTo({
          url: VOLUNTEER_ENTRY_PATH,
          fail: () => {
            wx.reLaunch({ url: VOLUNTEER_ENTRY_PATH })
          }
        })
        return
      }
      wx.switchTab({
        url,
        fail: () => {
          wx.reLaunch({ url })
        }
      })
    },
    openQuickPublish() {
      const token = wx.getStorageSync('token') || ''
      if (!token) {
        wx.showModal({
          title: '请先登录',
          content: '发布动态需要先完成登录。',
          confirmText: '去登录',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/auth/login/index'
              })
            }
          }
        })
        return
      }

      wx.showActionSheet({
        itemList: ['发布动态暂未开放'],
        success: (res) => {
          if (res.tapIndex !== 0) return
          wx.showToast({ title: '暂未开放', icon: 'none' })
        }
      })
    }
  }
})
