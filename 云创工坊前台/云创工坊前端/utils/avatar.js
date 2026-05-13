export const LEGACY_DEFAULT_AVATAR_URL = 'https://vkceyugu.cdn.bspapp.com/VKCEYUGU-uni-id-avatar/default-avatar.png'
export const DEFAULT_AVATAR_URL = '/static/icons/default-avatar.svg'

export function normalizeAvatarUrl(url, fallback = DEFAULT_AVATAR_URL) {
  const value = typeof url === 'string' ? url.trim() : ''

  if (!value) {
    return fallback
  }

  if (value === LEGACY_DEFAULT_AVATAR_URL || value.includes('/VKCEYUGU-uni-id-avatar/default-avatar.png')) {
    return fallback
  }

  return value
}
