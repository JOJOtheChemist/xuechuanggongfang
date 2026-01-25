#!/bin/bash

# 批量更新云对象认证逻辑

SERVICES=("article-service" "business-service" "checkin-service" "dashboard-service" "task-service" "wallet-service" "admin-service")

for SERVICE in "${SERVICES[@]}"; do
  echo "更新 $SERVICE..."
  
  # 更新 package.json - 添加 auth-utils 依赖
  PACKAGE_FILE="uniCloud-aliyun/cloudfunctions/$SERVICE/package.json"
  
  if [ -f "$PACKAGE_FILE" ]; then
    # 备份
    cp "$PACKAGE_FILE" "$PACKAGE_FILE.bak"
    
    # 检查是否已有 dependencies
    if grep -q '"dependencies"' "$PACKAGE_FILE"; then
      echo "$SERVICE 已有 dependencies，需要手动检查"
    else
      # 添加 dependencies
      sed -i '' 's/  }/  },\
  "dependencies": {\
    "auth-utils": "file:..\/common\/auth-utils"\
  }/g' "$PACKAGE_FILE"
      echo "  ✅ package.json 更新完成"
    fi
  fi
done

echo "所有云对象 package.json 已更新！"
echo "请手动更新每个云对象的 index.obj.js 文件的 _before 方法"
