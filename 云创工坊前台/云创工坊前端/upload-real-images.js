const fs = require('fs')
const path = require('path')
const http = require('http')
const https = require('https')

const API_BASE_URL = (process.env.XUECHUANG_API_BASE_URL || 'https://xuechuang.xyz/api/v1').replace(/\/+$/, '')
const ADMIN_TOKEN = process.env.XUECHUANG_ADMIN_TOKEN || process.env.TOKEN || ''
const DATA_FILE = path.join(__dirname, 'pages', 'admin', 'static', 'articles_data.json')

const MIME_TYPES = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.gif': 'image/gif'
}

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

function uploadBinary(uploadUrl, buffer, contentType) {
	return new Promise((resolve, reject) => {
		const target = new URL(uploadUrl)
		const transport = target.protocol === 'http:' ? http : https

		const req = transport.request(
			target,
			{
				method: 'PUT',
				headers: {
					'Content-Type': contentType,
					'Content-Length': buffer.length
				}
			},
			(res) => {
				if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
					resolve()
					return
				}

				let raw = ''
				res.on('data', (chunk) => {
					raw += chunk
				})
				res.on('end', () => {
					reject(new Error(`Upload failed: ${res.statusCode || 'unknown'} ${raw}`))
				})
			}
		)

		req.on('error', reject)
		req.write(buffer)
		req.end()
	})
}

function contentTypeForFile(filePath) {
	const extension = path.extname(filePath).toLowerCase()
	return MIME_TYPES[extension] || ''
}

async function createUploadPresign(localPath) {
	const stat = fs.statSync(localPath)
	const fileName = path.basename(localPath)
	const contentType = contentTypeForFile(localPath)

	if (!contentType) {
		throw new Error(`Unsupported image type: ${fileName}`)
	}

	const response = await requestJson('POST', `${API_BASE_URL}/storage/uploads/presign`, {
		fileName,
		contentType,
		fileSize: stat.size,
		scene: 'catalog-asset'
	})

	if (!response || response.code !== 0 || !response.data) {
		throw new Error((response && response.message) || 'Failed to create upload presign')
	}

	return response.data
}

async function uploadImage(localPath) {
	const presign = await createUploadPresign(localPath)
	const buffer = fs.readFileSync(localPath)
	await uploadBinary(presign.upload_url, buffer, presign.headers && presign.headers['Content-Type'] ? presign.headers['Content-Type'] : contentTypeForFile(localPath))
	return presign.public_url || (presign.file && presign.file.public_url) || ''
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
	if (!ADMIN_TOKEN) {
		console.error('❌ 缺少管理员 Token。请设置环境变量 XUECHUANG_ADMIN_TOKEN 后重试。')
		process.exit(1)
	}

	if (!fs.existsSync(DATA_FILE)) {
		console.error('Articles data file not found:', DATA_FILE)
		process.exit(1)
	}

	const articles = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
	console.log(`Loaded ${articles.length} articles.`)

	for (let i = 0; i < articles.length; i += 1) {
		const article = articles[i]
		console.log(`\n[${i + 1}/${articles.length}] Processing: ${article.title}`)

		const localImages = Array.isArray(article.local_images) ? article.local_images : []
		const uploadedFileURLs = []

		for (const imgPath of localImages) {
			try {
				if (!fs.existsSync(imgPath)) {
					throw new Error(`File not found: ${imgPath}`)
				}

				console.log(`  Uploading: ${path.basename(imgPath)}...`)
				const publicUrl = await uploadImage(imgPath)
				if (publicUrl) {
					uploadedFileURLs.push(publicUrl)
					console.log(`    -> Success: ${publicUrl}`)
				}
			} catch (error) {
				console.error(`    ❌ Upload failed for ${imgPath}:`, error.message)
			}
		}

		if (uploadedFileURLs.length === 0) {
			console.log('  ⚠️ No images uploaded, skipping article save.')
			continue
		}

		const articleData = {
			...article,
			cover_image: uploadedFileURLs[0],
			attachments: [{
				type: 'pdf-images',
				name: `${article.title}.pdf`,
				images: uploadedFileURLs,
				pageCount: uploadedFileURLs.length
			}]
		}
		delete articleData.local_images

		try {
			console.log('  Saving article to database...')
			const importResult = await importArticle(articleData)
			if (Number(importResult.success || 0) > 0) {
				console.log('  ✅ Article saved successfully.')
			} else {
				console.log('  ⚠️ Article save skipped or failed.')
				if (Array.isArray(importResult.errors) && importResult.errors.length > 0) {
					console.error('    Error:', importResult.errors[0].error)
				}
			}
		} catch (error) {
			console.error('  ❌ Article import failed:', error.message)
		}
	}

	console.log('\nDone!')
}

main().catch((error) => {
	console.error('Fatal error:', error)
	process.exit(1)
})
