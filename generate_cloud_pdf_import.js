const fs = require('fs');
const path = require('path');

// Base config
const PDF_ROOT = "/Users/yeya/Documents/HBuilderProjects/云创工坊/所有PDF资料";
const OUTPUT_FILE = "/Users/yeya/Documents/HBuilderProjects/云创工坊/云创工坊前台/云创工坊前端/cloud_pdf_articles.json";
const CDN_BASE_URL = "https://mp-46bd4293-7b92-444c-b936-5777a228063a.cdn.bspapp.com";

// Category mapping based on directory names
const CATEGORY_MAP = {
    "四级知识板块": "cat_001",
    "六级知识板块": "cat_001",
    "考公知识板块资料": "cat_002",
    "考研知识点资料": "cat_004",
    "专升本知识板块": "cat_005",
    "教资资料": "cat_006", // Assuming this exists or similar
    "计算机资料": "cat_007",
    "考编资料": "cat_009",
    "朋友圈素材": "cat_008"
};

// Map directory names to tags or structured tags
function getTagsFromPath(filePath) {
    const relPath = path.relative(PDF_ROOT, filePath);
    const parts = relPath.split(path.sep);
    const rootDir = parts[0];

    // Default tags
    let tags = [];

    // Add specific logic based on folder structure if needed
    // Usually parts[1], parts[2] etc are tags
    if (parts.length > 1) {
        // Exclude filename
        tags = parts.slice(1, parts.length - 1);
    }

    // Specific adjustments for some categories if needed
    if (rootDir.includes("四级")) tags.unshift("四级");
    if (rootDir.includes("六级")) tags.unshift("六级");

    return tags.filter(t => t);
}

function scanFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            if (file === ".venv" || file === "__pycache__") return;
            scanFiles(filePath, fileList);
        } else {
            if (file.toLowerCase().endsWith('.pdf')) {
                fileList.push(filePath);
            }
        }
    });

    return fileList;
}

function generate() {
    console.log("Scanning files...");
    const pdfFiles = scanFiles(PDF_ROOT);
    console.log(`Found ${pdfFiles.length} PDF files.`);

    const articles = [];
    const now = Date.now();

    pdfFiles.forEach((filePath, index) => {
        const relPath = path.relative(PDF_ROOT, filePath);
        const parts = relPath.split(path.sep);
        const rootDir = parts[0];
        const filename = path.basename(filePath, '.pdf');

        // Determine category
        let categoryId = "cat_other";
        for (const [key, val] of Object.entries(CATEGORY_MAP)) {
            if (rootDir.includes(key) || key.includes(rootDir)) {
                categoryId = val;
                break;
            }
        }

        // Construct CDN URL
        // URL path usually matches local relative path, need to ensure encoding
        // The user example: .../云南专升本/历年各院校招生专业计划表/2025年云南专升本专项批次vs省控线.pdf
        // Local structure might strictly match this
        const urlPath = relPath.split(path.sep).map(p => encodeURIComponent(p)).join('/');
        const cdnUrl = `${CDN_BASE_URL}/${urlPath}`;

        const tags = getTagsFromPath(filePath);

        const article = {
            title: filename,
            category_id: categoryId,
            summary: filename, // Use title as summary
            content: `<p>${filename}</p>`, // Simple content
            price_points: 0, // Default free
            author_name: "云创工坊",
            publish_time: now - (index * 60000), // Stagger times
            stats: { views: 0, likes: 0, dislikes: 0 },
            tags: tags,
            attachments: [
                {
                    type: "pdf",
                    name: path.basename(filePath),
                    fileID: cdnUrl, // Use the CDN link as fileID for direct download/open
                    size: fs.statSync(filePath).size
                }
            ],
            // For compatibility with some views, we might set cover as empty or default
            cover_image: "",
            unlocked: true // Default unlocked or locked? User said "all articles deleted then add new", no mention of locking. Assuming free/unlocked for now unless price > 0.
        };

        articles.push(article);
    });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(articles, null, 2));
    console.log(`Generated ${articles.length} articles in ${OUTPUT_FILE}`);
}

generate();
