<template>
	<view v-if="visible" class="modal-overlay" @tap="handleClose">
		<view class="modal" @tap.stop>
			<view class="modal-header">
				<text class="modal-title">选择学校</text>
				<text class="manage-btn" :class="{ active: manageMode }" @tap="toggleManageMode">
					{{ manageMode ? '完成' : '管理' }}
				</text>
			</view>

			<scroll-view class="school-list" scroll-y>
				<view
					v-for="name in schoolItems"
					:key="name"
					class="school-item"
					@tap="selectSchool(name)"
				>
					<text class="school-name">{{ name }}</text>
					<view class="school-actions">
						<text v-if="isCurrentSchool(name)" class="school-check">✓</text>
						<text
							v-if="manageMode && canDeleteSchool(name)"
							class="school-delete"
							@tap.stop="requestDeleteSchool(name)"
						>
							删除
						</text>
					</view>
				</view>
				<view class="school-item add-school-trigger" @tap="toggleAddForm">
					<text class="add-icon">+</text>
					<text class="add-text">新增学校</text>
				</view>
			</scroll-view>

			<view v-if="showAddForm" class="admin-section">
				<text class="admin-tip">添加新学校（需管理员密码）</text>
				<input
					v-model="adminPassword"
					type="text"
					password
					placeholder="管理员密码"
					class="input"
				/>
				<input
					v-model="newSchoolName"
					type="text"
					placeholder="新学校名称"
					class="input"
				/>
				<button class="btn btn-primary" @tap="submitAddSchool">验证并添加</button>
			</view>

			<view v-if="showDeleteForm" class="admin-section">
				<text class="admin-tip">删除学校：{{ deletingSchoolName }}（帖子会归类到“神秘学校”）</text>
				<input
					v-model="deletePassword"
					type="text"
					password
					placeholder="管理员密码"
					class="input"
				/>
				<button class="btn btn-danger" @tap="submitDeleteSchool">验证并删除</button>
			</view>

			<button class="btn btn-cancel" @tap="handleClose">取消</button>
		</view>
	</view>
</template>

<script>
export default {
	name: 'ForumSchoolPopup',
	props: {
		visible: {
			type: Boolean,
			default: false
		},
		currentSchool: {
			type: String,
			default: ''
		},
		schools: {
			type: Array,
			default() {
				return []
			}
		}
	},
	data() {
		return {
			showAddForm: false,
			showDeleteForm: false,
			manageMode: false,
			newSchoolName: '',
			adminPassword: '',
			deletePassword: '',
			deletingSchoolName: ''
		}
	},
	computed: {
		schoolItems() {
			const rawList = Array.isArray(this.schools) ? this.schools.slice() : []
			const list = []
			const set = new Set()

			rawList.forEach((item) => {
				const name = this.normalizeSchoolDisplay(item)
				if (!name || set.has(name)) return
				set.add(name)
				list.push(name)
			})

			const current = this.normalizeSchoolDisplay(this.currentSchool)
			if (current && !set.has(current)) {
				list.unshift(current)
			}
			return list
		}
	},
	watch: {
		visible(next) {
			if (!next) {
				this.resetForm()
			}
		}
	},
	methods: {
		normalizeSchoolDisplay(name) {
			const safe = String(name || '').trim()
			if (!safe) return ''
			if (safe.toLowerCase() === 'campus' || safe === '其他') return '神秘学校'
			return safe
		},
		isCurrentSchool(name) {
			return this.normalizeSchoolDisplay(name) === this.normalizeSchoolDisplay(this.currentSchool)
		},
		canDeleteSchool(name) {
			return this.normalizeSchoolDisplay(name) !== '神秘学校'
		},
		selectSchool(name) {
			this.$emit('select-school', this.normalizeSchoolDisplay(name))
		},
		requestDeleteSchool(name) {
			if (!this.manageMode) return
			this.deletingSchoolName = this.normalizeSchoolDisplay(name)
			this.deletePassword = ''
			this.showAddForm = false
			this.showDeleteForm = true
		},
		toggleManageMode() {
			this.manageMode = !this.manageMode
			if (!this.manageMode) {
				this.showDeleteForm = false
				this.deletePassword = ''
				this.deletingSchoolName = ''
			}
		},
		toggleAddForm() {
			this.showDeleteForm = false
			this.showAddForm = !this.showAddForm
		},
		submitAddSchool() {
			this.$emit('add-school', {
				password: (this.adminPassword || '').trim(),
				name: (this.newSchoolName || '').trim()
			})
		},
		submitDeleteSchool() {
			this.$emit('delete-school', {
				name: (this.deletingSchoolName || '').trim(),
				password: (this.deletePassword || '').trim()
			})
		},
		handleClose() {
			this.$emit('close')
		},
		resetForm() {
			this.showAddForm = false
			this.showDeleteForm = false
			this.manageMode = false
			this.newSchoolName = ''
			this.adminPassword = ''
			this.deletePassword = ''
			this.deletingSchoolName = ''
		}
	}
}
</script>

<style scoped>
.modal-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	z-index: 200;
	display: flex;
	align-items: center;
	justify-content: center;
}

.modal {
	background: #ffffff;
	width: 80%;
	max-width: 620rpx;
	border-radius: 24rpx;
	padding: 28rpx;
	box-sizing: border-box;
}

.modal-header {
	position: relative;
	min-height: 44rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.modal-title {
	display: block;
	text-align: center;
	font-size: 32rpx;
	font-weight: 700;
	color: #333333;
}

.manage-btn {
	position: absolute;
	right: 0;
	top: 50%;
	transform: translateY(-50%);
	padding: 6rpx 14rpx;
	border-radius: 999rpx;
	font-size: 22rpx;
	color: #475569;
	background: #f1f5f9;
}

.manage-btn.active {
	color: #ffffff;
	background: #ff5722;
}

.school-list {
	max-height: 300rpx;
	margin: 20rpx 0;
}

.school-item {
	min-height: 76rpx;
	padding: 0 8rpx;
	border-bottom: 1rpx solid #f5f5f5;
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.school-name {
	font-size: 28rpx;
	color: #333333;
}

.school-check {
	font-size: 24rpx;
	color: #ff9800;
}

.school-actions {
	display: flex;
	align-items: center;
	column-gap: 18rpx;
}

.school-delete {
	font-size: 24rpx;
	color: #ef4444;
}

.add-school-trigger {
	justify-content: flex-start;
	column-gap: 10rpx;
}

.add-icon {
	font-size: 34rpx;
	line-height: 1;
	color: #ff5722;
}

.add-text {
	font-size: 28rpx;
	color: #ff5722;
}

.admin-section {
	border-top: 1rpx solid #eeeeee;
	padding-top: 18rpx;
}

.admin-tip {
	display: block;
	font-size: 22rpx;
	color: #999999;
	margin-bottom: 12rpx;
}

.input {
	width: 100%;
	height: 74rpx;
	border: 1rpx solid #dddddd;
	border-radius: 8rpx;
	padding: 0 16rpx;
	box-sizing: border-box;
	font-size: 26rpx;
	margin-bottom: 12rpx;
}

.btn {
	width: 100%;
	height: 74rpx;
	line-height: 74rpx;
	border: none;
	border-radius: 8rpx;
	font-size: 28rpx;
	padding: 0;
}

.btn-primary {
	background: #ff5722;
	color: #ffffff;
}

.btn-danger {
	background: #ef4444;
	color: #ffffff;
}

.btn-cancel {
	background: transparent;
	color: #999999;
	margin-top: 10rpx;
}
</style>
