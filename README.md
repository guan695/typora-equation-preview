# Typora Heading Demoter

一个无依赖、无轮询的 Typora 小插件：在正文中选中一段内容，按 `Ctrl+Alt+↓`，将选区内的 H1–H5 标题统一降一级；正文不变，H6 跳过。

## 安装

1. 保存文档并完全退出 Typora。
2. 在 PowerShell 中运行：

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File ".\install.ps1"
   ```

3. 接受一次 UAC 提示并重新打开 Typora。

安装脚本会备份 `resources\window.html`，把单个脚本复制到 `resources\heading-demoter.js`，并停用原 `typora_plugin` 的注入。原插件文件不会删除。

整批修改只产生一次撤销记录，按一次 `Ctrl+Z` 即可恢复。

## 恢复原插件

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".\install.ps1" -Action RestoreLegacy
```

## 仅卸载本插件

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".\install.ps1" -Action Uninstall
```

## 自测

```powershell
node .\test.js
```
