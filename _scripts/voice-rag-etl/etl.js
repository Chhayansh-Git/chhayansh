/**
 * ETL Script — Annai (案内) Voice RAG
 * 
 * ZERO external dependencies — uses only built-in fetch().
 * Works on Node.js 18+ (including v25).
 * 
 *   - Reads knowledge.txt
 *   - Chunks text with overlap
 *   - Embeds via Google AI REST API (text-embedding-004)
 *   - Upserts to Pinecone REST API
 * 
 * Usage:
 *   1. Create a .env file with GOOGLE_API_KEY, PINECONE_API_KEY, PINECONE_INDEX
 *   2. node etl.js
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ─── Load .env manually (no dotenv dependency) ─────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.substring(0, eqIndex).trim();
    const val = trimmed.substring(eqIndex + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

// ─── Configuration ──────────────────────────────────────────────
const EMBEDDING_MODEL = 'gemini-embedding-001'; // 768 dimensions
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;
const UPSERT_BATCH = 5;

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX;

// ─── Validate ──────────────────────────────────────────────────
if (!GOOGLE_API_KEY || !PINECONE_API_KEY || !PINECONE_INDEX) {
  console.error('\n❌  Missing env vars. Required: GOOGLE_API_KEY, PINECONE_API_KEY, PINECONE_INDEX');
  console.error('   Create a .env file in this directory.\n');
  process.exit(1);
}

// ─── Google Embedding (raw fetch) ──────────────────────────────
async function embedText(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GOOGLE_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
    }),
  });
  if (!res.ok) {
    throw new Error(`Embedding API ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.embedding.values;
}

// ─── Pinecone REST API ─────────────────────────────────────────
async function getPineconeHost() {
  const res = await fetch(`https://api.pinecone.io/indexes/${PINECONE_INDEX}`, {
    headers: { 'Api-Key': PINECONE_API_KEY },
  });
  if (!res.ok) {
    throw new Error(`Pinecone index lookup failed ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.host;
}

async function pineconeUpsert(host, vectors) {
  const res = await fetch(`https://${host}/vectors/upsert`, {
    method: 'POST',
    headers: {
      'Api-Key': PINECONE_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ vectors }),
  });
  if (!res.ok) {
    throw new Error(`Pinecone upsert failed ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// ─── Text Chunker ──────────────────────────────────────────────
function chunkText(text) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE, text.length);
    if (end < text.length) {
      const slice = text.substring(start, end);
      const lastBreak = Math.max(
        slice.lastIndexOf('. '),
        slice.lastIndexOf('.\n'),
        slice.lastIndexOf('\n\n')
      );
      if (lastBreak > CHUNK_SIZE * 0.3) end = start + lastBreak + 1;
    }
    chunks.push({ text: text.substring(start, end).trim(), offset: start });
    if (end >= text.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks.filter((c) => c.text.length > 0);
}

// ─── Metadata Extraction ───────────────────────────────────────
function extractSections(text) {
  const sections = [];
  const lines = text.split('\n');
  let current = { project_name: 'General', github_url: '' };
  let sectionStart = 0;
  let offset = 0;

  for (const line of lines) {
    const pm = line.match(/^Project(?:\/Research)?:\s*(.+)$/i);
    if (pm) {
      if (offset > sectionStart) {
        sections.push({ start: sectionStart, end: offset, meta: { ...current } });
      }
      current = { project_name: pm[1].trim(), github_url: '' };
      sectionStart = offset;
    }
    const gm = line.match(/GitHub Link:\s*(https?:\/\/[^\s*]+)/i);
    if (gm) current.github_url = gm[1].replace(/\*$/, '');
    offset += line.length + 1;
  }
  sections.push({ start: sectionStart, end: offset, meta: { ...current } });
  return sections;
}

function metaFor(sections, offset) {
  for (const s of sections) {
    if (offset >= s.start && offset < s.end) return s.meta;
  }
  return { project_name: 'General', github_url: '' };
}

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀  Annai ETL Pipeline — Starting...\n');

  // 1. Load knowledge
  const kPath = resolve(__dirname, 'knowledge.txt');
  const rawText = readFileSync(kPath, 'utf-8');
  console.log(`📄  Loaded knowledge.txt (${rawText.length} chars)`);

  // 2. Sections
  const sections = extractSections(rawText);
  console.log(`📑  ${sections.length} sections:`);
  sections.forEach((s) => console.log(`     → ${s.meta.project_name}`));

  // 3. Chunk
  const chunks = chunkText(rawText);
  console.log(`\n✂️   ${chunks.length} chunks (size=${CHUNK_SIZE}, overlap=${CHUNK_OVERLAP})`);

  // 4. Embed
  console.log(`\n🧠  Embedding via ${EMBEDDING_MODEL}...`);
  const embeddings = [];
  for (let i = 0; i < chunks.length; i++) {
    const values = await embedText(chunks[i].text);
    embeddings.push(values);
    process.stdout.write(`     ${i + 1}/${chunks.length} done\r`);
    if (i < chunks.length - 1) await sleep(250);
  }
  console.log(`\n     ✓ ${embeddings.length} embeddings (dim=${embeddings[0].length})`);

  // 5. Pinecone host
  console.log(`\n🌲  Connecting to Pinecone index: ${PINECONE_INDEX}`);
  const host = await getPineconeHost();
  console.log(`     Host: ${host}`);

  // 6. Build vectors
  const vectors = chunks.map((c, i) => {
    const m = metaFor(sections, c.offset);
    return {
      id: `annai-${i}`,
      values: embeddings[i],
      metadata: { text: c.text, project_name: m.project_name, github_url: m.github_url },
    };
  });

  // 7. Upsert
  console.log(`\n⬆️   Upserting ${vectors.length} vectors...`);
  const t0 = Date.now();
  for (let i = 0; i < vectors.length; i += UPSERT_BATCH) {
    const batch = vectors.slice(i, i + UPSERT_BATCH);
    await pineconeUpsert(host, batch);
    process.stdout.write(`     ${Math.min(i + UPSERT_BATCH, vectors.length)}/${vectors.length}\r`);
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n\n✅  Done! ${vectors.length} vectors upserted in ${secs}s`);
  console.log(`🎉  Annai's knowledge base is ready!\n`);
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

main().catch((e) => { console.error('\n❌  Failed:', e.message); process.exit(1); });
