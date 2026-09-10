import { readFile, writeFile } from "node:fs/promises";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import selectorParser from "postcss-selector-parser";
import { privateClasses } from "./private-classes.mjs";

const input = new URL("../src/styles.css", import.meta.url);
const result = await postcss([tailwindcss({ optimize: false })]).process(
  await readFile(input, "utf8"),
  { from: input.pathname },
);
const scope = ":where([data-mendy-ui], [data-mendy-ui] *)";
const keyframes = new Map();
result.root.walkAtRules("keyframes", (rule) => {
  keyframes.set(rule.params, `mendy-${rule.params}`);
  rule.params = `mendy-${rule.params}`;
});
result.root.walkRules((rule) => {
  // Nested selectors inherit their outer scope; keyframe steps are not selectors.
  for (let parent = rule.parent; parent; parent = parent.parent) {
    if (parent.type === "rule" || (parent.type === "atrule" && parent.name.includes("keyframes")))
      return;
  }
  rule.selector = selectorParser((selectors) => {
    selectors.each((selector) => {
      if ([":root", ":host"].includes(selector.toString().trim())) {
        selector.replaceWith(selectorParser().astSync(":where([data-mendy-ui])").first);
        return;
      }
      const marker = selectorParser().astSync(scope).first.first.clone();
      const pseudoElement = selector.nodes.find(
        (node) => node.type === "pseudo" && node.value.startsWith("::"),
      );
      if (pseudoElement) selector.insertBefore(pseudoElement, marker);
      else selector.append(marker);
    });
  }).processSync(rule.selector);
});
result.root.walkDecls((decl) => {
  if (!decl.prop.includes("animation") && !decl.prop.startsWith("--animate-")) return;
  for (const [name, replacement] of keyframes) {
    decl.value = decl.value.replace(new RegExp(`(?<![\\w-])${name}(?![\\w-])`, "g"), replacement);
  }
});
// Package utilities belong below the application's utilities in the cascade.
result.root.walkAtRules("layer", (rule) => {
  if (["utilities", "base"].includes(rule.params)) rule.params = "components";
});
await privateClasses(result.root, new URL("../dist/", import.meta.url).pathname);
// Keep Tailwind's internal properties independent from the consuming app's version.
const css = result.root.toString().replaceAll("--tw-", "--mendy-tw-");
await writeFile(new URL("../dist/styles.css", import.meta.url), css);

await writeFile(new URL("../dist/styles.css.d.ts", import.meta.url), "export {};\n");

// Tailwind 3 reserves @layer components for source compilation. Ship the same
// compiled rules outside that layer, while leaving host preflight in control.
const legacy = postcss.parse(css);
legacy.walkAtRules("layer", (rule) => {
  if (rule.params !== "components") return;
  const first = rule.nodes?.[0];
  if (first?.type === "rule" && first.selector.startsWith("*:where")) {
    rule.params = "mendy-ui-base";
  } else {
    rule.replaceWith(...(rule.nodes ?? []));
  }
});
await writeFile(new URL("../dist/styles.tailwind3.css", import.meta.url), legacy.toString());
