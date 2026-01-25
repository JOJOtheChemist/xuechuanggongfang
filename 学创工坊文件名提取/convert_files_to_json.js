const fs = require('fs');
const path = require('path');
// Using native TextDecoder which supports 'gbk' in modern Node.js

const SOURCE_DIR = __dirname;
const OUTPUT_DIR = path.join(SOURCE_DIR, 'processed_json');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

function decodeGBK(buffer) {
    try {
        const decoder = new TextDecoder('gbk');
        return decoder.decode(buffer);
    } catch (e) {
        console.warn("TextDecoder 'gbk' failed, falling back to toString:", e.message);
        return buffer.toString();
    }
}

// Map<Level1, Array<ResultObject>>
let resourcesByLevel1 = {};

// Mapping based on updated "business_categories.init.json"
const CATEGORY_MAP = {
    "考公": "cat_002",
    "考编": "cat_009",
    "考研": "cat_004",
    "教资": "cat_006",
    "四六级": "cat_001",
    "专升本": "cat_005",
    "计算机": "cat_007",
    "动态": "cat_010",
    "就业": "cat_013",
    "考证": "cat_014",
    "升学": "cat_015",
    "驾校": "cat_003",
    "勤工": "cat_011",
    "棉被": "cat_016",
    "新人": "cat_012"
};

const validLevel1 = new Set();
fs.readdirSync(SOURCE_DIR, { withFileTypes: true }).forEach(dirent => {
    if (dirent.isDirectory() && !dirent.name.startsWith('.') && dirent.name !== 'processed_json') {
        validLevel1.add(dirent.name);
    }
});

function traverseAndProcess(currentDir) {
    const files = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const file of files) {
        const fullPath = path.join(currentDir, file.name);

        if (file.name.startsWith('.') || file.name === 'processed_json' || file.name === path.basename(__filename) || file.name.endsWith('.json')) {
            continue;
        }

        if (file.isDirectory()) {
            traverseAndProcess(fullPath);
        } else if (file.isFile() && file.name.toUpperCase().endsWith('.TXT')) {
            processFile(fullPath);
        }
    }
}

function processFile(filePath) {
    const relativePath = path.relative(SOURCE_DIR, filePath);
    const fileNameNoExt = path.basename(filePath, path.extname(filePath));

    let parts = fileNameNoExt.split('-');

    if (parts.length > 0) {
        let potentialL1 = parts[0];

        if (!validLevel1.has(potentialL1)) {
            for (const valid of validLevel1) {
                if (potentialL1.startsWith(valid)) {
                    const suffix = potentialL1.substring(valid.length);
                    const newParts = [valid];
                    if (suffix) newParts.push(suffix);
                    newParts.push(...parts.slice(1));
                    parts = newParts;
                    break;
                }
            }
        }
    }

    let level1 = parts.length > 0 ? parts[0] : '其他';
    let level2 = parts.length > 1 ? parts[1] : '';
    let level3 = parts.length > 2 ? parts[2] : '';
    let level4 = parts.length > 3 ? parts[3] : '';
    let level5 = parts.length > 4 ? parts[4] : '';

    if (!resourcesByLevel1[level1]) {
        resourcesByLevel1[level1] = [];
    }

    try {
        const buffer = fs.readFileSync(filePath);
        const content = decodeGBK(buffer);
        const lines = content.split(/\r?\n/);

        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return;

            if (trimmedLine.toUpperCase() === 'LIST.TXT') return;
            if (trimmedLine.endsWith('.bat')) return;
            if (trimmedLine === '.DS_Store') return;

            const resourceObj = {
                level1: level1,
                fileName: trimmedLine
            };

            if (level2) resourceObj.level2 = level2;
            if (level3) resourceObj.level3 = level3;
            if (level4) resourceObj.level4 = level4;
            if (level5) resourceObj.level5 = level5;

            resourcesByLevel1[level1].push(resourceObj);
        });

    } catch (err) {
        console.error(`Error processing ${relativePath}:`, err);
    }
}

// Clean output dir
fs.readdirSync(OUTPUT_DIR).forEach(f => {
    if (f.endsWith('.json')) fs.unlinkSync(path.join(OUTPUT_DIR, f));
});

console.log('Starting conversion...');
traverseAndProcess(SOURCE_DIR);

// Write separate files with Category ID in name
const allArticles = [];
const BASE_URL = "https://mp-46bd4293-7b92-444c-b936-5777a228063a.cdn.bspapp.com";

