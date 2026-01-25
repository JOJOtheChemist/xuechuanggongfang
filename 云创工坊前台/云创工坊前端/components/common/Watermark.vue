<template>
	<view class="watermark-container">
		<view class="watermark-layer">
			<view 
				v-for="(item, index) in watermarkItems" 
				:key="index"
				class="watermark-item"
				:style="item.style"
			>
				<text class="watermark-text">{{ watermarkText }}</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'Watermark',
	props: {
		uid: {
			type: String,
			default: ''
		},
		nickname: {
			type: String,
			default: ''
		},
		opacity: {
			type: Number,
			default: 0.08
		}
	},
	data() {
		return {
			watermarkItems: []
		}
	},
	computed: {
		watermarkText() {
			// 显示 UID 或 昵称+UID
			if (this.uid) {
				return `UID: ${this.uid}`
			}
			return 'UID: ------'
		}
	},
	mounted() {
		this.generateWatermark()
	},
	methods: {
		generateWatermark() {
			// 生成重复的水印网格
			const items = []
			const rows = 15 // 行数
			const cols = 3  // 列数
			
			for (let i = 0; i < rows; i++) {
				for (let j = 0; j < cols; j++) {
					items.push({
						style: {
							top: `${i * 150}rpx`,
							left: `${j * 280}rpx`,
							opacity: this.opacity
						}
					})
				}
			}
			
			this.watermarkItems = items
		}
	}
}
</script>

<style scoped>
.watermark-container {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	pointer-events: none;
	z-index: 9999;
	overflow: hidden;
}

.watermark-layer {
	position: relative;
	width: 100%;
	height: 100%;
}

.watermark-item {
	position: absolute;
	transform: rotate(-25deg);
	white-space: nowrap;
}

.watermark-text {
	font-size: 24rpx;
	color: #000000;
	font-weight: 500;
	letter-spacing: 2rpx;
	user-select: none;
}
</style>
