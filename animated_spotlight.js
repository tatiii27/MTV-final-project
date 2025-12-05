import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const container = d3.select("#animated-spotlight-chart");
if (container.empty()) {
  console.warn("animated_spotlight.js: container #animated-spotlight-chart not found.");
}

const regionSelect = d3.select("#anim-region-select");
const toggleBtn = d3.select("#anim-toggle");
const resetBtn = d3.select("#anim-reset");
const yearLabel = d3.select("#anim-year-label");
const yearNote = d3.select("#anim-year-note");
const gapText = d3.select("#anim-gap-text");

const margin = { top: 28, right: 90, bottom: 52, left: 70 };
const width = 960;
const height = 430;
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

const startYear = 1970;
const actualCutoff = 2020;
const endYear = 2035;
const projectionYears = [2025, 2035];
const hereYear = 2025;

const femaleColor = "#ff7eb6";
const maleColor = "#6aa5ff";

const svg = container
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .attr("preserveAspectRatio", "xMidYMid meet");

const defs = svg.append("defs");

const pinkGrad = defs
  .append("radialGradient")
  .attr("id", "glowPink")
  .attr("cx", "50%")
  .attr("cy", "45%")
  .attr("r", "70%");
pinkGrad.append("stop").attr("offset", "0%").attr("stop-color", femaleColor).attr("stop-opacity", 0.65);
pinkGrad.append("stop").attr("offset", "100%").attr("stop-color", femaleColor).attr("stop-opacity", 0);

const blueGrad = defs
  .append("radialGradient")
  .attr("id", "glowBlue")
  .attr("cx", "50%")
  .attr("cy", "45%")
  .attr("r", "70%");
blueGrad.append("stop").attr("offset", "0%").attr("stop-color", maleColor).attr("stop-opacity", 0.65);
blueGrad.append("stop").attr("offset", "100%").attr("stop-color", maleColor).attr("stop-opacity", 0);

const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

const x = d3.scaleLinear().domain([startYear, endYear]).range([0, innerWidth]);
const y = d3.scaleLinear().range([innerHeight, 0]);

const glowRect = g
  .insert("rect", ":first-child")
  .attr("class", "gap-glow")
  .attr("x", 0)
  .attr("y", 0)
  .attr("width", innerWidth)
  .attr("height", innerHeight);

g.append("rect")
  .attr("class", "projection-band")
  .attr("x", x(actualCutoff))
  .attr("y", 0)
  .attr("width", x(endYear) - x(actualCutoff))
  .attr("height", innerHeight);

const hereLine = g
  .append("line")
  .attr("class", "here-line")
  .attr("x1", x(hereYear))
  .attr("x2", x(hereYear))
  .attr("y1", 0)
  .attr("y2", innerHeight);

g.append("text")
  .attr("class", "here-label")
  .attr("x", x(hereYear))
  .attr("y", 12)
  .attr("text-anchor", "middle")
  .text("You are here (2025)");

