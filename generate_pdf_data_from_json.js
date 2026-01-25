const fs = require('fs');
const path = require('path');

// Configuration
const JSON_DIR = path.join(__dirname, '学创工坊文件名提取/processed_json');
const OUTPUT_FILE = path.join(__dirname, '云创工坊前台/云创工坊前端/pages/admin/static/cloud_urls.json');
// Note: The user mentioned "cloud_pdf_articles.json" in my plan, but "cloud_urls.json" is used by batch-pdf-upload quick import.
// Using "articles_data.json" might be better for "local-import".
// Let's generate BOTH or a main one. The prompt mentioned "articles_data.json" in grep results.
// Let's stick to the plan's output file but maybe also helpful to update what the frontend uses.
const OUTPUT_DATA_FILE = path.join(__dirname, '云创工坊前台/云创工坊前端/pages/admin/static/articles_data.json');

const CDN_BASE = "https://mp-46bd4293-7b92-444c-b936-5777a228063a.cdn.bspapp.com/";

// Category Logic
const CATEGORY_MAP = {
    "四级": "cat_001",
    "六级": "cat_001",
    "考公": "cat_002",
    "考研": "cat_004",
    "专升本": "cat_005",
    "教资": "cat_006",
    "计算机": "cat_007",
    "朋友圈": "cat_008",
    "考编": "cat_009"
};

function getCategory(level1, filename) {
    // Try level 1 first
    for (const [key, val] of Object.entries(CATEGORY_MAP)) {
        if (level1.includes(key)) return val;
    }
    // Try filename
    for (const [key, val] of Object.entries(CATEGORY_MAP)) {
        if (filename.includes(key)) return val;
    }
    return "cat_other";
}

function processFiles() {
    console.log("Reading JSON files from:", JSON_DIR);

    if (!fs.existsSync(JSON_DIR)) {
        console.error("Directory not found:", JSON_DIR);
        return;
    }

    const files = fs.readdirSync(JSON_DIR).filter(f => f.endsWith('.json'));
    let allArticles = [];
    let allUrls = [];

    files.forEach(file => {
        const filePath = path.join(JSON_DIR, file);
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const items = JSON.parse(content);

            if (!Array.isArray(items)) return;

            items.forEach((item, index) => {
                // Construct Path parts: level1, level2, level3, level4...
                // The structure is flat in the JSON objects: level1, level2...
                // We need to join them.

                // Exclude empty levels
                const parts = [];
                if (item.level1) parts.push(item.level1);
                if (item.level2) parts.push(item.level2);
                if (item.level3) parts.push(item.level3);
                if (item.level4) parts.push(item.level4);

                // Last part is filename
                // Check if filename is already included in levels or separate?
                // Looking at json sample:
                // "level1": "专升本", "fileName": "2025年云南专升本专项批次vs省控线.pdf", "level2": "历年各院校招生专业计划表"
                // The user said: ".../专升本/历年各院校招生专业计划表/2025年云南专升本专项批次vs省控线.pdf"
                // So it seems to be level1 + level2 + ... + fileName

                // Need to re-order? The JSON keys order isn't guaranteed.
                // Sample 1: level1=专升本, fileName=..., level2=历年...
                // Sample 2: level1=专升本, fileName=..., level2=知识板块, level3=公共英语

                // It seems generally: level1 / level2 / [level3] / [level4] / fileName

                const pathParts = [];
                if (item.level1) pathParts.push(item.level1);
                if (item.level2) pathParts.push(item.level2);
                if (item.level3) pathParts.push(item.level3);
                if (item.level4) pathParts.push(item.level4);

                // Ensure filename is added
                if (item.fileName) pathParts.push(item.fileName);

                // Construct URL - UNENCODED as requested
                // Use '/' to join
                const urlPath = pathParts.join('/');

                // If there are duplicate slashes, remove them (though join shouldn't create them if parts are clean)
                // CDN Path
                const cdnUrl = CDN_BASE + urlPath;

                allUrls.push(cdnUrl);

                // Article Object
                // Use tags from item if available (from process_json_files.js), otherwise generate simple ones
                let tags = item.tags || [];
                if (tags.length === 0) {
                    if (item.level1) tags.push(item.level1);
                    if (item.level2) tags.push(item.level2);
                    if (item.level3) tags.push(item.level3);
                }

                const article = {
                    title: item.fileName.replace('.pdf', ''),
                    category_id: getCategory(item.level1 || "", item.fileName),
                    summary: `${item.fileName} 完整资料。`,
                    content: `<p>请点击下方按钮阅读 PDF 文档：${item.fileName.replace('.pdf', '')}</p>`,
                    price_points: 0,
                    author_name: "云创管家",
                    publish_time: Date.now() - (Math.floor(Math.random() * 1000000)),
                    stats: { views: 0, likes: 0, dislikes: 0 },
                    tags: tags,
                    cover_image: "",
                    attachments: [
                        {
                            type: "pdf",
                            name: item.fileName,
                            fileID: item.fileID || cdnUrl, // Prefer pre-calculated fileID
                            size: 0
                        }
                    ]
                };

                allArticles.push(article);
            });

        } catch (e) {
            console.error(`Error processing ${file}:`, e);
        }
    });

    console.log(`Generated ${allArticles.length} articles.`);

    // Write articles_data.json
    fs.writeFileSync(OUTPUT_DATA_FILE, JSON.stringify(allArticles, null, 2));
    console.log(`Saved to ${OUTPUT_DATA_FILE}`);

    // Write cloud_urls.json (simple list)
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allUrls, null, 2));
    console.log(`Saved urls to ${OUTPUT_FILE}`);
}

processFiles();
