Component({
  data: {
    selected: 0,
    color: '#6b7280',
    selectedColor: '#4f46e5',
    // 暂时隐藏主菜单发布入口，后续如需恢复改回 true 即可。
    showCenterPublish: false,
    list: [
      {
        pagePath: '/pages/dashboard/index',
        text: '广场',
        iconPath: '/static/icons/nav-home.svg',
        selectedIconPath: '/static/icons/nav-home.svg'
      },
      {
        pagePath: '/pages/business/index',
        text: '学习',
        iconPath: '/static/icons/nav-chat.svg',
        selectedIconPath: '/static/icons/nav-chat.svg'
      },
      {
        pagePath: '/pages/volunteer/index',
        text: '志愿',
        iconPath: '/static/icons/nav-volunteer.svg',
        selectedIconPath: '/static/icons/nav-volunteer.svg'
      },
      {
        pagePath: '/pages/task-center/index',
        text: '创业',
        iconPath: '/static/icons/nav-chart.svg',
        selectedIconPath: '/static/icons/nav-chart.svg'
      },
      {
        pagePath: '/pages/profile/index',
        text: '我的',
        iconPath: '/static/icons/nav-user.svg',
        selectedIconPath: '/static/icons/nav-user.svg'
      }
    ]
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path
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
        itemList: ['快速发布动态'],
        success: (res) => {
          if (res.tapIndex !== 0) return
          wx.navigateTo({
            url: '/subpackages/forum/publish'
          })
        }
      })
    }
  }
})