for (const [lvl1, items] of Object.entries(resourcesByLevel1)) {
    let outputFileName = `${lvl1}.json`;
    let catId = CATEGORY_MAP[lvl1] || 'cat_other'; // Default if missing

    if (CATEGORY_MAP[lvl1]) {
        outputFileName = `${lvl1}_${CATEGORY_MAP[lvl1]}.json`;
    }

    const outputPath = path.join(OUTPUT_DIR, outputFileName);
    fs.writeFileSync(outputPath, JSON.stringify(items, null, 2), 'utf8');
    console.log(`Saved ${items.length} items to ${outputFileName}`);

    // Aggregate for articles_data.json
    items.forEach(item => {
        // Construct Tags from levels
        // User requested: ["教资", "知识板块", "中学", "教育知识"] -> i.e., [Lvl1, Lvl2, Lvl3, Lvl4]
        const tags = [lvl1];
        if (item.level2) tags.push(item.level2);
        if (item.level3) tags.push(item.level3);
        if (item.level4) tags.push(item.level4);
        if (item.level5) tags.push(item.level5);

        // Remove duplicates if any (e.g. if file structure repeated names, though unlikely with current parsing)
        const uniqueTags = [...new Set(tags)];

        // Construct Path for URL (Best Guess)
        // Structure: Base / Level1 / Level2? / Level3? / Filename
        // User example: https://.../教资/知识板块/中学/教育知识/filename.pdf
        // Note: Filename in path usually includes extension.
        let urlPath = [lvl1];
        if (item.level2) urlPath.push(item.level2);
        if (item.level3) urlPath.push(item.level3);
        if (item.level4) urlPath.push(item.level4);
        if (item.level5) urlPath.push(item.level5);
        urlPath.push(item.fileName);

        const fullUrl = `${BASE_URL}/${urlPath.map(p => encodeURIComponent(p)).join('/')}`;
        const fileNameBase = item.fileName.replace(/\.pdf$/i, ''); // display title

        allArticles.push({
            title: fileNameBase,
            category_id: catId,
            summary: `${fileNameBase} 完整资料。`,
            content: `<p>请点击下方按钮阅读 PDF 文档：${fileNameBase}</p>`, // User preferred format
            price_points: 0,
            author_name: "云创管家",
            publish_time: Date.now(),
            stats: { views: 0, likes: 0, dislikes: 0 },
            tags: uniqueTags,
            attachments: [{
                type: "pdf",
                name: item.fileName,
                fileID: fullUrl,
                size: 0
            }],
            cover_image: "",
            unlocked: true
        });
    });
}

// Write the aggregated file to frontend static dir
const FRONTEND_STATIC_DIR = path.join(__dirname, '../云创工坊前台/云创工坊前端/pages/admin/static');
if (!fs.existsSync(FRONTEND_STATIC_DIR)) {
    // Try to create or just warn if path is wrong (User provided path: /Users/yeya/Documents/HBuilderProjects/云创工坊/云创工坊前台/云创工坊前端/pages/admin/static)
    // We can use the absolute path from user context to be safe.
}
// Using the absolute path derived from user context
const TARGET_ARTICLES_JSON = '/Users/yeya/Documents/HBuilderProjects/云创工坊/云创工坊前台/云创工坊前端/pages/admin/static/articles_data.json';




// ... (previous code)

try {
    fs.writeFileSync(TARGET_ARTICLES_JSON, JSON.stringify(allArticles, null, 2), 'utf8');
    console.log(`Successfully generated articles_data.json with ${allArticles.length} items at ${TARGET_ARTICLES_JSON}`);
} catch (e) {
    console.error(`Failed to write articles_data.json: ${e.message}`);
}

// Generate TAG_CONFIG based on hierarchy
const tagConfig = {};

for (const [lvl1, items] of Object.entries(resourcesByLevel1)) {
    const catId = CATEGORY_MAP[lvl1];
    if (!catId) continue;

    // Structure: TagName -> { name: TagName, children: Set/Map }
    const rootChildren = new Map(); // key: level2, value: Map of level3

    items.forEach(item => {
        if (!item.level2) return;

        if (!rootChildren.has(item.level2)) {
            rootChildren.set(item.level2, new Map());
        }

        if (item.level3) {
            const l2Children = rootChildren.get(item.level2);
            if (!l2Children.has(item.level3)) {
                l2Children.set(item.level3, new Set()); // level4 set
            }

            if (item.level4) {
                l2Children.get(item.level3).add(item.level4);
            }
        }
    });

    // recursive build
    const buildChildren = (map) => {
        const arr = [];
        for (const [key, val] of map.entries()) {
            if (val instanceof Map) {
                // It's a Map of sub-children
                const grandChildren = buildChildren(val);
                if (grandChildren.length > 0) {
                    arr.push({ name: key, children: grandChildren });
                } else {
                    arr.push(key);
                }
            } else if (val instanceof Set) {
                // It's a Set of leaf strings
                const leaves = Array.from(val);
                if (leaves.length > 0) {
                    arr.push({ name: key, children: leaves });
                } else {
                    arr.push(key);
                }
            }
        }
        return arr;
    };

    tagConfig[catId] = buildChildren(rootChildren);
}

console.log('--- Generated TAG_CONFIG ---');
console.log(JSON.stringify(tagConfig, null, 2));
console.log('----------------------------');

console.log('Done.');
