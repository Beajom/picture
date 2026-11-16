# 崇逢锦时 · 婚礼管家 Android APK

安卓原生 WebView 安装包。主页保持现有在线婚礼管家：
https://beajom.github.io/picture/wedding-planner/

- **桌面图标**：粉色渐变、白色爱心、两枚金色相扣戒指；不采用华为快应用快捷方式的蓝色角标。
- **云端数据**：继续使用现有 Supabase 共享婚礼，不迁移、不复制、更不覆盖数据。新 APK 的 WebView 存储与旧浏览器/快应用互相独立，安装后请用已有邮箱重新登录。
- **项目备份**：安卓 10+ 通过原生接口将 JSON/CSV 导出到手机“下载”目录。
- **网页更新**：APP 会直接访问现有 GitHub Pages 网址；需要联网。

## 构建 APK

在仓库 `Actions → 婚礼管家 APK 构建` 中运行自动构建，完成后下载 `WeddingPlanner-Android-APK` 工件，或访问本仓库 Releases 的 `wedding-android-v1-preview` 预发布页面。

- 自动构建输出：`WeddingPlanner-v1-Preview.apk`
- 源码生成脚本：`wedding-android-app/build.sh`
- Android SDK Platform 35、JDK 17、Gradle 8.10.2、Android Gradle Plugin 8.7.3。

**签名注意**：GitHub Actions 的测试 APK 由临时调试密钥签名，可在华为/荣耀手机安装测试，但不同 CI 运行的调试签名可能不同，不能作为长期正式升级签名。长期发布前应创建并私密备份稳定的正式签名密钥，使用签名后的 release APK。请勿把密钥上传到公开仓库。

**安装前**：先在原 APP「我的 → 高级设置」导出原始 JSON；确认现有云端婚礼预算、费用和待办记录后再切换，勿清除浏览器的站点数据。