const payConfig = require('wx-pay-config/config')
const payUtils = require('wx-pay-config/utils')
const crypto = require('crypto')

/**
 * 调用微信统一下单接口（V2）
 */
async function unifiedOrder({ outTradeNo, totalFee, openid, body }) {
    const nonceStr = payUtils.generateNonceStr()
    const timestamp = Math.floor(Date.now() / 1000)

    // 构建请求参数
    const params = {
        appid: payConfig.appId,
        mch_id: payConfig.mchId,
        nonce_str: nonceStr,
        body: body,
        out_trade_no: outTradeNo,
        total_fee: totalFee,
        spbill_create_ip: '127.0.0.1', // 云函数IP
        notify_url: payConfig.notifyUrl || 'https://your-domain.com/notify',
        trade_type: payConfig.tradeType,
        openid: openid
    }

    // 生成签名
    params.sign = payUtils.md5Sign(params, payConfig.apiKey)

    // 转换为XML
    const xmlData = objToXml(params)

    // 请求微信接口
    const res = await uniCloud.httpclient.request(
        'https://api.mch.weixin.qq.com/pay/unifiedorder',
        {
            method: 'POST',
            dataType: 'text',
            headers: { 'Content-Type': 'application/xml' },
            data: xmlData
        }
    )

    // 解析XML响应
    const result = xmlToObj(res.data)

    if (result.return_code !== 'SUCCESS') {
        throw new Error(`统一下单失败: ${result.return_msg}`)
    }

    if (result.result_code !== 'SUCCESS') {
        throw new Error(`统一下单失败: ${result.err_code_des || result.err_code}`)
    }

    return {
        prepay_id: result.prepay_id
    }
}

/**
 * 生成小程序支付参数
 */
function generatePayParams(prepayId) {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const nonceStr = payUtils.generateNonceStr()
    const packageStr = `prepay_id=${prepayId}`

    const signParams = {
        appId: payConfig.appId,
        timeStamp: timestamp,
        nonceStr: nonceStr,
        package: packageStr,
        signType: 'MD5'
    }

    const paySign = payUtils.md5Sign(signParams, payConfig.apiKey)

    return {
        timeStamp: timestamp,
        nonceStr: nonceStr,
        package: packageStr,
        signType: 'MD5',
        paySign: paySign
    }
}

/**
 * 对象转XML
 */
function objToXml(obj) {
    let xml = '<xml>'
    for (const k in obj) {
        xml += `<${k}><![CDATA[${obj[k]}]]></${k}>`
    }
    xml += '</xml>'
    return xml
}

/**
 * XML转对象
 */
function xmlToObj(xml) {
    const obj = {}
    const regex = /<(\w+)>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/\1>/g
    let match
    while ((match = regex.exec(xml)) !== null) {
        obj[match[1]] = match[2]
    }
    return obj
}

/**
 * 微信商家转账到零钱（APIv3）
 * 替代旧版企业付款到零钱
 */
async function transfer({ partnerTradeNo, openid, amount, desc, realName }) {
    // 1. 准备私钥
    // 优先使用 PEM 格式私钥 (避免 PFX 解析问题)
    let privateKey
    if (payConfig.privateKeyPem) {
        privateKey = payConfig.privateKeyPem
    } else if (payConfig.pfx) {
        // 降级尝试：从 PFX 中提取私钥 (不推荐，某些环境兼容性差)
        privateKey = crypto.createPrivateKey({
            key: payConfig.pfx,
            passphrase: payConfig.mchId
        })
    } else {
        throw new Error('提现功能需要配置商户私钥 (privateKeyPem)，请检查 wx-pay-config/config.js')
    }

    // 2. 准备请求参数
    const url = 'https://api.mch.weixin.qq.com/v3/transfer/batches'
    const method = 'POST'
    const timestamp = Math.floor(Date.now() / 1000)
    const nonceStr = payUtils.generateNonceStr()

    const bodyObj = {
        appid: payConfig.appId,
        out_batch_no: partnerTradeNo,
        batch_name: desc || '余额提现',
        batch_remark: desc || '余额提现',
        total_amount: amount, // 单位：分
        total_num: 1,
        transfer_detail_list: [
            {
                out_detail_no: partnerTradeNo + '1', // 明细单号，不能包含 _ 等特殊字符，仅支持数字和字母
                transfer_amount: amount,
                transfer_remark: desc || '余额提现',
                openid: openid,
                // 如果需要校验真实姓名，需开启并传入 user_name (需加密，此处简略暂不处理姓名加密，通常提现不强制校验)
                // user_name: realName 
            }
        ]
    }

    const body = JSON.stringify(bodyObj)

    // 3. 生成签名
    // 注意：generateSignature 需要传入 URL 的 path 部分 (e.g. /v3/transfer/batches)
    const urlPath = '/v3/transfer/batches'
    const signature = payUtils.generateSignature(method, urlPath, timestamp, nonceStr, body, privateKey)

    // 4. 生成 Authorization 头
    const authHeader = payUtils.buildAuthorizationHeader(
        payConfig.mchId,
        payConfig.serialNo,
        nonceStr,
        timestamp,
        signature
    )

    // 5. 发起请求
    const res = await uniCloud.httpclient.request(url, {
        method: method,
        data: body,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': authHeader,
            // 某些云环境可能需要 User-Agent
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36'
        },
        dataType: 'json'
    })

    if (res.status !== 200 && res.status !== 204) {
        const errData = res.data || {}
        console.error('APIv3转账失败:', JSON.stringify(errData))
        throw new Error(`提现请求失败: ${errData.message || '未知错误'}`)
    }

    // 6. 解析结果
    // V3 接口返回的是批次信息
    const result = res.data

    return {
        payment_no: result.out_batch_no, // 使用批次号作为凭证
        payment_time: result.create_time
    }
}

module.exports = {
    unifiedOrder,
    generatePayParams,
    transfer,
    objToXml,
    xmlToObj
}
