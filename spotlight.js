// spotlight.js
// Horizontal scrollytelling: user country highlighted across multiple gender metrics

// Columns to include (full list provided by user)
const requestedColumns = [
  "average_value_Adjusted net enrollment rate, primary, female (% of primary school age children)",
  "average_value_Adjusted net enrollment rate, primary, male (% of primary school age children)",
  "average_value_Adolescent fertility rate (births per 1,000 women ages 15-19)",
  "average_value_Births attended by skilled health staff (% of total)",
  "average_value_Children out of school, primary, female",
  "average_value_Children out of school, primary, male",
  "average_value_Educational attainment, Doctoral or equivalent, population 25+, female (%) (cumulative)",
  "average_value_Educational attainment, Doctoral or equivalent, population 25+, male (%) (cumulative)",
  "average_value_Educational attainment, Doctoral or equivalent, population 25+, total (%) (cumulative)",
  "average_value_Educational attainment, at least Bachelor's or equivalent, population 25+, female (%) (cumulative)",
  "average_value_Educational attainment, at least Bachelor's or equivalent, population 25+, male (%) (cumulative)",
  "average_value_Educational attainment, at least Bachelor's or equivalent, population 25+, total (%) (cumulative)",
  "average_value_Educational attainment, at least completed lower secondary, population 25+, female (%) (cumulative)",
  "average_value_Educational attainment, at least completed lower secondary, population 25+, male (%) (cumulative)",
  "average_value_Educational attainment, at least completed lower secondary, population 25+, total (%) (cumulative)",
  "average_value_Educational attainment, at least completed post-secondary, population 25+, female (%) (cumulative)",
  "average_value_Educational attainment, at least completed post-secondary, population 25+, male (%) (cumulative)",
  "average_value_Educational attainment, at least completed post-secondary, population 25+, total (%) (cumulative)",
  "average_value_Educational attainment, at least completed short-cycle tertiary, population 25+, female (%) (cumulative)",
  "average_value_Educational attainment, at least completed short-cycle tertiary, population 25+, male (%) (cumulative)",
  "average_value_Educational attainment, at least completed short-cycle tertiary, population 25+, total (%) (cumulative)",
  "average_value_Educational attainment, at least completed upper secondary, population 25+, female (%) (cumulative)",
  "average_value_Educational attainment, at least completed upper secondary, population 25+, male (%) (cumulative)",
  "average_value_Educational attainment, at least completed upper secondary, population 25+, total (%) (cumulative)",
  "average_value_Fertility rate, total (births per woman)",
  "average_value_Life expectancy at birth, female (years)",
  "average_value_Life expectancy at birth, male (years)",
  "average_value_Mortality rate, adult, female (per 1,000 female adults)",
  "average_value_Mortality rate, adult, male (per 1,000 male adults)",
  "average_value_Persistence to last grade of primary, female (% of cohort)",
  "average_value_Persistence to last grade of primary, male (% of cohort)",
  "average_value_Primary education, teachers (% female)",
  "average_value_Progression to secondary school, female (%)",
  "average_value_Progression to secondary school, male (%)",
  "average_value_Repeaters, primary, female (% of female enrollment)",
  "average_value_Repeaters, primary, male (% of male enrollment)",
  "average_value_School enrollment, secondary, female (% gross)",
  "average_value_School enrollment, secondary, female (% net)",
  "average_value_School enrollment, secondary, male (% gross)",
  "average_value_School enrollment, secondary, male (% net)",
  "average_value_School enrollment, tertiary, female (% gross)",
  "average_value_School enrollment, tertiary, male (% gross)",
  "average_value_Secondary education, general pupils (% female)",
  "average_value_Secondary education, pupils (% female)",
  "average_value_Secondary education, teachers (% female)",
  "average_value_Secondary education, vocational pupils (% female)",
  "average_value_Survival to age 65, female (% of cohort)",
  "average_value_Survival to age 65, male (% of cohort)",
  "average_value_Trained teachers in primary education, female (% of female teachers)",
  "average_value_Trained teachers in primary education, male (% of male teachers)"
];

// Pair female/male columns where possible + collect singles
let metrics = [];
let singleMetrics = [];
const usedColumns = new Set();
const spotlightTooltip = d3
  .select("body")
  .append("div")
  .attr("class", "spotlight-tooltip")
  .style("opacity", 0);
requestedColumns.forEach((col) => {
  if (!/female/i.test(col)) return;
  const maleCol = col.replace(/female/i, "male");
  if (!requestedColumns.includes(maleCol)) return; // need both sides

  const baseLabel = col
    .replace(/^average_value_/i, "")
    .replace(/, female.*$/i, "")
    .trim();

  usedColumns.add(col);
  usedColumns.add(maleCol);

  metrics.push({
    id: baseLabel.toLowerCase().replace(/\s+/g, "-"),
    label: baseLabel,
    description: "",
    femaleCol: col,
    maleCol,
  });
});

