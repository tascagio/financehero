import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(rootDir, "..");
const publicDir = path.join(projectDir, "public");
const distDir = path.join(projectDir, "dist");

await rm(distDir, { force: true, recursive: true });
await mkdir(distDir, { recursive: true });
await cp(publicDir, distDir, { force: true, recursive: true });

console.log("Build concluido em", distDir);
