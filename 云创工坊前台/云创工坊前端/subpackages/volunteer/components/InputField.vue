<template>
  <view class="volunteer-input-field" :class="shellClass">
    <input
      class="volunteer-input-field-native"
      :class="inputClass"
      :value="resolvedValue"
      :type="type"
      :disabled="disabled"
      :confirm-type="confirmType"
      :maxlength="maxlength"
      :cursor-spacing="cursorSpacing"
      :adjust-position="adjustPosition"
      :placeholder="placeholder"
      :placeholder-class="placeholderClass"
      @input="handleInput"
      @focus="handleFocus"
      @blur="handleBlur"
      @confirm="handleConfirm"
    />
  </view>
</template>

<script>
export default {
  name: 'VolunteerInputField',
  props: {
    value: {
      type: [String, Number],
      default: ''
    },
    modelValue: {
      type: [String, Number],
      default: undefined
    },
    placeholder: {
      type: String,
      default: ''
    },
    placeholderClass: {
      type: String,
      default: ''
    },
    inputClass: {
      type: String,
      default: ''
    },
    shellClass: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      default: 'text'
    },
    confirmType: {
      type: String,
      default: ''
    },
    disabled: {
      type: Boolean,
      default: false
    },
    maxlength: {
      type: [Number, String],
      default: -1
    },
    cursorSpacing: {
      type: [Number, String],
      default: 24
    },
    adjustPosition: {
      type: Boolean,
      default: false
    },
    lazyModel: {
      type: Boolean,
      default: false
    },
    commitOnBlur: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      innerValue: this.resolveInitialValue(),
      lastCommittedValue: this.resolveInitialValue()
    }
  },
  computed: {
    resolvedValue() {
      return this.innerValue
    }
  },
  watch: {
    value() {
      this.syncInnerValueFromProps()
    },
    modelValue() {
      this.syncInnerValueFromProps()
    }
  },
  methods: {
    resolveInitialValue() {
      return this.modelValue !== undefined && this.modelValue !== null
        ? this.modelValue
        : this.value
    },
    syncInnerValueFromProps() {
      const nextValue = this.resolveInitialValue()
      this.lastCommittedValue = nextValue
      if (nextValue !== this.innerValue) {
        this.innerValue = nextValue
      }
    },
    emitValue(value, force = false) {
      if (!force && value === this.lastCommittedValue) {
        return
      }

      this.lastCommittedValue = value
      this.$emit('update:modelValue', value)
      this.$emit('input', value)
    },
    commitValue(force = false) {
      this.emitValue(this.innerValue, force)
    },
    handleInput(event) {
      const value = event && event.detail ? event.detail.value : ''
      this.innerValue = value
      if (!this.lazyModel) {
        this.emitValue(value)
      }
    },
    handleFocus(event) {
      this.$emit('focus', event)
    },
    handleBlur(event) {
      if (this.lazyModel && this.commitOnBlur) {
        this.commitValue()
      }
      this.$emit('blur', event)
    },
    handleConfirm(event) {
      if (this.lazyModel) {
        this.commitValue()
      }
      this.$emit('confirm', event)
    }
  }
}
</script>

<style scoped>
.volunteer-input-field {
  display: flex;
  flex: 1;
  min-width: 0;
  height: 100%;
}

.volunteer-input-field-native {
  width: 100%;
  height: 100%;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  padding: 0;
  font: inherit;
  color: inherit;
  box-sizing: border-box;
}

.volunteer-input-field-native:disabled {
  color: #94a3b8;
}
</style>
