<template>
  <view class="volunteer-category-dropdown">
    <picker
      class="dropdown-picker"
      mode="selector"
      :range="displayOptions"
      range-key="label"
      :value="normalizedValue"
      @change="handleChange"
    >
      <view
        class="dropdown-trigger"
        :class="{
          'dropdown-trigger-compact': compact,
          'dropdown-trigger-borderless': borderless
        }"
      >
        <text
          class="dropdown-trigger-text"
          :class="{ 'dropdown-trigger-text-compact': compact }"
        >{{ currentLabel }}</text>
        <view
          class="dropdown-arrow"
          :class="{ 'dropdown-arrow-compact': compact }"
        ></view>
      </view>
    </picker>
  </view>
</template>

<script>
export default {
  name: 'VolunteerCategoryDropdown',
  props: {
    options: {
      type: Array,
      default() {
        return []
      }
    },
    value: {
      type: [Number, String],
      default: 0
    },
    labelKey: {
      type: String,
      default: 'label'
    },
    placeholder: {
      type: String,
      default: '请选择'
    },
    compact: {
      type: Boolean,
      default: false
    },
    borderless: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    normalizedValue() {
      const options = Array.isArray(this.options) ? this.options : []
      const rawValue = this.value
      const numericValue = Number(rawValue)

      if (Number.isFinite(numericValue) && numericValue >= 0 && numericValue <= options.length - 1) {
        return numericValue
      }

      const stringValue = String(rawValue || '').trim()
      if (!stringValue) {
        return 0
      }

      const matchedIndex = options.findIndex((option, index) => {
        const label = this.resolveOptionLabel(option)
        if (!label) return false

        if (label === stringValue) {
          return true
        }

        const optionValue = option && typeof option === 'object' ? option.value : option
        if (String(optionValue || '').trim() === stringValue) {
          return true
        }

        return String(index) === stringValue
      })

      if (matchedIndex >= 0) {
        return matchedIndex
      }

      return 0
    },
    currentLabel() {
      const option = this.options[this.normalizedValue]
      const label = this.resolveOptionLabel(option)
      return label || this.placeholder
    },
    displayOptions() {
      return (Array.isArray(this.options) ? this.options : []).map((option, index) => ({
        label: this.resolveOptionLabel(option),
        value: this.resolveOptionKey(option, index)
      }))
    }
  },
  methods: {
    handleChange(event) {
      const index = Number(event && event.detail && event.detail.value)
      if (!Number.isFinite(index) || index < 0) {
        return
      }

      this.$emit('change', {
        index,
        option: this.options[index]
      })
    },
    resolveOptionLabel(option) {
      if (!option && option !== 0) {
        return ''
      }

      if (typeof option === 'object') {
        const value = option[this.labelKey]
        return value === undefined || value === null ? '' : String(value).trim()
      }

      return String(option).trim()
    },
    resolveOptionKey(option, index) {
      if (option && typeof option === 'object') {
        if (option.value !== undefined && option.value !== null && option.value !== '') {
          return option.value
        }

        const label = this.resolveOptionLabel(option)
        if (label) {
          return `${label}-${index}`
        }
      }

      return index
    }
  }
}
</script>

<style scoped>
.volunteer-category-dropdown {
  position: relative;
  width: 100%;
  min-width: 0;
  z-index: 40;
}

.dropdown-picker {
  display: block;
  width: 100%;
}

.dropdown-trigger {
  position: relative;
  height: var(--control-height, 76rpx);
  padding: 0 24rpx;
  border-radius: 18rpx;
  background: linear-gradient(180deg, #ffffff, var(--control-bg, #f8fafc));
  border: 1rpx solid rgba(226, 232, 240, 0.95);
  box-shadow: 0 8rpx 20rpx rgba(15, 23, 42, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  box-sizing: border-box;
}

.dropdown-trigger-compact {
  padding: 0 10rpx;
  border-radius: 16rpx;
}

.dropdown-trigger-borderless {
  background: var(--control-bg, #ffffff);
  border: 1rpx solid var(--control-border, #e5e7eb);
  box-shadow: none;
}

.dropdown-trigger-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 30rpx;
  font-weight: 400;
  color: var(--control-text, #374151);
}

.dropdown-trigger-text-compact {
  font-size: 22rpx;
}

.dropdown-arrow {
  width: 16rpx;
  height: 16rpx;
  flex-shrink: 0;
  border-right: 4rpx solid #94a3b8;
  border-bottom: 4rpx solid #94a3b8;
  transform: rotate(45deg) translateY(-2rpx);
}

.dropdown-arrow-compact {
  width: 10rpx;
  height: 10rpx;
  border-right-width: 3rpx;
  border-bottom-width: 3rpx;
}
</style>
