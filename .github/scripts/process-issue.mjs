import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

const { ANTHROPIC_API_KEY, ISSUE_NUMBER, ISSUE_TITLE, ISSUE_BODY, REPO } = process.env;

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function exec(cmd) {
  return execSync(cmd, { cwd: ROOT, stdio: 'pipe' }).toString().trim();
}

async function claude(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Claude API: ${data.error?.message}`);
  return data.content[0].text.trim();
}

async function postComment(body) {
  writeFileSync('/tmp/issue-comment.md', body);
  execSync(`gh issue comment ${ISSUE_NUMBER} --body-file /tmp/issue-comment.md --repo ${REPO}`, { cwd: ROOT });
}

const shipsPath = join(ROOT, 'src/data/ships.json');
const ships = JSON.parse(readFileSync(shipsPath, 'utf8'));

function findShip(shipName) {
  const needle = shipName.toLowerCase();
  return ships.find(s => {
    const hay = s.name.toLowerCase();
    return hay.includes(needle) || needle.includes(hay) ||
      // also try matching on first 3 words of the stored name
      needle.includes(hay.split(' ').slice(0, 3).join(' '));
  });
}

const isImage = ISSUE_TITLE.startsWith('Image Submission:');
const isLoadout = ISSUE_TITLE.startsWith('Loadout Submission:');

try {
  if (isImage) {
    const raw = await claude(
      `Extract from this GitHub issue body:
1. The ship name
2. The image URL — this may be a direct https:// link, a GitHub attachment URL (https://github.com/user-attachments/... or https://user-images.githubusercontent.com/...), or any URL following "Image URL" in the body.

Return ONLY valid JSON, no other text: {"shipName": "...", "imageUrl": "..."}

Issue body:
${ISSUE_BODY}`
    );

    const { shipName, imageUrl } = JSON.parse(raw.match(/\{[\s\S]*?\}/)[0]);

    if (!imageUrl || !imageUrl.startsWith('http')) {
      throw new Error('No valid image URL found in the issue body. Please edit your submission to include a direct image link or GitHub attachment.');
    }

    const ship = findShip(shipName);
    if (!ship) throw new Error(`Could not match "${shipName}" to any ship in ships.json.`);

    // Download image
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`Image download failed (HTTP ${imgRes.status}). The URL may be private or expired.`);

    const contentType = imgRes.headers.get('content-type') || '';
    const extByMime = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };
    const urlExt = imageUrl.split('?')[0].split('.').pop().toLowerCase().replace('jpeg', 'jpg');
    const validExts = ['jpg', 'png', 'webp', 'gif', 'avif'];
    const ext = extByMime[contentType.split(';')[0].trim()] ?? (validExts.includes(urlExt) ? urlExt : 'jpg');

    const filename = `${slugify(ship.name)}-i${ISSUE_NUMBER}.${ext}`;
    const assetsDir = join(ROOT, 'src/assets/ships');
    mkdirSync(assetsDir, { recursive: true });
    writeFileSync(join(assetsDir, filename), Buffer.from(await imgRes.arrayBuffer()));

    // Update ships.json — store just the filename; ShipCard resolves it via import.meta.glob
    ship.image = filename;
    writeFileSync(shipsPath, JSON.stringify(ships, null, 2) + '\n');

    const branch = `issue/${ISSUE_NUMBER}-image`;
    exec(`git checkout -b ${branch}`);
    exec(`git add src/assets/ships/${filename} src/data/ships.json`);
    exec(`git commit -m "feat: image submission for ${ship.name} (#${ISSUE_NUMBER})"`);
    exec(`git push origin ${branch}`);

    writeFileSync('/tmp/pr-body.md',
      `Adds submitted image for **${ship.name}**.\n\nCloses #${ISSUE_NUMBER}\n\n_Auto-generated from issue #${ISSUE_NUMBER}_`
    );
    execSync(
      `gh pr create --title "Image: ${ship.name}" --body-file /tmp/pr-body.md --base main --head ${branch} --repo ${REPO}`,
      { cwd: ROOT }
    );

    await postComment('> ✅ A PR has been created automatically from this submission. A maintainer will review and merge it.');

  } else if (isLoadout) {
    const raw = await claude(
      `Extract from this GitHub issue body:
1. The ship name
2. The variant label (e.g. "Stealth", "Military", or a single custom label)
3. The erkul.games loadout URL (starts with https://www.erkul.games/loadout/)

Return ONLY valid JSON, no other text: {"shipName": "...", "variantLabel": "...", "erkulUrl": "..."}

Issue body:
${ISSUE_BODY}`
    );

    const { shipName, variantLabel, erkulUrl } = JSON.parse(raw.match(/\{[\s\S]*?\}/)[0]);

    if (!erkulUrl?.includes('erkul.games')) {
      throw new Error('No valid erkul.games URL found in the issue body. Please include the full URL from erkul.games/loadout/...');
    }

    const ship = findShip(shipName);
    if (!ship) throw new Error(`Could not match "${shipName}" to any ship in ships.json.`);

    const variant = ship.variants.find(v => v.label.toLowerCase() === variantLabel.toLowerCase());
    if (!variant) {
      throw new Error(`Variant "${variantLabel}" not found on ${ship.name}. Available variants: ${ship.variants.map(v => v.label).join(', ')}`);
    }

    variant.erkulUrl = erkulUrl;
    writeFileSync(shipsPath, JSON.stringify(ships, null, 2) + '\n');

    const branch = `issue/${ISSUE_NUMBER}-loadout`;
    exec(`git checkout -b ${branch}`);
    exec(`git add src/data/ships.json`);
    exec(`git commit -m "feat: ${variantLabel} loadout for ${ship.name} (#${ISSUE_NUMBER})"`);
    exec(`git push origin ${branch}`);

    writeFileSync('/tmp/pr-body.md',
      `Adds erkul.games loadout URL for **${ship.name}** (${variantLabel}).\n\nCloses #${ISSUE_NUMBER}\n\n_Auto-generated from issue #${ISSUE_NUMBER}_`
    );
    execSync(
      `gh pr create --title "Loadout: ${ship.name} — ${variantLabel}" --body-file /tmp/pr-body.md --base main --head ${branch} --repo ${REPO}`,
      { cwd: ROOT }
    );

    await postComment('> ✅ A PR has been created automatically from this submission. A maintainer will review and merge it.');
  }
} catch (err) {
  console.error(err);
  await postComment(
    `> ⚠️ Could not auto-generate a PR for this submission.\n>\n> **Reason:** ${err.message}\n>\n> A maintainer will process this manually.`
  );
  process.exit(1);
}
