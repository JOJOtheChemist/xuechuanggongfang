Component({
  data: {
    selected: 0,
    color: '#6b7280',
    selectedColor: '#4f46e5',
    list: [
      {
        pagePath: '/subpackages/forum/index',
        text: '论坛',
        iconPath: '/static/icons/bell.svg',
        selectedIconPath: '/static/icons/bell.svg'
      },
      {
        pagePath: '/pages/business/index',
        text: '学习',
        iconPath: '/static/icons/nav-chat.svg',
        selectedIconPath: '/static/icons/nav-chat.svg'
      },
      {
        pagePath: '/pages/dashboard/index',
        text: '首页',
        iconPath: '/static/icons/nav-home.svg',
        selectedIconPath: '/static/icons/nav-home.svg'
      },
      {
        pagePath: '/pages/task-center/index',
        text: '创业中心',
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
    }
  }
})
