<template>
  <view class="privacy-page">
    <view class="content-wrapper">
      <view class="title">{{ title }}</view>
      <scroll-view scroll-y class="text-content">
        <text class="text-body">{{ content }}</text>
      </scroll-view>
    </view>
    
    <view class="footer">
      <button class="btn-confirm" @click="handleConfirm">我已阅读并知晓</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      type: '',
      title: '',
      content: ''
    }
  },
  onLoad(options) {
    this.type = options.type || 'privacy'
    this.initContent()
  },
  methods: {
    initContent() {
      if (this.type === 'service') {
        this.title = '用户服务协议'
        this.content = `1. 协议的接受与生效
你在使用学创工坊小程序（以下简称“本小程序”）的服务前，必须自主阅读并充分理解本协议及《学创工坊小程序隐私政策》的全部内容。
本小程序不会默认强制你同意本协议及隐私政策，你需要自主选择点击“同意”或“不同意”按钮：
- 点击“同意”，视为你已认可并接受本协议及隐私政策的全部内容，本协议随即生效，你可以正常使用本小程序的服务
- 点击“不同意”，你将无法使用本小程序的服务，本协议不会对你产生约束力
若你未满18周岁，请在法定监护人的陪同下阅读本协议及隐私政策，取得法定监护人同意后再选择是否使用本服务。

2. 账号使用规范
- 你注册、登录本小程序账号，需提供真实有效的信息，若信息不真实导致的问题，由你自行承担责任
- 你不得利用本小程序进行任何违法违规的行为，包括但不限于发布违法内容、干扰小程序运营等

3. 服务的变更与终止
- 本小程序有权根据运营需要调整服务内容，调整前会进行公示
- 若你违反本协议或相关规则，本小程序有权中断或终止对你的服务`
      } else {
        this.title = '隐私政策'
        this.content = `1. 隐私政策的同意规则
在使用本小程序服务前，请你自主阅读本隐私政策的全部内容，本小程序不会默认获取你的同意授权，你需自主选择“同意”或“不同意”：
- 选择“同意”，我们将按照本政策收集、使用、存储和保护你的个人信息
- 选择“不同意”，你将无法使用本小程序的服务

2. 个人信息的收集与使用
- 我们仅会收集为实现本小程序服务功能所必需的个人信息，包括但不限于账号注册信息、服务使用过程中产生的操作数据，不会收集无关信息
- 收集个人信息前，会明确告知你收集的目的、方式和范围，仅在你自主同意后进行收集

3. 个人信息的保护与管理
- 我们会采用符合业界标准的安全措施保护你的个人信息，防止信息泄露、损坏
- 你可以随时查看、修改自己的个人信息，也可以申请删除个人信息

4. 隐私政策的更新
我们会适时更新本隐私政策，更新后会在小程序内以显著方式通知你，你需要自主阅读更新后的内容并选择是否同意`
      }
      
      uni.setNavigationBarTitle({
        title: this.title
      })
    },
    
    handleConfirm() {
      uni.navigateBack()
    }
  }
}
</script>

<style scoped>
.privacy-page {
  min-height: 100vh;
  background-color: #fff;
  display: flex;
  flex-direction: column;
}

.content-wrapper {
  flex: 1;
  padding: 40rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 40rpx;
  text-align: center;
}

.text-content {
  flex: 1;
  overflow-y: auto;
}

.text-body {
  font-size: 28rpx;
  color: #666;
  line-height: 1.8;
  white-space: pre-wrap;
}

.footer {
  padding: 30rpx 40rpx;
  background-color: #fff;
  border-top: 1rpx solid #eee;
  padding-bottom: calc(30rpx + env(safe-area-inset-bottom));
}

.btn-confirm {
  background: #7C3AED;
  color: #fff;
  border-radius: 50rpx;
  font-size: 30rpx;
  font-weight: 500;
}

.btn-confirm:active {
  opacity: 0.9;
}
</style>
