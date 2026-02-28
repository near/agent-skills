import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), '../..');
const TARGETS = [
  path.join(ROOT, 'skills', 'near-agent-market-autopilot'),
  path.join(ROOT, 'README.md'),
];

async function listMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFiles(full)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

async function collectFiles() {
  const out = [];
  for (const target of TARGETS) {
    try {
      const info = await stat(target);
      if (info.isFile()) {
        out.push(target);
      } else {
        out.push(...(await listMarkdownFiles(target)));
      }
    } catch {
      // ignore missing optional targets
    }
  }
  return out;
}

function extractLinks(markdown) {
  const regex = /\[[^\]]+\]\(([^)]+)\)/g;
  const links = [];
  let match = regex.exec(markdown);
  while (match) {
    links.push(match[1]);
    match = regex.exec(markdown);
  }
  return links;
}

async function main() {
  const files = await collectFiles();
  const missing = [];

  for (const file of files) {
    const body = await readFile(file, 'utf8');
    const links = extractLinks(body)
      .filter(link => !link.startsWith('http'))
      .filter(link => !link.startsWith('#'));

    for (const link of links) {
      const clean = link.split('#')[0];
      const abs = path.resolve(path.dirname(file), clean);
      try {
        await readFile(abs, 'utf8');
      } catch {
        try {
          await readdir(abs);
        } catch {
          missing.push(`${path.relative(ROOT, file)} -> ${link}`);
        }
      }
    }
  }

  if (missing.length > 0) {
    for (const row of missing) {
      console.error(`Missing doc link: ${row}`);
    }
    process.exit(1);
  }

  console.log(`Docs links OK (${files.length} files checked)`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
