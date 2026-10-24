"use strict";

const assert = require("node:assert/strict");
const { nextPattern, isShortcut, isPreviewGesture, equationTargetId, normalizeDisplayMath, explanationBlock, explanationEdit } = require("./heading-demoter");

assert.equal(nextPattern("## {0}", 3), "### {0}");
assert.equal(nextPattern("{0}\n===", 2), "{0}\n---");
assert.equal(nextPattern("{0}\n---", 3), undefined);
assert.equal(nextPattern(undefined, 4), undefined);
assert.equal(isShortcut({ ctrlKey: true, altKey: true, shiftKey: false, metaKey: false, key: "ArrowDown" }), true);
assert.equal(isShortcut({ ctrlKey: true, altKey: false, shiftKey: false, metaKey: false, key: "ArrowDown" }), false);
assert.equal(isPreviewGesture({ button: 0, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false }), true);
assert.equal(isPreviewGesture({ button: 0, ctrlKey: true, metaKey: false, altKey: false, shiftKey: false }), false);
assert.equal(equationTargetId("#mjx-eqn%3Aeq%3A1.6", "file:///document.md"), "mjx-eqn:eq:1.6");
assert.equal(equationTargetId("file:///document.md#mjx-eqn%3Aeq%3AA.11"), "mjx-eqn:eq:A.11");
assert.equal(equationTargetId("#section-1", "file:///document.md"), undefined);

const cases = [
  ["$$A_{m \\times n} = U \\Sigma V^T$$", "$$\nA_{m \\times n} = U \\Sigma V^T\n$$", 1],
  [String.raw`\[a=b\]`, "$$\na=b\n$$", 1],
  [String.raw`\(a=b\)`, "$$\na=b\n$$", 1],
  ["前文\n$$a=b$$\n后文", "前文\n\n$$\na=b\n$$\n\n后文", 1],
  ["\\[\na=b\n\\]", "$$\na=b\n$$", 1],
  ["\\(\na=b\n\\)", "$$\na=b\n$$", 1],
  ["\\[\na=b\n\nc=d\n\\]", "$$\na=b\n\nc=d\n$$", 1],
  ["$$a=\nb$$", "$$\na=\nb\n$$", 1],
  ["  \\(a=b\\)  ", "  $$\n  a=b\n  $$", 1],
  ["前文\r\n$$a=b$$\r\n后文\r\n", "前文\r\n\r\n$$\r\na=b\r\n$$\r\n\r\n后文\r\n", 1],
  // Regression: standalone list formulas retain every line of list indentation.
  ["2. 求 U：\n   同理，\n   $$A A^T = U (\\Sigma \\Sigma^T) U^T$$\n   * 列向量", "2. 求 U：\n   同理，\n\n   $$\n   A A^T = U (\\Sigma \\Sigma^T) U^T\n   $$\n\n   * 列向量", 1],
  ["- 项目\n  \\(a\\)", "- 项目\n\n  $$\n  a\n  $$", 1],
  ["- 项目\n\n  \\(a\\)", "- 项目\n\n  $$\n  a\n  $$", 1],
  ["10. 项目\n    \\[a=b\\]", "10. 项目\n\n    $$\n    a=b\n    $$", 1],
  ["- \\(a\\)", "- $$\n  a\n  $$", 1],
  ["- 一级\n  - 二级\n    $$a$$\n  \\(b\\)", "- 一级\n  - 二级\n\n    $$\n    a\n    $$\n\n  $$\n  b\n  $$", 2],
  ["1. 一级\n   - 二级\n     \\[\n     a=b\n     c=d\n     \\]", "1. 一级\n   - 二级\n\n     $$\n     a=b\n     c=d\n     $$", 1],
  ["$$a=\nb\n$$", "$$\na=\nb\n$$", 1],
];
for (const [input, expected, count] of cases) {
  const result = normalizeDisplayMath(input);
  assert.deepEqual(result, { markdown: expected, count }, input);
  assert.deepEqual(normalizeDisplayMath(result.markdown), { markdown: expected, count: 0 }, `idempotent: ${input}`);
}
const unchanged = [
  "", "普通正文", "$a=b$", "$$$$", "$$ $$", String.raw`\(\)`,
  "$$\nunclosed\n\\(a\\)",
  "$$\na=b\n$$", "$$\na=b\n\nc=d\n$$", "$$\n\\(x\\)\n$$",
  String.raw`句子里的 \(A\) 和 \[B\] 以及 $$C$$ 均保留。`,
  String.raw`$$a$$ $$b$$`, String.raw`$$a$$ 后文`, String.raw`\(a\) 后文`,
  String.raw`\(a\) + \(b\)`, String.raw`\(a`, String.raw`\[a\)`,
  String.raw`\(a\)\)`, String.raw`\\(a\\)`, String.raw`\$\$a\$\$`,
  "> 引用\n\\(a\\)",
  "    $$a$$", "\t$$a$$", "> $$a$$",
  "`start\n- fake list\n  end`\n\n    $$code$$",
  "`code\n$$a$$\nend`", "``code\n\\(a\\)\nend``",
  "- 项目\n      $$code$$", "- 项目\n\n      \\(code\\)",
  "- ```tex\n  $$code$$\n  ```",
  "1. 一级\n   - 二级\n     ```tex\n     $$code$$\n     ```",
  "```tex\n$$a$$\n\\[b\\]\n\\(c\\)\n```", "~~~\n$$a$$\n~~~",
  "````md\n```\n$$a$$\n````", "`$$a$$`", "$$`code`$$",
  "---\nformula: \\(a\\)\n$$b$$\n---", "---\n$$a$$",
  "<!--\n$$a$$\n-->", "<pre>\n$$a$$\n</pre>", "<div>\n\\(a\\)\n</div>",
];
for (const input of unchanged) assert.deepEqual(normalizeDisplayMath(input), { markdown: input, count: 0 }, input);
const mixed = "```\n$$code$$\n```\n$$A$$\n\\[B\\]\n\\(C\\)\n正文 \\(D\\)";
assert.equal(normalizeDisplayMath(mixed).count, 3);
assert.equal(normalizeDisplayMath("```\n$$code$$\n```\n$$A$$").count, 1);
assert.equal(normalizeDisplayMath("---\ntitle: hi\n---\n\\(A\\)").count, 1);
assert.equal(normalizeDisplayMath("$$x = \\$5$$").count, 1);
assert.equal(normalizeDisplayMath("Unmatched ` tick\n\\(A\\)").count, 1);
assert.equal(normalizeDisplayMath("- 项目\n\n\\(A\\)").count, 1);

