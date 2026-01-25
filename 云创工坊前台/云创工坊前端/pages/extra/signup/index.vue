<template>
  <view class="signup-page">
		<!-- Readonly Status Bar -->
		<view v-if="isReadonly" class="readonly-banner">
			<text class="readonly-text">当前为订单详情查看模式 (仅供浏览)</text>
		</view>

    <!-- 顶部业务卡片 -->
    <view class="business-card" :style="{ backgroundColor: business.bgColor || '#e0e7ff' }">
      <view class="card-content">
        <view class="icon-box">
          <text class="icon-text">{{ business.short || '业务' }}</text>
        </view>
        <text class="business-title">{{ business.title || '加载中...' }}</text>
        <text class="business-desc">{{ business.desc || '暂无简介' }}</text>
        <text class="contact-hint">{{ isReadonly ? '查看用户报名详细信息' : '填写报名信息，提交后工作人员将尽快与您联系' }}</text>
      </view>
    </view>

    <!-- [NEW] 无权限提示 -->
    <view v-if="permissionDenied" class="permission-denied-container">
      <view class="denied-icon-wrap">
        <text class="denied-icon-text">🔒</text>
      </view>
      <text class="denied-title">无查看权限</text>
      <text class="denied-desc">仅直推上级（直接邀请人）可查看详细信息</text>
    </view>

    <!-- 报名表单区域 -->
    <view v-else class="form-container">



      <!-- 当前用户信息 -->
      <view class="user-info-row">
        <image :src="userAvatar || '/static/logo.png'" class="avatar" mode="aspectFill"></image>
        <view class="info-col">
          <text class="nickname">{{ userNickname || '用户' }}</text>
          <text class="uid">ID: {{ userId ? userId.substr(-6) : '...' }}</text>
        </view>
      </view>

      <!-- 姓名 -->
      <view class="input-group">
        <view class="label-row">
          <text class="required">*</text>
          <text class="label">姓名</text>
        </view>
        <input
          class="input"
          type="text"
          v-model="form.name"
          placeholder="请输入您的姓名"
          placeholder-class="placeholder"
					:disabled="isReadonly"
        />
      </view>

      <!-- 电话 -->
      <view class="input-group">
        <view class="label-row">
          <text class="required">*</text>
          <text class="label">电话</text>
        </view>
        <input
          class="input"
          type="number"
          v-model="form.mobile"
          placeholder="请输入您的手机号码"
          placeholder-class="placeholder"
					:disabled="isReadonly"
        />
      </view>


      <!-- 民族 -->
      <view class="input-group" v-if="!isConsult">
        <view class="label-row">
          <text class="required">*</text>
          <text class="label">民族</text>
        </view>
        <picker mode="selector" :range="nationOptions" @change="onNationChange" :disabled="isReadonly">
          <view class="picker-display">
            <text :class="form.nation ? 'picker-text' : 'picker-placeholder'">
              {{ form.nation || '请选择民族' }}
            </text>
          </view>
        </picker>
      </view>

      <!-- 年龄（咨询类专用） -->
      <view class="input-group" v-if="isConsult">
        <view class="label-row">
          <text class="required">*</text>
          <text class="label">年龄</text>
        </view>
        <input
          class="input"
          type="number"
          v-model="form.age"
          placeholder="请输入您的年龄"
          placeholder-class="placeholder"
					:disabled="isReadonly"
        />
      </view>

      <!-- 微信号（咨询类必填，其他选填） -->
      <view class="input-group">
        <view class="label-row">
          <text class="required" v-if="isConsult">*</text>
          <text class="label">{{ isConsult ? '微信号' : '微信号（选填）' }}</text>
        </view>
        <input
          class="input"
          type="text"
          v-model="form.wechatId"
          :placeholder="isConsult ? '请输入您的微信号' : '请输入您的微信号（可选）'"
          placeholder-class="placeholder"
					:disabled="isReadonly"
        />
      </view>



      <!-- 学校 -->
      <view class="input-group">
        <view class="label-row">
          <text class="required">*</text>
          <text class="label">学校</text>
        </view>
        <input
          class="input"
          type="text"
          v-model="form.school"
          placeholder="请输入您的学校"
          placeholder-class="placeholder"
					:disabled="isReadonly"
        />
      </view>

      <!-- 入学年份 -->
      <view class="input-group">
        <view class="label-row">
          <text class="required">*</text>
          <text class="label">入学年份</text>
        </view>
        <picker mode="selector" :range="entryYearOptions" @change="onEntryYearChange" :disabled="isReadonly">
          <view class="picker-display">
            <text :class="form.entryYear ? 'picker-text' : 'picker-placeholder'">
              {{ form.entryYear || '请选择入学年份' }}
            </text>
          </view>
        </picker>
      </view>

      <!-- 推荐人 UID（不可编辑） -->
      <view class="input-group">
        <view class="label-row">
          <text class="label">推荐人 UID</text>
        </view>
        <input
          class="input"
          type="text"
          v-model="referrerUid"
          placeholder="暂无推荐人"
          placeholder-class="placeholder"
          disabled
        />
        <text class="helper-text">如果是扫推荐码进来，会自动填充。该项不可修改。</text>
      </view>
    </view>


    <!-- 底部按钮 -->
    <view class="bottom-action" v-if="!isReadonly">
      <button
        class="submit-btn"
        :loading="submitting || payProcessing"
        :disabled="submitting || payProcessing"
        @click="handleSignup"
      >
        {{ submitButtonText }}
      </button>
    </view>
    <!-- Unified Debug Footer -->
    <!-- Hidden recruitment debug tags
    <view class="global-debug" style="margin-top: 40rpx; padding-bottom: 60rpx; font-size: 20rpx; color: #ccc; text-align: center; display: flex; flex-direction: column; gap: 6rpx;">
      <text>UID: {{ global_uid || '未登录' }}</text>
      <text>终身: {{ global_lifetime_inviter }}</text>
      <text>团队: {{ global_team_inviter }}</text>
      <text>业务: {{ global_business_inviter }}</text>
    </view>
    -->
  </view>
