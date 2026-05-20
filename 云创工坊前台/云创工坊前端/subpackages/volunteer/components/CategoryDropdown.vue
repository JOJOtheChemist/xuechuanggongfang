<template>
  <view
    class="volunteer-category-dropdown"
    :class="{ 'volunteer-category-dropdown-open': visible }"
  >
    <view
      v-if="visible"
      class="dropdown-mask"
      @tap="close"
      @touchmove.stop.prevent="noop"
    ></view>

    <view
      class="dropdown-trigger"
      :class="{
        'dropdown-trigger-compact': compact,
        'dropdown-trigger-borderless': borderless
      }"
      @tap.stop="toggle"
    >
      <text
        class="dropdown-trigger-text"
        :class="{ 'dropdown-trigger-text-compact': compact }"
      >{{ currentLabel }}</text>
      <view
        class="dropdown-arrow"
        :class="{
          'dropdown-arrow-open': visible,
          'dropdown-arrow-compact': compact
        }"
      ></view>
    </view>

    <view
      v-if="visible"
      class="dropdown-panel"
      :class="{ 'dropdown-panel-compact': compact }"
      @tap.stop
    >
      <scroll-view
        class="dropdown-scroll"
        scroll-y
        :show-scrollbar="false"
        :style="{ height: panelHeight }"
      >
        <view
          v-for="(option, index) in displayOptions"
          :key="option.renderKey"
          class="dropdown-option"
          :class="{ 'dropdown-option-active': index === normalizedValue }"
          @tap.stop="selectOption(index)"
        >
          <text class="dropdown-option-text">{{ option.label }}</text>
          <view
            class="dropdown-option-marker"
            :class="{ 'dropdown-option-marker-active': index === normalizedValue }"
          >
            <view v-if="index === normalizedValue" class="dropdown-option-marker-dot"></view>
          </view>
        </view>
      </scroll-view>
    </view>
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
      type: Number,
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
  data() {
    return {
      visible: false
    }
  },
  computed: {
    normalizedValue() {
      const nextValue = Number(this.value)
      if (!Number.isFinite(nextValue) || nextValue < 0) {
        return 0
      }

      if (nextValue > this.options.length - 1) {
        return Math.max(this.options.length - 1, 0)
      }

      return nextValue
    },
    currentLabel() {
      const option = this.options[this.normalizedValue]
      const label = this.resolveOptionLabel(option)
      return label || this.placeholder
    },
    panelHeight() {
      const visibleCount = Math.min(Math.max(this.options.length, 1), 6)
      return `${visibleCount * 92}rpx`
    },
    displayOptions() {
      return (Array.isArray(this.options) ? this.options : []).map((option, index) => {
        return {
          data: option,
          label: this.resolveOptionLabel(option),
          renderKey: `dropdown-${this.resolveOptionKey(option, index)}`
        }
      })
    }
  },
  methods: {
    toggle() {
      this.visible = !this.visible
    },
    close() {
      this.visible = false
    },
    selectOption(index) {
      this.$emit('change', {
        index,
        option: this.options[index]
      })
      this.close()
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
    },
    noop() {}
  }
}
</script>

<style scoped>
.volunteer-category-dropdown {
  position: relative;
  min-width: 0;
  z-index: 40;
}

.volunteer-category-dropdown-open {
  z-index: 80;
}

.dropdown-mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: transparent;
  z-index: 70;
}

.dropdown-trigger {
  position: relative;
  z-index: 82;
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

.volunteer-category-dropdown-open .dropdown-trigger {
  border-color: rgba(109, 40, 217, 0.24);
  box-shadow: 0 12rpx 28rpx rgba(15, 23, 42, 0.08);
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

.volunteer-category-dropdown-open .dropdown-trigger-borderless {
  border-color: var(--control-border, #e5e7eb);
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
  transition: transform 0.2s ease;
}

.dropdown-arrow-open {
  transform: rotate(-135deg) translateY(-1rpx);
}

.dropdown-arrow-compact {
  width: 10rpx;
  height: 10rpx;
  border-right-width: 3rpx;
  border-bottom-width: 3rpx;
}

.dropdown-panel {
  position: absolute;
  top: calc(100% + 16rpx);
  left: 0;
  width: 100%;
  padding: 12rpx;
  border-radius: 24rpx;
  background: #ffffff;
  border: 1rpx solid rgba(226, 232, 240, 0.95);
  box-shadow: 0 24rpx 48rpx rgba(15, 23, 42, 0.14);
  box-sizing: border-box;
  z-index: 81;
}

.dropdown-panel-compact {
  min-width: 200rpx;
}

.dropdown-scroll {
  min-height: 92rpx;
}

.dropdown-option {
  min-height: 84rpx;
  padding: 18rpx 20rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  box-sizing: border-box;
}

.dropdown-option + .dropdown-option {
  margin-top: 8rpx;
}

.dropdown-option-active {
  background: var(--primary-soft, #ede9fe);
}

.dropdown-option-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 28rpx;
  font-weight: 400;
  line-height: 1.5;
  color: var(--control-text, #374151);
}

.dropdown-option-active .dropdown-option-text {
  color: var(--primary-text, #6d28d9);
}

.dropdown-option-marker {
  width: 28rpx;
  height: 28rpx;
  flex-shrink: 0;
  border-radius: 14rpx;
  border: 2rpx solid #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.dropdown-option-marker-active {
  border-color: var(--primary-text, #6d28d9);
  background: #ffffff;
}

.dropdown-option-marker-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 6rpx;
  background: var(--primary-text, #6d28d9);
}
</style>
