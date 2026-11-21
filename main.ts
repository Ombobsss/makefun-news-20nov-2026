// make.fun entry — ships the bundled news artwork to /output/entry.png.
// Reads the entry.png sitting next to this file and writes it out unchanged.
const { readFile, writeFile, mkdir } = require("node:fs/promises");
const { createHash } = require("node:crypto");
const path = require("node:path");

const ARTWORK_NAME = "entry.png";
const DEST_DIR = "/output";
const DEST_NAME = "entry.png";

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

async function guardArtwork(source) {
  let bytes;
  try {
    bytes = await readFile(source);
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error(`artwork missing: expected entry.png at ${source}`);
    }
    throw err;
  }
  if (bytes.length === 0) {
    throw new Error("artwork empty: entry.png is 0 bytes, nothing to ship");
  }
  if (bytes.length < 8 || !bytes.subarray(0, 8).equals(PNG_MAGIC)) {
    throw new Error("artwork is not a PNG: entry.png does not start with the PNG magic bytes");
  }
  return bytes;
}

async function confirmShipped(target, expectedHash) {
  const shipped = await readFile(target);
  const shippedHash = createHash("sha256").update(shipped).digest("hex");
  if (shippedHash !== expectedHash) {
    throw new Error(`shipped copy differs from entry.png (sha256 ${shippedHash} != ${expectedHash})`);
  }
  return shipped.length;
}

async function shipArtwork() {
  const here = __dirname;
  const source = path.join(here, ARTWORK_NAME);
  const bytes = await guardArtwork(source);
  const fingerprint = createHash("sha256").update(bytes).digest("hex");
  await mkdir(DEST_DIR, { recursive: true });
  const target = path.join(DEST_DIR, DEST_NAME);
  await writeFile(target, bytes);
  const size = await confirmShipped(target, fingerprint);
  console.log(`shipped ${size} bytes: ${source} -> ${target} (sha256 ${fingerprint}, verified)`);
}

shipArtwork().catch((err) => {
  console.error(`error: ${err.message}`);
  process.exit(1);
});
