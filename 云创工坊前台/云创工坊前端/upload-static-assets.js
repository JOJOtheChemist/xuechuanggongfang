const fs = require('fs')
const path = require('path')
const http = require('http')
const https = require('https')

const API_BASE_URL = (process.env.XUECHUANG_API_BASE_URL || 'https://xuechuang.xyz/api/v1').replace(/\/+$/, '')
const ADMIN_TOKEN = process.env.XUECHUANG_ADMIN_TOKEN || process.env.TOKEN || ''
const STATIC_DIR = path.join(__dirname, 'static')
const MANIFEST_JSON_FILE = path.join(__dirname, 'utils', 'cloud-static-assets.manifest.json')
const MANIFEST_JS_FILE = path.join(__dirname, 'utils', 'cloud-static-assets.manifest.js')
const REMOVE_LOCAL_STATIC = process.env.REMOVE_LOCAL_STATIC === '1'

const MIME_TYPES = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml'
}

function readManifest() {
	if (!fs.existsSync(MANIFEST_JSON_FILE)) {
		return {}
	}

	try {
		return JSON.parse(fs.readFileSync(MANIFEST_JSON_FILE, 'utf8'))
	} catch (error) {
		throw new Error(`无法读取 manifest: ${error.message}`)
	}
}

function writeManifest(manifest) {
	const serializedManifest = JSON.stringify(manifest, null, 2)
	fs.writeFileSync(MANIFEST_JSON_FILE, `${serializedManifest}\n`, 'utf8')
	fs.writeFileSync(MANIFEST_JS_FILE, `module.exports = ${serializedManifest}\n`, 'utf8')
}

function walkFiles(dirPath) {
	const entries = fs.readdirSync(dirPath, { withFileTypes: true })
	const files = []

	entries.forEach((entry) => {
		if (entry.name === '.DS_Store') {
			return
		}

		const absolutePath = path.join(dirPath, entry.name)
		if (entry.isDirectory()) {
			files.push(...walkFiles(absolutePath))
			return
		}

		files.push(absolutePath)
	})

	return files
}

function removeEmptyDirectories(dirPath) {
	if (!fs.existsSync(dirPath) || dirPath === STATIC_DIR) {
		return
	}

	const entries = fs.readdirSync(dirPath)
	if (entries.length > 0) {
		return
	}

	fs.rmdirSync(dirPath)
	removeEmptyDirectories(path.dirname(dirPath))
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
					Authorization: `Bearer ${ADMIN_TOKEN}`,
					'X-Access-Token': ADMIN_TOKEN
				}
			},
			(res) => {
				let raw = ''
				res.on('data', (chunk) => {
					raw += chunk
				})
				res.on('end', () => {
					try {
						resolve(raw ? JSON.parse(raw) : {})
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

async function createUploadPresign(localPath, relativePath) {
	const stat = fs.statSync(localPath)
	const contentType = contentTypeForFile(localPath)
	if (!contentType) {
		throw new Error(`Unsupported static asset type: ${relativePath}`)
	}

	const safeFileName = relativePath.replace(/[\\/]/g, '__')
	const response = await requestJson('POST', `${API_BASE_URL}/storage/uploads/presign`, {
		fileName: safeFileName,
		contentType,
		fileSize: stat.size,
		scene: 'catalog-asset'
	})

	if (!response || response.code !== 0 || !response.data) {
		throw new Error((response && response.message) || `Failed to create upload presign for ${relativePath}`)
	}

	return response.data
}

async function uploadStaticAsset(localPath) {
	const relativePath = path.relative(STATIC_DIR, localPath).split(path.sep).join('/')
	const localAssetPath = `/static/${relativePath}`
	const presign = await createUploadPresign(localPath, relativePath)
	const buffer = fs.readFileSync(localPath)
	await uploadBinary(
		presign.upload_url,
		buffer,
		(presign.headers && (presign.headers['Content-Type'] || presign.headers['content-type'])) || contentTypeForFile(localPath)
	)

	return {
		localAssetPath,
		publicUrl: presign.public_url || (presign.file && presign.file.public_url) || ''
	}
}

async function main() {
	if (!ADMIN_TOKEN) {
		throw new Error('缺少管理员 Token。请设置环境变量 XUECHUANG_ADMIN_TOKEN 后再执行。')
	}

	if (!fs.existsSync(STATIC_DIR)) {
		throw new Error(`static 目录不存在: ${STATIC_DIR}`)
	}

	const manifest = readManifest()
	const files = walkFiles(STATIC_DIR)
	const uploadedLocalFiles = []
	console.log(`Found ${files.length} static assets.`)

	for (let index = 0; index < files.length; index += 1) {
		const filePath = files[index]
		const relativePath = path.relative(STATIC_DIR, filePath).split(path.sep).join('/')
		process.stdout.write(`[${index + 1}/${files.length}] Uploading ${relativePath}... `)
		const uploaded = await uploadStaticAsset(filePath)
		if (!uploaded.publicUrl) {
			throw new Error(`未拿到上传后的公网地址: ${relativePath}`)
		}
		manifest[uploaded.localAssetPath] = uploaded.publicUrl
		uploadedLocalFiles.push(filePath)
		console.log(uploaded.publicUrl)
	}

	writeManifest(manifest)
	if (REMOVE_LOCAL_STATIC) {
		uploadedLocalFiles.forEach((filePath) => {
			fs.unlinkSync(filePath)
			removeEmptyDirectories(path.dirname(filePath))
		})
		console.log(`Removed ${uploadedLocalFiles.length} local static assets.`)
	}
	console.log(`\nUpdated manifest: ${MANIFEST_JSON_FILE}`)
}

main().catch((error) => {
	console.error('\n❌ upload-static-assets failed:', error.message)
	process.exit(1)
})
