// global.js
const WORLD_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

/* =======================================
 * PART A — SCROLL-PROGRESS DRIVEN GLOBE
 * =====================================*/
(function scrollyGlobe() {
  const container = document.getElementById("globe-container");
  if (!container) return;

  // --- Dimensions ---
  const size = container.clientWidth || 760;
  const width = size;
  const height = size;
  const radius = Math.min(width, height) / 2 - 20;

  // Make sure the container has height so the SVG is visible
  container.style.height = `${height}px`;

  // --- SVG + projection ---
  const svg = d3
    .select("#globe")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`);

  const projection = d3.geoOrthographic()
    .scale(radius)
    .translate([width / 2, height / 2])
    .clipAngle(90);

  const path = d3.geoPath(projection);
  const graticule = d3.geoGraticule();

  let rotation = [0, -20];
  projection.rotate(rotation);

  // --- Layers ---
  svg.append("path")
    .datum({ type: "Sphere" })
    .attr("class", "water")
    .attr("d", path);

  svg.append("path")
    .datum(graticule())
    .attr("class", "graticule")
    .attr("d", path);

  const countriesLayer = svg.append("g").attr("id", "countries-layer");
  const annotationGroup = svg.append("g").attr("id", "annotation-group");

  /* -------------------------------------
   * REGION KEYFRAMES (IN ORDER)
   * -------------------------------------*/
  const keyframes = [
    { name: "Africa", coords: [20, 5] },
    { name: "Asia", coords: [90, 30] },
    { name: "Middle East & North Africa", coords: [35, 25] },
    { name: "Europe", coords: [15, 50] },
    { name: "Latin America & the Caribbean", coords: [-70, -10] },
    { name: "Northern America", coords: [-100, 40] },
    { name: "Oceania", coords: [140, -25] }
  ];

  let countries = [];

  // --- Load world map ---
  d3.json(WORLD_URL).then(world => {
    countries = topojson.feature(world, world.objects.countries).features;
    countriesLayer
      .selectAll("path")
      .data(countries)
      .join("path")
      .attr("class", "country")
      .attr("d", path)
      .attr("fill", "#444f7a")
      .attr("stroke", "white")
      .attr("stroke-width", 0.3);

    setupScrollProgress();
    addDrag();
    render();
  });

  /* -------------------------------------
   * UPDATE PER FRAME
   * -------------------------------------*/
  function render() {
    svg.selectAll("path.water").attr("d", path);
    svg.selectAll("path.graticule").attr("d", path);
    countriesLayer.selectAll("path").attr("d", path);
    updateAnnotationPosition();
  }

  /* -------------------------------------
   * DRAGGING OVERRIDES SCROLL
   * -------------------------------------*/
  let isDragging = false;
  let lastDrag = null;
  let lastRot = null;

  function addDrag() {
    svg.call(
      d3.drag()
        .on("start", (event) => {
          isDragging = true;
          lastDrag = [event.x, event.y];
          lastRot = rotation.slice();
        })
        .on("drag", (event) => {
          const dx = event.x - lastDrag[0];
          const dy = event.y - lastDrag[1];

          rotation = [
            lastRot[0] + dx * 0.4,
            lastRot[1] - dy * 0.4
          ];

          projection.rotate(rotation);
          render();
        })
        .on("end", () => { isDragging = false; })
    );
  }

  /* -------------------------------------
   * SCROLLPROGRESS → ROTATION
   * -------------------------------------*/
  function setupScrollProgress() {
    const steps = Array.from(document.querySelectorAll(".step"));
    const stepsContainer = document.querySelector(".steps");
    let activeIndex = 0;
    let stepTops = [];

    function computeStepTops() {
      stepTops = steps.map(s => s.getBoundingClientRect().top + window.scrollY);
    }
    computeStepTops();
    window.addEventListener("resize", computeStepTops);

    window.addEventListener("scroll", () => {
      if (isDragging) return; // dragging overrides scroll

      const viewportCenter = window.innerHeight * 0.5;

      // Find the .step whose center is closest to the viewport center
      let idx = 0;
      let minDist = Infinity;

      steps.forEach((step, i) => {
        const rect = step.getBoundingClientRect();
        const stepCenter = rect.top + rect.height / 2;
        const dist = Math.abs(stepCenter - viewportCenter);
        if (dist < minDist) {
          minDist = dist;
          idx = i;
        }
      });

      const frame = keyframes[idx];

      // Snap globe rotation directly to the active region
      rotation = [-frame.coords[0], -frame.coords[1]];
      projection.rotate(rotation);

      annotationGroup.datum(frame);
      render();

      if (idx !== activeIndex) {
        activeIndex = idx;
        steps.forEach((step, i) => step.classList.toggle("is-active", i === idx));
      }
    });

    // set initial annotation
    annotationGroup.datum(keyframes[0]);
    // set initial state
    if (steps.length) {
      steps[0].classList.add("is-active");
    }
  }

  /* -------------------------------------
   * ANNOTATIONS FOLLOW ROTATION
   * -------------------------------------*/
  function updateAnnotationPosition() {
    const region = annotationGroup.datum();
    if (!region) return;

    annotationGroup.selectAll("*").remove();

    const projected = projection(region.coords);
    if (!projected) return;

    const [x, y] = projected;

    const labelOffsetX = 70;
    const labelOffsetY = -25;

    annotationGroup
      .append("circle")
      .attr("class", "annotation-halo")
      .attr("cx", x)
      .attr("cy", y)
      .attr("r", 20);

    annotationGroup
      .append("circle")
      .attr("class", "annotation-dot")
      .attr("cx", x)
      .attr("cy", y)
      .attr("r", 5);

    annotationGroup
      .append("line")
      .attr("class", "annotation-line")
      .attr("x1", x)
      .attr("y1", y)
      .attr("x2", x + labelOffsetX)
      .attr("y2", y + labelOffsetY);

    annotationGroup
      .append("text")
      .attr("class", "annotation-label")
      .attr("x", x + labelOffsetX)
      .attr("y", y + labelOffsetY - 4)
      .text(region.name);
  }
})();


/* =======================================
 * PART B: EXPLORE GLOBE (BOTTOM)
 * =====================================*/
(function exploreGlobe() {
  const container = document.getElementById("globe-explore-container");
  const svgEl = document.getElementById("globe-explore");
  if (!container || !svgEl) return; // if bottom view isn't in the HTML, just skip

  const size = container.clientWidth || 760;
  const width = size;
  const height = size;
  const radius = Math.min(width, height) / 2 - 20;

  // ensure visible
  container.style.height = `${height}px`;

  const svg = d3
    .select("#globe-explore")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`);

  const projection = d3
    .geoOrthographic()
    .scale(radius)
    .translate([width / 2, height / 2])
    .clipAngle(90);

  const path = d3.geoPath(projection);
  const graticule = d3.geoGraticule();

  let rotation = [0, -20];
  projection.rotate(rotation);
  let isDragging = false;
  let lastDragPos = null;
  let lastRotation = null;

  // Background
  svg.append("path")
    .datum({ type: "Sphere" })
    .attr("class", "water")
    .attr("d", path);

  svg.append("path")
    .datum(graticule())
    .attr("class", "graticule")
    .attr("d", path);

  const countriesLayer = svg.append("g").attr("id", "explore-countries");
  const tooltip = document.getElementById("explore-tooltip");

  countriesLayer
    .selectAll("path.country")
    .on("mousemove", (event, d) => {
      const name = d.properties && d.properties.name;
      const v = getValue(name, currentDecade, currentMetric);

      tooltip.style.opacity = 1;
      tooltip.style.left = event.pageX + 15 + "px";
      tooltip.style.top = event.pageY + 15 + "px";

      tooltip.innerHTML = `
        <strong>${name}</strong><br>
        ${prettyMetricLabel(currentMetric)}:<br>
        <strong>${v == null ? "No data" : d3.format(".2f")(v)}</strong>
      `;
    })
    .on("mouseleave", () => {
      tooltip.style.opacity = 0;
    });

  // Controls & legend
  const metricSelect = document.getElementById("metric-select");
  const decadeSelect = document.getElementById("decade-select");
  const exploreReset = document.getElementById("explore-reset");
  const legendMin = document.getElementById("legend-min");
  const legendMax = document.getElementById("legend-max");
  const legendBar = document.querySelector("#legend-explore .legend-bar");
  const countryStatsEl = document.getElementById("country-stats");

  if (
    !metricSelect ||
    !decadeSelect ||
    !exploreReset ||
    !legendMin ||
    !legendMax ||
    !legendBar ||
    !countryStatsEl
  ) {
    console.warn(
      "Explore controls, legend, or stats panel missing, skipping explore globe."
    );
    return;
  }

  // Color scale
  const elegantInterpolator = (t) =>
    d3.interpolateRgbBasis(["#f28e84", "#f2d675", "#18a6a6"])(t);

  const colorScale = d3.scaleSequential(elegantInterpolator);

  let countries = [];
  let dataByNameDecade = null; // keyed by Country Name
  let metricColumns = [];
  let decades = [];
  let currentMetric = null;
  let currentDecade = null;

  // Map year -> decade label like "1970-1979"
  function decadeLabelFromYear(year) {
    if (year == null || isNaN(year)) return null;
    if (year < 1970) return null;
    const start = Math.floor(year / 10) * 10;
    const end = start + 9;
    return `${start}-${end}`;
  }

  // 1️⃣ Load world map first
  d3.json(WORLD_URL)
    .then((world) => {
      countries = topojson.feature(world, world.objects.countries).features;

      countriesLayer
        .selectAll("path")
        .data(countries)
        .join("path")
        .attr("class", "country")
        .attr("d", path)
        .attr("fill", "#444f7a")
        .attr("stroke", "white")
        .attr("stroke-width", 0.3)
        .on("click", (event, d) => onCountryClick(d));

      addDrag();
      startRotation();
      render();

      loadGenderData();
    })
    .catch((err) =>
      console.error("Explore globe world load error:", err)
    );

  // 2️⃣ Load gender data
  function loadGenderData() {
    d3.csv("data/gender.csv", d3.autoType)
      .then((data) => {
        const filtered = data
          .map((d) => {
            const dec = decadeLabelFromYear(d.Year);
            return dec ? { ...d, Decade: dec } : null;
          })
          .filter((d) => d !== null);

        dataByNameDecade = d3.rollup(
          filtered,
          (v) => v,
          (d) => d["Country Name"],
          (d) => d.Decade
        );

        const allowed = new Set([
          "average_value_Adolescent fertility rate (births per 1,000 women ages 15-19)",
          "average_value_Births attended by skilled health staff (% of total)",
          "average_value_Fertility rate, total (births per woman)",
          "average_value_Life expectancy at birth, female (years)",
          "average_value_Life expectancy at birth, male (years)",
          "average_value_Mortality rate, adult, female (per 1,000 female adults)",
          "average_value_Mortality rate, adult, male (per 1,000 male adults)",
          "average_value_School enrollment, secondary, female (% gross)",
          "average_value_School enrollment, secondary, male (% gross)",
          "average_value_School enrollment, tertiary, female (% gross)",
          "average_value_School enrollment, tertiary, male (% gross)",
          "average_value_Survival to age 65, female (% of cohort)",
          "average_value_Survival to age 65, male (% of cohort)"
        ]);

        metricColumns = data.columns.filter((c) => allowed.has(c));

        const preferredMetric =
          metricColumns.find((c) =>
            c.toLowerCase().includes(
              "life expectancy at birth, female (years)"
            )
          ) || metricColumns[0];

        currentMetric = null;

        decades = Array.from(new Set(filtered.map((d) => d.Decade)))
          .filter((dec) => !dec.startsWith("2020"))
          .sort(
          (a, b) =>
            parseInt(a.split("-")[0]) - parseInt(b.split("-")[0])
        );

        currentDecade = null;

        setupControls();
        updateChoropleth();
      })
      .catch((err) =>
        console.error("Explore globe gender.csv load error:", err)
      );
  }

  function setupControls() {
    metricSelect.innerHTML = "";
    // placeholder for metric
    const metricPlaceholder = document.createElement("option");
    metricPlaceholder.value = "";
    metricPlaceholder.disabled = true;
    metricPlaceholder.selected = true;
    metricPlaceholder.textContent = "Select metric";
    metricSelect.appendChild(metricPlaceholder);

    metricColumns.forEach((col) => {
      const opt = document.createElement("option");
      opt.value = col;
      opt.textContent = prettyMetricLabel(col);
      metricSelect.appendChild(opt);
    });
    metricSelect.value = "";

    metricSelect.addEventListener("change", () => {
      currentMetric = metricSelect.value || null;
      updateChoropleth();
      clearCountryStats(false);
    });

    decadeSelect.innerHTML = "";
    const decadePlaceholder = document.createElement("option");
    decadePlaceholder.value = "";
    decadePlaceholder.disabled = true;
    decadePlaceholder.selected = true;
    decadePlaceholder.textContent = "Select decade";
    decadeSelect.appendChild(decadePlaceholder);

    decades.forEach((dec) => {
      const opt = document.createElement("option");
      opt.value = dec;
      opt.textContent = dec;
      decadeSelect.appendChild(opt);
    });
    decadeSelect.value = "";

    decadeSelect.addEventListener("change", () => {
      currentDecade = decadeSelect.value || null;
      updateChoropleth();
      clearCountryStats(false);
    });

    exploreReset.addEventListener("click", () => {
      metricSelect.value = "";
      decadeSelect.value = "";
      currentMetric = null;
      currentDecade = null;
      clearCountryStats(true, "Select a country to see its decade-average stats.");
      countriesLayer.selectAll("path.country").attr("fill", "#444f7a");
      if (legendMin && legendMax) {
        legendMin.textContent = "–";
        legendMax.textContent = "–";
      }
      if (legendBar) {
        legendBar.style.backgroundImage = "none";
      }
    });
  }

  function prettyMetricLabel(col) {
    let label = col.replace("average_value_", "");
    label = label.replace(
      " (% of primary school age children)",
      " (% of children)"
    );
    label = label.replace(
      " (births per 1,000 women ages 15-19)",
      " (per 1k women 15–19)"
    );
    return label;
  }

  function addDrag() {
    svg.call(
      d3
        .drag()
        .on("start", (event) => {
          isDragging = true;
          lastDragPos = [event.x, event.y];
          lastRotation = rotation.slice();
        })
        .on("drag", (event) => {
          const dx = event.x - lastDragPos[0];
          const dy = event.y - lastDragPos[1];
          rotation[0] = lastRotation[0] + dx * 0.4;
          rotation[1] = lastRotation[1] - dy * 0.4;
          projection.rotate(rotation);
          render();
        })
        .on("end", () => {
          isDragging = false;
        })
    );
  }

  function startRotation() {
    const velocity = 0.01;
    d3.timer(() => {
      if (!isDragging) {
        rotation[0] += velocity;
        projection.rotate(rotation);
        render();
      }
    });
  }

  function render() {
    svg.selectAll("path.water").attr("d", path);
    svg.selectAll("path.graticule").attr("d", path);
    countriesLayer.selectAll("path.country").attr("d", path);
  }

  // Get metric value for a given country and decade
  function getValue(countryName, decade, metric) {
    const byDec = dataByNameDecade.get(countryName);
    if (!byDec) return null;

    const rows = byDec.get(decade);
    if (!rows || !rows.length) return null;

    const vals = rows
      .map((r) => r[metric])
      .filter((v) => v != null && !isNaN(v));

    return vals.length ? d3.mean(vals) : null;
  }

  function updateChoropleth() {
    if (!countries.length || !currentMetric || !currentDecade) return;

    const vals = [];
    countries.forEach((d) => {
      const name = d.properties && d.properties.name;
      const v = getValue(name, currentDecade, currentMetric);
      if (v != null) vals.push(v);
    });

    if (!vals.length) return;

    const extent = d3.extent(vals);
    colorScale.domain(extent);

    countriesLayer
      .selectAll("path.country")
      .attr("fill", d => {
        const name = d.properties && d.properties.name;
        const v = getValue(name, currentDecade, currentMetric);
        return v == null ? "#444f7a" : colorScale(v);
      });

    const fmt = d3.format(".2f");
    legendMin.textContent = fmt(extent[0]);
    legendMax.textContent = fmt(extent[1]);

    const [minV, maxV] = extent;
    const stops = d3.range(7).map((i) => {
      const t = i / 6;
      const value = minV + t * (maxV - minV);
      return colorScale(value);
    });

    legendBar.style.backgroundImage = `linear-gradient(to right, ${stops.join(
      ","
    )})`;

    render();
  }

  // Click handler for showing stats
  function onCountryClick(feature) {
    const name =
      feature.properties && feature.properties.name
        ? feature.properties.name
        : "Unknown country";

    const byDec = dataByNameDecade.get(name);
    if (!byDec) {
      clearCountryStats(true, `No data for ${name} in ${currentDecade}.`);
      return;
    }

    const rows = byDec.get(currentDecade);
    if (!rows || !rows.length) {
      clearCountryStats(true, `No data for ${name} in ${currentDecade}.`);
      return;
    }

    const metricLabel = prettyMetricLabel(currentMetric);
    const vals = rows
      .map((r) => r[currentMetric])
      .filter((v) => v != null && !isNaN(v));

    if (!vals.length) {
      clearCountryStats(
        true,
        `No numeric values for ${metricLabel} in ${name}, ${currentDecade}.`
      );
      return;
    }

    const avg = d3.mean(vals);
    const min = d3.min(vals);
    const max = d3.max(vals);
    const years = Array.from(
      new Set(rows.map((r) => r.Year))
    ).sort((a, b) => a - b);

    const fmt = d3.format(".2f");

    countryStatsEl.classList.remove("country-stats--empty");
    countryStatsEl.innerHTML = `
      <div class="country-stats-header">
        <div class="country-stats-name">${name}</div>
        <div class="country-stats-decade">${currentDecade}</div>
      </div>

      <div class="country-stats-metric">${metricLabel}</div>

      <div class="country-stats-value-row">
        <span class="country-stats-label">Average:</span>
        <span class="country-stats-value">${fmt(avg)}</span>
      </div>

      <div class="country-stats-value-row">
        <span class="country-stats-label">Range:</span>
        <span class="country-stats-value">${fmt(min)} – ${fmt(
      max
    )}</span>
      </div>

    `;
  }

  function clearCountryStats(showPlaceholder = true, message = null) {
    if (!showPlaceholder) return;
    countryStatsEl.classList.add("country-stats--empty");
    countryStatsEl.innerHTML = `
      <p class="country-stats-placeholder">
        ${message || "Click on a country to see its decade-average stats."}
      </p>
    `;
  }
})();







