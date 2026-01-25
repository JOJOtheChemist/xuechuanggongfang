<template>
	<view class="tabs-wrapper">
		<!-- 一级标签 -->
		<scroll-view class="category-tabs" scroll-x :show-scrollbar="false">
			<view 
				class="tab" 
				:class="{ active: currentTag === '' }"
				@tap="selectTag('')"
			>
				全部
			</view>
			<view 
				v-for="(tag, index) in currentTags" 
				:key="index"
				class="tab" 
				:class="{ active: currentTag === tag }"
				@tap="selectTag(tag)"
			>
				{{ tag }}
				<text v-if="hasChildren(tag)" class="dropdown-icon">▾</text>
			</view>
		</scroll-view>
		
		<!-- 二级标签 (始终保留占位) -->
		<view class="sub-tabs-container">
			<scroll-view 
				class="category-tabs sub-tabs" 
				scroll-x 
				:show-scrollbar="false"
			>
				<!-- 提示文案 -->
				<view v-if="!subTags || subTags.length === 0" class="sub-tab-placeholder">
					<text class="placeholder-text">此处显示子级筛选...</text>
				</view>
				
				<view 
					v-for="(sub, index) in subTags" 
					:key="index"
					class="tab sub-tab-item" 
					:class="{ active: currentSubTag === sub }"
					@tap="selectSubTag(sub)"
				>
					{{ sub }}
					<text v-if="hasChildren(sub, 2)" class="dropdown-icon">▾</text>
				</view>
			</scroll-view>
		</view>
		
		<!-- 三级标签 (始终保留占位，体现层级感) -->
		<view class="sub-tabs-container third-level">
			<scroll-view 
				class="category-tabs sub-tabs" 
				scroll-x 
				:show-scrollbar="false"
			>
				<!-- 提示文案 -->
				<view v-if="!thirdTags || thirdTags.length === 0" class="sub-tab-placeholder">
					<text class="placeholder-text">此处显示三级细分...</text>
				</view>

				<view 
					v-for="(t3, index) in thirdTags" 
					:key="index"
					class="tab sub-tab-item third-tab-item" 
					:class="{ active: currentThirdTag === t3 }"
					@tap="selectThirdTag(t3)"
				>
					{{ t3 }}
				</view>
			</scroll-view>
		</view>
	</view>
</template>

<script>
import { TAG_CONFIG } from '@/common/tag-config.js'

export default {
	name: 'ArticleFilter',
	props: {
		categoryId: {
			type: String,
			default: ''
		}
	},
	data() {
		return {
			rawTags: [], 
			currentTags: [], // L1 display
			currentTag: '', // L1 selected
			
			subTags: [], // L2 display
			currentSubTag: '', // L2 selected
			
			thirdTags: [], // L3 display
			currentThirdTag: '', // L3 selected
		}
	},
	watch: {
		categoryId: {
			immediate: true,
			handler(val) {
				if (val) {
					this.initTags(val)
				}
			}
		}
	},
	methods: {
		initTags(catId) {
			const config = TAG_CONFIG[catId] || []
			this.rawTags = config
			this.currentTags = config.map(item => typeof item === 'object' ? item.name : item)
			this.resetSelection()
		},
		resetSelection() {
			this.currentTag = ''
			this.subTags = []
			this.currentSubTag = ''
			this.thirdTags = []
			this.currentThirdTag = ''
			this.emitChange()
		},
		hasChildren(tagName, level = 1) {
			if (level === 1) {
				const item = this.rawTags.find(i => typeof i === 'object' && i.name === tagName)
				return item && item.children && item.children.length > 0
			} else if (level === 2) {
				const l1Item = this.rawTags.find(i => typeof i === 'object' && i.name === this.currentTag)
				if (!l1Item || !l1Item.children) return false
				const l2Item = l1Item.children.find(i => typeof i === 'object' && i.name === tagName)
				return l2Item && l2Item.children && l2Item.children.length > 0
			}
			return false
		},
		selectTag(tag) {
			if (this.currentTag === tag) {
				this.resetSelection()
				return
			}

			this.currentTag = tag
			this.currentSubTag = ''
			this.thirdTags = []
			this.currentThirdTag = ''
			
			const configItem = this.rawTags.find(item => typeof item === 'object' && item.name === tag)
			if (configItem && configItem.children && configItem.children.length > 0) {
				this.subTags = configItem.children.map(item => typeof item === 'object' ? item.name : item)
			} else {
				this.subTags = []
			}
			this.emitChange()
		},
		selectSubTag(subTag) {
			if (this.currentSubTag === subTag) {
				this.currentSubTag = ''
				this.thirdTags = []
				this.currentThirdTag = ''
				this.emitChange()
				return 
			}
			
			this.currentSubTag = subTag
			this.currentThirdTag = ''
			
			const l1Item = this.rawTags.find(i => typeof i === 'object' && i.name === this.currentTag)
			if (l1Item && l1Item.children) {
				const l2Item = l1Item.children.find(i => typeof i === 'object' && i.name === subTag)
				if (l2Item && l2Item.children && l2Item.children.length > 0) {
					this.thirdTags = l2Item.children
				} else {
					this.thirdTags = []
				}
			} else {
				this.thirdTags = []
			}
			this.emitChange()
		},
		selectThirdTag(tag) {
			this.currentThirdTag = this.currentThirdTag === tag ? '' : tag
			this.emitChange()
		},
		emitChange() {
			this.$emit('change', {
				tag: this.currentTag,
				subTag: this.currentSubTag,
				thirdTag: this.currentThirdTag
			})
		}
	}
}
</script>

<style scoped>
.tabs-wrapper {
	background-color: #ffffff;
	border-bottom: 1rpx solid #f1f5f9;
	padding: 12rpx 0;
}

.category-tabs {
	white-space: nowrap;
	width: 100%;
}

.tab {
	display: inline-flex;
	align-items: center;
	padding: 12rpx 24rpx;
	margin-left: 24rpx;
	border-radius: 999rpx;
	background: #f1f5f9;
	color: #64748b;
	font-size: 26rpx;
}

.dropdown-icon {
	margin-left: 6rpx;
	font-size: 20rpx;
	color: #94a3b8;
}

.tab.active .dropdown-icon {
	color: #4f46e5;
}

.tab.active {
	background: #eef2ff;
	color: #4f46e5;
	font-weight: 600;
}

.sub-tabs-container {
	height: 80rpx;
	display: flex;
	align-items: center;
	background-color: #ffffff;
}

.sub-tabs {
	margin-top: 0;
	padding-left: 24rpx;
	border-top: none;
	padding-top: 0;
	height: 100%;
	display: flex;
	align-items: center;
}

.sub-tab-placeholder {
	display: inline-flex;
	align-items: center;
	height: 100%;
	padding-left: 24rpx;
}

.placeholder-text {
	font-size: 24rpx;
	color: #cbd5e1;
	font-style: italic;
}

.sub-tab-item {
	font-size: 24rpx;
	padding: 8rpx 20rpx;
	background: #f8fafc;
	color: #64748b;
	margin-top: 16rpx;
}

.sub-tab-item.active {
	background: #f0fdf4;
	color: #16a34a;
}

.third-level {
	background-color: #f8fafc;
	height: 70rpx;
}

.third-tab-item {
	font-size: 22rpx;
	padding: 6rpx 16rpx;
	background: #ffffff;
	border: 1rpx solid #e2e8f0;
}

.third-tab-item.active {
	background: #f0fdf4;
	color: #16a34a;
	border-color: #86efac;
}
</style>
