import { requestAdmissionEnvelope } from './admission-api'
import { createPaymentOrder, confirmPayment } from './payment-api'
import { VOLUNTEER_UNLOCK_PAYMENT_AMOUNT } from './volunteer-local-admission'

function trimText(value) {
  return String(value || '').trim()
}

async function requestWechatPayment(payParams = {}) {
  if (!payParams || !payParams.timeStamp) {
    throw new Error('支付参数异常')
  }

  await uni.requestPayment({
    timeStamp: payParams.timeStamp,
    nonceStr: payParams.nonceStr,
    package: payParams.package,
    signType: payParams.signType,
    paySign: payParams.paySign
  })
}

export async function fetchAdmissionUnlockStatus(query = {}) {
  const envelope = await requestAdmissionEnvelope('/admission/unlock-status', query, { auth: true })
  return {
    envelope,
    data: envelope.body.data || {}
  }
}

export async function saveAdmissionScoreRequest(payload = {}) {
  const envelope = await requestAdmissionEnvelope('/admission/score', {}, {
    auth: true,
    method: 'POST',
    data: payload
  })

  return {
    envelope,
    data: envelope.body.data || {}
  }
}

export async function consumeAdmissionQueryCountRequest() {
  const envelope = await requestAdmissionEnvelope('/admission/query-count/consume', {}, {
    auth: true,
    method: 'POST',
    data: {}
  })

  return {
    envelope,
    data: envelope.body.data || {}
  }
}

export async function startAdmissionUnlockPayment(options = {}) {
  const amount = Number(options.amount || VOLUNTEER_UNLOCK_PAYMENT_AMOUNT)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('支付金额配置无效')
  }

  const orderRes = await createPaymentOrder({
    businessId: trimText(options.businessId) || 'admission_unlock',
    businessName: trimText(options.businessName) || '志愿填报系统解锁',
    amount,
    scene: 'admission_unlock',
    extraData: Object.assign(
      {
        scene: 'admission_unlock',
        module: 'volunteer'
      },
      options.extraData || {}
    )
  })

  if (!orderRes || orderRes.code !== 0 || !orderRes.data) {
    throw new Error((orderRes && orderRes.message) || '创建订单失败')
  }

  const orderData = orderRes.data
  await requestWechatPayment(orderData.pay_params)

  const confirmRes = await confirmPayment({
    orderNo: orderData.order_no
  })

  return {
    orderNo: orderData.order_no,
    order: (confirmRes && confirmRes.data && confirmRes.data.order) || null,
    result: confirmRes && confirmRes.data ? confirmRes.data : null
  }
}
