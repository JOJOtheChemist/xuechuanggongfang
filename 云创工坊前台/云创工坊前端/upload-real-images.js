const fs = require('fs');
const path = require('path');
const https = require('https');
const url = require('url');

// Configuration
// 自动推测的云函数URL
const SPACE_ID = 'mp-46bd4293-7b92-444c-b936-5777a228063a';
const CLOUD_FUNCTION_NAME = 'import-articles';
// 尝试两个常见格式
const CANDIDATE_URLS = [
    `https://fc-${SPACE_ID}.next.bspapp.com/http/${CLOUD_FUNCTION_NAME}`,
    `https://${SPACE_ID}.next.bspapp.com/http/${CLOUD_FUNCTION_NAME}`
];

let CLOUD_FUNCTION_URL_BASE = '';

const DATA_FILE = path.join(__dirname, 'articles_data.json');

// Helper: Check URL availability
function checkUrl(urlToCheck) {
    return new Promise((resolve) => {
        const parsedUrl = url.parse(urlToCheck);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.path, // checking root of function
            method: 'POST', // Use POST as our function expects it
             headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const req = https.request(options, (res) => {
            // If we get 200-299, or even 500 (meaning function ran but errored), it exists.
            // If 404, it might not exist or path is wrong.
            if (res.statusCode !== 404) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
        
        req.on('error', () => resolve(false));
        req.write(JSON.stringify({ test: true })); // sending dummy data
        req.end();
    });
}

// Helper: Send POST request to Cloud Function
function callCloudFunction(methodName, data) {
    return new Promise((resolve, reject) => {
        const fullUrl = `${CLOUD_FUNCTION_URL_BASE}/${methodName}`;
        const parsedUrl = url.parse(fullUrl);
        
        const postData = JSON.stringify(data);
        
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const parsed = JSON.parse(body);
                        resolve(parsed);
                    } catch (e) {
                         // Sometimes it returns plain text if error
                        reject(new Error(`Invalid JSON response: ${body}`));
                    }
                } else {
                    reject(new Error(`HTTP Error: ${res.statusCode} ${body}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(postData);
        req.end();
    });
}

async function uploadImage(localPath, remoteName) {
    try {
        if (!fs.existsSync(localPath)) {
            throw new Error(`File not found: ${localPath}`);
        }
        
        const content = fs.readFileSync(localPath, { encoding: 'base64' });
        
        const res = await callCloudFunction('uploadImage', {
            filename: remoteName,
            content: content
        });
        
        if (res.fileID) {
            return res.fileID;
        } else if (res.error) {
            throw new Error(res.error);
        } else {
            throw new Error('Unknown upload error');
        }
    } catch (e) {
        console.error(`  ❌ Upload failed for ${remoteName}:`, e.message);
        return null;
    }
}

async function main() {
    console.log('正在检测云函数 URL...');
    for (const testUrl of CANDIDATE_URLS) {
        console.log(`  Trying: ${testUrl}`);
        const isUp = await checkUrl(testUrl);
        if (isUp) {
            CLOUD_FUNCTION_URL_BASE = testUrl;
            console.log(`  ✅ 成功连接: ${CLOUD_FUNCTION_URL_BASE}`);
            break;
        }
    }
    
    if (!CLOUD_FUNCTION_URL_BASE) {
         console.error('\n❌ 无法自动连接到云函数。请执行以下步骤：');
         console.error('1. 打开 HBuilderX');
         console.error('2. 右键 uniCloud-aliyun/cloudfunctions/import-articles -> 上传部署');
         console.error('3. 登录 uniCloud 控制台 -> 云函数 -> import-articles -> 详情');
         console.error('4. 找到 "云函数URL化" -> 点击编辑 -> 启用 (路径设为 /http/import-articles)');
         console.error('5. 复制生成的 URL 填入脚本 upload-real-images.js 的 CANDIDATE_URLS 数组中\n');
         process.exit(1);
    }

    if (!fs.existsSync(DATA_FILE)) {
        console.error('Articles data file not found:', DATA_FILE);
        return;
    }

    const articles = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    console.log(`\nLoaded ${articles.length} articles.`);

    for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        console.log(`\n[${i+1}/${articles.length}] Processing: ${article.title}`);

        const localImages = article.local_images || [];
        const uploadedFileIDs = [];

        // Upload images
        for (const imgPath of localImages) {
            const fileName = `articles/${article.title}/${path.basename(imgPath)}`;
            console.log(`  Uploading: ${path.basename(imgPath)}...`);
            
            const fileID = await uploadImage(imgPath, fileName);
            if (fileID) {
                uploadedFileIDs.push(fileID);
                console.log(`    -> Success: ${fileID}`);
            }
        }

        if (uploadedFileIDs.length > 0) {
            // Prepare article data with cloud attachments
            const attachments = [{
                type: 'pdf-images',
                name: article.title + '.pdf',
                images: uploadedFileIDs,
                pageCount: uploadedFileIDs.length
            }];

            const articleData = {
                ...article,
                cover_image: uploadedFileIDs[0], // Use first page as cover
                attachments: attachments
            };
            
            // Remove local_images field before sending
            delete articleData.local_images;

            // Import/Update article
            console.log('  Saving article to database...');
            const importRes = await callCloudFunction('importData', {
                articles: [articleData]
            });
            
            if (importRes.success > 0) {
                console.log('  ✅ Article saved successfully.');
            } else {
                console.log('  ⚠️ Article save skipped or failed (see cloud logs).');
                if (importRes.errors && importRes.errors.length > 0) {
                    console.error('    Error:', importRes.errors[0].error);
                }
            }
        } else {
            console.log('  ⚠️ No images uploaded, skipping article save.');
        }
    }
    
    console.log('\nDone!');
}

main();
