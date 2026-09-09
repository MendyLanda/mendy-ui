import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";
import selectorParser from "postcss-selector-parser";

/** Keep app Tailwind rules from matching our defaults. Data attributes stay public. */
export async function privateClasses(css, directory) {
  const names = new Map();
  const parser = selectorParser((selectors) => {
    selectors.walkClasses((node) => {
      // Host dark mode and react-day-picker's structural selectors are external contracts.
      if (node.value === "dark" || node.value.startsWith("rdp-")) return;
      const original = node.value;
      const name = `mui-${createHash("sha256").update(original).digest("hex").slice(0, 12)}`;
      names.set(original, name);
      node.value = name;
    });
  });
  css.walkRules((rule) => {
    rule.selector = parser.processSync(rule.selector);
  });
  const replace = (value) =>
    value
      .split(/(\s+)/)
      .map((token) => names.get(token) ?? token)
      .join("");
  const printer = ts.createPrinter();
  async function visitDirectory(path) {
    for (const file of await readdir(path, { withFileTypes: true })) {
      const target = join(path, file.name);
      if (file.isDirectory()) {
        await visitDirectory(target);
        continue;
      }
      if (!file.name.endsWith(".js") || file.name === "class-names.js") continue;
      const source = ts.createSourceFile(
        target,
        await readFile(target, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.JS,
      );
      const transformed = ts.transform(source, [
        (context) => {
          function classValue(node) {
            if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
              return ts.factory.createStringLiteral(replace(node.text));
            if (
              ts.isTaggedTemplateExpression(node) &&
              node.tag.getText(source) === "String.raw" &&
              ts.isNoSubstitutionTemplateLiteral(node.template)
            ) {
              return ts.factory.createStringLiteral(
                replace(node.template.rawText ?? node.template.text),
              );
            }
            // Class conditions, property names and component props retain their meaning.
            if (ts.isConditionalExpression(node))
              return ts.factory.updateConditionalExpression(
                node,
                node.condition,
                node.questionToken,
                classValue(node.whenTrue),
                node.colonToken,
                classValue(node.whenFalse),
              );
            if (ts.isBinaryExpression(node))
              return ts.factory.updateBinaryExpression(
                node,
                node.left,
                node.operatorToken,
                classValue(node.right),
              );
            if (ts.isPropertyAssignment(node))
              return ts.factory.updatePropertyAssignment(
                node,
                node.name,
                classValue(node.initializer),
              );
            return ts.visitEachChild(node, classValue, context);
          }
          function visit(node) {
            if (
              ts.isCallExpression(node) &&
              ts.isIdentifier(node.expression) &&
              ["cn", "cva"].includes(node.expression.text)
            )
              return ts.factory.updateCallExpression(
                node,
                node.expression,
                node.typeArguments,
                node.arguments.map(classValue),
              );
            if (ts.isPropertyAssignment(node) && node.name.getText(source) === "className")
              return ts.factory.updatePropertyAssignment(
                node,
                node.name,
                classValue(node.initializer),
              );
            return ts.visitEachChild(node, visit, context);
          }
          return (node) => ts.visitNode(node, visit);
        },
      ]);
      await writeFile(target, printer.printFile(transformed.transformed[0]));
      transformed.dispose();
    }
  }
  await visitDirectory(directory);
  const originals = Object.fromEntries([...names].map(([original, name]) => [name, original]));
  await writeFile(
    join(directory, "class-names.js"),
    `export const originalClassNames = ${JSON.stringify(originals)};\n`,
  );
}
