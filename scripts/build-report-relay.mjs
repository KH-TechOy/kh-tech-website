import { build } from "esbuild";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { validateGasScript } from "./check-report-gas.mjs";
const out = ".playwright-artifacts/report-relay";
await mkdir(out, { recursive: true });
const result = await build({
  entryPoints: ["report-relay/pdf-entry.ts"],
  bundle: true,
  write: false,
  format: "iife",
  globalName: "KhReportPdf",
  target: "es2019",
  charset: "ascii",
  legalComments: "inline",
  plugins: [
    {
      name: "unused-browser-only-plugins",
      setup(b) {
        b.onResolve({ filter: /^(html2canvas|canvg|dompurify)$/ }, (a) => ({
          path: a.path,
          namespace: "unused",
        }));
        b.onLoad({ filter: /.*/, namespace: "unused" }, () => ({
          contents:
            'export default function(){throw new Error("HTML conversion is not supported in the archive generator")}',
          loader: "js",
        }));
      },
    },
  ],
});
// Apps Script supplies Utilities rather than browser base64 helpers. No DOM/Drive/network API is needed.
const banner =
  'var atob=function(s){return Utilities.base64Decode(s).map(function(n){return String.fromCharCode(n&255)}).join("")};\nvar btoa=function(s){return Utilities.base64Encode(Array.prototype.map.call(s,function(c){var n=c.charCodeAt(0)&255;return n>127?n-256:n}))};\n';
const textCode =
  'var TextEncoder=class{encode(s){return new Uint8Array(Utilities.newBlob(String(s)).getBytes().map(function(n){return n&255}))}};\nvar TextDecoder=class{constructor(label){this.label=label||"UTF-8"}decode(a){return Utilities.newBlob(Array.from(a||[],function(n){return n>127?n-256:n})).getDataAsString(this.label)}};\n';
const source = textCode + banner + result.outputFiles[0].text;
const validation = validateGasScript(source, "PdfLibrary.gs");
validateGasScript(await readFile("report-relay/Code.gs"), "Code.gs");
await writeFile(out + "/PdfLibrary.gs", source, "utf8");
console.log(
  "Trusted PDF library built locally: " +
    out +
    "/PdfLibrary.gs (" +
    validation.bytes +
    " bytes; validated ES2019 script syntax). No deployment.",
);
