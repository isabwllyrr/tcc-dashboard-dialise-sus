import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";


const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "dist");

if (dirname(output) !== root || output === root) {
  throw new Error("Diretório de saída inválido.");
}

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync(join(root, "web_dashboard"), join(output, "web_dashboard"), { recursive: true });
cpSync(join(root, "dados_tratados"), join(output, "dados_tratados"), { recursive: true });

writeFileSync(
  join(output, "index.html"),
  [
    "<!doctype html>",
    '<html lang="pt-BR">',
    '<meta charset="utf-8">',
    '<meta http-equiv="refresh" content="0;url=/web_dashboard/">',
    '<title>DialisaSUS</title>',
    '<a href="/web_dashboard/">Abrir DialisaSUS</a>',
    "</html>",
  ].join("\n"),
  "utf8",
);

console.log("Build Netlify criado em dist/.");