// Exercise the editor adapter without opening or editing a real document.
const vm = require("node:vm");
const fs = require("node:fs");
const content = { scrollTop: 123 };
let reloads = [];
let replacements = [];
let syncs = 0;
let source = false;
let documentText = String.raw`\(a=b\)`;
let onReady;
const cm = {
  getValue: () => documentText,
  getScrollInfo: () => ({ left: 0, top: 45 }),
  getCursor: () => ({ line: 0, ch: 0 }),
  posFromIndex: ch => ({ line: 0, ch }),
  operation: callback => callback(),
  replaceRange: (...args) => { replacements.push(args); documentText = args[0]; },
  setCursor() {}, scrollTo() {}, focus() {},
};
const document = {
  readyState: "loading",
  body: { classList: { contains: () => false }, appendChild() {} },
  getElementById: () => null,
  createElement: () => ({ style: {}, setAttribute() {} }),
  querySelector: () => content,
  addEventListener: (name, callback) => { if (name === "DOMContentLoaded") onReady = callback; },
};
const window = {
  document, setTimeout() {}, addEventListener() {}, requestAnimationFrame: callback => callback(),
  File: {
    sync: () => syncs++,
    reloadContent: (...args) => { reloads.push(args); documentText = args[0]; },
    editor: { getMarkdown: () => documentText, sourceView: { get inSourceMode() { return source; }, cm } },
  },
};
vm.runInNewContext(fs.readFileSync(require.resolve("./heading-demoter"), "utf8"), { window, URL, console });
assert.equal(window.headingDemoter.formatDisplayMath(), 1);
assert.equal(reloads.length, 1);
assert.equal(reloads[0][0], "$$\na=b\n$$");
assert.equal(reloads[0][1].delayRefresh, false);
assert.equal(content.scrollTop, 123);
assert.equal(window.headingDemoter.formatDisplayMath(), 0);
assert.equal(reloads.length, 1);
source = true;
documentText = "$$c=d$$";
assert.equal(window.headingDemoter.formatDisplayMath(), 1);
assert.equal(reloads.length, 1);
assert.equal(replacements.length, 1);
assert.equal(replacements[0][0], "$$\nc=d\n$$");
assert.equal(replacements[0][3], "formatDisplayMath");
window.File.isLocked = true;
assert.equal(window.headingDemoter.formatDisplayMath(), 0);
assert.equal(syncs, 3);