requestedColumns.forEach((col) => {
  if (usedColumns.has(col)) return;
  const label = col.replace(/^average_value_/i, "").trim();
  singleMetrics.push({
    id: label.toLowerCase().replace(/\s+/g, "-"),
    label,
    description: "",
    valueCol: col,
  });
});

// Reorder and keep only the requested columns from the user prompt
const pairOrder = [
  "Adjusted net enrollment rate, primary",
  "Educational attainment, at least completed upper secondary, population 25+",
  "Educational attainment, at least Bachelor's or equivalent, population 25+",
  "Educational attainment, Doctoral or equivalent, population 25+",
];

const singleOrder = [
  "Births attended by skilled health staff (% of total)",
  "Adolescent fertility rate (births per 1,000 women ages 15-19)",
  "Fertility rate, total (births per woman)",
];

metrics = metrics
  .filter((m) => pairOrder.includes(m.label))
  .sort(
    (a, b) => pairOrder.indexOf(a.label) - pairOrder.indexOf(b.label)
  );

singleMetrics = singleMetrics
  .filter((m) => singleOrder.includes(m.label))
  .sort(
    (a, b) => singleOrder.indexOf(a.label) - singleOrder.indexOf(b.label)
  );

const countrySelect = document.getElementById("spotlight-country");
const track = document.getElementById("spotlight-track");
let selectedCountry = null;
if (countrySelect && track) {
  d3.csv("data/gender.csv", d3.autoType).then((rows) => {
    const cleaned = rows
      .map((d) => ({
        ...d,
        country: typeof d["Country Name"] === "string" ? d["Country Name"].trim() : d["Country Name"],
      }))
      .filter((d) => d.country && isRealCountry(d.country));

    const rowsByCountry = d3.group(cleaned, (d) => d.country);

    const countryNames = Array.from(rowsByCountry.keys())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    countryNames.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      countrySelect.appendChild(opt);
    });

    const pairCards = metrics.map((metric) => {
      const perCountry = Array.from(rowsByCountry.entries())
        .map(([country, list]) => {
          const row = findLatest(
            list,
            (d) =>
              isValidNumber(d[metric.femaleCol]) &&
              isValidNumber(d[metric.maleCol])
          );
          if (!row) return null;
          return {
            country,
            female: row[metric.femaleCol],
            male: row[metric.maleCol],
            year: row.Year,
          };
        })
        .filter(Boolean);

      return buildCard(metric, perCountry);
    });

    const singleCards = singleMetrics.map((metric) => {
      const perCountry = Array.from(rowsByCountry.entries())
        .map(([country, list]) => {
          const row = findLatest(
            list,
            (d) => isValidNumber(d[metric.valueCol])
          );
          if (!row) return null;
          return {
            country,
            value: row[metric.valueCol],
            year: row.Year,
          };
        })
        .filter(Boolean);

      return buildSingleCard(metric, perCountry);
    });

    const orderedLabels = [
      "Births attended by skilled health staff (% of total)",
      "Adjusted net enrollment rate, primary",
      "Educational attainment, at least completed upper secondary, population 25+",
      "Educational attainment, at least Bachelor's or equivalent, population 25+",
      "Educational attainment, Doctoral or equivalent, population 25+",
      "Adolescent fertility rate (births per 1,000 women ages 15-19)",
      "Fertility rate, total (births per woman)",
    ];

    const cardsByLabel = new Map(
      [...pairCards, ...singleCards].map((c) => [c.metric.label, c])
    );

    const cards = [];
    orderedLabels.forEach((label) => {
      if (cardsByLabel.has(label)) {
        cards.push(cardsByLabel.get(label));
        cardsByLabel.delete(label);
      }
    });
    // append any remaining cards (if any)
    cards.push(...cardsByLabel.values());

    countrySelect.addEventListener("change", () => {
      selectedCountry = countrySelect.value || null;
      cards.forEach((card) => updateCardHighlight(card, selectedCountry));
    });
  });
}

function isValidNumber(val) {
  return typeof val === "number" && !Number.isNaN(val);
}