</template>

<script>
export default {
  data() {
    return {
      businessId: '',
      business: {},
      userAvatar: '',
      userNickname: '',
      userId: '',
      contactInfo: '',
      remark: '',
			isReadonly: false, // 是否只读模式
      permissionDenied: false, // [NEW] 无权限状态
      submitting: false,
      category: '',
      signupWx: '',
      // 展示用推荐人（可以是姓名或备注）
      referrer: '',
      // 推荐人的 uid（用于后端统计和标记）
      referrerUid: '',
      form: {
        name: '',
        mobile: '',
        wechatId: '',
        nation: '',

        school: '',
      entryYear: ''
      },
      nationOptions: [],


      entryYearOptions: [],
      payProcessing: false,
      currentOrderNo: '', // 当前订单号
      // 这里直接复用 pages/business/index.vue 里的静态配置，保持一致
      // 实际开发中建议抽取到 common/constants.js 或 store 中
      businessItems: [
        {
          id: 1,
          title: '四六级',
          short: '四六级',
          bgColor: '#dbeafe',
          desc: '大学英语四、六级备考规划、真题解析与高分技巧，配套词汇与听力练习资料。',
          type: 'consult'
        },
        {
          id: 2,
          title: '考公',
          short: '考公',
          bgColor: '#fee2e2',
          desc: '最新公考资讯与题库，结合名师课程，帮助你高效备考，稳步上岸。',
          type: 'consult'
        },
        {
          id: 16,
          title: '考编',
          short: '考编',
          bgColor: '#ffedd5',
          desc: '汇集各地事业编考试公告、岗位分析与备考资料，助你顺利入编。',
          type: 'consult'
        },
        {
          id: 4,
          title: '考研',
          short: '考研',
          bgColor: '#e0e7ff',
          desc: '提供全程备考规划、院校专业分析与复试指导，帮你构建系统化学习路径。',
          type: 'consult'
        },
        {
          id: 9,
          title: '就业',
          short: '就业',
          bgColor: '#ccfbf1',
          desc: '为有定向就业需求的同学提供岗位信息、面试机会与用人单位对接通道。',
          type: 'consult'
        },
        {
          id: 6,
          title: '教资',
          short: '教资',
          bgColor: '#ffe4e6',
          desc: '教师资格证报考指南、备考资料与面试技巧，覆盖笔试与面试全流程。',
          type: 'consult'
        },
        {
          id: 15,
          title: '升学',
          short: '升学',
          bgColor: '#bae6fd',
          desc: '为有升学意向的同学提供测评、志愿规划与备考服务，支持一对一定制方案与专属班主任跟踪。',
          type: 'consult'
        },
        {
          id: 5,
          title: '专升本',
          short: '专升本',
          bgColor: '#fef3c7',
          desc: '为专科生量身打造的升学路径，提供报考指南、备考资料与院校分析，助力升学梦想。',
          type: 'consult'
        },
        {
          id: 11,
          title: '计算机',
          short: '计算机',
          bgColor: '#e0f2fe',
          desc: '计算机一级、二级考试大纲解析、真题训练与高频考点梳理，适合零基础快速入门。',
          type: 'consult'
        },
        {
          id: 14,
          title: '棉被品类',
          short: '棉被',
          bgColor: '#fce7f3',
          desc: '精选优质新生棉被，厂家直供，舒适保暖，支持送货到寝，让你的校园生活更温暖。',
          type: 'consult'
        },
        {
          id: 3,
          title: '驾校',
          short: '驾校',
          bgColor: '#dcfce7',
          desc: '提供专业驾考咨询服务，在学创工坊报名咨询，省心报考，高效拿证。',
          type: 'signup'
        },
        {
          id: 7,
          title: '勤工俭学',
          short: '勤工',
          bgColor: '#cffafe',
          desc: '覆盖校内勤工俭学、校外兼职与企业实习，多重审核保障岗位真实可靠。',
          type: 'signup'
        },
        {
          id: 13,
          title: '考证',
          short: '考证',
          bgColor: '#f3e8ff',
          desc: '应急人社考证一站式服务，提供报名咨询、考前培训与证书领取全流程支持。',
          type: 'signup'
        },
        {
          id: 12,
          title: '新人分享',
          short: '分享',
          bgColor: '#fee2ff',
          desc: '邀请好友加入学创工坊，共享优质校园服务资源，领取丰厚推广奖励。',
          type: 'share'
        }
      ]
    }
  },
  computed: {
    // 是否是咨询类业务
    isConsult() {
      return this.business && this.business.type === 'consult'
    },
    // 是否需要支付
    // [MOD] 2025-01-06 全面关闭支付逻辑，直接提交报名
    isPaymentRequired() {
      return false
    },
    // 底部按钮文案
    submitButtonText() {
      if (this.submitting || this.payProcessing) {
        return this.isPaymentRequired ? '处理中...' : '提交中...'
      }
      if (this.isConsult) {
        return '立即咨询'
      }
      return this.isPaymentRequired ? '报名并支付（¥1）' : '立即报名'
    }
  },
  onLoad(options) {
    this.checkLogin()

		// [NEW] 处理只读模式
		if (options.mode === 'readonly') {
			this.isReadonly = true
			uni.setNavigationBarTitle({ title: '订单详情' })
			// 读取缓存中的订单数据 (主要为了拿 ID)
			const cachedItem = uni.getStorageSync('current_order_detail')
			
			if (cachedItem && cachedItem.id) {
				console.log('[signup] Readonly mode, fetching detail for id:', cachedItem.id)
				// 尝试调用云函数获取完整详情
				this.fetchSignupDetail(cachedItem.id)
			} else {
				console.warn('[signup] No signup ID found in cache')
			}
		}

    if (options.id) {
      this.businessId = Number(options.id)
      this.loadBusinessInfo()
    } else {
			// [FIX] 只读模式下可能没有 id 参数（已从 fetchSignupDetail 获取），不应跳转
			if (!this.isReadonly) {
				uni.showToast({ title: '缺少业务参数', icon: 'none' })
				setTimeout(() => uni.switchTab({ url: '/pages/dashboard/index' }), 1500)
			}
    }

    if (options.category) {
      this.category = decodeURIComponent(options.category)
    }

    // [双重保险] 优先从 URL 获取邀请人 (支持 inviter_id 和老的 referrer 参数)
    const inviterId = options.inviter_id || options.referrer ? decodeURIComponent(options.inviter_id || options.referrer) : ''
    const refName = options.referrerName ? decodeURIComponent(options.referrerName) : ''
    
    if (inviterId) {
      this.referrerUid = inviterId
      this.referrer = refName || inviterId
      this.signupWx = refName || ''
      
      // 同步到缓存 (双重保险)
      uni.setStorageSync('pending_business_invite', {
        inviter: inviterId,
        businessId: String(this.businessId),
        timestamp: Date.now(),
        source: 'signup_url'
      })
      console.log('[signup] 从 URL 获取到邀请人并同步缓存:', inviterId)
    } else {
      // [双重保险] 兜底从缓存读取
      const cached = uni.getStorageSync('pending_business_invite')
      // 检查缓存是否存在，且业务 ID 匹配（或者是通用邀请）
      if (cached && cached.inviter && (!cached.businessId || String(cached.businessId) === String(this.businessId))) {
        this.referrerUid = cached.inviter
        this.referrer = cached.inviter
        console.log('[signup] 从缓存恢复业务推荐人:', this.referrerUid)
      } else {
        // [MOD] 移除兜底使用当前用户的逻辑：没有推荐人就是没有，保持为空
        this.referrerUid = ''
        this.referrer = ''
      }
      this.signupWx = ''
    }

    const currentYear = new Date().getFullYear()
    const years = []
    for (let i = 0; i < 8; i++) {
      years.push(String(currentYear - i))
    }
    this.entryYearOptions = years

    // 初始化一些基础选项（如未配置可在此处调整）
    this.nationOptions = ['汉族', '回族', '藏族', '维吾尔族', '蒙古族', '其他']



    this.loadUserInfo()
    
    // [NEW] 立即记录业务邀请查看 (解决老用户已登录不触发 loginByWeixin 的问题)
    this.recordBusinessInviteView()
  },
  methods: {
    // 处理报名（包含支付流程）
    async handleSignup() {
      if (this.submitting || this.payProcessing) return

      if (this.isPaymentRequired) {
        // 先验证表单
        if (!this.validateForm()) {
          return
        }
        // 调用真实支付
        await this.processPayment()
      } else {
        // 不需要支付的业务，直接走报名
        await this.submitSignup()
      }
    },
    // 验证表单
    validateForm() {
      if (!this.form.name) {
        uni.showToast({ title: '请填写姓名', icon: 'none' })
        return false
      }
      if (!this.form.mobile) {
        uni.showToast({ title: '请填写手机号码', icon: 'none' })
        return false
      }

      // 根据业务类型区分校验逻辑
      if (this.isConsult) {
        // 咨询类：必填 年龄、微信号
        if (!this.form.age) {
          uni.showToast({ title: '请填写年龄', icon: 'none' })
          return false
        }
        if (!this.form.wechatId) {
          uni.showToast({ title: '请填写微信号', icon: 'none' })
          return false
        }
      } else {
        if (!this.form.nation) {
          uni.showToast({ title: '请选择民族', icon: 'none' })
          return false
        }

      }

      // 公共必填
      if (!this.form.school) {
        uni.showToast({ title: '请选择学校', icon: 'none' })
        return false
      }
      if (!this.form.entryYear) {
        uni.showToast({ title: '请选择入学年份', icon: 'none' })
        return false
      }
      return true
    },
    // 真实支付流程：先报名，再支付
    async processPayment() {
      this.payProcessing = true
      try {
        // 1. 先提交报名，获得 signup_id
        const signupId = await this.submitSignupAndGetId()
        if (!signupId) {
          throw new Error('报名提交失败')
        }

        // 2. 创建支付订单，关联 signup_id
        const token = uni.getStorageSync('token')
        const paymentService = uniCloud.importObject('payment-service')
        const res = await paymentService.createOrder({
          _token: token,
          businessId: String(this.businessId),
          businessName: this.business.title,
          amount: 1, // 测试金额
          signupId: signupId
        })

        if (res.code !== 0) {
          throw new Error(res.message || '创建订单失败')
        }

        const orderData = res.data
        this.currentOrderNo = orderData.order_no
        const payParams = orderData.pay_params

        console.log('支付参数:', payParams)

        // 3. 调用微信支付
        await uni.requestPayment({
          timeStamp: payParams.timeStamp,
          nonceStr: payParams.nonceStr,
          package: payParams.package,
          signType: payParams.signType,
          paySign: payParams.paySign
        })

        // 4. 支付成功后，调用后端确认支付并发放奖励
        const confirmRes = await paymentService.confirmPayment({
          _token: token,
          orderNo: this.currentOrderNo
        })

        let content = '支付成功！报名已提交。'
        if (confirmRes.code === 0 && confirmRes.data && confirmRes.data.reward_coins > 0) {
          content += `\n\n给推荐人发放了 ${confirmRes.data.reward_coins} 新币奖励！`
        }

        // 5. 显示成功提示
        uni.showToast({ 
          title: content, 
          icon: 'success',
          duration: 3000
        })
      } catch (error) {
        console.error('支付失败:', error)
        if (error.errMsg && error.errMsg.includes('cancel')) {
          uni.showToast({ title: '已取消支付', icon: 'none' })
        } else {
          uni.showToast({ title: error.message || '支付失败', icon: 'none' })
        }
      } finally {
        this.payProcessing = false
      }
    },
    checkLogin() {
      const token = uni.getStorageSync('token')
      if (!token) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        setTimeout(() => {
          uni.reLaunch({ url: '/pages/auth/login/index' })
        }, 1000)
      }
    },
    loadUserInfo() {
      const userInfo = uni.getStorageSync('userInfo') || {}
      this.userId = uni.getStorageSync('userId')
      this.userAvatar = userInfo.avatar
      this.userNickname = userInfo.nickname
      // 自动填充手机号（如果有）
      if (userInfo.mobile) {
        this.contactInfo = userInfo.mobile
        this.form.mobile = userInfo.mobile
      }
    },
    onNationChange(e) {
      const index = e.detail.value
      this.form.nation = this.nationOptions[index]
    },


    onEntryYearChange(e) {
      const index = e.detail.value
      this.form.entryYear = this.entryYearOptions[index]
    },
    loadBusinessInfo() {
      const item = this.businessItems.find(b => b.id === this.businessId)
      if (item) {
        this.business = item
        uni.setNavigationBarTitle({ title: `报名 - ${item.title}` })
      } else {
        this.business = { title: '未知业务', desc: '无法找到该业务信息' }
      }
    },
    // 提交报名并返回 signup_id（用于支付流程）
    async submitSignupAndGetId() {
      const token = uni.getStorageSync('token')
      if (!token) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return null
      }

      const businessService = uniCloud.importObject('business-service')
      const payload = {
        businessId: String(this.businessId),
        businessName: this.business.title,
        name: this.form.name,
        mobile: this.form.mobile,
        nation: this.form.nation,
        workDuration: this.form.workDuration,
        school: this.form.school,
        entryYear: this.form.entryYear,
        wechatId: this.form.wechatId,
        category: this.category || this.business.title,
        signupWx: this.signupWx,
        referrer: this.referrer,
        referrerUid: this.referrerUid || this.referrer,
        contactInfo: this.form.mobile,
        remark: this.remark,
        age: this.form.age,
        _token: token
      }
      const res = await businessService.submitSignup(payload)

      if (res.code === 0) {
        return res.data.signup_id
      } else {
        uni.showToast({ title: res.message || '报名失败', icon: 'none' })
        return null
      }
    },
    // 单纯报名（不需要支付的业务）
    async submitSignup() {
      const token = uni.getStorageSync('token')
      if (!token) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        setTimeout(() => {
          uni.reLaunch({ url: '/pages/auth/login/index' })
        }, 1000)
        return
      }

      if (!this.validateForm()) {
        return
      }

      this.submitting = true
      try {
        const businessService = uniCloud.importObject('business-service')
        const payload = {
          businessId: String(this.businessId),
          businessName: this.business.title,
          name: this.form.name,
          mobile: this.form.mobile,
          nation: this.form.nation,
          workDuration: this.form.workDuration,
          school: this.form.school,
          entryYear: this.form.entryYear,
          wechatId: this.form.wechatId,
          category: this.category || this.business.title,
          signupWx: this.signupWx,
          referrer: this.referrer,
          referrerUid: this.referrerUid || this.referrer,
          contactInfo: this.form.mobile,
          remark: this.remark,
          age: this.form.age,
          _token: token
        }
        const res = await businessService.submitSignup(payload)

        if (res.code === 0) {
          uni.showModal({
            title: '提示',
            content: '报名成功！',
            showCancel: false,
            success: () => {
              setTimeout(() => {
                uni.switchTab({ url: '/pages/dashboard/index' })
              }, 300)
            }
          })
        } else {
          uni.showToast({ title: res.message || '报名失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: e.message || '提交异常', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },
    
    // [NEW] 记录业务邀请查看日志
    async recordBusinessInviteView() {
      try {
        const token = uni.getStorageSync('token')
        if (!token || !this.referrerUid || !this.businessId) {
          console.log('[signup] 跳过记录: token/referrerUid/businessId缺失')
          return
        }
        
        console.log('[signup] 准备记录业务邀请查看 - inviterId:', this.referrerUid, 'businessId:', this.businessId)
        
        const userCenter = uniCloud.importObject('user-center')
        const res = await userCenter.recordBusinessInviteView({
          _token: token,
          inviterId: this.referrerUid,
          businessId: String(this.businessId)
        })
        
        if (res && res.code === 0) {
          console.log('[signup] 业务邀请查看记录成功:', res.message)
        } else {
          console.warn('[signup] 业务邀请查看记录失败:', res?.message)
        }
      } catch (e) {
        console.error('[signup] 记录业务邀请查看异常:', e)
      }
    },
		

		// [NEW] 获取报名详情 (只读模式用)
		async fetchSignupDetail(signupId) {
			uni.showLoading({ title: '加载详情...' })
			try {
				const token = uni.getStorageSync('token')
				const businessService = uniCloud.importObject('business-service')
				const res = await businessService.getSignupDetail({ 
					signupId,
					_token: token
				})
				
				if (res && res.code === 0 && res.data) {
					const d = res.data
					// 填充表单
					this.form.name = d.name || ''
					this.form.mobile = d.mobile || ''
					this.form.idCard = d.id_card || ''
					this.form.nation = d.nation || ''
					this.form.workDuration = d.work_duration || ''
					this.form.school = d.school || ''
					this.form.entryYear = d.entry_year || ''
					this.form.wechatId = d.wechat_id || ''
					this.form.age = d.age || ''
					
					// 其他字段
					this.referrer = d.referrer || ''
					this.referrerUid = d.referrer_uid || ''
					this.remark = d.remark || ''
					
					// 如果有 business_id，也可以同步更新页面状态
					if (d.business_id) {
						this.businessId = Number(d.business_id)
						this.loadBusinessInfo()
					}
				} else if (res && res.code === -403) {
          // 无权限处理
          this.permissionDenied = true
          uni.showToast({ title: '无权限查看详情', icon: 'none' })
        } else {
					uni.showToast({ title: res.message || '获取详情失败', icon: 'none' })
				}
			} catch(e) {
				console.error('[signup] fetchDetail failed:', e)
				uni.showToast({ title: '加载失败', icon: 'none' })
			} finally {
				uni.hideLoading()
			}
		}
  }
}
</script>

<style scoped>
.signup-page {
  min-height: 100vh;
  background-color: #f8fafc;
  display: flex;
  flex-direction: column;
}

/* 顶部业务卡片 */
.business-card {
  padding: 60rpx 40rpx 80rpx;
  border-bottom-left-radius: 48rpx;
  border-bottom-right-radius: 48rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.05);
}

.card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.icon-box {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50rpx;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.icon-text {
  font-size: 32rpx;
  font-weight: 700;
  color: #1e293b;
}

.business-title {
  font-size: 40rpx;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 16rpx;
}

.business-desc {
  font-size: 28rpx;
  color: #475569;
}

.readonly-banner {
	background-color: #FFF7ED;
	padding: 16rpx 24rpx;
	text-align: center;
	border-bottom: 1rpx solid #FFEDD5;
}

.readonly-text {
	color: #EA580C;
	font-size: 24rpx;
	font-weight: 500;
}

.contact-hint {
  font-size: 28rpx;
  color: #334155;
  font-weight: 700; /* 加粗 */
  margin-top: 24rpx;
  text-align: center;
}

/* 表单区域 */
.form-container {
  flex: 1;
  padding: 0 32rpx;
  margin-top: -40rpx; /* 稍微重叠一点上面的背景 */
}

.section-title {
  margin-bottom: 32rpx;
  padding: 0 16rpx;
}

.title-text {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8rpx;
}

.sub-text {
  display: block;
  font-size: 24rpx;
  color: #64748b;
}

.user-info-row {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.02);
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 40rpx;
  margin-right: 24rpx;
  background-color: #f1f5f9;
}

.info-col {
  display: flex;
  flex-direction: column;
}

.nickname {
  font-size: 28rpx;
  font-weight: 600;
  color: #1e293b;
}

.uid {
  font-size: 22rpx;
  color: #94a3b8;
  margin-top: 4rpx;
}

.input-group {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.02);
}

