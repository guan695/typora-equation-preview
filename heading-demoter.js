(function (factory) {
  const api = factory(typeof window === "undefined" ? null : window);
  if (typeof module === "object" && module.exports) module.exports = api;
})(function (root) {
  "use strict";

  const SELECTOR = "#write h1[mdtype='heading'], #write h2[mdtype='heading'], #write h3[mdtype='heading'], #write h4[mdtype='heading'], #write h5[mdtype='heading'], #write h6[mdtype='heading']";
  const FLAG = "__typoraHeadingDemoterLoaded";
  const TOAST_ID = "typora-heading-demoter-toast";

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

  const api = { nextPattern, isShortcut, demoteSelection };
  if (root?.document && !root[FLAG]) {
    root[FLAG] = true;
    root.addEventListener("keydown", onKeyDown, true);
    root.headingDemoter = api;
  }
  return api;
});