function isRealCountry(name) {
  const n = name.toLowerCase();
  const banned = [
    "income",
    "oecd",
    "ida",
    "ibrd",
    "hipc",
    "euro area",
    "europe &",
    "sub-saharan",
    "latin america",
    "caribbean",
    "east asia",
    "central asia",
    "central europe",
    "middle east",
    "north africa",
    "south asia",
    "arab world",
    "world",
    "small states",
    "fragile",
    "pacific",
    "least developed",
    "developing only",
    "developing",
    "high income",
    "low income",
    "upper middle income",
    "lower middle income",
    "g7",
    "g20",
    "demographic dividend",
    "africa eastern and southern",
    "africa western and central",
  ];
  return !banned.some((b) => n.includes(b));
}

function findLatest(list, predicate) {
  return list
    .filter((d) => Number.isFinite(d.Year))
    .sort((a, b) => b.Year - a.Year)
    .find(predicate);
}

function buildCard(metric, data) {
  const card = document.createElement("article");
  card.className = "spotlight-card";
  card.innerHTML = `
    <div class="spotlight-card__text">
      <p class="spotlight-card__eyebrow">${metric.label}</p>
      <p class="spotlight-card__desc">${metric.description}</p>
    </div>
    <div class="spotlight-chart"></div>
  `;

  track.appendChild(card);

  const container = card.querySelector(".spotlight-chart");
  const chartW = 720;
  const chartH = 520;
  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${chartW} ${chartH}`)
    .attr("role", "img");

  const margin = { top: 28, right: 36, bottom: 64, left: 84 };
  const innerW = chartW - margin.left - margin.right;
  const innerH = chartH - margin.top - margin.bottom;

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const filtered = data.filter(
    (d) => isValidNumber(d.female) && isValidNumber(d.male)
  );

  if (!filtered.length) {
    g.append("text")
      .attr("x", innerW / 2)
      .attr("y", innerH / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "#cbd2e4")
      .text("No data available for this metric.");
    return { card, metric, g, filtered, x: null, y: null };
  }

  const maxVal = Math.max(
    d3.max(filtered, (d) => d.female),
    d3.max(filtered, (d) => d.male)
  );
  const padded = Number.isFinite(maxVal) && maxVal > 0 ? maxVal * 1.05 : 1;

  const x = d3.scaleLinear().domain([0, padded]).range([0, innerW]);
  const y = d3.scaleLinear().domain([0, padded]).range([innerH, 0]);

  const axis = d3.axisBottom(x).ticks(7).tickSize(-innerH).tickFormat((d) => `${d}`);
  g.append("g")
    .attr("class", "spotlight-axis")
    .attr("transform", `translate(0,${innerH})`)
    .call(axis);

  const yAxis = d3.axisLeft(y).ticks(7).tickSize(-innerW).tickFormat((d) => `${d}`);
  g.append("g").attr("class", "spotlight-axis").call(yAxis);

  g.append("line")
    .attr("class", "spotlight-parity")
    .attr("x1", x(0))
    .attr("y1", y(0))
    .attr("x2", x(padded))
    .attr("y2", y(padded));

  // Axis labels
  g.append("text")
    .attr("class", "spotlight-axis-label")
    .attr("x", innerW / 2)
    .attr("y", innerH + margin.bottom - 12)
    .attr("text-anchor", "middle")
    .text("Boys");

  g.append("text")
    .attr("class", "spotlight-axis-label")
    .attr("transform", `translate(${-margin.left + 16}, ${innerH / 2}) rotate(-90)`)
    .attr("text-anchor", "middle")
    .text("Girls");

  const dots = g
    .append("g")
    .attr("class", "spotlight-dots")
    .selectAll("circle")
    .data(filtered, (d) => d.country)
    .enter()
    .append("circle")
    .attr("class", "spotlight-dot")
    .attr("r", 4)
    .attr("cx", (d) => x(d.male))
    .attr("cy", (d) => y(d.female));

  dots
    .on("mouseenter", (event, d) => {
      if (!selectedCountry || d.country !== selectedCountry) return;
      spotlightTooltip
        .style("opacity", 1)
        .html(
          `<strong>${d.country}</strong><br>Girls: ${d.female.toFixed(1)}<br>Boys: ${d.male.toFixed(1)}`
        );
    })
    .on("mousemove", (event) => {
      if (!selectedCountry) return;
      spotlightTooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 20 + "px");
    })
    .on("mouseleave", () => {
      spotlightTooltip.style("opacity", 0);
    });

  // Highlight layer
  const highlight = g
    .append("circle")
    .attr("class", "spotlight-highlight")
    .attr("r", 10)
    .attr("visibility", "hidden");

  const highlightLabel = g
    .append("text")
    .attr("class", "spotlight-highlight-label")
    .attr("visibility", "hidden");

  return { card, metric, kind: "pair", g, filtered, x, y, highlight, highlightLabel, innerW, innerH };
}

function updateCardHighlight(card, countryName) {
  const { filtered, x, y, yPos, highlight, highlightLabel, kind, innerW, innerH } = card;
  if (!x || !filtered) return;
  if (kind === "pair" && !y) return;
  if (kind === "single" && yPos == null) return;

  const match = filtered.find((d) => d.country === countryName);
  if (!match) {
    highlight.attr("visibility", "hidden");
    highlightLabel.attr("visibility", "hidden");
    return;
  }

  const cx = kind === "single" ? x(match.value) : x(match.male);
  const cy = kind === "single" ? yPos : y(match.female);

  highlight
    .attr("visibility", "visible")
    .attr("cx", cx)
    .attr("cy", cy);

  const maxX = typeof innerW === "number" ? innerW : x.range()[1];
  const maxY = typeof innerH === "number" ? innerH : (y ? y.range()[0] : yPos);
  const roomRight = maxX - cx;
  const placeLeft = roomRight < 120; // long names near the edge -> flip to left
  const labelX = placeLeft ? Math.max(10, cx - 12) : Math.min(maxX - 10, cx + 12);
  const labelY = Math.min(maxY - 6, Math.max(14, cy - 6));
  const anchor = placeLeft ? "end" : "start";

  highlightLabel
    .attr("visibility", "visible")
    .attr("x", labelX)
    .attr("y", labelY)
    .attr("text-anchor", anchor)
    .text(`${match.country}`);

  // Keep tooltip hidden until hover on selected country
  spotlightTooltip.style("opacity", 0);
}

function buildSingleCard(metric, data) {
  const card = document.createElement("article");
  card.className = "spotlight-card";
  card.innerHTML = `
    <div class="spotlight-card__text">
      <p class="spotlight-card__eyebrow">${metric.label}</p>
      <p class="spotlight-card__desc">${metric.description}</p>
    </div>
    <div class="spotlight-chart"></div>
  `;

  track.appendChild(card);

  const container = card.querySelector(".spotlight-chart");
  const chartW = 720;
  const chartH = 520;
  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${chartW} ${chartH}`)
    .attr("role", "img");

  const margin = { top: 20, right: 32, bottom: 48, left: 60 };
  const innerW = chartW - margin.left - margin.right;
  const innerH = chartH - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const filtered = data.filter((d) => isValidNumber(d.value));
  if (!filtered.length) {
    g.append("text")
      .attr("x", innerW / 2)
      .attr("y", innerH / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "#cbd2e4")
      .text("No data available for this metric.");
    return { card, metric, kind: "single", filtered: [], x: null, yPos: null, highlight: null, highlightLabel: null };
  }

  const maxVal = d3.max(filtered, (d) => d.value);
  const padded = Number.isFinite(maxVal) && maxVal > 0 ? maxVal * 1.05 : 1;

  const x = d3.scaleLinear().domain([0, padded]).range([0, innerW]);
  const yPos = innerH / 2;

  const xAxis = d3.axisBottom(x).ticks(7).tickSize(-innerH).tickFormat((d) => `${d}`);
  g.append("g")
    .attr("class", "spotlight-axis")
    .attr("transform", `translate(0,${innerH})`)
    .call(xAxis);

  g.append("text")
    .attr("class", "spotlight-axis-label")
    .attr("x", innerW / 2)
    .attr("y", innerH + margin.bottom - 12)
    .attr("text-anchor", "middle")
    .text(metric.label);

  const dots = g
    .append("g")
    .attr("class", "spotlight-dots")
    .selectAll("circle")
    .data(filtered, (d) => d.country)
    .enter()
    .append("circle")
    .attr("class", "spotlight-dot")
    .attr("r", 4)
    .attr("cx", (d) => x(d.value))
    .attr("cy", yPos);

  dots
    .on("mouseenter", (event, d) => {
      if (!selectedCountry || d.country !== selectedCountry) return;
      spotlightTooltip
        .style("opacity", 1)
        .html(
          `<strong>${d.country}</strong><br>Value: ${d.value.toFixed(2)}`
        );
    })
    .on("mousemove", (event) => {
      if (!selectedCountry) return;
      spotlightTooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 20 + "px");
    })
    .on("mouseleave", () => {
      spotlightTooltip.style("opacity", 0);
    });

  const highlight = g
    .append("circle")
    .attr("class", "spotlight-highlight")
    .attr("r", 10)
    .attr("visibility", "hidden");

  const highlightLabel = g
    .append("text")
    .attr("class", "spotlight-highlight-label")
    .attr("visibility", "hidden");

  return { card, metric, kind: "single", filtered, x, yPos, highlight, highlightLabel, innerW, innerH };
}
