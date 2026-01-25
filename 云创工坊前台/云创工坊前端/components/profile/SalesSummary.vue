<template>
	<view class="sales-card">
		<text class="sales-title">年度销售额统计</text>
		<view class="sales-row">
			<view class="sales-item">
				<text class="sales-label">个人</text>
				<text class="sales-value">{{ personalDisplay }}</text>
			</view>
			<view class="sales-item">
				<text class="sales-label">团队</text>
				<text class="sales-value sales-value-highlight">{{ teamDisplay }}</text>
			</view>
			<view class="sales-item">
				<text class="sales-label">公司</text>
				<text class="sales-value">{{ companyDisplay }}</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'SalesSummary',
	data() {
		return {
			personalSales: 0,
			teamSales: 0,
			companySales: 0
		}
	},
	computed: {
		personalDisplay() {
			return this.formatAmount(this.personalSales) + ' 新币'
		},
		teamDisplay() {
			return this.formatAmount(this.teamSales) + ' 新币'
		},
		companyDisplay() {
			return this.formatAmount(this.companySales) + ' 新币'
		}
	},
	methods: {
		getToken() {
			return uni.getStorageSync('token')
		},
		formatAmount(amount) {
			const n = Number(amount) || 0
			// 不保留小数，做千分位
			const intStr = Math.round(n).toString()
			return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
		},
		async loadSales() {
			const token = this.getToken()
			if (!token) {
				return
			}
			try {
				const userCenter = uniCloud.importObject('user-center')
				const res = await userCenter.getMyStats({ _token: token })
				if (res && res.code === 0 && res.data) {
					const d = res.data || {}
					// 优先使用“当年”字段，兼容后端暂时只返回累计字段的情况
					this.personalSales = d.year_total_sales || d.total_sales || 0
					this.teamSales = d.year_team_sales || d.team_sales || 0
					this.companySales = d.year_company_sales || d.company_sales || 0
				}
			} catch (e) {
				console.error('[SalesSummary] 获取年度销售额失败', e)
			}
		}
	},
	mounted() {
		this.loadSales()
	}
}
</script>

<style scoped>
	.sales-card {
		margin-bottom: 24rpx;
		padding: 28rpx 24rpx;
		border-radius: 24rpx;
		background-color: #ffffff;
		/* Border removed */
		box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.03); /* Added subtle shadow instead */
	}

	.sales-title {
		/* 样式对齐“其他功能”的主标题（feed-title） */
		font-size: 26rpx;
		font-weight: 700;
		color: #111827;
		margin-bottom: 12rpx;
	}

	.sales-row {
		display: flex;
		flex-direction: row;
		border-top-width: 2rpx;
		border-top-color: #e5e7eb;
		border-top-style: solid;
		padding-top: 12rpx;
	}

	.sales-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 8rpx 0;
	}

	.sales-label {
		font-size: 22rpx;
		color: #9ca3af;
		margin-bottom: 4rpx;
	}

	.sales-value {
		font-size: 28rpx;
		font-weight: 500;
		color: #111827;
		white-space: nowrap;
	}

	.sales-value-highlight {
		color: #4f46e5;
	}
</style>
