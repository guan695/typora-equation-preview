"use strict";

const assert = require("node:assert/strict");
const { nextPattern, isShortcut, isPreviewGesture, equationTargetId } = require("./heading-demoter");

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

console.log("typora tools self-test: OK");
