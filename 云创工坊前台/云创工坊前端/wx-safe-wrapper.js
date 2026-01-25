'use strict'

const objectKeys = ['qy', 'env', 'error', 'version', 'lanDebug', 'cloud', 'serviceMarket', 'router', 'worklet', '__webpack_require_UNI_MP_PLUGIN__']
const singlePageDisableKey = ['lanDebug', 'router', 'worklet']

const target = typeof globalThis !== 'undefined' ? globalThis : function () {
    return this
}()

const key = ['w', 'x'].join('')
const oldWx = target[key] || {}

const FALLBACK_SAFE_AREA = {
    left: 0,
    right: 375,
    top: 44,
    bottom: 0,
    width: 375,
    height: 623
}

const FALLBACK_SYSTEM_INFO = {
    brand: 'devtools',
    model: 'iPhone 12',
    pixelRatio: 3,
    system: 'iOS 14.0.0',
    platform: 'devtools',
    version: '8.0.0',
    screenWidth: 375,
    screenHeight: 667,
    windowWidth: 375,
    windowHeight: 667,
    statusBarHeight: 44,
    language: 'zh_CN',
    safeArea: FALLBACK_SAFE_AREA,
    SDKVersion: '2.32.0',
    enableDebug: false,
    theme: 'light'
}

const FALLBACK_LAUNCH_OPTIONS = {
    scene: 1001,
    path: '',
    query: {},
    referrerInfo: {},
    shareTicket: ''
}

const cloneSafeArea = (area) => ({
    left: area.left,
    right: area.right,
    top: area.top,
    bottom: area.bottom,
    width: area.width,
    height: area.height
})

const normalizeSystemInfo = (info) => {
    const safeInfo = {
        ...FALLBACK_SYSTEM_INFO,
        safeArea: cloneSafeArea(FALLBACK_SAFE_AREA)
    }
    if (info && typeof info === 'object') {
        Object.keys(info).forEach((prop) => {
            if (prop === 'safeArea') {
                if (info.safeArea && typeof info.safeArea === 'object') {
                    safeInfo.safeArea = {
                        ...safeInfo.safeArea,
                        ...info.safeArea
                    }
                }
            } else if (info[prop] !== undefined) {
                safeInfo[prop] = info[prop]
            }
        })
    }
    return safeInfo
}

const normalizeLaunchOptions = (value) => {
    if (value && typeof value === 'object') {
        return {
            scene: typeof value.scene === 'number' ? value.scene : FALLBACK_LAUNCH_OPTIONS.scene,
            path: value.path || '',
            query: value.query || {},
            referrerInfo: value.referrerInfo || {},
            shareTicket: value.shareTicket || ''
        }
    }
    return { ...FALLBACK_LAUNCH_OPTIONS }
}

const safeCall = (label, fn, ...args) => {
    if (typeof fn !== 'function') {
        return null
    }
    try {
        return fn.apply(oldWx, args)
    } catch (error) {
        console.warn(`[wx-safe-wrapper] ${label} failed:`, error)
        return null
    }
}

const wrapSystemInfo = (original) => function wrappedSystemInfo(...args) {
    const res = safeCall('getSystemInfoSync', original, ...args)
    if (!res) {
        console.warn('[wx-safe-wrapper] wx.getSystemInfoSync returned invalid data, using fallback object')
    }
    return normalizeSystemInfo(res || undefined)
}

const wrapAppBaseInfo = (original, systemInfoProvider) => function wrappedAppBaseInfo(...args) {
    const res = safeCall('getAppBaseInfo', original, ...args) || {}
    const baseInfo = normalizeSystemInfo(res)
    return {
        ...baseInfo,
        ...res,
        SDKVersion: typeof res.SDKVersion === 'string' ? res.SDKVersion : baseInfo.SDKVersion,
        language: res.language || baseInfo.language,
        enableDebug: typeof res.enableDebug === 'boolean' ? res.enableDebug : false,
        host: res.host || { env: 'develop' },
        theme: res.theme || baseInfo.theme
    }
}

