import json
import os
import base64
import requests
import time

# === 配置 ===
# 云函数 URL (根据你给的默认域名拼接)
# 阿里云某些空间可能需要 /http 前缀
API_URL = "https://fc-mp-46bd4293-7b92-444c-b936-5777a228063a.next.bspapp.com/http/import-articles"

# 数据文件路径
DATA_FILE = "/Users/yeya/Documents/HBuilderProjects/云创工坊/云创工坊前台/云创工坊前端/articles_data.json"

def main():
    print(f"读取数据文件: {DATA_FILE}")
    if not os.path.exists(DATA_FILE):
        print("错误: 文件不存在")
        return

    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        articles = json.load(f)

    print(f"共 {len(articles)} 篇文章，准备开始上传...")
    
    # 每次上传的数量 (分批，防止请求包过大)
    # 由于图片转base64很大，建议一篇一篇传，或者包含少量图片
    BATCH_SIZE = 1 
    
    for i, article in enumerate(articles):
        print(f"\n[{i+1}/{len(articles)}] 处理: {article['title']}")
        
        # 1. 处理图片转 Base64
        # 云函数只能接收文本，无法直接读本地文件
        # 我们把 local_images 转换成 base64 数组传过去
        # 云函数端其实没法把 base64 转回 cloud:// (除非用 uniCloud.uploadFile，但云函数里用不了)
        # *** 修正 ***
        # 云函数里不能直接把 Base64 存成云存储文件 (需用 admin SDK 或 扩展库，比较麻烦)
        #
        # 最简单的临时方案：
        # 我们直接把 Base64 存到 articles 的 attachments 字段里展示？
        # 不行，太大了，数据库会炸。
        # 
        # 回到现实：
        # “脚本上传图片到云存储”必须要有 uni-cloud-admin 的权限。
        # 既然你用了 URL 化，云函数收到 Base64 后，可以用 uniCloud.uploadFile (云函数端) 吗？
        # 答案：云函数端只能用 `uniCloud.uploadFile` (仅支持腾讯云/阿里云流式上传，且需要扩展能力)
        
        # 为了不折腾你配置 admin key，
        # 我们这里做一个 *取巧* 的办法：
        # 我们只上传文章元数据（文字部分）。
        # 图片... 暂时没办法通过简单的 HTTP 脚本传到 uniCloud 云存储（因为有签名校验）。
        # 
        # 等等，除非...
        # 你能接受图片暂时不显示？或者我们在 HBuilderX 前端页面里点一下“自动上传”？
        # 
        # 你之前说“用脚本上传到他们云数据库上去”。
        # 我先只传文章数据。图片路径先留空，或者指向一个占位符。
        # 这样先把 359 篇文章建好。
        # 
        # 如果你一定要传图片，且不想手动点 HBuilderX，
        # 那必须用 uni-admin 那个 SDK，比较重。
        
        # 先试着传数据看看通不通。
        
        payload = {
            "articles": [article]
        }
        
        try:
            # 发送请求
            resp = requests.post(API_URL, json=payload, timeout=30)
            if resp.status_code == 200:
                print("  ✅ 上传成功:", resp.text)
            else:
                print(f"  ❌ 失败 ({resp.status_code}):", resp.text)
        except Exception as e:
            print("  ❌ 请求异常:", str(e))
            
        # 避免频率过快
        time.sleep(0.5)

if __name__ == "__main__":
    main()
