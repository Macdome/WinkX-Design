import { spawn } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url)) + sep;
const previewPath = process.env.PREVIEW_PATH || "/works";
const outputName = process.env.PREVIEW_OUTPUT || "works-preview-live.png";
const previewHeight = process.env.PREVIEW_HEIGHT || "3000";
const output = join(root, outputName);
const profile = join(root, `.preview-chrome-${Date.now()}`);
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const server = createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const requested = normalize(join(root, pathname));
  const safePath = requested.startsWith(root) ? requested : join(root, "index.html");
  const filePath =
    existsSync(safePath) && statSync(safePath).isFile() ? safePath : join(root, "index.html");

  response.writeHead(200, {
    "Content-Type": types[extname(filePath)] || "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
});

server.listen(4173, "127.0.0.1", () => {
  const chromeProcess = spawn(
    chrome,
    [
      "--headless=new",
      "--no-first-run",
      "--enable-logging=stderr",
      "--disable-gpu",
      "--hide-scrollbars",
      `--window-size=1440,${previewHeight}`,
      "--virtual-time-budget=5000",
      `--user-data-dir=${profile}`,
      `--screenshot=${output}`,
      `http://127.0.0.1:4173${previewPath}`,
    ],
    { stdio: "inherit" },
  );

  chromeProcess.on("error", (error) => {
    console.error(error);
    server.close();
    process.exitCode = 1;
  });

  chromeProcess.on("exit", (code) => {
    if (code === 0) {
      console.log(output);
    } else {
      process.exitCode = code || 1;
    }
    server.close();
  });
});