// Check that startup exposes the menu and its math action reaches the editor.
const elements = new Map();
const append = (...items) => items.forEach(item => { if (item.id) elements.set(item.id, item); });
document.head = { appendChild: append };
document.body.append = append;
document.body.appendChild = append;
document.getElementById = id => elements.get(id);
document.createElement = () => ({
  style: {}, attributes: {}, listeners: {}, offsetWidth: 350,
  setAttribute(name, value) { this.attributes[name] = value; },
  addEventListener(name, callback) { this.listeners[name] = callback; },
  matches() { return Boolean(this.open); },
  showPopover() { this.open = true; this.listeners.toggle?.(); },
  hidePopover() { this.open = false; this.listeners.toggle?.(); },
  getBoundingClientRect: () => ({ right: 780, bottom: 30 }),
  remove() { elements.delete(this.id); },
});
window.innerWidth = 800;
onReady();
const menuButton = elements.get("typora-plugin-menu-button");
const menu = elements.get("typora-plugin-menu");
assert.equal(menuButton.textContent, "Plugin");
assert.ok(menu.innerHTML.includes(String.raw`\( … \)`));
menuButton.listeners.click();
assert.equal(menu.open, true);
assert.equal(menuButton.attributes["aria-expanded"], "true");
let prevented = false;
menuButton.listeners.mousedown({ preventDefault: () => { prevented = true; } });
assert.equal(prevented, true);
window.File.isLocked = false;
documentText = String.raw`\(E=mc^2\)`;
menu.listeners.click({ target: { closest: () => ({ dataset: { action: "math" } }) } });
assert.equal(menu.open, false);
assert.equal(documentText, "$$\nE=mc^2\n$$");
assert.equal(replacements.length, 2);
onReady();
assert.equal(elements.get("typora-plugin-menu-button"), menuButton);

const placeholder = "在这里填写讲解内容。";
const template = "***\n\n> [!NOTE]\n> **补充说明**\n>\n> 在这里填写讲解内容。\n\n***";
assert.equal(explanationBlock(), template);
assert.equal(explanationBlock("   "), template);
const richNote = "**列空间**\n\n$$\nC(A)=\\{Ax\\mid x\\in\\mathbb{R}^n\\}\n$$\n\n- 第一项\n  - 第二项";
const richBlock = explanationBlock(richNote);
assert.ok(richBlock.includes("> $$\n> C(A)=\\{Ax\\mid x\\in\\mathbb{R}^n\\}\n> $$"));
assert.ok(richBlock.includes("> - 第一项\n>   - 第二项"));
assert.equal(richBlock.split("\n").filter(line => line === "***").length, 2);

