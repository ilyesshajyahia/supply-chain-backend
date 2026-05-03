const asyncHandler = require("../utils/asyncHandler");
const productService = require("../services/product.service");
const scanService = require("../services/scan.service");
const env = require("../config/env");


function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function distanceKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earth = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) *
      Math.sin(dLon / 2) *
      Math.cos(lat1) *
      Math.cos(lat2);
  return earth * 2 * Math.asin(Math.sqrt(h));
}

function checkSuspicious(scans) {
  if (!scans || scans.length < 2) return null;
  const latest = scans[0];
  const previous = scans[1];
  const km = distanceKm(latest.location, previous.location);
  const diffMs = Math.abs(
    new Date(latest.timestamp).getTime() -
      new Date(previous.timestamp).getTime()
  );
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (km >= 300 && diffDays <= 7) {
    return `Suspicious: scanned ${Math.round(km)} km apart within ${Math.round(
      diffDays
    )} day(s).`;
  }
  return null;
}

const publicProductPage = asyncHandler(async (req, res) => {
  const qrId = req.params.qrId;
  const history = await productService.getProductHistoryByQrId(qrId);
  if (!history) {
    res.status(404).send(
      `<!doctype html><html><body><h2>Product not found</h2></body></html>`
    );
    return;
  }

  const scans = await scanService.getPublicScansByQrId(qrId);
  const scanPoints = scans.map((s) => ({
    lat: s.location?.coordinates?.[1] || 0,
    lng: s.location?.coordinates?.[0] || 0,
    timestamp: s.timestamp,
  }));
  const suspicious = checkSuspicious(scanPoints);

  const product = history.product;
  const events = history.events || [];

  const html = `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>ChainTrace • ${escapeHtml(product.qrId)}</title>
      <style>
        body { font-family: Arial, sans-serif; background: #0a0f17; color: #f7f9fc; margin: 0; padding: 24px; }
        .card { max-width: 840px; margin: 0 auto; background: #111827; border-radius: 16px; padding: 24px; box-shadow: 0 12px 30px rgba(0,0,0,0.25); }
        .badge { display: inline-block; padding: 6px 12px; border-radius: 999px; background: rgba(30,136,229,0.15); color: #4da3ff; font-weight: 600; font-size: 12px; }
        h1 { margin: 0 0 6px 0; font-size: 24px; }
        h2 { margin: 18px 0 10px; font-size: 18px; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        a { color: #4da3ff; }
        .warn { background: rgba(198,40,40,0.18); color: #ffb4b4; padding: 10px 12px; border-radius: 12px; margin: 12px 0; }
        .muted { color: #9ca3af; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">ChainTrace Product Passport</div>
        <h1>${escapeHtml(product.name)} (${escapeHtml(product.qrId)})</h1>
        <div class="muted">Status: ${escapeHtml(product.status)}</div>
        ${suspicious ? `<div class="warn">${escapeHtml(suspicious)}</div>` : ""}
        <h2>Blockchain Timeline</h2>
        <table>
          <thead>
            <tr><th>Action</th><th>Role</th><th>When</th><th>Tx</th></tr>
          </thead>
          <tbody>
            ${events
              .map(
                (e) => `<tr>
                  <td>${escapeHtml(e.meta?.eventType || e.action)}</td>
                  <td>${escapeHtml(e.byRole)}</td>
                  <td>${escapeHtml(formatDate(e.timestamp))}</td>
                  <td>${
                    e.txHash
                      ? `<a target="_blank" rel="noopener noreferrer" href="${escapeHtml(env.blockExplorerUrl)}/tx/${escapeHtml(
                          e.txHash
                        )}">${escapeHtml(e.txHash.slice(0, 10))}...</a>`
                      : "-"
                  }</td>
                </tr>`
              )
              .join("")}
          </tbody>
        </table>
        <h2>Recent Public Scans</h2>
        <table>
          <thead><tr><th>When</th><th>Location</th><th>Result</th></tr></thead>
          <tbody>
            ${scans
              .slice(0, 10)
              .map((s) => {
                const coords = s.location?.coordinates || [0, 0];
                return `<tr>
                  <td>${escapeHtml(formatDate(s.timestamp))}</td>
                  <td>${escapeHtml(coords[1])}, ${escapeHtml(coords[0])}</td>
                  <td>${escapeHtml(String(s.result || "verified"))}</td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    </body>
  </html>`;

  res.status(200).set("Content-Type", "text/html").send(html);
});

module.exports = { publicProductPage };