.label-row {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.required {
  color: #ef4444;
  margin-right: 8rpx;
  font-size: 26rpx;
}

.label {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: #334155;
}

.input {
  font-size: 28rpx;
  color: #0f172a;
  height: 80rpx;
  line-height: 80rpx;
}

.textarea {
  width: 100%;
  height: 160rpx;
  font-size: 28rpx;
  color: #0f172a;
  line-height: 1.5;
}

.placeholder {
  color: #cbd5e1;
}

.helper-text {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #64748b;
}

.info-card {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 20rpx 24rpx;
  margin: 0 16rpx 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.02);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  font-size: 24rpx;
  color: #64748b;
}

.info-value {
  font-size: 24rpx;
  color: #0f172a;
}

.picker-display {
  height: 48rpx;
  display: flex;
  align-items: center;
}

.picker-text {
  font-size: 28rpx;
  color: #0f172a;
}

.picker-placeholder {
  font-size: 28rpx;
  color: #cbd5e1;
}

/* 底部按钮 */
.bottom-action {
  padding: 32rpx 40rpx 60rpx;
  background-color: #ffffff;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.03);
}

/* 假微信支付弹窗样式 */
.pay-mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.pay-dialog {
  width: 640rpx;
  padding: 40rpx 32rpx 32rpx;
  background-color: #ffffff;
  border-radius: 24rpx;
}