function applyExplanation(input, from, to) {
  const edit = explanationEdit(input, from, to);
  return { edit, output: input.slice(0, edit.from) + edit.text + input.slice(edit.to) };
}
let sourceResult = applyExplanation("前文后文", 2, 2);
assert.equal(sourceResult.output, "前文\n\n" + template + "\n\n后文");
assert.equal(sourceResult.output.slice(sourceResult.edit.selectionFrom, sourceResult.edit.selectionTo), placeholder);
assert.equal(applyExplanation("", 0, 0).output, template);
assert.equal(applyExplanation("\n后文", 0, 0).output, template + "\n\n后文");
assert.equal(applyExplanation("前文\n\n", 4, 4).output, "前文\n\n" + template);
const wrappedInput = "前文\n\n" + richNote + "\n\n后文";
sourceResult = applyExplanation(wrappedInput, 4, 4 + richNote.length);
assert.equal(sourceResult.output, "前文\n\n" + richBlock + "\n\n后文");
const listInput = "2. 内容\n   同理，\n   第一段\n   第二段\n   后文";
const listStart = listInput.indexOf("第一段");
const listEnd = listInput.indexOf("\n   后文");
sourceResult = applyExplanation(listInput, listStart, listEnd);
assert.equal(sourceResult.output, "2. 内容\n   同理，\n\n   ***\n\n   > [!NOTE]\n   > **补充说明**\n   >\n   > 第一段\n   > 第二段\n\n   ***\n\n   后文");
assert.equal(applyExplanation("- ", 2, 2).output, "- ***\n\n  > [!NOTE]\n  > **补充说明**\n  >\n  > 在这里填写讲解内容。\n\n  ***");
const crlf = "前文\r\n\r\n后文";
sourceResult = applyExplanation(crlf, 6, 6);
assert.equal(sourceResult.output, "前文\r\n\r\n" + template.replace(/\n/g, "\r\n") + "\r\n\r\n后文");
assert.equal(/(?<!\r)\n/.test(sourceResult.output), false);

// A source-mode insertion must replace one range and select only the new placeholder.
source = true;
let sourceSelection = [2, 2];
let sourceHistory = [];
cm.indexFromPos = pos => documentText.split("\n").slice(0, pos.line).reduce((n, line) => n + line.length + 1, 0) + pos.ch;
cm.posFromIndex = index => {
  const lines = documentText.slice(0, index).split("\n");
  return { line: lines.length - 1, ch: lines[lines.length - 1].length };
};
cm.getCursor = which => cm.posFromIndex(sourceSelection[which === "to" ? 1 : 0]);
cm.listSelections = () => [{ anchor: cm.getCursor("from"), head: cm.getCursor("to") }];
cm.replaceRange = (text, from, to, origin) => {
  const start = cm.indexFromPos(from), end = cm.indexFromPos(to);
  sourceHistory.push({ before: documentText, text, origin });
  documentText = documentText.slice(0, start) + text + documentText.slice(end);
};
cm.setSelection = (from, to) => { sourceSelection = [cm.indexFromPos(from), cm.indexFromPos(to)]; };
cm.scrollIntoView = () => {};
documentText = "前文后文";
assert.equal(window.headingDemoter.insertExplanation(), true);
assert.equal(sourceHistory.length, 1);
assert.equal(sourceHistory[0].origin, "insertExplanation");
assert.equal(documentText, "前文\n\n" + template + "\n\n后文");
assert.equal(documentText.slice(...sourceSelection), placeholder);
menu.listeners.click({ target: { closest: () => ({ dataset: { action: "explanation" } }) } });
assert.equal(sourceHistory.length, 2);
window.File.isLocked = true;
assert.equal(window.headingDemoter.insertExplanation(), false);
assert.equal(sourceHistory.length, 2);
window.File.isLocked = false;
cm.listSelections = () => [{}, {}];
assert.equal(window.headingDemoter.insertExplanation(), false);
assert.equal(sourceHistory.length, 2);

