<template>
  <view v-if="visible" class="publish-profile-mask" @tap="handleMaskTap">
    <view class="publish-profile-dialog" @tap.stop>
      <text class="publish-profile-title">发布前完善信息</text>
      <text class="publish-profile-desc">首次发布动态前，请先填写学校、手机号和学号，用于内容安全备案。</text>

      <view class="publish-profile-field">
        <text class="publish-profile-label">学校</text>
        <input
          class="publish-profile-input"
          :value="form.school"
          maxlength="50"
          placeholder="请输入学校名称"
          placeholder-class="publish-profile-placeholder"
          @input="handleInput('school', $event)"
        />
      </view>

      <view class="publish-profile-field">
        <text class="publish-profile-label">手机号</text>
        <input
          class="publish-profile-input"
          :value="form.phone"
          type="number"
          maxlength="11"
          placeholder="请输入手机号"
          placeholder-class="publish-profile-placeholder"
          @input="handleInput('phone', $event)"
        />
      </view>

      <view class="publish-profile-field">
        <text class="publish-profile-label">学号</text>
        <input
          class="publish-profile-input"
          :value="form.studentId"
          maxlength="30"
          placeholder="请输入学号"
          placeholder-class="publish-profile-placeholder"
          @input="handleInput('studentId', $event)"
        />
      </view>

      <view class="publish-profile-actions">
        <button class="publish-profile-btn cancel" :disabled="loading" @tap="handleClose">取消</button>
        <button class="publish-profile-btn confirm" :loading="loading" :disabled="loading" @tap="handleConfirm">保存并继续</button>
      </view>
    </view>
  </view>
</template>

<script>
import { isValidForumPublishPhone } from '@/utils/forum-publish-profile'

function buildForm(source = {}) {
  return {
    school: String(source.school || '').trim(),
    phone: String(source.phone || '').trim(),
    studentId: String(source.studentId || '').trim()
  }
}

export default {
  name: 'ForumPublishProfileDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    },
    initialValue: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      form: buildForm(this.initialValue)
    }
  },
  watch: {
    initialValue: {
      immediate: true,
      deep: true,
      handler(value) {
        this.form = buildForm(value)
      }
    },
    visible(value) {
      if (value) {
        this.form = buildForm(this.initialValue)
      }
    }
  },
  methods: {
    handleMaskTap() {
      if (this.loading) return
      this.handleClose()
    },
    handleClose() {
      this.$emit('close')
    },
    handleInput(field, event) {
      const nextValue = event && event.detail ? event.detail.value : ''
      this.form = Object.assign({}, this.form, {
        [field]: String(nextValue || '')
      })
    },
    handleConfirm() {
      const payload = buildForm(this.form)

      if (!payload.school) {
        uni.showToast({ title: '请填写学校', icon: 'none' })
        return
      }
      if (!payload.phone) {
        uni.showToast({ title: '请填写手机号', icon: 'none' })
        return
      }
      if (!isValidForumPublishPhone(payload.phone)) {
        uni.showToast({ title: '请输入正确手机号', icon: 'none' })
        return
      }
      if (!payload.studentId) {
        uni.showToast({ title: '请填写学号', icon: 'none' })
        return
      }

      this.$emit('confirm', payload)
    }
  }
}
</script>

<style scoped>
.publish-profile-mask {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
  box-sizing: border-box;
  background: rgba(15, 23, 42, 0.52);
}

.publish-profile-dialog {
  width: 100%;
  background: #ffffff;
  border-radius: 28rpx;
  padding: 32rpx 28rpx;
  box-sizing: border-box;
  box-shadow: 0 24rpx 64rpx rgba(15, 23, 42, 0.18);
}

.publish-profile-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #111827;
}

.publish-profile-desc {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: #6b7280;
}

.publish-profile-field {
  margin-top: 24rpx;
}

.publish-profile-label {
  display: block;
  margin-bottom: 12rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: #374151;
}

.publish-profile-input {
  width: 100%;
  height: 84rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  border-radius: 18rpx;
  border: 1rpx solid #e5e7eb;
  background: #f9fafb;
  font-size: 28rpx;
  color: #111827;
}

.publish-profile-placeholder {
  color: #9ca3af;
}

.publish-profile-actions {
  display: flex;
  column-gap: 16rpx;
  margin-top: 30rpx;
}

.publish-profile-btn {
  flex: 1;
  height: 84rpx;
  line-height: 84rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.publish-profile-btn.cancel {
  color: #4b5563;
  background: #f3f4f6;
}

.publish-profile-btn.confirm {
  color: #ffffff;
  background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
}
</style>