const wrapLaunchOptions = (original) => function wrappedLaunchOptions(...args) {
    const res = safeCall('getLaunchOptionsSync', original, ...args)
    if (!res) {
        console.warn('[wx-safe-wrapper] wx.getLaunchOptionsSync returned invalid data, using fallback launch options')
    }
    return normalizeLaunchOptions(res)
}

const wrapDeviceInfo = (original, systemInfoProvider) => function wrappedDeviceInfo(...args) {
    const res = safeCall('getDeviceInfo', original, ...args)
    if (!res) {
        console.warn('[wx-safe-wrapper] wx.getDeviceInfo returned invalid data, using fallback')
    }
    return {
        ...systemInfoProvider(),
        ...(res || {})
    }
}

const wrapWindowInfo = (original, systemInfoProvider) => function wrappedWindowInfo(...args) {
    const res = safeCall('getWindowInfo', original, ...args)
    if (!res) {
        console.warn('[wx-safe-wrapper] wx.getWindowInfo returned invalid data, using fallback')
    }
    const base = systemInfoProvider()
    return {
        ...base,
        ...(res || {}),
        safeArea: {
            ...base.safeArea,
            ...((res && res.safeArea) || {})
        }
    }
}

const cachedLaunchOption = (() => {
    if (!oldWx || typeof oldWx.getLaunchOptionsSync !== 'function') {
        return null
    }
    try {
        return oldWx.getLaunchOptionsSync()
    } catch (error) {
        console.warn('[wx-safe-wrapper] getLaunchOptionsSync failed:', error)
        return null
    }
})()

function isWxKey(prop) {
    const launchOption = cachedLaunchOption
    if (launchOption && launchOption.scene === 1154 && singlePageDisableKey.includes(prop)) {
        return false
    }
    return objectKeys.indexOf(prop) > -1 || typeof oldWx[prop] === 'function'
}

function initWx() {
    const newWx = {}
    for (const prop in oldWx) {
        if (isWxKey(prop)) {
            newWx[prop] = oldWx[prop]
        }
    }
    return newWx
}

const newWx = initWx()

const originalGetSystemInfoSync = typeof oldWx.getSystemInfoSync === 'function' ? oldWx.getSystemInfoSync : null
const originalGetAppBaseInfo = typeof oldWx.getAppBaseInfo === 'function' ? oldWx.getAppBaseInfo : null
const originalGetLaunchOptionsSync = typeof oldWx.getLaunchOptionsSync === 'function' ? oldWx.getLaunchOptionsSync : null
const originalGetDeviceInfo = typeof oldWx.getDeviceInfo === 'function' ? oldWx.getDeviceInfo : null
const originalGetWindowInfo = typeof oldWx.getWindowInfo === 'function' ? oldWx.getWindowInfo : null

const patchedGetSystemInfoSync = wrapSystemInfo(originalGetSystemInfoSync)
const systemInfoProvider = () => patchedGetSystemInfoSync()

newWx.getSystemInfoSync = patchedGetSystemInfoSync
newWx.getAppBaseInfo = wrapAppBaseInfo(originalGetAppBaseInfo, systemInfoProvider)
newWx.getLaunchOptionsSync = wrapLaunchOptions(originalGetLaunchOptionsSync)
newWx.getDeviceInfo = wrapDeviceInfo(originalGetDeviceInfo, systemInfoProvider)
newWx.getWindowInfo = wrapWindowInfo(originalGetWindowInfo, systemInfoProvider)

if (typeof newWx.canIUse === 'function') {
    if (!newWx.canIUse('getAppBaseInfo')) {
        newWx.getAppBaseInfo = newWx.getSystemInfoSync
    }
    if (!newWx.canIUse('getWindowInfo')) {
        newWx.getWindowInfo = newWx.getSystemInfoSync
    }
    if (!newWx.canIUse('getDeviceInfo')) {
        newWx.getDeviceInfo = newWx.getSystemInfoSync
    }
}

target[key] = newWx

module.exports = newWx
module.exports.default = newWx
module.exports.__esModule = true