// In normal mode use native Markdown/mark-HTML conversion, never rendered plain text.
source = false;
const editor = window.File.editor;
const paragraph = (cid, text) => ({ textContent: text, getAttribute: () => cid });
const oldPlaceholder = paragraph("old", placeholder);
let paragraphs = [oldPlaceholder];
const noteNodes = new Map();
let quoteElements = [];
function pastedQuote(cid, label, firstType = "paragraph") {
  const node = {
    attrs: { type: "blockquote" },
    get(key) { return this.attrs[key]; },
    set(key, value) { this.attrs[key] = value; },
    getFirstChild: () => ({ get: key => key === "type" ? firstType : label }),
    toHTML() { return this.get("alert") ? `<div class="md-alert md-alert-${this.get("alert")}">${label}</div>` : `<blockquote>${label}</blockquote>`; },
  };
  // Native mark-HTML reconstruction does not copy the alert attribute.
  noteNodes.set(cid, node);
  const element = { getAttribute: () => cid, outerHTML: node.toHTML() };
  quoteElements.push(element);
  return element;
}
const oldQuote = pastedQuote("old-note", "[!NOTE]\n原有内容");
const write = {
  contains: node => node === content,
  querySelectorAll: selector => selector.includes("blockquote") ? quoteElements : selector === "[cid]" ? [...paragraphs, ...quoteElements] : paragraphs,
};
elements.set("write", write);
let collapsed = false;
const range = { startContainer: content, endContainer: content, get collapsed() { return collapsed; }, cloneRange() { return { ...this, cloneRange: this.cloneRange, toHtml: () => "native selected HTML" }; } };
let nativePastes = [];
let parsedBlocks = [];
let placeholderSelections = [];
let nativeCommands = [];
window.NodeDef = { parseFrom: text => { parsedBlocks.push(text); return ["parsed native mark-HTML"]; } };
editor.nodeMap = { constructor: function DetachedMap() {} };
editor.writingArea = { focus() {} };
editor.undo = {
  endSnap() {},
  UndoManager: { buildReplaceUndo: node => ({ type: "replace", alert: node.get("alert"), html: node.toHTML() }) },
};
editor.getNode = cid => noteNodes.get(cid);
editor.selection = {
  getRangy: () => range,
  includeTrailMeta() {},
  setRange() {},
  scrollAdjust() {},
  restoreSelection: (element, offsets) => placeholderSelections.push({ element, offsets }),
  buildUndo: () => ({ type: "cursor" }),
};
editor.UserOp = {
  prepMarkHtml: html => { assert.equal(html, "native selected HTML"); return { html: () => "native selected mark-HTML" }; },
  getMarkdownSourceFrom: html => { assert.equal(html, "native selected mark-HTML"); return richNote; },
  pasteHandler: (_editor, payload, plain, callback) => {
    nativePastes.push({ payload, plain });
    paragraphs = [...paragraphs, paragraph("new" + nativePastes.length, placeholder)];
    pastedQuote("note" + nativePastes.length, "[!NOTE]\n**补充说明**");
    pastedQuote("plain" + nativePastes.length, "普通引用");
    pastedQuote("code" + nativePastes.length, "[!NOTE]", "fences");
    const command = { redo: [] };
    nativeCommands.push(command);
    callback("from", 0, "to", 0, command);
  },
};
assert.equal(window.headingDemoter.insertExplanation(), true);
assert.equal(parsedBlocks[0], richBlock);
assert.equal(nativePastes[0].plain, false);
assert.equal(nativePastes[0].payload.markhtml, "parsed native mark-HTML");
assert.equal(placeholderSelections.length, 0);
assert.equal(noteNodes.get("note1").get("alert"), "note", "new NOTE must use Typora's native blue alert styling");
assert.ok(quoteElements.find(element => element.getAttribute("cid") === "note1").outerHTML.includes("md-alert-note"));
assert.equal(nativeCommands[0].redo[0].alert, "note", "redo must retain NOTE styling");
assert.equal(noteNodes.get("old-note").get("alert"), undefined, "existing quotes are untouched");
assert.equal(noteNodes.get("plain1").get("alert"), undefined);
assert.equal(noteNodes.get("code1").get("alert"), undefined);
collapsed = true;
assert.equal(window.headingDemoter.insertExplanation(), true);
assert.equal(parsedBlocks[1], template);
assert.equal(placeholderSelections.length, 1);
assert.equal(placeholderSelections[0].element.getAttribute("cid"), "new2");
assert.equal(placeholderSelections[0].offsets.end, placeholder.length);
assert.equal(nativeCommands[1].redo.length, 2);
assert.equal(nativeCommands[1].redo[0].alert, "note");
assert.equal(noteNodes.get("note2").get("alert"), "note");
const pasteCount = nativePastes.length;
window.File.option = { enableAlert: false };
assert.equal(window.headingDemoter.insertExplanation(), false);
assert.equal(nativePastes.length, pasteCount, "disabled callouts must not insert a misleading plain quote");

console.log("typora tools self-test: OK (math, note template, separators, selections, lists, native NOTE styling, redo, editor adapters, menu)");
