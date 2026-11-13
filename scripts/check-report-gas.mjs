import { parse } from "acorn";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// A conservative save-time grammar gate, not a substitute for Google's live runtime.
// Node's current V8 accepts the BigInt literal rejected by the Apps Script editor.
export function validateGasScript(input, filename = "PdfLibrary.gs") {
  const source =
    typeof input === "string"
      ? input
      : new TextDecoder("utf-8", { fatal: true }).decode(input);
  let ast;
  try {
    ast = parse(source, {
      ecmaVersion: 2019,
      sourceType: "script",
      locations: true,
    });
  } catch (error) {
    throw new Error(
      filename + ": incompatible Apps Script syntax: " + error.message,
    );
  }
  const stack = [ast];
  while (stack.length) {
    const node = stack.pop();
    // Avoid depending on runtime BigInt even via constructor syntax that ES2019 parses.
    if (node.type === "Identifier" && node.name === "BigInt")
      throw new Error(
        filename +
          ":" +
          node.loc.start.line +
          ": BigInt is outside the Report relay runtime contract",
      );
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const child of value)
          if (
            child &&
            typeof child === "object" &&
            typeof child.type === "string"
          )
            stack.push(child);
      } else if (
        value &&
        typeof value === "object" &&
        typeof value.type === "string"
      )
        stack.push(value);
    }
  }
  return {
    syntax: "ES2019 script",
    bytes: Buffer.byteLength(source, "utf8"),
    lines: source.split("\n").length,
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const files = process.argv.slice(2);
  for (const file of files.length
    ? files
    : [
        ".playwright-artifacts/report-relay/PdfLibrary.gs",
        "report-relay/Code.gs",
      ]) {
    const result = validateGasScript(readFileSync(file), file);
    console.log(
      file +
        ": validated " +
        result.syntax +
        ", " +
        result.bytes +
        " bytes, " +
        result.lines +
        " lines. No deployment.",
    );
  }
}
