const fs = require('fs')
const path = require('path')
const http = require('http')
const https = require('https')

const BASE_URL = 'https://mp-46bd4293-7b92-444c-b936-5777a228063a.cdn.bspapp.com/all_pdf_images/'
const LOCAL_ROOT_PREFIX = '/Users/yeya/Documents/HBuilderProjects/云创工坊/所有PDF资料/'
const DRY_RUN = false

const API_BASE_URL = (process.env.XUECHUANG_API_BASE_URL || 'https://xuechuang.xyz/api/v1').replace(/\/+$/, '')
const ADMIN_TOKEN = process.env.XUECHUANG_ADMIN_TOKEN || process.env.TOKEN || ''
const DATA_FILE = path.join(__dirname, 'pages', 'admin', 'static', 'articles_data.json')

function requestJson(method, requestUrl, payload) {
	return new Promise((resolve, reject) => {
		const target = new URL(requestUrl)
		const transport = target.protocol === 'http:' ? http : https
		const body = payload ? JSON.stringify(payload) : ''

		const req = transport.request(
			target,
			{
				method,
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': Buffer.byteLength(body),
					...(ADMIN_TOKEN
						? {
							Authorization: `Bearer ${ADMIN_TOKEN}`,
							'X-Access-Token': ADMIN_TOKEN
						}
						: {})
				}
			},
			(res) => {
				let raw = ''
				res.on('data', (chunk) => {
					raw += chunk
				})
				res.on('end', () => {
					if (!raw) {
						resolve({})
						return
					}

					try {
						resolve(JSON.parse(raw))
					} catch (error) {
						reject(new Error(`Invalid JSON response: ${raw}`))
					}
				})
			}
		)

		req.on('error', reject)
		if (body) req.write(body)
		req.end()
	})
}

function convertLocalToRemote(localPath) {
	if (!localPath.startsWith(LOCAL_ROOT_PREFIX)) {
		console.warn(`    ⚠️ Path does not start with expected prefix: ${localPath}`)
		return null
	}

	const relativePath = localPath.substring(LOCAL_ROOT_PREFIX.length)
	const encodedRelativePath = relativePath
		.split(/[/\\]/)
		.map((segment) => encodeURIComponent(segment))
		.join('/')

	return BASE_URL + encodedRelativePath
}

async function importArticle(articleData) {
	const response = await requestJson('POST', `${API_BASE_URL}/catalog/admin/articles/import`, {
		articles: [articleData]
	})

	if (!response || response.code !== 0 || !response.data) {
		throw new Error((response && response.message) || 'Import failed')
	}

	return response.data
}

async function main() {
	console.log('=============================================')
	console.log(`Dry Run Mode: ${DRY_RUN ? 'ON (No DB changes)' : 'OFF (Will update DB)'}`)
	console.log(`API Base : ${API_BASE_URL}`)
	console.log(`CDN Base : ${BASE_URL}`)
	console.log(`Prefix   : ${LOCAL_ROOT_PREFIX}`)
	console.log('=============================================\n')

	if (!DRY_RUN && !ADMIN_TOKEN) {
		console.error('❌ 缺少管理员 Token。请设置环境变量 XUECHUANG_ADMIN_TOKEN 后重试。')
		process.exit(1)
	}

	if (!fs.existsSync(DATA_FILE)) {
		console.error('Articles data file not found:', DATA_FILE)
		process.exit(1)
	}

	const articles = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
	console.log(`Found ${articles.length} articles to process.`)

	let successCount = 0
	let skipCount = 0

	for (let i = 0; i < articles.length; i += 1) {
		const article = articles[i]
		const localImages = Array.isArray(article.local_images) ? article.local_images : []
		const remoteUrls = localImages
			.map((imgPath) => convertLocalToRemote(imgPath))
			.filter(Boolean)

		if (remoteUrls.length === 0) {
			console.log(`\n[${i + 1}] ${article.title} - ⚠️ Skipped (No valid image mappings)`)
			skipCount += 1
			continue
		}

		console.log(`\n[${i + 1}] ${article.title}`)
		console.log(`    L: ${localImages[0]}`)
		console.log(`    R: ${remoteUrls[0]}`)
		if (localImages.length > 1) {
			console.log(`    ... (+${localImages.length - 1} more)`)
		}

		if (DRY_RUN) {
			successCount += 1
			continue
		}

		const articleData = {
			...article,
			cover_image: remoteUrls[0],
			attachments: [{
				type: 'pdf-images',
				name: `${article.title}.pdf`,
				images: remoteUrls,
				pageCount: remoteUrls.length
			}]
		}
		delete articleData.local_images

		try {
			const importResult = await importArticle(articleData)
			if (Number(importResult.success || 0) > 0) {
				console.log('    ✅ DB Update Success')
				successCount += 1
			} else {
				console.error('    ⚠️ DB Update Failed:', importResult)
			}
		} catch (error) {
			console.error('    ❌ Request Failed:', error.message)
		}
	}

	console.log('\n=============================================')
	console.log(`Summary: Processed ${articles.length} articles.`)
	console.log(`Potential Updates: ${successCount}`)
	console.log(`Skipped: ${skipCount}`)

	if (DRY_RUN) {
		console.log('\n⚠️ This was a DRY RUN. No database changes were made.')
	} else {
		console.log('\n✅ Database update complete.')
	}
}

main().catch((error) => {
	console.error('Fatal error:', error)
	process.exit(1)
})
