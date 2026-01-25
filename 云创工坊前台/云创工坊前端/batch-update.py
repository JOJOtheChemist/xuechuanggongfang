#!/usr/bin/env python3
import json
import os

# 需要更新的云对象列表
services = [
    "article-service",
    "business-service", 
    "checkin-service",
    "dashboard-service",
    "task-service",
    "wallet-service",
    "admin-service"
]

base_path = "uniCloud-aliyun/cloudfunctions"

# 新的 _before 代码模板
new_before_code = """const authUtils = require('auth-utils')

module.exports = {
  _before: function () {
    const params = this.getParams()[0] || {}
    const token = params._token
    
    if (!token) {
      throw new Error('未提供token，请先登录')
    }
    
    const tokenData = authUtils.parseToken(token)
    
    if (!tokenData || !tokenData.uid) {
      throw new Error('token无效或已过期，请重新登录')
    }
    
    this.currentUser = {
      uid: tokenData.uid,
      openid: tokenData.openid
    }
    
    console.log('[SERVICE_NAME] 认证成功, UID:', tokenData.uid)
    delete params._token
  },"""

for service in services:
    print(f"正在更新 {service}...")
    
    # 更新 package.json
    package_path = f"{base_path}/{service}/package.json"
    if os.path.exists(package_path):
        with open(package_path, 'r', encoding='utf-8') as f:
            package_data = json.load(f)
        
        # 添加 dependencies
        if 'dependencies' not in package_data:
            package_data['dependencies'] = {}
        package_data['dependencies']['auth-utils'] = 'file:../common/auth-utils'
        
        with open(package_path, 'w', encoding='utf-8') as f:
            json.dump(package_data, f, indent=2, ensure_ascii=False)
        
        print(f"  ✅ {service}/package.json 已更新")
    
    print(f"  ⚠️  请手动更新 {service}/index.obj.js 的 _before 方法")

print("\n所有 package.json 已更新完成！")
print("请参考 template.js 手动更新各云对象的 index.obj.js")
