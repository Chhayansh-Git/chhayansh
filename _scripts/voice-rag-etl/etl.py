#!/usr/bin/env python3
"""
ETL Script — Annai (案内) Voice RAG

Zero-dependency Python ETL (uses only stdlib):
  - Reads knowledge.txt
  - Chunks text with overlap
  - Embeds via Google AI REST API (text-embedding-004)
  - Upserts to Pinecone REST API

Usage:
  1. Create a .env file with GOOGLE_API_KEY, PINECONE_API_KEY, PINECONE_INDEX
  2. python3 etl.py
"""

import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

# ─── Config ─────────────────────────────────────────────────────
EMBEDDING_MODEL = "gemini-embedding-001"  # supports outputDimensionality
EMBEDDING_DIM = 768
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50
UPSERT_BATCH = 5
SCRIPT_DIR = Path(__file__).parent


# ─── Load .env ──────────────────────────────────────────────────
def load_env():
    env_file = SCRIPT_DIR / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            key, val = line.split("=", 1)
            os.environ.setdefault(key.strip(), val.strip())


load_env()

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")
PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY", "")
PINECONE_INDEX = os.environ.get("PINECONE_INDEX", "")

if not all([GOOGLE_API_KEY, PINECONE_API_KEY, PINECONE_INDEX]):
    print("\n❌  Missing env vars. Required: GOOGLE_API_KEY, PINECONE_API_KEY, PINECONE_INDEX")
    print("   Create a .env file in this directory.\n")
    sys.exit(1)


# ─── HTTP Helper ────────────────────────────────────────────────
def api_post(url, data, headers=None):
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8") if e.fp else ""
        raise RuntimeError(f"HTTP {e.code}: {err_body}") from e


def api_get(url, headers=None):
    req = urllib.request.Request(url)
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


# ─── Embedding with retry ───────────────────────────────────────
def embed_text(text, max_retries=5):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{EMBEDDING_MODEL}:embedContent?key={GOOGLE_API_KEY}"
    data = {
        "model": f"models/{EMBEDDING_MODEL}",
        "content": {"parts": [{"text": text}]},
        "outputDimensionality": EMBEDDING_DIM,
    }
    for attempt in range(max_retries):
        try:
            result = api_post(url, data)
            return result["embedding"]["values"]
        except RuntimeError as e:
            if "429" in str(e) and attempt < max_retries - 1:
                wait = 2 ** (attempt + 1)  # 2, 4, 8, 16, 32 seconds
                print(f"\n     ⏳ Rate limited. Waiting {wait}s...", flush=True)
                time.sleep(wait)
            else:
                raise


# ─── Pinecone ───────────────────────────────────────────────────
def get_pinecone_host():
    url = f"https://api.pinecone.io/indexes/{PINECONE_INDEX}"
    data = api_get(url, headers={"Api-Key": PINECONE_API_KEY})
    return data["host"]


def pinecone_upsert(host, vectors):
    url = f"https://{host}/vectors/upsert"
    return api_post(url, {"vectors": vectors}, headers={"Api-Key": PINECONE_API_KEY})


# ─── Chunker ────────────────────────────────────────────────────
def chunk_text(text):
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + CHUNK_SIZE, len(text))
        if end < len(text):
            slc = text[start:end]
            breaks = [slc.rfind(". "), slc.rfind(".\n"), slc.rfind("\n\n")]
            best = max(breaks)
            if best > CHUNK_SIZE * 0.3:
                end = start + best + 1
        chunks.append({"text": text[start:end].strip(), "offset": start})
        # Ensure forward progress (prevent infinite loop near end of text)
        new_start = end - CHUNK_OVERLAP
        if new_start <= start:
            new_start = end  # Skip overlap for the last chunk
        start = new_start
        if start >= len(text):
            break
    return [c for c in chunks if c["text"]]


# ─── Metadata ───────────────────────────────────────────────────
def extract_sections(text):
    sections = []
    current = {"project_name": "General", "github_url": ""}
    section_start = 0
    offset = 0
    for line in text.split("\n"):
        pm = re.match(r"^Project(?:/Research)?:\s*(.+)$", line, re.I)
        if pm:
            if offset > section_start:
                sections.append({"start": section_start, "end": offset, "meta": dict(current)})
            current = {"project_name": pm.group(1).strip(), "github_url": ""}
            section_start = offset
        gm = re.search(r"GitHub Link:\s*(https?://[^\s*]+)", line, re.I)
        if gm:
            current["github_url"] = gm.group(1).rstrip("*")
        offset += len(line) + 1
    sections.append({"start": section_start, "end": offset, "meta": dict(current)})
    return sections


def meta_for(sections, offset):
    for s in sections:
        if s["start"] <= offset < s["end"]:
            return s["meta"]
    return {"project_name": "General", "github_url": ""}


# ─── Main ───────────────────────────────────────────────────────
def main():
    print("\n🚀  Annai ETL Pipeline — Starting...\n")

    # 1. Load
    kpath = SCRIPT_DIR / "knowledge.txt"
    raw = kpath.read_text(encoding="utf-8")
    print(f"📄  Loaded knowledge.txt ({len(raw)} chars)")

    # 2. Sections
    sections = extract_sections(raw)
    print(f"📑  {len(sections)} sections:")
    for s in sections:
        print(f"     → {s['meta']['project_name']}", flush=True)

    # 3. Chunk
    chunks = chunk_text(raw)
    print(f"\n✂️   {len(chunks)} chunks (size={CHUNK_SIZE}, overlap={CHUNK_OVERLAP})")

    # 4. Embed
    print(f"\n🧠  Embedding via {EMBEDDING_MODEL}...")
    embeddings = []
    for i, c in enumerate(chunks):
        vals = embed_text(c["text"])
        embeddings.append(vals)
        print(f"     {i+1}/{len(chunks)} done", end="\r", flush=True)
        if i < len(chunks) - 1:
            time.sleep(1.5)  # Stay under free-tier rate limit
    print(f"\n     ✓ {len(embeddings)} embeddings (dim={len(embeddings[0])})")

    # 5. Pinecone
    print(f"\n🌲  Connecting to Pinecone: {PINECONE_INDEX}")
    host = get_pinecone_host()
    print(f"     Host: {host}")

    # 6. Build vectors
    vectors = []
    for i, c in enumerate(chunks):
        m = meta_for(sections, c["offset"])
        vectors.append({
            "id": f"annai-{i}",
            "values": embeddings[i],
            "metadata": {
                "text": c["text"],
                "project_name": m["project_name"],
                "github_url": m["github_url"],
            },
        })

    # 7. Upsert
    print(f"\n⬆️   Upserting {len(vectors)} vectors...")
    t0 = time.time()
    for i in range(0, len(vectors), UPSERT_BATCH):
        batch = vectors[i : i + UPSERT_BATCH]
        pinecone_upsert(host, batch)
        done = min(i + UPSERT_BATCH, len(vectors))
        print(f"     {done}/{len(vectors)}", end="\r")

    elapsed = time.time() - t0
    print(f"\n\n✅  Done! {len(vectors)} vectors upserted in {elapsed:.1f}s")
    print("🎉  Annai's knowledge base is ready!\n")


if __name__ == "__main__":
    main()
