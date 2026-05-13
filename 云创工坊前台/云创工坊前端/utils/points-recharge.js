import { createPaymentOrder, confirmPayment } from './payment-api'
import { rechargePoints } from './points-api'

export const TEST_RECHARGE_AMOUNT = 0.01
export const TEST_RECHARGE_POINTS = 1

const DEFAULT_POINTS_PER_YUAN = 5

export function isTestRechargeAmount(amount) {
  const value = Number(amount)
  return Number.isFinite(value) && Math.abs(value - TEST_RECHARGE_AMOUNT) < 0.000001
}

export function calculateRechargePoints(amount) {
  const value = Number(amount)
  if (!Number.isFinite(value) || value <= 0) return 0
  if (isTestRechargeAmount(value)) return TEST_RECHARGE_POINTS
  return Math.floor(value * DEFAULT_POINTS_PER_YUAN)
}

function ensureLoggedIn() {
  const token =
    uni.getStorageSync('token') ||
    uni.getStorageSync('accessToken') ||
    uni.getStorageSync('uni_id_token')

  if (!token) {
    throw new Error('请先登录')
  }
}

async function requestWechatPayment(payParams = {}) {
  if (!payParams || !payParams.timeStamp) {
    throw new Error('支付参数缺失')
  }

  await uni.requestPayment({
    timeStamp: payParams.timeStamp,
    nonceStr: payParams.nonceStr,
    package: payParams.package,
    signType: payParams.signType,
    paySign: payParams.paySign
  })
}

export async function startPointsRechargePayment(options = {}) {
  const amount = Number(options.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('请输入有效金额')
  }

  const points = Number(options.points ?? calculateRechargePoints(amount))
  if (!Number.isInteger(points) || points <= 0) {
    throw new Error('充值积分配置无效')
  }

  ensureLoggedIn()
  const businessId =
    options.businessId || (isTestRechargeAmount(amount) ? 'points_recharge_test' : 'points_recharge')
  const businessName =
    options.businessName || (isTestRechargeAmount(amount) ? '积分充值测试支付' : '积分充值')

  const orderRes = await createPaymentOrder({
    businessId,
    businessName,
    amount
  })

  if (!orderRes || orderRes.code !== 0 || !orderRes.data) {
    throw new Error((orderRes && orderRes.message) || '创建订单失败')
  }

  const orderData = orderRes.data
  await requestWechatPayment(orderData.pay_params)
  await confirmPayment({
    orderNo: orderData.order_no
  })

  const rechargeRes = await rechargePoints({
    amount,
    points,
    orderNo: orderData.order_no
  })

  return {
    orderNo: orderData.order_no,
    amount,
    points,
    recharge: rechargeRes && rechargeRes.data ? rechargeRes.data : null
  }
}