.pay-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #111827;
}

.pay-subtitle {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #6b7280;
}

.pay-amount {
  margin-top: 24rpx;
  font-size: 40rpx;
  font-weight: 800;
  color: #16a34a;
}

.pay-buttons {
  margin-top: 32rpx;
  display: flex;
  justify-content: flex-end;
  gap: 24rpx;
}

.pay-btn {
  min-width: 160rpx;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 28rpx;
  border-radius: 999rpx;
}

.pay-btn.cancel {
  background-color: #e5e7eb;
  color: #111827;
}

.pay-btn.confirm {
  background-color: #07c160; /* 微信绿 */
  color: #ffffff;
}

.pay-btn::after {
  border: none;
}

.submit-btn {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: #ffffff;
  border-radius: 50rpx;
  font-size: 32rpx;
  font-weight: 700;
  height: 96rpx;
  line-height: 96rpx;
  box-shadow: 0 8rpx 20rpx rgba(79, 70, 229, 0.3);
}

.submit-btn[disabled] {
  opacity: 0.7;
  background: #94a3b8;
}

.permission-denied-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 40rpx;
  background-color: #fff;
  margin: 32rpx;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.05);
}

.denied-icon-wrap {
  width: 120rpx;
  height: 120rpx;
  background-color: #F1F5F9;
  border-radius: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}

.denied-icon-text {
  font-size: 60rpx;
}

.denied-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 16rpx;
}

.denied-desc {
  font-size: 28rpx;
  color: #64748b;
  text-align: center;
  line-height: 1.6;
}
</style>
