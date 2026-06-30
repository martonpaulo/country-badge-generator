import assert from "node:assert/strict";
import test from "node:test";

import {
  createBadgeSvg
} from "../../js/svg.js";

const flagSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="3" height="2" fill="#009739"/></svg>`;

test("generated badge SVG is self-contained and accessible", () => {
  const svg = createBadgeSvg({
    code: "BR",
    countryName: "Brazil",
    flagSvgText: flagSvg,
    backgroundHex: "#62B46D"
  });

  assert.match(svg, /viewBox="0 0 1024 1024"/);
  assert.match(svg, /fill="#62B46D"/);
  assert.match(svg, /<title id="badge-br-title">Brazil country badge<\/title>/);
  assert.match(svg, /<desc id="badge-br-description">BR flag centered/);
  assert.match(svg, /href="data:image\/svg\+xml;base64,/);
  assert.match(svg, /x="233"/);
  assert.match(svg, /y="336\.5"/);
  assert.match(svg, /width="558"/);
  assert.match(svg, /height="351"/);
  assert.doesNotMatch(svg, /href="https?:\/\//);
});

test("changing the selected background changes the SVG", () => {
  const first = createBadgeSvg({
    code: "PY",
    countryName: "Paraguay",
    flagSvgText: flagSvg,
    backgroundHex: "#FD9C91"
  });

  const second = createBadgeSvg({
    code: "PY",
    countryName: "Paraguay",
    flagSvgText: flagSvg,
    backgroundHex: "#8AB7FF"
  });

  assert.notEqual(first, second);
  assert.match(second, /fill="#8AB7FF"/);
});
