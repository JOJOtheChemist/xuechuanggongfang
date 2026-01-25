const fs = require('fs');
const content = fs.readFileSync('/Users/yeya/Documents/HBuilderProjects/云创工坊/云创工坊前台/云创工坊前端/common/tag-config.js', 'utf8');

// Use regex to extract the object portion more reliably
const startToken = 'export const TAG_CONFIG =';
const startIndex = content.indexOf(startToken);
if (startIndex === -1) {
    console.error('TAG_CONFIG not found');
    process.exit(1);
}

// Extract search space
let searchSpace = content.substring(startIndex + startToken.length).trim();

// Try to find the closing brace by counting braces or identifying the next export
// Simplified: find the last closing brace or next export
const nextExport = searchSpace.indexOf('export');
if (nextExport !== -1) {
    searchSpace = searchSpace.substring(0, nextExport).trim();
}
// Strip potential trailing export default
searchSpace = searchSpace.replace(/export default[\s\S]*$/, '').trim();

let TAG_CONFIG;
try {
    // Wrap in parens to make it an expression
    TAG_CONFIG = eval('(' + searchSpace + ')');
} catch (e) {
    console.error('Parsing failed:', e.message);
    process.exit(1);
}

const articles = [];
const baseUrl = 'https://mp-46bd4293-7b92-444c-b936-5777a228063a.cdn.bspapp.com/所有PDF资料_仅PDF备份/';
const placeholderPdf = 'placeholder.pdf';

function traverse(catId, items, path = []) {
    if (!Array.isArray(items)) return;
    items.forEach(item => {
        if (typeof item === 'string') {
            createArticle(catId, [...path, item]);
        } else if (item.name && item.children) {
            if (!Array.isArray(item.children) || item.children.length === 0) {
                createArticle(catId, [...path, item.name]);
            } else {
                traverse(catId, item.children, [...path, item.name]);
            }
        }
    });
}

function createArticle(catId, tags) {
    const title = '[测试文章] ' + tags.join(' - ');
    articles.push({
        title: title,
        category_id: catId,
        tags: tags,
        content: '这是一篇系统生成的测试文章，用于验证【' + tags.join(' > ') + '】分类。点击下方附件可查看 PDF。',
        price_points: 0,
        author_name: '系统自建',
        status: 1,
        publish_time: Date.now(),
        createTime: Date.now(), // Fixed field name based on getList
        attachments: [
            {
                type: 'pdf',
                name: tags[tags.length - 1] + '.pdf',
                fileID: baseUrl + placeholderPdf,
                size: 1048576
            }
        ],
        stats: { views: 0, likes: 0, dislikes: 0 }
    });
}

Object.keys(TAG_CONFIG).forEach(catId => {
    traverse(catId, TAG_CONFIG[catId]);
});

// Output as a JS module for direct import in uni-app (bypasses uni.request issues)
const jsContent = `export const PLACEHOLDER_ARTICLES = ${JSON.stringify(articles, null, 2)};\n\nexport default PLACEHOLDER_ARTICLES;`;
fs.writeFileSync('/Users/yeya/Documents/HBuilderProjects/云创工坊/云创工坊前台/云创工坊前端/common/placeholder-data.js', jsContent);
console.log(`Generated ${articles.length} articles to common/placeholder-data.js`);
