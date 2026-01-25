import os

def process_files(root_dir, base_url):
    results = []
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.TXT') and file != 'LIST.TXT':
                file_path = os.path.join(root, file)
                # Get the relative path from root_dir
                rel_dir = os.path.relpath(root, root_dir)
                if rel_dir == '.':
                    rel_dir = ''
                
                # Extract the suffix from the filename
                # Example: '专升本-知识板块-公共英语.TXT' -> '公共英语'
                # We split by '-' and take the last part, then remove .TXT
                name_parts = file.replace('.TXT', '').split('-')
                suffix = name_parts[-1]
                
                # Construct the folder path in the URL
                url_folder = os.path.join(rel_dir, suffix).replace('\\', '/')
                
                try:
                    # Try reading with gbk encoding
                    with open(file_path, 'r', encoding='gbk') as f:
                        lines = f.readlines()
                except UnicodeDecodeError:
                    # Fallback to utf-8 if gbk fails
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            lines = f.readlines()
                    except:
                        continue
                
                for line in lines:
                    pdf_name = line.strip()
                    if pdf_name.endswith('.pdf'):
                        full_url = f"{base_url}{url_folder}/{pdf_name}"
                        results.append(full_url)
    
    return results

if __name__ == "__main__":
    root_directory = "/Users/yeya/Documents/HBuilderProjects/云创工坊/学创工坊文件名提取"
    cdn_base = "https://mp-46bd4293-7b92-444c-b936-5777a228063a.cdn.bspapp.com/"
    
    urls = process_files(root_directory, cdn_base)
    for url in urls:
        print(url)
