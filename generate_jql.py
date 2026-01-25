import os
import urllib.parse
import json
import time

FOLDER_MAP = {
    "专升本": "cat_005",
    "四六级": "cat_001",
    "四级": "cat_001",
    "六级": "cat_001",
    "考公": "cat_002",
    "考研": "cat_004",
    "考编": "cat_009",
    "计算机": "cat_007",
    "升学": "cat_005",
    "就业": "cat_009",
    "教资": "cat_002",
    "教师资格证": "cat_002",
    "考证": "cat_002",
    "素材": "cat_008"
}

def generate_jql(url_file, output_jql):
    with open(url_file, 'r', encoding='utf-8') as f:
        urls = [line.strip() for line in f if line.strip()]

    articles = []
    now = int(time.time() * 1000)
    
    for i, url in enumerate(urls):
        # Decode the URL to get the original paths and filename
        decoded_url = urllib.parse.unquote(url)
        path_parts = decoded_url.split('/')
        filename = path_parts[-1].replace('.pdf', '')
        
        # Determine Category ID
        category_id = "cat_011" # Default to Resource Files (cat_011) if no match
        for key, val in FOLDER_MAP.items():
            if key in decoded_url:
                category_id = val
                break
        
        # Extract tags from the path (relative to the base folder)
        # The base folders start after the domain.
        # Example: https://.../专升本/知识板块/公共英语/xxx.pdf
        # path_parts[3:] would be ['专升本', '知识板块', '公共英语', 'xxx.pdf']
        tags = []
        if len(path_parts) > 4:
             tags = path_parts[3:-1]

        article = {
            "title": filename,
            "category_id": category_id,
            "summary": f"{filename} 完整资料。",
            "content": f"<p>请点击下方按钮阅读 PDF 文档：{filename}</p>",
            "price_points": 0,
            "author_name": "云创管家",
            "publish_time": now - (i * 1000), # Descending order
            "tags": tags,
            "stats": {"views": 0, "likes": 0, "dislikes": 0},
            "attachments": [
                {
                    "type": "pdf",
                    "name": filename + ".pdf",
                    "fileID": url,
                    "size": 0
                }
            ],
            "cover_image": "",
            "unlocked": True,
            "create_date": now,
            "update_date": now
        }
        articles.append(article)

    # Write to JQL in batches of 100 to avoid limits
    batch_size = 100
    with open(output_jql, 'w', encoding='utf-8') as f:
        f.write("// 批量导入导出的文件文章\n")
        f.write("// 共有 {} 条记录\n".format(len(articles)))
        f.write("const db = uniCloud.database();\n")
        for i in range(0, len(articles), batch_size):
            batch = articles[i:i+batch_size]
            f.write("db.collection('articles').add({});\n".format(json.dumps(batch, ensure_ascii=False, indent=2)))
            f.write("\n")

if __name__ == "__main__":
    url_list = "/Users/yeya/Documents/HBuilderProjects/云创工坊/extracted_urls.txt"
    output = "/Users/yeya/Documents/HBuilderProjects/云创工坊/云创工坊前台/云创工坊前端/uniCloud-aliyun/database/import-concatenated-articles.jql"
    generate_jql(url_list, output)
