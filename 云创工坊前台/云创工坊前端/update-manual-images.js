const fs = require('fs');
const path = require('path');
const https = require('https');
const url = require('url');

// Configuration
// Cloud Storage Base URL (Must end with /)
const BASE_URL = 'https://mp-46bd4293-7b92-444c-b936-5777a228063a.cdn.bspapp.com/all_pdf_images/';

// Local Path Root to be replaced (Must end with / or whatever separator used)
// Note: We will dynamically detect the separator, but this string should match the start of your local_images paths.
const LOCAL_ROOT_PREFIX = '/Users/yeya/Documents/HBuilderProjects/云创工坊/所有PDF资料/';

// Set to true to print generated URLs without updating the database
const DRY_RUN = false;

const SPACE_ID = 'mp-46bd4293-7b92-444c-b936-5777a228063a';
const CLOUD_FUNCTION_NAME = 'import-articles';
const CANDIDATE_URLS = [
    `https://fc-${SPACE_ID}.next.bspapp.com/http/${CLOUD_FUNCTION_NAME}`,
    `https://${SPACE_ID}.next.bspapp.com/http/${CLOUD_FUNCTION_NAME}`
];

let CLOUD_FUNCTION_URL_BASE = '';
const DATA_FILE = path.join(__dirname, 'static', 'articles_data.json');

// Helper: Check URL availability
function checkUrl(urlToCheck) {
    return new Promise((resolve) => {
        const parsedUrl = url.parse(urlToCheck);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.path,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };
        const req = https.request(options, (res) => {
            if (res.statusCode !== 404) resolve(true);
            else resolve(false);
        });
        req.on('error', () => resolve(false));
        req.write(JSON.stringify({ test: true }));
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
                    try { resolve(JSON.parse(body)); }
                    catch (e) { reject(new Error(`Invalid JSON: ${body}`)); }
                } else {
                    reject(new Error(`HTTP Error: ${res.statusCode} ${body}`));
                }
            });
        });
        req.on('error', (e) => reject(e));
        req.write(postData);
        req.end();
    });
}

function convertLocalToRemote(localPath) {
    // 1. Check if path starts with prefix
    if (!localPath.startsWith(LOCAL_ROOT_PREFIX)) {
        console.warn(`    ⚠️ Path does not start with expected prefix: ${localPath}`);
        // Fallback: just use filename if prefix doesn't match? 
        // Or maybe return null to skip? 
        // For now, let's try to preserve the folder structure relative to the '所有PDF资料' directory if possible,
        // or just return plain filename if totally mismatch.
        // Let's being strict:
        return null;
    }

    // 2. Extract relative path
    // e.g. "六级知识板块/六级高频词汇.../image.webp"
    const relativePath = localPath.substring(LOCAL_ROOT_PREFIX.length);

    // 3. Split by path separator (forward or backward slash)
    const parts = relativePath.split(/[/\\]/);

    // 4. Encode each part (URI encode needed for Chinese characters)
    const encodedParts = parts.map(part => encodeURIComponent(part));

    // 5. Join with forward slashes
    const encodedRelativePath = encodedParts.join('/');

    // 6. Prepend Base URL
    return BASE_URL + encodedRelativePath;
}

async function main() {
    console.log('=============================================');
    console.log(`Dry Run Mode: ${DRY_RUN ? 'ON (No DB changes)' : 'OFF (Will update DB)'}`);
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Prefix  : ${LOCAL_ROOT_PREFIX}`);
    console.log('=============================================\n');

    if (!DRY_RUN) {
        console.log('正在检测云函数 URL...');
        for (const testUrl of CANDIDATE_URLS) {
            console.log(`  Trying: ${testUrl}`);
            if (await checkUrl(testUrl)) {
                CLOUD_FUNCTION_URL_BASE = testUrl;
                console.log(`  ✅ 成功连接: ${CLOUD_FUNCTION_URL_BASE}`);
                break;
            }
        }

        if (!CLOUD_FUNCTION_URL_BASE) {
            console.error('❌ 无法连接到云函数。请确保 import-articles 云函数已 URL 化。');
            process.exit(1);
        }
    }

    if (!fs.existsSync(DATA_FILE)) {
        console.error('Articles data file not found:', DATA_FILE);
        return;
    }

    const articles = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    console.log(`\nFound ${articles.length} articles to process.`);

    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        // console.log(`\n[${i+1}/${articles.length}] Processing: ${article.title}`);

        const localImages = article.local_images || [];
        const remoteUrls = [];

        for (const imgPath of localImages) {
            const remoteUrl = convertLocalToRemote(imgPath);
            if (remoteUrl) {
                remoteUrls.push(remoteUrl);
            }
        }

        if (remoteUrls.length > 0) {
            // Log the first mapping for verification
            console.log(`\n[${i + 1}] ${article.title}`);
            console.log(`    L: ${localImages[0]}`);
            console.log(`    R: ${remoteUrls[0]}`);
            if (localImages.length > 1) {
                console.log(`    ... (+${localImages.length - 1} more)`);
            }

            if (!DRY_RUN) {
                // Prepare update payload
                const attachments = [{
                    type: 'pdf-images',
                    name: article.title + '.pdf',
                    images: remoteUrls,
                    pageCount: remoteUrls.length
                }];

                const articleData = {
                    ...article,
                    cover_image: remoteUrls[0],
                    attachments: attachments
                };
                delete articleData.local_images;

                try {
                    const importRes = await callCloudFunction('importData', {
                        articles: [articleData]
                    });

                    if (importRes.success > 0) {
                        console.log('    ✅ DB Update Success');
                        successCount++;
                    } else {
                        console.error('    ⚠️ DB Update Failed:', importRes);
                    }
                } catch (e) {
                    console.error('    ❌ Request Failed:', e.message);
                }
            } else {
                successCount++; // Count potential successes in dry run
            }
        } else {
            console.log(`\n[${i + 1}] ${article.title} - ⚠️ Skipped (No valid image mappings)`);
            skipCount++;
        }
    }

    console.log('\n=============================================');
    console.log(`Summary: Processed ${articles.length} articles.`);
    console.log(`Potential Updates: ${successCount}`);
    console.log(`Skipped: ${skipCount}`);

    if (DRY_RUN) {
        console.log('\n⚠️  This was a DRY RUN. No database changes were made.');
        console.log('👉 To apply changes, set "const DRY_RUN = false;" in the script and run again.');
    } else {
        console.log('\n✅ Database update complete.');
    }
}

main();
