(function (factory) {
  const api = factory(typeof window === "undefined" ? null : window);
  if (typeof module === "object" && module.exports) module.exports = api;
})(function (root) {
  "use strict";

  const SELECTOR = "#write h1[mdtype='heading'], #write h2[mdtype='heading'], #write h3[mdtype='heading'], #write h4[mdtype='heading'], #write h5[mdtype='heading'], #write h6[mdtype='heading']";
  const FLAG = "__typoraHeadingDemoterLoaded";
  const TOAST_ID = "typora-heading-demoter-toast";
  const PREVIEW_ID = "typora-equation-reference-preview";
  const EXPLANATION_PLACEHOLDER = "在这里填写讲解内容。";

  function nextPattern(pattern, level) {
    if (!pattern) return undefined;
    if (/[-=]/.test(pattern)) {
      return level <= 2 ? pattern.replace(/[-=]/g, level === 1 ? "=" : "-") : undefined;
    }
    return pattern.replace(/#+/g, "#".repeat(level));
  }

  function isShortcut(event) {
    return event.ctrlKey && event.altKey && !event.shiftKey && !event.metaKey && event.key.toLowerCase() === "arrowdown";
  }

  function isPreviewGesture(event) {
    return event.button === 0 && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey;
  }

  function equationTargetId(href, base) {
    if (!href) return undefined;
    try {
      const id = decodeURIComponent(new URL(href, base || "file:///").hash.slice(1));
      return id.startsWith("mjx-eqn:") ? id : undefined;
    } catch {
      return undefined;
    }
  }

  function normalizeDisplayMath(markdown) {
    const newline = markdown.includes("\r\n") ? "\r\n" : "\n";
    const lines = markdown.split(newline);
    const output = [];
    const lineOffsets = [];
    let offset = 0;
    for (const line of lines) {
      lineOffsets.push(offset);
      offset += line.length + newline.length;
    }
    const codeSpans = markdown.matchAll(/(?<!`)(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)/g);
    let codeSpan = codeSpans.next().value;
    let count = 0;
    let fence = null;
    let htmlEnd = null;
    let frontMatter = lines[0]?.trim() === "---";
    let inQuote = false;
    const listIndents = [];

    function closingIndex(text, delimiter) {
      let at = text.indexOf(delimiter);
      while (at !== -1) {
        let slashes = 0;
        for (let i = at - 1; i >= 0 && text[i] === "\\"; i--) slashes++;
        if (slashes % 2 === 0) return at;
        at = text.indexOf(delimiter, at + delimiter.length);
      }
      return -1;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (frontMatter) {
        output.push(line);
        if (i > 0 && /^(---|\.\.\.)\s*$/.test(line)) frontMatter = false;
        continue;
      }
      while (codeSpan && codeSpan.index + codeSpan[0].length <= lineOffsets[i]) codeSpan = codeSpans.next().value;
      if (!fence && codeSpan && codeSpan.index < lineOffsets[i]) {
        output.push(line);
        continue;
      }
      const leadingSpaces = /^ */.exec(line)[0].length;
      while (listIndents.length && line.trim() && leadingSpaces < listIndents[listIndents.length - 1]) listIndents.pop();
      let firstPrefix = line.slice(0, listIndents[listIndents.length - 1] || 0);
      let content = line.slice(firstPrefix.length);
      if (fence) {
        output.push(line);
        const end = /^ {0,3}(`+|~+)\s*$/.exec(content);
        if (end && end[1][0] === fence[0] && end[1].length >= fence.length) fence = null;
        continue;
      }
      if (!htmlEnd) {
        let marker;
        while ((marker = /^( {0,3}(?:[-+*]|\d+[.)]) {1,4})(?=\S|$)/.exec(content))) {
          firstPrefix += marker[1];
          content = content.slice(marker[1].length);
          listIndents.push(firstPrefix.length);
        }
      }
      const startFence = /^ {0,3}(`{3,}|~{3,})/.exec(content);
      if (startFence) {
        fence = startFence[1];
        output.push(line);
        continue;
      }
      if (htmlEnd) {
        output.push(line);
        if (htmlEnd.test(line)) htmlEnd = null;
        continue;
      }
      const htmlStart = /<!--|<\?|<\/?(script|style|pre|textarea|div|table|section|details)\b/i.exec(line);
      if (htmlStart) {
        const end = htmlStart[0] === "<!--" ? /-->/ : htmlStart[0] === "<?" ? /\?>/ : new RegExp(`</${htmlStart[1]}\\s*>`, "i");
        if (!end.test(line)) htmlEnd = end;
        output.push(line);
        continue;
      }
      if (/^ {0,3}>/.test(content)) inQuote = true;
      else if (!content.trim()) inQuote = false;
      if (inQuote) {
        output.push(line);
        continue;
      }
      if (codeSpan && codeSpan.index < lineOffsets[i] + line.length) {
        output.push(line);
        continue;
      }
      const opening = /^( {0,3})(\$\$(?!\$)|\\\[|\\\()/.exec(content);
      if (!opening) {
        output.push(line);
        continue;
      }
      const [prefix, spacing, delimiter] = opening;
      const firstIndent = firstPrefix + spacing;
      const indent = " ".repeat(firstIndent.length);
      const close = delimiter === "$$" ? "$$" : delimiter === "\\[" ? "\\]" : "\\)";
      const blockOpening = !content.slice(prefix.length).trim();
      if (delimiter === "$$" && blockOpening) {
        let end = i + 1;
        while (end < lines.length && !/^ *\$\$\s*$/.test(lines[end])) end++;
        for (let j = i; j <= end && j < lines.length; j++) output.push(lines[j]);
        i = end;
        continue;
      }
      const body = [];
      let end = i;
      let part = content.slice(prefix.length);
      let at = closingIndex(part, close);
      // Keep all formula lines inside the same list item; fences still end a candidate.
      while (at < 0 && end + 1 < lines.length) {
        const next = lines[end + 1];
        if (next.trim() && !next.startsWith(indent)) break;
        const nextContent = next.startsWith(indent) ? next.slice(indent.length) : next;
        if (!blockOpening && !nextContent.trim()) break;
        if (closingIndex(nextContent, close) < 0 && /^ {0,3}(?:`{3}|~{3}|\$\$|\\\[|\\\()/.test(nextContent)) break;
        body.push(part);
        part = nextContent;
        end++;
        at = closingIndex(part, close);
      }
      if (at < 0 || part.slice(at + close.length).trim()) {
        output.push(line);
        continue;
      }
      body.push(part.slice(0, at));
      const formula = body.join(newline).trim();
      if (!formula || formula.includes("`")) {
        output.push(...lines.slice(i, end + 1));
        i = end;
        continue;
      }
      if (output.length && output[output.length - 1].trim()) output.push("");
      output.push(`${firstIndent}$$`, ...formula.split(newline).map(part => indent + part), `${indent}$$`);
      if (end + 1 < lines.length && lines[end + 1].trim()) output.push("");
      i = end;
      count++;
    }
    return { markdown: output.join(newline), count };
  }

  function formatDisplayMath() {
    const file = root.File;
    const editor = file?.editor;
    if (!editor || file.isLocked || root.document.body.classList.contains("modal-open")) {
      notify("当前文档不可编辑", true);
      return 0;
    }
    file.sync();
    const result = normalizeDisplayMath(editor.getMarkdown());
    if (!result.count) {
      notify("没有需要转换的独立公式");
      return 0;
    }
    if (editor.sourceView?.inSourceMode) {
      const cm = editor.sourceView.cm;
      const scroll = cm.getScrollInfo();
      const cursor = cm.getCursor();
      cm.operation(() => cm.replaceRange(result.markdown, { line: 0, ch: 0 }, cm.posFromIndex(cm.getValue().length), "formatDisplayMath"));
      cm.setCursor(cursor);
      cm.scrollTo(scroll.left, scroll.top);
      cm.focus();
    } else {
      const content = root.document.querySelector("content");
      const scrollTop = content?.scrollTop;
      file.reloadContent(result.markdown, { delayRefresh: false });
      root.requestAnimationFrame(() => { if (content) content.scrollTop = scrollTop; });
    }
    notify(`已转换 ${result.count} 个公式块，可按 Ctrl+Z 撤销`);
    return result.count;
  }

  function explanationBlock(content = "", newline = "\n") {
    const body = content.replace(/\r\n?/g, "\n").replace(/^\n+|\n+$/g, "");
    const lines = (body.trim() ? body : EXPLANATION_PLACEHOLDER).split("\n");
    return ["***", "", "> [!NOTE]", "> **补充说明**", ">", ...lines.map(line => line ? `> ${line}` : ">"), "", "***"].join(newline);
  }

  function explanationEdit(markdown, from, to) {
    const newline = markdown.includes("\r\n") ? "\r\n" : "\n";
    const lineStart = from > 0 ? markdown.lastIndexOf("\n", from - 1) + 1 : 0;
    const lineEnd = markdown.indexOf("\n", from);
    const line = markdown.slice(lineStart, lineEnd < 0 ? markdown.length : lineEnd).replace(/\r$/, "");
    const prefix = /^[ \t]*(?:(?:[-+*]|\d+[.)])[ \t]+)?/.exec(line)[0];
    const beforeOnLine = markdown.slice(lineStart, from);
    let indent = /^[ \t]*/.exec(line)[0];
    const inList = prefix.trim() && from - lineStart >= prefix.length;
    if (inList) indent = " ".repeat(prefix.replace(/\t/g, "    ").length);
    const selected = markdown.slice(from, to);
    const body = selected.replace(/\r\n?/g, "\n").split("\n")
      .map(part => indent && part.startsWith(indent) ? part.slice(indent.length) : part).join("\n");
    let block = explanationBlock(body, newline).split(newline).map(part => part ? indent + part : "").join(newline);
    const after = markdown.slice(to);
    let leading = "";
    if (inList && beforeOnLine === prefix) {
      block = block.slice(indent.length);
    } else {
      if (!beforeOnLine.trim()) from = lineStart;
      const before = markdown.slice(0, from);
      if (before && !before.endsWith(newline + newline)) leading = before.endsWith(newline) ? newline : newline + newline;
    }
    let trailing = "";
    if (after && !after.startsWith(newline + newline)) {
      trailing = after.startsWith(newline) ? newline : newline + newline;
      if (!after.startsWith(newline) && to > 0 && markdown[to - 1] !== "\n") trailing += indent;
    }
    const text = leading + block + trailing;
    const start = !selected.trim() ? from + text.indexOf(EXPLANATION_PLACEHOLDER) : from + text.length;
    return { from, to, text, selectionFrom: start, selectionTo: start + (!selected.trim() ? EXPLANATION_PLACEHOLDER.length : 0) };
  }

  function insertExplanation() {
    const editor = root.File?.editor;
    if (!editor || root.File.isLocked || root.document.body.classList.contains("modal-open")) {
      notify("当前文档不可编辑", true);
      return false;
    }
    if (root.File.option?.enableAlert === false) {
      notify("请先在 Typora 偏好设置中启用 GitHub Style Alert / Callouts", true);
      return false;
    }
    if (editor.sourceView?.inSourceMode) {
      const cm = editor.sourceView.cm;
      if (cm.listSelections().length > 1) {
        notify("请只保留一个光标或选区", true);
        return false;
      }
      const edit = explanationEdit(cm.getValue(), cm.indexFromPos(cm.getCursor("from")), cm.indexFromPos(cm.getCursor("to")));
      cm.operation(() => {
        cm.replaceRange(edit.text, cm.posFromIndex(edit.from), cm.posFromIndex(edit.to), "insertExplanation");
        cm.setSelection(cm.posFromIndex(edit.selectionFrom), cm.posFromIndex(edit.selectionTo));
      });
      cm.focus();
      cm.scrollIntoView();
      notify("已插入补充说明，可按 Ctrl+Z 撤销");
      return true;
    }
    if (root.document.activeElement?.closest?.(".CodeMirror, table")) {
      notify("请先在正文段落中放置光标或选择内容", true);
      return false;
    }
    const range = editor.selection.getRangy()?.cloneRange();
    const write = root.document.getElementById("write");
    if (!range || !write?.contains(range.startContainer) || !write.contains(range.endContainer)) {
      notify("请先在正文中放置光标或选择内容", true);
      return false;
    }
    const copyRange = range.cloneRange();
    let content = "";
    if (!range.collapsed) {
      editor.selection.includeTrailMeta(copyRange);
      content = editor.UserOp.getMarkdownSourceFrom(editor.UserOp.prepMarkHtml(copyRange.toHtml(), editor).html());
      if (!content.trim()) {
        notify("未能读取选中的 Markdown，请改用源代码模式", true);
        return false;
      }
    }
    // Parse in a detached node map, then paste blocks so an inline cursor still gets real separators.
    const html = root.NodeDef.parseFrom(explanationBlock(content), new editor.nodeMap.constructor(), { skips: { old_code: false } })[0];
    const oldIds = new Set(Array.from(write.querySelectorAll("[cid]")).map(element => element.getAttribute("cid")));
    editor.writingArea.focus({ preventScroll: true });
    editor.selection.setRange(range, true);
    editor.undo.endSnap(true);
    let inserted = false;
    editor.UserOp.pasteHandler(editor, { markhtml: html }, false, (_startCid, _start, _endCid, _end, command) => {
      inserted = true;
      // Native mark-HTML paste omits alert types; repair new blocks in the same undo command.
      for (const element of Array.from(write.querySelectorAll("[mdtype='blockquote'][cid]")).reverse()) {
        const cid = element.getAttribute("cid");
        if (oldIds.has(cid)) continue;
        const node = editor.getNode(cid);
        const first = node?.getFirstChild();
        if (first?.get("type") !== "paragraph") continue;
        const alert = /^\s*\[!(note|tip|important|warning|caution)\](?:\s|$)/i.exec(first.get("text") || "")?.[1].toLowerCase();
        if (!alert || node.get("alert") === alert) continue;
        node.set("alert", alert);
        element.outerHTML = node.toHTML();
        command.redo.push(editor.undo.UndoManager.buildReplaceUndo(node));
      }
      if (!content.trim()) {
        const placeholder = Array.from(write.querySelectorAll("p[mdtype='paragraph'][cid]"))
          .find(element => !oldIds.has(element.getAttribute("cid")) && element.textContent === EXPLANATION_PLACEHOLDER);
        if (placeholder) {
          editor.selection.restoreSelection(placeholder, { start: 0, end: EXPLANATION_PLACEHOLDER.length });
          const cursor = editor.selection.buildUndo();
          if (cursor && command) command.redo.push(cursor);
        }
      }
      editor.undo.endSnap(true);
      editor.selection.scrollAdjust();
      notify("已插入补充说明，可按 Ctrl+Z 撤销");
    });
    if (!inserted) notify("请将光标放在正文段落中重试", true);
    return inserted;
  }

  function installPluginMenu() {
    if (root.document.getElementById("typora-plugin-menu-button")) return;
    const style = root.document.createElement("style");
    style.textContent = `
      #typora-plugin-menu-button { position: fixed; top: 6px; right: 18px; z-index: 9998; -webkit-app-region: no-drag; padding: 3px 12px; border: 1px solid var(--border-color, #aaa); border-radius: 4px; color: var(--text-color, #333); background: var(--bg-color, #fff); font: 13px sans-serif; cursor: pointer; }
      #typora-plugin-menu { inset: unset; margin: 0; padding: 14px; width: 350px; max-width: calc(100vw - 16px); max-height: 75vh; overflow: auto; box-sizing: border-box; border: 1px solid var(--border-color, #aaa); border-radius: 8px; color: var(--text-color, #333); background: var(--bg-color, #fff); box-shadow: 0 8px 28px #0003; font: 14px/1.6 sans-serif; }
      #typora-plugin-menu h3 { margin: 0 0 10px; font-size: 16px; }
      #typora-plugin-menu button { display: block; width: 100%; text-align: left; padding: 7px 10px; border: 1px solid var(--border-color, #aaa); border-radius: 4px; color: inherit; background: transparent; cursor: pointer; font: inherit; }
      #typora-plugin-menu button:hover, #typora-plugin-menu button:focus-visible { background: var(--active-file-bg-color, #8882); }
      #typora-plugin-menu p { margin: 4px 0 14px; font-size: 12px; opacity: .8; }
      #typora-plugin-menu .plugin-feature { font-weight: 600; }
      @media print { #typora-plugin-menu-button, #typora-plugin-menu { display: none !important; } }
    `;
    root.document.head.appendChild(style);
    const button = root.document.createElement("button");
    button.id = "typora-plugin-menu-button";
    button.type = "button";
    button.textContent = "Plugin";
    button.title = "查看插件功能";
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-controls", "typora-plugin-menu");
    button.setAttribute("aria-expanded", "false");
    const panel = root.document.createElement("div");
    panel.id = "typora-plugin-menu";
    panel.setAttribute("popover", "auto");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "插件功能");
    panel.innerHTML = String.raw`<h3>插件功能</h3>
      <button type="button" data-action="explanation">插入补充说明</button>
      <p>插入上下分隔线与 NOTE 说明块；选中内容时直接包裹，无选区时选中正文占位文字。支持源代码模式，可整次撤销。</p>
      <button type="button" data-action="math">全文独立公式 → 居中公式块</button>
      <p>支持 $$…$$、\[ … \]、\( … \)。支持列表内公式并保留缩进；正文行内公式保留。整批转换可撤销，也可在源代码模式使用。</p>
      <button type="button" data-action="heading">选区标题降一级　Ctrl+Alt+↓</button>
      <p>先选中正文中的一段内容，将其中 H1–H5 标题降一级；H6 保留。可整批撤销。</p>
      <div class="plugin-feature">公式引用就地预览</div>
      <p>普通单击 \ref / \eqref 渲染出的公式编号即可预览；Ctrl+单击仍跳转。点击外面或 Esc 关闭。</p>`;
    root.document.body.append(button, panel);
    // Keep the editor selection when the menu is opened with the mouse.
    button.addEventListener("mousedown", event => event.preventDefault());
    panel.addEventListener("mousedown", event => { if (event.target.closest("button")) event.preventDefault(); });
    function positionButton() {
      const titlebar = root.document.getElementById("top-titlebar");
      button.style.right = titlebar?.getBoundingClientRect().height ? "146px" : "18px";
    }
    positionButton();
    root.addEventListener("resize", positionButton);
    button.addEventListener("click", () => {
      if (panel.matches(":popover-open")) return panel.hidePopover();
      positionButton();
      panel.style.left = "0px";
      panel.style.top = "0px";
      panel.showPopover();
      const rect = button.getBoundingClientRect();
      panel.style.left = `${Math.max(8, Math.min(rect.right - panel.offsetWidth, root.innerWidth - panel.offsetWidth - 8))}px`;
      panel.style.top = `${rect.bottom + 6}px`;
    });
    panel.addEventListener("toggle", () => button.setAttribute("aria-expanded", String(panel.matches(":popover-open"))));
    panel.addEventListener("click", event => {
      const action = event.target.closest("button")?.dataset.action;
      if (!action) return;
      panel.hidePopover();
      try {
        if (action === "math") formatDisplayMath();
        else if (action === "explanation") insertExplanation();
        else if (action === "heading") demoteSelection();
      } catch (error) {
        console.error("[Typora Plugin]", error);
        notify("操作失败，请查看开发者控制台", true);
      }
    });
  }

  function overlaps(range, element) {
    try {
      return range.intersectsNode(element);
    } catch {
      return false;
    }
  }

  function notify(message, error) {
    root.document.getElementById(TOAST_ID)?.remove();
    const toast = root.document.createElement("div");
    toast.id = TOAST_ID;
    toast.setAttribute("role", "status");
    toast.textContent = message;
    Object.assign(toast.style, {
      position: "fixed",
      left: "50%",
      bottom: "34px",
      transform: "translateX(-50%)",
      zIndex: "99999",
      padding: "7px 12px",
      borderRadius: "5px",
      color: "#fff",
      background: error ? "#b42318" : "rgba(30, 30, 30, .88)",
      fontSize: "13px",
      pointerEvents: "none",
    });
    root.document.body.appendChild(toast);
    root.setTimeout(() => toast.remove(), 1600);
  }

  function equationReference(target) {
    const anchor = target?.closest?.("a");
    const write = root.document.getElementById("write");
    if (!anchor || !write?.contains(anchor)) return undefined;
    const href = anchor.getAttribute("href") || anchor.getAttribute("xlink:href");
    const targetId = equationTargetId(href, root.location.href);
    return targetId ? { anchor, targetId } : undefined;
  }

  function previewPanel() {
    let panel = root.document.getElementById(PREVIEW_ID);
    if (panel) return panel;
    panel = root.document.createElement("div");
    panel.id = PREVIEW_ID;
    panel.setAttribute("popover", "auto");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "公式引用预览");
    Object.assign(panel.style, {
      position: "fixed",
      inset: "unset",
      margin: "0",
      maxWidth: "min(88vw, 960px)",
      maxHeight: "60vh",
      overflow: "auto",
      boxSizing: "border-box",
      padding: "12px 16px",
      border: "1px solid var(--border-color, rgba(127, 127, 127, .35))",
      borderRadius: "8px",
      color: "var(--text-color, #333)",
      background: "var(--bg-color, #fff)",
      boxShadow: "0 8px 28px rgba(0, 0, 0, .22)",
    });
    root.document.body.appendChild(panel);
    return panel;
  }

  function cloneEquation(targetId) {
    const target = root.document.getElementById(targetId);
    const math = target?.closest?.("mjx-container");
    if (!math) return undefined;
    const clone = math.cloneNode(true);
    if (clone.id.startsWith("mjx-eqn:")) clone.removeAttribute("id");
    clone.querySelectorAll("[id^='mjx-eqn:']").forEach(element => element.removeAttribute("id"));
    clone.removeAttribute("tabindex");
    clone.querySelectorAll("[tabindex]").forEach(element => element.removeAttribute("tabindex"));
    Object.assign(clone.style, { display: "block", margin: "0" });
    return clone;
  }

  function showEquationPreview(reference) {
    const equation = cloneEquation(reference.targetId);
    if (!equation) {
      notify("未找到被引用公式，请检查 \\label 或刷新数学公式", true);
      return false;
    }

    const panel = previewPanel();
    panel.replaceChildren(equation);
    panel.style.left = "0px";
    panel.style.top = "0px";
    if (!panel.matches(":popover-open")) panel.showPopover();

    const gap = 8;
    const padding = 8;
    const anchorRect = reference.anchor.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const maxLeft = Math.max(padding, root.innerWidth - panelRect.width - padding);
    const maxTop = Math.max(padding, root.innerHeight - panelRect.height - padding);
    const left = Math.min(maxLeft, Math.max(padding, anchorRect.left + anchorRect.width / 2 - panelRect.width / 2));
    let top = anchorRect.top - panelRect.height - gap;
    if (top < padding) top = anchorRect.bottom + gap;
    top = Math.min(maxTop, Math.max(padding, top));
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    return true;
  }

  function selectedHeadings(editor, range) {
    return Array.from(root.document.querySelectorAll(SELECTOR))
      .filter(element => overlaps(range, element))
      .map(element => {
        const node = editor.getNode(element.getAttribute("cid"));
        return { element, node, level: Number(node?.get("depth")) };
      })
      .filter(item => item.node && item.level >= 1 && item.level < 6);
  }

  function applyBatch(editor, items, range) {
    const manager = editor.undo?.UndoManager;
    if (!manager?.makeEmptyCommand || !manager?.buildReplaceUndo) return false;

    editor.undo.endSnap(true);
    const cursor = editor.selection.buildUndo(range);
    const command = manager.makeEmptyCommand(cursor);

    for (const item of items) {
      const nextLevel = item.level + 1;
      command.undo.push(manager.buildReplaceUndo(item.node));
      item.node.set("depth", nextLevel);
      item.node.set("pattern", nextPattern(item.node.get("pattern"), nextLevel));
      command.redo.push(manager.buildReplaceUndo(item.node));
      item.html = item.node.toHTML();
    }

    for (const item of items) item.element.outerHTML = item.html;
    if (cursor) editor.undo.exeCommand(cursor);
    const cursorAfter = editor.selection.buildUndo();
    if (cursorAfter) command.redo.push(cursorAfter);
    editor.undo.register(command);
    editor.refocus();
    return true;
  }

  function applyNativeFallback(editor, items) {
    for (const item of items) editor.stylize.changeBlock(`header${item.level + 1}`, item.node);
  }

  function demoteSelection() {
    const editor = root.File?.editor;
    if (!editor || root.File.isLocked || root.document.body.classList.contains("modal-open")) return 0;
    if (editor.sourceView?.inSourceMode) {
      notify("请先退出源代码模式", true);
      return 0;
    }

    const selection = root.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      notify("请先在正文中选中包含标题的范围", true);
      return 0;
    }

    const range = selection.getRangeAt(0).cloneRange();
    const items = selectedHeadings(editor, range);
    if (items.length === 0) {
      notify("选区中没有可降级的 H1–H5 标题", true);
      return 0;
    }

    if (!applyBatch(editor, items, range)) applyNativeFallback(editor, items);
    notify(`已降级 ${items.length} 个标题`);
    return items.length;
  }

  function onKeyDown(event) {
    if (!isShortcut(event) || event.repeat || event.isComposing) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      demoteSelection();
    } catch (error) {
      console.error("[Heading Demoter]", error);
      notify("标题降级失败，请查看开发者控制台", true);
    }
  }

  function onEquationMouseDown(event) {
    if (!isPreviewGesture(event) || root.File?.editor?.sourceView?.inSourceMode) return;
    if (!equationReference(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function onEquationClick(event) {
    if (!isPreviewGesture(event) || root.File?.editor?.sourceView?.inSourceMode) return;
    const reference = equationReference(event.target);
    if (!reference) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      showEquationPreview(reference);
    } catch (error) {
      console.error("[Equation Reference Preview]", error);
      notify("公式预览失败，请查看开发者控制台", true);
    }
  }

  const api = { nextPattern, isShortcut, isPreviewGesture, equationTargetId, demoteSelection, normalizeDisplayMath, formatDisplayMath, explanationBlock, explanationEdit, insertExplanation };
  if (root?.document && !root[FLAG]) {
    root[FLAG] = true;
    root.addEventListener("keydown", onKeyDown, true);
    root.addEventListener("mousedown", onEquationMouseDown, true);
    root.addEventListener("click", onEquationClick, true);
    root.headingDemoter = api;
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", installPluginMenu, { once: true });
    else installPluginMenu();
  }
  return api;
});
