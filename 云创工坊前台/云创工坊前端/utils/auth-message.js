const MISSING_AUTH_TOKEN_PATTERNS = [
	/missing\s+authorization\s+token/i,
	/authorization\s+token\s+(is\s+)?missing/i,
	/authorization\s+token.*required/i,
	/缺失\s*authorization\s*token/i,
	/未提供\s*token/i,
	/token\s*(missing|required|not\s+provided)/i,
	/no\s+authorization\s+token/i,
	/no\s+token/i,
	/^请先登录$/,
	/^未登录$/
]

const EXPIRED_AUTH_TOKEN_PATTERNS = [
	/token.*(expired|invalid|malformed)/i,
	/(jwt|token).*(expired|invalid)/i,
	/token.*(无效|过期)/,
	/登录状态已失效/,
	/重新登录/,
	/认证失败/
]

export function isAuthMessage(message) {
	const text = String(message || '').trim()
	if (!text) return false

	return MISSING_AUTH_TOKEN_PATTERNS.concat(EXPIRED_AUTH_TOKEN_PATTERNS).some((pattern) => pattern.test(text))
}

export function toFriendlyAuthMessage(message, fallback = '未登录') {
	const text = String(message || '').trim()
	if (!text) return fallback

	if (MISSING_AUTH_TOKEN_PATTERNS.some((pattern) => pattern.test(text))) {
		return '未登录'
	}

	if (EXPIRED_AUTH_TOKEN_PATTERNS.some((pattern) => pattern.test(text))) {
		return '登录状态已失效，请重新登录'
	}

	return text
}
