<template>
    <view class="app-container">
        <view class="card" @tap="goToEditor">
            <view class="card-left">
                <view class="icon-box">
                    <text class="icon">📝</text>
                </view>
                <view class="text-box">
                    <text class="title">成长日志</text>
                    <text class="desc">记录今日进展、困难与明日计划</text>
                </view>
            </view>
            <view class="card-right">
                <text class="action-text">去记录</text>
                <text class="arrow">›</text>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    name: 'GrowthLog',
    methods: {
        goToEditor() {
            uni.navigateTo({
                url: '/pages/growth-log/index'
            })
        }
    }
}
</script>

<style scoped>
.app-container {
    width: 100%;
    margin-bottom: 24rpx;
}

.card {
    background: #ffffff;
    padding: 30rpx 32rpx;
    border-radius: 32rpx;
    box-shadow: 0 8rpx 30rpx rgba(148, 163, 184, 0.12);
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1rpx solid #f1f5f9;
}

.card:active {
    background-color: #f8fafc;
    transform: scale(0.98);
}

.card-left {
    display: flex;
    align-items: center;
    gap: 24rpx;
}

.icon-box {
    width: 88rpx;
    height: 88rpx;
    background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
    border-radius: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.icon {
    font-size: 40rpx;
}

.text-box {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
}

.title {
    font-size: 30rpx;
    font-weight: 700;
    color: #1e293b;
}

.desc {
    font-size: 24rpx;
    color: #94a3b8;
}

.card-right {
    display: flex;
    align-items: center;
    gap: 8rpx;
}

.action-text {
    font-size: 24rpx;
    color: #6366f1;
    font-weight: 600;
}

.arrow {
    font-size: 32rpx;
    color: #cbd5e1;
    margin-top: -2rpx;
}
</style>