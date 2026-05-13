import { requestHttpApi } from './http-api'

export async function createPaymentOrder(payload = {}) {
  const result = await requestHttpApi({
    path: '/orders',
    method: 'POST',
    data: payload
  })

  const data = result.data || {}
  const order = data.order || {}

  return {
    ...result,
    data: {
      ...data,
      order_no: data.order_no || order.orderNo || order.order_no || '',
      orderNo: data.orderNo || order.orderNo || order.order_no || '',
      pay_params: data.payParams || data.pay_params || null
    }
  }
}

export async function confirmPayment(payload = {}) {
  return requestHttpApi({
    path: '/payments/confirm',
    method: 'POST',
    data: payload
  })
}
