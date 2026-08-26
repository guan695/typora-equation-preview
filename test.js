"use strict";

const assert = require("node:assert/strict");
const { nextPattern, isShortcut } = require("./heading-demoter");

assert.equal(nextPattern("## {0}", 3), "### {0}");
assert.equal(nextPattern("{0}\n===", 2), "{0}\n---");
assert.equal(nextPattern("{0}\n---", 3), undefined);
assert.equal(nextPattern(undefined, 4), undefined);
assert.equal(isShortcut({ ctrlKey: true, altKey: true, shiftKey: false, metaKey: false, key: "ArrowDown" }), true);
assert.equal(isShortcut({ ctrlKey: true, altKey: false, shiftKey: false, metaKey: false, key: "ArrowDown" }), false);

console.log("heading-demoter self-test: OK");
