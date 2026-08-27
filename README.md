<h1 align="center">Typora Equation Preview</h1>

<p align="center">
  <strong>Preview referenced equations in place—without losing your reading position.</strong><br>
  在原位置预览被引用公式，不再来回跳转。
</p>

<p align="center">
  <img alt="Typora 1.14.9" src="https://img.shields.io/badge/Typora-1.14.9%20tested-5b5bd6?style=flat-square">
  <img alt="Windows 10 and 11" src="https://img.shields.io/badge/Windows-10%20%7C%2011-0078d4?style=flat-square">
  <img alt="Zero dependencies" src="https://img.shields.io/badge/dependencies-0-2ea043?style=flat-square">
  <a href="https://github.com/guan695/typora-equation-preview/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/guan695/typora-equation-preview?style=flat-square"></a>
</p>

![Typora equation reference preview](assets/equation-preview.svg)

Long technical derivations often refer back to equations several screens away. Typora can jump to an official MathJax `\label` / `\eqref`, but getting back breaks the reading flow. This tiny Windows enhancement adds the missing interaction: **plain-click a rendered equation number to preview the already-rendered formula in a popover**.

No MathJax rerender. No runtime dependency. No full plugin framework.

## Features

- **In-place equation preview** using Typora's official `\label` and `\eqref` syntax.
- **No page jump** on a plain click; the current reading position stays put.
- **Native navigation preserved** with <kbd>Ctrl</kbd> + click.
- **One popover at a time**, dismissed by clicking outside or pressing <kbd>Esc</kbd>.
- **Long equations remain usable** with viewport-aware placement and horizontal scrolling.
- **Lightweight installation**: one JavaScript file, one small injection, zero dependencies.
- **Bonus:** demote all selected H1–H5 headings with <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>↓</kbd> and undo the batch once.

## Quick start

Use [Typora's official math cross-reference syntax](https://support.typora.io/Math/):

```tex
$$
E = mc^2
\label{eq:energy}
\tag{1.6}
$$

Substitute $\eqref{eq:energy}$ into the next equation.
```

Then interact with the rendered reference:

| Action | Result |
|---|---|
| Plain left click | Preview the referenced equation in place |
| <kbd>Ctrl</kbd> + click | Use Typora's native jump |
| Click elsewhere / <kbd>Esc</kbd> | Close the preview |

Make sure **File → Preferences → Markdown → Math → Inline Math** is enabled.

## Install on Windows

1. Save your documents and fully exit Typora.
2. Clone or download this repository.
3. Run from PowerShell:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File ".\install.ps1"
   ```

4. Accept the UAC prompt, then reopen Typora.

The installer backs up `resources\window.html`, copies the single script to `resources\heading-demoter.js`, and disables the legacy `typora_plugin` injection if present. The historical filename is intentionally retained for upgrade compatibility.

Typora updates may replace the injection. If the feature disappears after an update, rerun the installer.

## Restore or uninstall

Restore the legacy `typora_plugin` injection:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".\install.ps1" -Action RestoreLegacy
```

Remove only this enhancement:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".\install.ps1" -Action Uninstall
```

## Compatibility and safety

- Tested with **Typora 1.14.9** on **Windows 11**.
- This is an unofficial enhancement and modifies Typora's installed `window.html` after creating a timestamped backup.
- It only recognizes official MathJax equation targets; ordinary text such as `(1.6)` is never guessed or rewritten.
- <kbd>Ctrl</kbd> + click remains under Typora's control.

## Self-test

```powershell
node .\test.js
```

If this saves you from one more scroll through a long derivation, a ⭐ helps other Typora users find it.

---

## 中文说明

Typora 已支持 MathJax 官方 `\label`、`\ref` 和 `\eqref`，但点击引用只能跳转到原公式。对于公式推导较长的文档，看完还要再找回原位置。

这个小工具补上了“**引用处就地预览**”：普通单击蓝色公式编号会弹出对应公式，页面不滚动；<kbd>Ctrl</kbd> + 单击仍执行 Typora 原生跳转；点击其他位置或按 <kbd>Esc</kbd> 关闭。

### 使用方式

```tex
$$
E = mc^2
\label{eq:energy}
\tag{1.6}
$$

将式 $\eqref{eq:energy}$ 代入下一公式。
```

请先在 **文件 → 偏好设置 → Markdown → 数学公式** 中启用行内公式，然后按照上方“Install on Windows”步骤安装。

附带功能：在正文中选中一段内容，按 <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>↓</kbd>，可将其中 H1–H5 标题整批降一级；整批操作只需一次 <kbd>Ctrl</kbd> + <kbd>Z</kbd> 即可撤销。

遇到兼容性问题时，请在 Issue 中附上 Typora 版本、Windows 版本和无法预览的 `\label` / `\eqref` 最小示例。
