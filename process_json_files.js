const fs = require('fs');
const path = require('path');

const JSON_DIR = path.join(__dirname, '学创工坊文件名提取/processed_json');
const CDN_BASE = "https://mp-46bd4293-7b92-444c-b936-5777a228063a.cdn.bspapp.com/";

const CATEGORY_MAP = {
    "教资": "cat_006",
    "考公": "cat_002",
    "考编": "cat_009",
    "四六级": "cat_001",
    "考研": "cat_004",
    "专升本": "cat_005",
    "计算机": "cat_007",
    "朋友圈": "cat_008",
    "就业": "cat_013",
    "考证": "cat_014",
    "升学": "cat_015"
};

if (!fs.existsSync(JSON_DIR)) {
    console.error("Directory not found:", JSON_DIR);
    process.exit(1);
}

const files = fs.readdirSync(JSON_DIR).filter(f => f.endsWith('.json'));

files.forEach(file => {
    const filePath = path.join(JSON_DIR, file);
    let newFileName = file;
    let categoryId = "";

    // Check if renaming is needed
    // If it already has _cat_XXX, keep it (or extract it)
    if (file.match(/cat_\d{3}/)) {
        // Already named correctly
        // extract ID if needed?
    } else {
        // Try to match keywords
        for (const [key, val] of Object.entries(CATEGORY_MAP)) {
            if (file.includes(key)) {
                categoryId = val;
                // Rename logic: Name_cat_XXX.json
                // But remove '增量' maybe? The user didn't ask to remove, just add.
                // Let's keep original name and append category.
                newFileName = file.replace('.json', '') + '_' + categoryId + '.json';
                break;
            }
        }
    }

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        let items = JSON.parse(content);
        let updated = false;

        if (Array.isArray(items)) {
            items = items.map(item => {
                // Construct URL Path & Tags
                const parts = [];
                const tags = [];

                if (item.level1) { parts.push(item.level1); tags.push(item.level1); }
                if (item.level2) { parts.push(item.level2); tags.push(item.level2); }
                if (item.level3) { parts.push(item.level3); tags.push(item.level3); }
                if (item.level4) { parts.push(item.level4); tags.push(item.level4); }
                if (item.fileName) parts.push(item.fileName);

                const urlPath = parts.join('/');
                const fileID = CDN_BASE + urlPath;

                return {
                    ...item,
                    fileID: fileID,
                    tags: tags // Add generated tags
                };
            });
            updated = true;
        }

        if (updated) {
            const newFilePath = path.join(JSON_DIR, newFileName);
            fs.writeFileSync(newFilePath, JSON.stringify(items, null, 2));
            console.log(`Processed: ${file} -> ${newFileName}`);

            // Delete old file if renamed
            if (newFileName !== file) {
                fs.unlinkSync(filePath);
            }
        }

    } catch (e) {
        console.error(`Error processing ${file}:`, e);
    }
});