const xAxisG = g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${innerHeight})`);
const yAxisG = g.append("g").attr("class", "y-axis");

g.append("text")
  .attr("class", "axis-title")
  .attr("x", innerWidth / 2)
  .attr("y", innerHeight + 40)
  .attr("text-anchor", "middle")
  .text("Year");

g.append("text")
  .attr("class", "axis-title")
  .attr("x", -innerHeight / 2)
  .attr("y", -50)
  .attr("transform", "rotate(-90)")
  .attr("text-anchor", "middle")
  .text("Secondary enrollment (gross %)");

const progressG = g.append("g").attr("class", "progress-lines");
const markersG = g.append("g").attr("class", "markers");

const femaleProgressPath = progressG.append("path").attr("class", "progress female");
const maleProgressPath = progressG.append("path").attr("class", "progress male");

const yearCursor = g.append("line").attr("class", "year-line");

const femaleMarker = markersG.append("circle").attr("class", "marker female").attr("r", 5);
const maleMarker = markersG.append("circle").attr("class", "marker male").attr("r", 5);

const lineFemale = d3
  .line()
  .x(d => x(d.year))
  .y(d => y(d.female))
  .curve(d3.curveMonotoneX);

const lineMale = d3
  .line()
  .x(d => x(d.year))
  .y(d => y(d.male))
  .curve(d3.curveMonotoneX);

const regionSeries = new Map();
let currentRegion = null;
let currentYear = startYear;
let playTimer = null;

function interpolate(points, year, key) {
  const sorted = points.slice().sort((a, b) => a.year - b.year);
  if (year <= sorted[0].year) return sorted[0][key];
  if (year >= sorted[sorted.length - 1].year) return sorted[sorted.length - 1][key];

  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i += 1) {
    const next = sorted[i];
    if (year <= next.year) {
      const t = (year - prev.year) / (next.year - prev.year);
      return prev[key] + t * (next[key] - prev[key]);
    }
    prev = next;
  }
  return prev[key];
}

function sampleSeries(points) {
  const yearly = [];
  for (let yr = startYear; yr <= endYear; yr += 1) {
    yearly.push({
      year: yr,
      female: interpolate(points, yr, "female"),
      male: interpolate(points, yr, "male"),
      projected: yr > actualCutoff
    });
  }
  return yearly;
}

function buildSeries(raw) {
  const grouped = d3.group(raw, d => d.region);
  grouped.forEach((rows, region) => {
    const actualPoints = rows
      .map(d => ({
        year: +d.Year,
        female: d["average_value_School enrollment, secondary, female (% gross)"],
        male: d["average_value_School enrollment, secondary, male (% gross)"],
        projected: false
      }))
      .filter(d => Number.isFinite(d.female) && Number.isFinite(d.male))
      .sort((a, b) => a.year - b.year);

    // Use the last two observed decades to set a damped trend projection (momentum that tapers over time).
    const projected = [];
    if (actualPoints.length >= 2) {
      const last = actualPoints[actualPoints.length - 1];
      const prev = actualPoints[actualPoints.length - 2];
      const span = Math.max(1, last.year - prev.year);
      const slopeFemale = (last.female - prev.female) / span;
      const slopeMale = (last.male - prev.male) / span;
      const dampingRate = 0.07; // higher = faster slowdown over time

      projectionYears.forEach(yr => {
        const yearsAhead = yr - last.year;
        const decay = Math.exp(-dampingRate * yearsAhead);
        projected.push({
          year: yr,
          female: last.female + slopeFemale * yearsAhead * decay,
          male: last.male + slopeMale * yearsAhead * decay,
          projected: true
        });
      });
    }

    const extendedPoints = [...actualPoints, ...projected]
      .map(d => ({
        ...d,
        female: Math.max(0, Math.min(120, d.female)),
        male: Math.max(0, Math.min(120, d.male))
      }))
      .sort((a, b) => a.year - b.year);
    const yearly = sampleSeries(extendedPoints);

    regionSeries.set(region, {
      actualPoints,
      extendedPoints,
      yearly,
      lookup: new Map(yearly.map(d => [d.year, d]))
    });
  });
}

function updateScales() {
  const maxVal = d3.max(
    Array.from(regionSeries.values()).flatMap(series =>
      series.extendedPoints.flatMap(d => [d.female, d.male])
    )
  );
  const paddedMax = Math.max(120, Math.ceil(maxVal || 100));
  y.domain([0, paddedMax]);

  xAxisG.call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(8));
  yAxisG.call(d3.axisLeft(y).ticks(6).tickFormat(d => `${d}%`));
}

function updateRegion(region) {
  currentRegion = region;
  const series = regionSeries.get(region);
  if (!series) return;

  setYear(startYear);
}

function setYear(year) {
  currentYear = Math.min(endYear, Math.max(startYear, Math.round(year)));
  const series = regionSeries.get(currentRegion);
  if (!series) return;
  const frame = series.lookup.get(currentYear);
  if (!frame) return;

  yearLabel.text(currentYear);
  yearNote.style("opacity", currentYear > actualCutoff ? 1 : 0.45);

  const qualifier = currentYear > actualCutoff ? "projected" : "observed";
  const gap = frame.female - frame.male;
  const direction = gap > 0 ? "Girls ahead" : gap < 0 ? "Boys ahead" : "No gap";
  
  // Special emphasis for year 2025
  if (currentYear === 2025) {
    gapText.html(
      `<span class="gap-emphasis">YOU ARE HERE (2025):</span> ${direction} by ${Math.abs(gap).toFixed(1)} percentage points (${qualifier}). Girls: ${frame.female.toFixed(
        1
      )}%, Boys: ${frame.male.toFixed(1)}%`
    );
    
    // Pulse the year cursor line
    yearCursor
      .classed("year-here-emphasis", true)
      .transition()
      .duration(500)
      .attr("stroke-width", 3)
      .style("stroke", "#ffcc00")
      .transition()
      .duration(500)
      .attr("stroke-width", 2);
    
    // Pulse the here line as well
    hereLine
      .transition()
      .duration(500)
      .attr("stroke-width", 3)
      .style("stroke", "#ffcc00")
      .transition()
      .duration(500)
      .attr("stroke-width", 2);
      
  } else {
    gapText.text(
      `${direction} by ${Math.abs(gap).toFixed(1)} percentage points (${qualifier}). Girls: ${frame.female.toFixed(
        1
      )}%, Boys: ${frame.male.toFixed(1)}%`
    );
    yearCursor.classed("year-here-emphasis", false);
  }

  const glowFill = gap > 0 ? "url(#glowPink)" : gap < 0 ? "url(#glowBlue)" : "url(#glowPink)";
  const glowOpacity = Math.min(0.7, 0.30 + Math.abs(gap) / 32);
  glowRect.attr("fill", glowFill).attr("opacity", glowOpacity);

  const progressFemale = series.yearly.filter(d => d.year <= currentYear);
  const progressMale = series.yearly.filter(d => d.year <= currentYear);

  femaleProgressPath.attr("d", lineFemale(progressFemale));
  maleProgressPath.attr("d", lineMale(progressMale));

  const cx = x(currentYear);
  yearCursor
    .attr("x1", cx)
    .attr("x2", cx)
    .attr("y1", 0)
    .attr("y2", innerHeight);

  femaleMarker.attr("cx", cx).attr("cy", y(frame.female));
  maleMarker.attr("cx", cx).attr("cy", y(frame.male));
}

function stopPlaying() {
  if (playTimer) {
    playTimer.stop();
    playTimer = null;
  }
  toggleBtn.text("Play");
}

function startPlaying() {
  const series = regionSeries.get(currentRegion);
  if (!series || playTimer) return;
  let idx = series.yearly.findIndex(d => d.year >= currentYear);
  if (idx < 0) idx = 0;
  toggleBtn.text("Pause");
  
  let pauseAt2025 = false;

  playTimer = d3.interval(() => {
    const frame = series.yearly[idx];
    if (!frame) {
      stopPlaying();
      return;
    }
    setYear(frame.year);
    
    // Add dramatic pause at year 2025
    if (frame.year === 2025 && !pauseAt2025) {
      pauseAt2025 = true;
      stopPlaying();
      
      // Auto-resume after 2 seconds to show the future projection
      setTimeout(() => {
        if (currentYear === 2025) {
          startPlaying();
        }
      }, 2000);
      return;
    }
    
    idx += 1;
    if (frame.year >= endYear) {
      stopPlaying();
    }
  }, 220);
}

toggleBtn.on("click", () => {
  if (playTimer) {
    stopPlaying();
  } else {
    startPlaying();
  }
});

resetBtn.on("click", () => {
  stopPlaying();
  setYear(startYear);
});

d3.csv("data/gender_regions_decades.csv", d3.autoType)
  .then(raw => {
    if (!raw || !raw.length) {
      console.error("animated_spotlight.js: no rows loaded.");
      return;
    }

    buildSeries(raw);
    updateScales();

    const regions = Array.from(regionSeries.keys()).sort(d3.ascending);
    regionSelect
      .selectAll("option")
      .data(regions)
      .join("option")
      .attr("value", d => d)
      .text(d => d);

    currentRegion = regions[0];
    regionSelect.property("value", currentRegion);
    updateRegion(currentRegion);
  })
  .catch(err => {
    console.error("animated_spotlight.js: error loading CSV", err);
  });

regionSelect.on("change", function () {
  stopPlaying();
  updateRegion(this.value);
});
