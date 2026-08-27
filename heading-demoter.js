(function (factory) {
  const api = factory(typeof window === "undefined" ? null : window);
  if (typeof module === "object" && module.exports) module.exports = api;
})(function (root) {
  "use strict";

  const SELECTOR = "#write h1[mdtype='heading'], #write h2[mdtype='heading'], #write h3[mdtype='heading'], #write h4[mdtype='heading'], #write h5[mdtype='heading'], #write h6[mdtype='heading']";
  const FLAG = "__typoraHeadingDemoterLoaded";
  const TOAST_ID = "typora-heading-demoter-toast";
  const PREVIEW_ID = "typora-equation-reference-preview";

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

  const api = { nextPattern, isShortcut, isPreviewGesture, equationTargetId, demoteSelection };
  if (root?.document && !root[FLAG]) {
    root[FLAG] = true;
    root.addEventListener("keydown", onKeyDown, true);
    root.addEventListener("mousedown", onEquationMouseDown, true);
    root.addEventListener("click", onEquationClick, true);
    root.headingDemoter = api;
  }
  return api;
});
