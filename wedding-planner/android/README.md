# 婚礼管家 Android APK
真正 Android 安装包，不是华为 PWA 快捷方式。使用粉色爱心双环图标（无右下角蓝色角标）。

## 使用
Android 8+（API 26+）或支持 APK 的荣耀/旧版鸿蒙。
**HarmonyOS NEXT / 鸿蒙 5+ 不支持原生 Android APK 的情况比较普遍，需要单独的 HAP。**

WebView 在原域名 https://beajom.github.io/picture/wedding-planner/ 中运行，独立保存登录会话。
请使用陈崇飞或胡锦莉已有账号登录，同一婚礼空间中的云端数据会显示。
本地浏览器存储不会自动继承，但原有云端数据不改变。

## 构建
在 JDK 17、Android SDK 35、Gradle 8.9 下执行 gradle assembleDebug。
默认提供可安装的测试签名 APK。
生产发布签名需安全配置 WEDDING_KEYSTORE_FILE、WEDDING_STORE_PASSWORD、WEDDING_KEY_ALIAS、WEDDING_KEY_PASSWORD。
不要将签名私钥放在公开 GitHub 仓库中。
