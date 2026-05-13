import {
  VOLUNTEER_UNLOCK_PAYMENT_AMOUNT,
  VOLUNTEER_UNLOCK_REQUIRED_INVITE_COUNT
} from './volunteer-local-admission'

function toPositiveNumber(value, fallback) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback
}

export function formatVolunteerUnlockAmount(amount = VOLUNTEER_UNLOCK_PAYMENT_AMOUNT) {
  const numeric = Number(amount)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return String(VOLUNTEER_UNLOCK_PAYMENT_AMOUNT)
  }

  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1).replace(/\.0$/, '')
}

function resolveInviteCount(requiredInviteCount = VOLUNTEER_UNLOCK_REQUIRED_INVITE_COUNT) {
  return toPositiveNumber(requiredInviteCount, VOLUNTEER_UNLOCK_REQUIRED_INVITE_COUNT)
}

function resolveAmountLabel(amount = VOLUNTEER_UNLOCK_PAYMENT_AMOUNT) {
  return `${formatVolunteerUnlockAmount(amount)} 元`
}

export function buildVolunteerSupportNotice(options = {}) {
  return ''
}

export function buildVolunteerSupportRules(options = {}) {
  const inviteCount = resolveInviteCount(options.requiredInviteCount)

  return [
    `免费邀请解锁：邀请满 ${inviteCount} 位新用户登录后，可获得 2 次查分机会。`,
    '高级付费用户：默认可查分 2 次；次数用完后可联系客服每次增加 2 次，最多可再增加 4 次，合计最多 6 次。',
    '荣誉查分大使：可联系客服开通无限次查分权限。'
  ]
}

export function buildVolunteerSupportHint(options = {}) {
  return '免费邀请 2 次｜高级付费最多 6 次｜荣誉查分大使无限次'
}

export function buildVolunteerShareMethodDesc(options = {}) {
  const inviteCount = resolveInviteCount(options.requiredInviteCount)
  return `仅统计 ${inviteCount} 位新用户成功登录。免费解锁后可查分 2 次，不再额外增加次数。`
}

export function buildVolunteerPaidMethodDesc(options = {}) {
  return '高级付费用户默认可查分 2 次，联系客服每次可增加 2 次，最多再增加 4 次；荣誉查分大使可联系客服开通无限次查分权限。'
}

export function buildVolunteerSupportFooterText(options = {}) {
  return '客服可协助核对解锁进度、处理高级付费用户加次数，以及为荣誉查分大使开通无限次查分权限。'
}

export function buildVolunteerShareUnlockPrompt(options = {}) {
  const inviteCount = resolveInviteCount(options.requiredInviteCount)
  return `分享 ${inviteCount} 名好友成功登录后可免费解锁，解锁后有 2 次查分机会。`
}

export function buildVolunteerPaymentConfirmText(options = {}) {
  const amountLabel = resolveAmountLabel(options.paymentAmount)
  return `确认支付 ${amountLabel} 开通查分吗？高级付费用户默认 2 次查分，可联系客服每次增加 2 次，最多再增加 4 次；荣誉查分大使可联系客服开通无限次查分权限。`
}
