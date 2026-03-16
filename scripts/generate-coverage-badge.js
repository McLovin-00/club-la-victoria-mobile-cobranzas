const fs = require("fs");
const path = require("path");

const summaryPath = path.join(__dirname, "..", "coverage", "coverage-summary.json");
const outputPath = path.join(__dirname, "..", "badges", "mobile-cobranzas-coverage.svg");

function getColor(percentage) {
  if (percentage >= 80) return "#16a34a";
  if (percentage >= 60) return "#f59e0b";
  return "#dc2626";
}

function createBadgeSvg(label, value, color) {
  const labelWidth = 88;
  const valueWidth = 56;
  const totalWidth = labelWidth + valueWidth;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
  <linearGradient id="smooth" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="round">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </mask>
  <g mask="url(#round)">
    <rect width="${labelWidth}" height="20" fill="#374151"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#smooth)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>`;
}

if (!fs.existsSync(summaryPath)) {
  throw new Error(`Coverage summary not found at ${summaryPath}`);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const linesPercentage = Number(summary.total?.lines?.pct ?? 0);
const value = `${linesPercentage}%`;
const svg = createBadgeSvg("coverage", value, getColor(linesPercentage));

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, svg, "utf8");

console.log(`Coverage badge generated at ${outputPath}`);
