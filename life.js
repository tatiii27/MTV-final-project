import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const featuresList = {
 primary: {
 female:
 "average_value_Adjusted net enrollment rate, primary, female (% of primary school age children)",
 male:
 "average_value_Adjusted net enrollment rate, primary, male (% of primary school age children)",
 },
 secondary: {
 female: "average_value_School enrollment, secondary, female (% gross)",
 male: "average_value_School enrollment, secondary, male (% gross)",
 },
 tertiary: {
 female: "average_value_School enrollment, tertiary, female (% gross)",
 male: "average_value_School enrollment, tertiary, male (% gross)",
 },
 fertility: {
 both: "average_value_Fertility rate, total (births per woman)",
 },
 lifeexp: {
 female: "average_value_Life expectancy at birth, female (years)",
 male: "average_value_Life expectancy at birth, male (years)",
 },
 survival65: {
 female: "average_value_Survival to age 65, female (% of cohort)",
 male: "average_value_Survival to age 65, male (% of cohort)",
 },
};

const stages = [
 { id: "primary", label: "Primary School" },
 { id: "secondary", label: "Secondary School" },
 { id: "tertiary", label: "Higher Education" },
 { id: "family", label: "Family & Fertility" },
 { id: "longevity", label: "Long-term Health" },
];



let allData = [];
let currentRegion = null;
let currentYear = null;
let currentGender = null;
let currentStageIndex = 0;
let stageState = {};

const regionSelect = d3.select("#lp-region-select");
const yearSelect = d3.select("#lp-year-select");
const genderToggle = d3.select("#lp-gender-toggle");
const stageTrack = d3.select("#lp-stage-track");
const titleEl = d3.select("#lp-stage-title");
const textEl = d3.select("#lp-stage-text");
const miniChartContainer = d3.select("#lp-stage-mini-chart");
const prevBtn = d3.select("#lp-prev-stage");
const nextBtn = d3.select("#lp-next-stage");
const resetPathBtn = d3.select("#lp-reset-path");
const guessSection = d3.select("#lp-guess-section");
const guessInput = d3.select("#lp-guess-input");
const guessNumber = d3.select("#lp-guess-number");
const guessSubmit = d3.select("#lp-guess-submit");
const guessFeedback = d3.select("#lp-guess-feedback");
const guessStageLabel = d3.select("#lp-guess-stage-label");
const fertilityGuessIcons = d3.select("#fertility-guess-icons");
const MAX_BABIES = 10;


d3.csv("data/gender_regions_decades.csv", d3.autoType).then((data) => {
 allData = data.filter((d) => d.region && d.Year);

 initControls();
 initStageTrack();
resetStageState();

currentRegion = null;
currentYear = null;
updateStageView();
});


function initControls() {
 const regions = Array.from(new Set(allData.map((d) => d.region))).sort(
 d3.ascending
 );
 regionSelect.selectAll("*").remove();
 regionSelect
   .append("option")
   .attr("value", "")
   .attr("disabled", true)
   .attr("selected", true)
   .text("Select region");
 regionSelect
   .selectAll("option.region-opt")
   .data(regions)
   .join("option")
   .attr("class", "region-opt")
   .attr("value", (d) => d)
   .text((d) => d);
 regionSelect.property("selectedIndex", 0);


 const allYears = Array.from(new Set(allData.map((d) => d.Year))).sort(
 d3.ascending
 );
 const years = allYears.filter((y) => y >= 1970 && y <= 2010);

 yearSelect.selectAll("*").remove();
 yearSelect
   .append("option")
   .attr("value", "")
   .attr("disabled", true)
   .attr("selected", true)
   .text("Select year");
 yearSelect
  .selectAll("option.year-opt")
  .data(years)
  .join("option")
  .attr("class", "year-opt")
  .attr("value", (d) => d)
  .text((d) => `${d}-${d + 9}`);
 yearSelect.property("selectedIndex", 0);

regionSelect.on("change", () => {
 currentRegion = regionSelect.property("value") || null;
 resetStageState();
 updateStageView();
});

yearSelect.on("change", () => {
 const val = yearSelect.property("value");
 currentYear = val ? +val : null;
 resetStageState();
 updateStageView();
});

genderToggle.selectAll("button").on("click", function () {
 const btn = d3.select(this);
 currentGender = btn.attr("data-gender");
 genderToggle.selectAll("button").classed("active", false);
 btn.classed("active", true);
 genderToggle.attr("data-active", currentGender);
 resetStageState();
 updateStageView();
});

prevBtn.on("click", () => {
 if (currentStageIndex > 0) {
 currentStageIndex -= 1;
 updateStageView();
 }
});

nextBtn.on("click", () => {
 if (currentStageIndex < stages.length - 1) {
 currentStageIndex += 1;
 updateStageView();
 }
});

resetPathBtn.on("click", () => {
 currentRegion = null;
 currentYear = null;
 currentGender = null;
 // reset selects to placeholder option
 regionSelect.property("value", "");
 yearSelect.property("value", "");
 const regionNode = regionSelect.node();
 const yearNode = yearSelect.node();
 if (regionNode) regionNode.selectedIndex = 0;
 if (yearNode) yearNode.selectedIndex = 0;
 genderToggle.selectAll("button").classed("active", false);
 genderToggle.attr("data-active", "");
 currentStageIndex = 0;
 resetStageState();
 updateStageView();
});

// Guess submit
guessSubmit.on("click", () => {
  const stage = stages[currentStageIndex];
  const row = getCurrentRow();
  if (!row) return;
   const actual = getStageActualValue(stage.id, row);
   if (!isNumber(actual)) {
     guessFeedback.text("No data to check your guess here.");
     return;
   }
   const guessVal = +guessInput.property("value");
   if (!isNumber(guessVal)) return;

   const diff = Math.abs(guessVal - actual);
   
   // Enhanced emotional feedback
   let feedbackText = "";
   let isSuprising = false;
   
   if (diff > 30) {
     feedbackText = `🤯 Wow! You were off by ${diff.toFixed(0)} percentage points! `;
     feedbackText += actual > guessVal ? 
       `Reality is much better than you thought! The actual value is ${actual.toFixed(1)}%.` : 
       `The situation is worse than you imagined. The actual value is ${actual.toFixed(1)}%.`;
     isSuprising = true;
   } else if (diff < 5) {
     feedbackText = `🎯 Incredible! You were only ${diff.toFixed(0)} points off! The actual value is ${actual.toFixed(1)}%.`;
   } else if (diff < 15) {
     feedbackText = `Good estimate! You were ${diff.toFixed(0)} points off. The actual value is ${actual.toFixed(1)}%.`;
   } else {
     feedbackText = `You guessed ${guessVal.toFixed(0)}%, but the actual value is ${actual.toFixed(1)}%. That's a ${diff.toFixed(0)} point difference!`;
   }
   
   // Add context for emotional impact based on stage
   if (stage.id === "tertiary" && currentGender === "female") {
     const maleVal = getMetric(row, "tertiary", "male");
     if (actual > maleVal && actual > 50) {
       feedbackText += ` <strong>💪 Girls are now the MAJORITY in universities here!</strong>`;
       isSuprising = true;
     } else if (actual < maleVal && diff > 20) {
       feedbackText += ` <strong>There's still a significant gender gap favoring boys in higher education.</strong>`;
     }
   }
   
   if (stage.id === "secondary" && actual < 20) {
     feedbackText += ` <strong>😔 Less than 1 in 5 children attend secondary school here.</strong>`;
     isSuprising = true;
   }
   
   if (stage.id === "longevity" && actual < 60) {
     feedbackText += ` <strong>Life expectancy here is below 60 years - that's 20+ years less than developed countries.</strong>`;
     isSuprising = true;
   }
   
   // Apply the feedback with animation
   guessFeedback
     .html(feedbackText)
     .classed("surprise", isSuprising)
     .style("opacity", 0)
     .transition()
     .duration(300)
     .style("opacity", 1);

   stageState[stage.id] = { revealed: true, guess: guessVal, feedback: feedbackText };
   nextBtn.property("disabled", currentStageIndex === stages.length - 1 ? false : false);
   
   // Show comparison after the last stage
   if (currentStageIndex === stages.length - 1) {
     setTimeout(() => showPathComparison(), 1000);
   }
   
   updateStageView();
 });
}

function initStageTrack() {
 const nodes = stageTrack
.selectAll(".stage-node")
.data(stages)
.join("div")
.attr("class", "stage-node")
.on("click", (_, d) => {
   if (!getCurrentRow()) return;
   currentStageIndex = stages.findIndex((s) => s.id === d.id);
   updateStageView();
});

 nodes
 .append("div")
 .attr("class", "stage-node-circle")
 .text((d, i) => i + 1);

 nodes
 .append("div")
 .attr("class", "stage-node-label")
 .text((d) => d.label);
}

function resetStageState() {
 stageState = {};
 stages.forEach((s) => {
   stageState[s.id] = { revealed: false, guess: null, feedback: "" };
 });
}

function getCurrentRow() {
 if (!currentRegion || !currentYear) return null;
 return allData.find((d) => d.region === currentRegion && d.Year === currentYear);
}

function setGuessUI(stageId) {
  // ---------- FIRST: Handle fertility UI BEFORE anything else ----------
  if (stageId === "family") {
    // Hide slider + number input
    guessInput.style("display", "none");
    guessNumber.style("display", "none");

    // Clear slider values to prevent visual ghosting
    guessInput.property("value", "");
    guessNumber.property("value", "");

    // Show fertility baby selector
    fertilityGuessIcons.style("display", "flex");

    // Update feedback label
    guessStageLabel.text("Births per woman");

    buildFertilityGuessIcons(stageId);
    return;  // 🔥 STOP HERE — do NOT run slider logic
  }

  // ---------- OTHER STAGES USE SLIDER ----------
  fertilityGuessIcons.style("display", "none");  // hide the baby selector
  guessInput.style("display", null);
  guessNumber.style("display", null);

  // Normal slider setup
  const ranges = {
    primary: { min: 0, max: 100, step: 1, label: "Enrollment %" },
    secondary: { min: 0, max: 100, step: 1, label: "Enrollment %" },
    tertiary: { min: 0, max: 100, step: 1, label: "Enrollment %" },
    fertility: { min: 0, max: 15, step: 0.1, label: "Births per woman" },
    longevity: { min: 40, max: 90, step: 0.5, label: "Life expectancy (years)" },
  };

  const r = ranges[stageId] || { min: 0, max: 100, step: 1.0, label: "" };

  guessInput
    .attr("min", r.min)
    .attr("max", r.max)
    .attr("step", r.step);

  guessNumber
    .attr("min", r.min)
    .attr("max", r.max)
    .attr("step", r.step);

  const preset = stageState[stageId]?.guess;
  const startVal = isNumber(preset) ? preset : (r.min + r.max) / 2;

  guessInput.property("value", startVal);
  guessNumber.property("value", startVal);

  guessStageLabel.text(r.label);
  guessFeedback.text(stageState[stageId]?.feedback || "");

  const accent =
    currentGender === "male"
      ? "#7d8dff"
      : currentGender === "female"
      ? "#ff8fc2"
      : "#4a5368";

  guessInput.style("accent-color", accent);
  guessNumber.style("border-color", accent);
}



guessInput.on("input", function () {
 guessNumber.property("value", this.value);
});

guessNumber.on("input", function () {
 guessInput.property("value", this.value);
});

function buildFertilityGuessIcons(stageId) {
  fertilityGuessIcons.selectAll("*").remove();

  const currentVal = stageState[stageId]?.guess ?? 0;

  const babies = d3.range(MAX_BABIES).map(i => ({
    index: i,
    active: i < currentVal
  }));

  fertilityGuessIcons
    .selectAll("span.baby-icon")
    .data(babies)
    .join("span")
    .attr("class", "baby-icon")
    .classed("active", d => d.active)
    .html("👶")
    .on("click", (event, d) => {
      const selected = d.index + 1;

      // Update UI state
      fertilityGuessIcons
        .selectAll("span.baby-icon")
        .classed("active", b => b.index < selected);

      // Sync with existing guess system
      guessInput.property("value", selected);
      guessNumber.property("value", selected);

      stageState["fertility"].guess = selected;  

      // Live preview feedback text
      guessFeedback.text(`Selected: ${selected} children`);
    });
}


function updateStageView() {
 const stage = stages[currentStageIndex];
 const hasSelection = currentRegion && currentYear && currentGender;
 const row = hasSelection ? getCurrentRow() : null;
 const state = stageState[stage.id] || { revealed: false, feedback: "" };
 const guessVal = state.guess;
 if (hasSelection && row) {
   setGuessUI(stage.id);
 }
 guessSection.style("display", hasSelection && row ? null : "none");

 
 stageTrack.selectAll(".stage-node").classed("active", (d, i) => {
 return i === currentStageIndex;
 });

 stageTrack.selectAll(".stage-node").classed("completed", (d, i) => {
 return i < currentStageIndex;
 });

 
prevBtn.property("disabled", currentStageIndex === 0);
nextBtn.text(
currentStageIndex === stages.length - 1 ? "Finish ◀◀" : "Next stage ▶"
);
nextBtn.property(
  "disabled",
   (!state.revealed && currentStageIndex !== stages.length - 1) || !row
);

if (!row) {
 titleEl.text("Pick a path to begin");
 textEl.text(
   hasSelection
     ? "No data for this selection. Try a different region or year."
     : "Select a region, year, and gender to start guessing."
 );
 miniChartContainer.selectAll("*").remove();
 guessSection.style("display", "none");
 return;
}
 const genderLabel = currentGender === "female" ? "girl" : "boy";
 const otherGender = currentGender === "female" ? "male" : "female";
 const region = currentRegion;
 const year = currentYear;

 if (stage.id === "primary") {
 const valSelf = getMetric(row, "primary", currentGender);
 const valOther = getMetric(row, "primary", otherGender);

 titleEl.text("Stage 1 · Primary School");
 if (!state.revealed) {
   textEl.text("Guess the enrollment % for your path to reveal the data.");
   miniChartContainer.selectAll("*").remove();
   return;
 }
 if (isNumber(valSelf) && isNumber(valOther)) {
 const diff = valSelf - valOther;
 const word =
 Math.abs(diff) < 1
 ? "about the same chance"
 : diff > 0
 ? "a higher chance"
 : "a lower chance";
 
 textEl.text(
 `As a ${genderLabel} in ${region} in ${year}, you have about ${valSelf.toFixed(1)}% chance of being enrolled in primary school. 
 That’s ${word} than ${otherGender === "female" ? "girls" : "boys"}, who are at ${valOther.toFixed(1)}%.`
 );
 drawMiniBarChart({
   title: "Primary school enrollment",
   row,
   stageId: "primary",
   unit: "%",
   guess: guessVal,
 });
 } else {
 textEl.text(
 `We don’t have enough data about primary school enrollment in ${region} in ${year}. Try a different year or region.`
 );
 miniChartContainer.selectAll("*").remove();
 }
 } else if (stage.id === "secondary") {
 const valSelf = getMetric(row, "secondary", currentGender);
 const valOther = getMetric(row, "secondary", otherGender);

 titleEl.text("Stage 2 · Secondary School");
 if (!state.revealed) {
   textEl.text("Guess the enrollment % for your path to reveal the data.");
   miniChartContainer.selectAll("*").remove();
   return;
 }

 if (isNumber(valSelf) && isNumber(valOther)) {
 const diff = valSelf - valOther;
 const word =
 Math.abs(diff) < 1
 ? "about the same chance"
 : diff > 0
 ? "a better chance"
 : "a worse chance";
 textEl.text(
 `Moving into secondary school, ${genderLabel}s in ${region} in ${year} are enrolled at about ${valSelf.toFixed(1)}%. 
 That gives you ${word} of staying in school compared to ${otherGender === "female" ? "girls" : "boys"} (${valOther.toFixed(1)}%).`
 );
 drawMiniBarChart({
   title: "Secondary school enrollment",
   row,
   stageId: "secondary",
   unit: "%",
   guess: guessVal,
 });
 } else {
 textEl.text(
 `Secondary school data is patchy for this path, so we can’t say much about the gap here.`
 );
 miniChartContainer.selectAll("*").remove();
 }
 } else if (stage.id === "tertiary") {
 const valSelf = getMetric(row, "tertiary", currentGender);
 const valOther = getMetric(row, "tertiary", otherGender);

 titleEl.text("Stage 3 · Higher Education");
 if (!state.revealed) {
   textEl.text("Guess the enrollment % for your path to reveal the data.");
   miniChartContainer.selectAll("*").remove();
   return;
 }

 if (isNumber(valSelf) && isNumber(valOther)) {
 const diff = valSelf - valOther;
 const word =
 Math.abs(diff) < 1
 ? "about equally"
 : diff > 0
 ? "slightly more likely"
 : "less likely";
 
 textEl.text(
 `Only a smaller group reaches college or university. In ${region} in ${year}, around ${valSelf.toFixed(1)}% of ${genderLabel}s are 
 enrolled in tertiary education, while ${otherGender === "female" ? "girls" : "boys"} are at ${valOther.toFixed(1)}%. You’re ${word} to continue studying beyond secondary school.`
 );
 
 drawMiniBarChart({
   title: "Tertiary enrollment",
   row,
   stageId: "tertiary",
   unit: "%",
   guess: guessVal,
 });
 } else {
 textEl.text(
 `We’re missing tertiary enrollment data for this path, which already tells a story: many regions still don’t track (or provide) detailed higher-education data by gender.`
 );
 miniChartContainer.selectAll("*").remove();
 } 
 } else if (stage.id === "family") {
 const fert = getMetric(row, "fertility", "both");

 titleEl.text("Stage 4 · Family & Fertility");
 if (!state.revealed) {
   textEl.text("Guess the average births per woman to reveal the data.");
   miniChartContainer.selectAll("*").remove();
   return;
 }

 if (isNumber(fert)) {
 textEl.text(
`In ${region} in ${year}, families have about ${fert.toFixed(1)} children on average. 
This statistic is measured per woman, but it shapes daily life for everyone-how many siblings you might have, 
how soon people start families, and how easy it is to stay in school or work.`
);
drawFertilityChart({ fert, guess: guessVal });
 } else {
 textEl.text(
 `We don’t have solid fertility data for this path, so we skip this part of the story.`
 );
 miniChartContainer.selectAll("*").remove();
 }
 } else if (stage.id === "longevity") {
 const leSelf = getMetric(row, "lifeexp", currentGender);
 const leOther = getMetric(row, "lifeexp", otherGender);
 const survSelf = getMetric(row, "survival65", currentGender);
 const survOther = getMetric(row, "survival65", otherGender);

 titleEl.text("Stage 5 · Long-term Health");
 if (!state.revealed) {
   textEl.text("Guess the life expectancy to reveal the data.");
   miniChartContainer.selectAll("*").remove();
   return;
 }

 if (isNumber(leSelf) && isNumber(survSelf)) {
 let text = `By the end of the path, a typical ${genderLabel} in ${region} in ${year} can expect to live to about ${leSelf.toFixed(1)} years old. 
 Around ${survSelf.toFixed(1)}% make it to age 65.`;
 
 if (isNumber(leOther) && isNumber(survOther)) {
 const deltaLE = leSelf - leOther;
 const deltaSurv = survSelf - survOther;

 const leWord =
 Math.abs(deltaLE) < 0.4
 ? "about the same life expectancy"
 : deltaLE > 0
 ? "a slightly longer life"
 : "a slightly shorter life";
 
 text += ` Compared to ${
 otherGender === "female" ? "girls" : "boys"}, that means ${leWord} (they are at ${leOther.toFixed(1)} years and ${survOther.toFixed(1)}% reach 65).`;
} 

textEl.text(text);
drawLongevityChart({ leSelf, leOther, survSelf, survOther, gender: currentGender, guess: guessVal });
 } else {
 textEl.text(
 `Health and survival data aren’t available here, so we can’t close the story with life expectancy for this path.`
 );
 miniChartContainer.selectAll("*").remove();
 }
 }
}



function getMetric(row, stageId, gender) {
 const cols = featuresList[stageId];
 if (!cols) return null;

 if (gender === "both") {
 const col = cols.both;
 return row[col];
 }

 const colName = cols[gender];
 return row[colName];
}

function getStageActualValue(stageId, row) {
 switch (stageId) {
   case "primary":
   case "secondary":
   case "tertiary":
     return getMetric(row, stageId, currentGender);
   case "family":
     return getMetric(row, "fertility", "both");
   case "longevity":
     return getMetric(row, "lifeexp", currentGender);
   default:
     return null;
 }
}

function isNumber(v) {
 return v !== null && v !== undefined && !Number.isNaN(v);
}


function drawMiniBarChart({ title, row, stageId, unit, guess }) {
  miniChartContainer.selectAll("*").remove();

  const valFemale = getMetric(row, stageId, "female");
  const valMale = getMetric(row, stageId, "male");

  if (!isNumber(valFemale) || !isNumber(valMale)) return;

  const selfLabel = currentGender === "female" ? "Girls" : "Boys";
  const otherLabel = currentGender === "female" ? "Boys" : "Girls";
  const girlColor = "#ff8cbc";
  const boyColor = "#7e9cff";
  const guessColor = "#f7e8a4";
  const guessVal = isNumber(guess) ? guess : null;

  let data = [
    {
      label: selfLabel,
      value: selfLabel === "Girls" ? valFemale : valMale,
      type: "self",
    },
    {
      label: otherLabel,
      value: otherLabel === "Girls" ? valFemale : valMale,
      type: "other",
    },
  ];

  // 🔥 ALWAYS push guess LAST to ensure it draws on top
  if (isNumber(guessVal)) {
    data.push({
      label: "Your guess",
      value: guessVal,
      type: "guess",
    });
  }

  // --------------------------- -
  // SVG Setup
  // -----------------------------
  const containerWidth = miniChartContainer.node()
    ? miniChartContainer.node().getBoundingClientRect().width
    : 700;

  const width = Math.max(700, containerWidth);
  const height = 180;
  const margin = { top: 16, right: 25, bottom: 16, left: 50 };

  const svg = miniChartContainer
    .append("svg")
    .attr("width", "100%")
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`);

  // -----------------------------
  // Scales
  // -----------------------------
  const maxDomain = d3.max(data.map(d => d.value).filter(isNumber)) || 1;

  const x = d3.scaleLinear()
    .domain([0, maxDomain])
    .nice()
    .range([margin.left, width - margin.right]);

  const y = d3.scaleBand()
    .domain(data.map((d) => d.label))
    .range([margin.top, height - margin.bottom])
    .padding(0.3);

  svg.append("text")
    .attr("x", margin.left)
    .attr("y", 12)
    .attr("fill", "#555")
    .attr("font-size", 11)
    .text(title);

  const barHeight = y.bandwidth() * 0.62;
  const barYOffset = y.bandwidth() * 0.19;

  // -----------------------------
  // Color logic based only on type
  // -----------------------------
  function barColor(d) {
    if (d.type === "guess") return guessColor;
    if (d.type === "self") return selfLabel === "Girls" ? girlColor : boyColor;
    if (d.type === "other") return selfLabel === "Girls" ? boyColor : girlColor;
    return "#ccc";
  }

  // -----------------------------
  // Bars (drawn in order; guess last)
  // -----------------------------
  svg.append("g")
    .attr("class", "bars")
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("class", "bar")
    .attr("data-type", d => d.type)    // for debugging or CSS
    .attr("x", x(0))
    .attr("y", d => y(d.label) + barYOffset)
    .attr("height", barHeight)
    .attr("rx", 6)
    .attr("width", 0)
    .transition()
    .duration(700)
    .attr("fill", barColor)     // <-- put inside transition
    .attr("width", d => x(d.value) - x(0));


  // -----------------------------
  // Labels
  // -----------------------------
  svg.append("g")
    .selectAll("text.value-label")
    .data(data)
    .join("text")
    .attr("class", "value-label")
    .attr("x", (d) => x(d.value) + 4)
    .attr("y", (d) => y(d.label) + y.bandwidth() / 2 + 3)
    .attr("font-size", 11)
    .attr("fill", (d) => (d.type === "guess" ? "#0c0f1a" : "#444"))
    .text((d) => `${d.value.toFixed(1)}${unit}`);

  // -----------------------------
  // Y-axis
  // -----------------------------
  const yAxis = d3.axisLeft(y).tickSize(0);

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(yAxis)
    .call((g) => g.selectAll("text").attr("font-size", 11))
    .call((g) => g.select(".domain").remove());
}

function drawFertilityChart({ fert, guess }) {
  miniChartContainer.selectAll("*").remove();

  const guessVal = isNumber(guess) ? guess : null;

  // Build actual + guess rows
  let data = [
    { label: "Average", value: fert, type: "actual" }
  ];
  if (isNumber(guessVal)) {
    data.push({ label: "Your guess", value: guessVal, type: "guess" });
  }

  // Setup SVG
  const containerWidth = miniChartContainer.node()
    ? miniChartContainer.node().getBoundingClientRect().width
    : 700;

  const width = Math.max(700, containerWidth);
  const height = data.length * 95 + 40;   // dynamic height for multiple rows
  const margin = { top: 28, right: 40, bottom: 20, left: 110 };

  const svg = miniChartContainer
    .append("svg")
    .attr("width", "100%")
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`);

  svg.append("text")
    .attr("x", margin.left)
    .attr("y", 16)
    .attr("fill", "#ddd")
    .attr("font-size", 13)
    .text("Average number of children");

  // Positioning scale
  const y = d3.scaleBand()
    .domain(data.map(d => d.label))
    .range([margin.top, height - margin.bottom])
    .padding(0.45);

  // Icon parameters
  const iconSize = 42;         // ⭐ bigger babies
  const iconSpacing = 10;
  const babyIcon = "👶";       // full baby
  const partialIcon = "🍼";    // indicates fractional baby

  // Draw each row
  data.forEach((row) => {
    const full = Math.floor(row.value);
    const fraction = row.value - full;

    const yPos = y(row.label) + iconSize * 0.9;

    // Draw full babies
    for (let i = 0; i < full; i++) {
      svg.append("text")
        .attr("x", margin.left + i * (iconSize + iconSpacing))
        .attr("y", yPos)
        .attr("font-size", iconSize)
        .attr("data-type", row.type)
        .attr("fill", row.type === "guess" ? "#f7e8a4" : "#fdff87")
        .text(babyIcon);
    }

    // Draw fractional baby
    if (fraction > 0.05) {
      svg.append("text")
        .attr("x", margin.left + full * (iconSize + iconSpacing))
        .attr("y", yPos)
        .attr("font-size", iconSize * 0.85)
        .attr("opacity", 0.65)
        .attr("data-type", row.type)
        .attr("fill", row.type === "guess" ? "#f7e8a4" : "#fdff87")
        .text(partialIcon);
    }

    // ⭐ Label showing the number (always)
    const labelX =
      margin.left +
      (full + (fraction > 0 ? 1 : 0)) * (iconSize + iconSpacing) +
      18;

    svg.append("text")
      .attr("x", labelX)
      .attr("y", yPos - iconSize * 0.2)
      .attr("font-size", 15)
      .attr("font-weight", 500)
      .attr("fill", row.type === "guess" ? "#f7e8a4" : "#dfe6f1")
      .text(`${row.value.toFixed(1)} children`);
  });

  // Y-axis labels
  svg.append("g")
    .attr("transform", `translate(${margin.left - 15},0)`)
    .call(d3.axisLeft(y).tickSize(0))
    .call(g => g.selectAll("text")
      .attr("font-size", 14)
      .attr("fill", "#eef1f8")
    )
    .call(g => g.select(".domain").remove());
}



function drawLongevityChart({ leSelf, leOther, survSelf, survOther, gender, guess }) {
 miniChartContainer.selectAll("*").remove();

 const containerWidth = miniChartContainer.node()
   ? miniChartContainer.node().getBoundingClientRect().width
   : 700;
 const width = Math.max(700, containerWidth);
 const height = 200;
 const margin = { top: 16, right: 25, bottom: 16, left: 50 };

 const labelSelf = gender === "male" ? "Boys" : "Girls";
 const labelOther = gender === "male" ? "Girls" : "Boys";
 const girlColor = "#ff8cbc";
 const boyColor = "#7e9cff";
 const guessColor = "#f7e8a4";
 const guessVal = isNumber(guess) ? guess : null;

 const data = [
   {
     label: labelSelf,
     lifeExp: isNumber(leSelf) ? leSelf : 0,
     hasLife: isNumber(leSelf),
     survival: isNumber(survSelf) ? survSelf : null,
     type: "self",
   },
   {
     label: labelOther,
     lifeExp: isNumber(leOther) ? leOther : 0,
     hasLife: isNumber(leOther),
     survival: isNumber(survOther) ? survOther : null,
     type: "other",
   },
 ];
 if (isNumber(guessVal)) {
   data.push({
     label: "Your guess",
     lifeExp: guessVal,
     hasLife: true,
     survival: null,
     type: "guess",
   });
 }

 if (!data.some((d) => d.hasLife)) {
   return;
 }

 const svg = miniChartContainer
   .append("svg")
   .attr("width", "100%")
   .attr("height", height)
   .attr("viewBox", `0 0 ${width} ${height}`);

 svg
  .append("text")
  .attr("x", margin.left)
  .attr("y", 12)
  .attr("fill", "#555")
  .attr("font-size", 11)
  .text("Life expectancy (bars, years) & survival to 65 (dot, %)");

 const genders = data.map((d) => d.label);
 const maxLife =
   d3.max([guessVal, ...data.map((d) => d.lifeExp).filter(isNumber)]) || 90;

 const x = d3
   .scaleLinear()
  .domain([40, Math.max(40, maxLife)])
   .nice()
   .range([margin.left, width - margin.right]);

  const y = d3
    .scaleBand()
    .domain(genders)
    .range([margin.top + 22, height - margin.bottom])
    .padding(0.4);
 const barHeightLon = y.bandwidth() * 0.62;
 const barYOffsetLon = y.bandwidth() * 0.19;

 svg
   .selectAll("rect.life-bar")
   .data(data)
   .join("rect")
   .attr("class", "life-bar")
   .attr("data-type", d => d.type)  
   .attr("x", x(40))
   .attr("y", (d) => y(d.label) + barYOffsetLon)
   .attr("height", barHeightLon)
   .attr("width", 0)
   .attr("rx", 6)
   .attr("fill", (d) =>
     d.type === "guess"
       ? guessColor
       : d.label === "Girls"
       ? girlColor
       : boyColor
   )
   .transition()
   .duration(700)
   .attr("width", (d) => x(d.lifeExp) - x(40));

 svg
   .selectAll("text.life-label")
   .data(data)
   .join("text")
   .attr("class", "life-label")
   .attr("x", (d) => x(d.lifeExp) + 4)
   .attr("y", (d) => y(d.label) + y.bandwidth() / 2 + 4)
   .attr("font-size", 10.5)
   .attr("fill", (d) => (d.type === "guess" ? "#0c0f1a" : "#333"))
   .text((d) => `${d.lifeExp.toFixed(1)} yrs`);

 const survScale = d3
   .scaleLinear()
   .domain([0, 100])
   .range([margin.left, width - margin.right]);

  svg
    .append("g")
    .attr("transform", `translate(0,${margin.top + 18})`)
    .call(d3.axisTop(survScale).ticks(5).tickFormat((d) => `${d}%`))
    .call((g) =>
      g
        .selectAll("text")
        .attr("font-size", 10)
       .attr("fill", "#4a4a4a")
   )
   .call((g) => g.select(".domain").attr("stroke", "#aaa"));

 svg
   .selectAll("circle.surv-dot")
   .data(data.filter((d) => d.type !== "guess" && isNumber(d.survival)))
   .join("circle")
   .attr("class", "surv-dot")
   .attr("cx", (d) => survScale(d.survival))
   .attr("cy", (d) => y(d.label) + y.bandwidth() / 2)
   .attr("r", 0)
   .attr("fill", "#3c8f5d")
   .attr("stroke", "#fff")
   .attr("stroke-width", 1.5)
   .transition()
   .delay(400)
   .duration(400)
   .attr("r", 5);

 svg
   .append("g")
   .attr("transform", `translate(0,${height - margin.bottom})`)
   .call(d3.axisBottom(x).ticks(4).tickFormat((d) => `${d} yrs`))
   .call((g) =>
     g
       .selectAll("text")
       .attr("font-size", 10)
       .attr("fill", "#666")
   )
   .call((g) => g.select(".domain").attr("stroke", "#aaa"));

 svg
   .append("g")
   .attr("transform", `translate(${margin.left},0)`)
   .call(d3.axisLeft(y).tickSize(0))
   .call((g) =>
     g
       .selectAll("text")
       .attr("font-size", 11)
       .attr("fill", "#444")
   )
   .call((g) => g.select(".domain").remove());
}

// New function to show path comparison
function showPathComparison() {
  const comparisons = {
    "Africa": { 
      better: [],
      worse: ["Europe", "Northern America", "Latin America & the Caribbean", "Oceania"],
      message: "Your African path faces more educational challenges than most other regions, but progress is happening."
    },
    "Asia": {
      better: ["Africa"],
      worse: ["Europe", "Northern America", "Oceania"],
      message: "Your Asian path has seen dramatic improvements, especially in closing gender gaps."
    },
    "Middle East & North Africa": {
      better: ["Africa", "Asia"],
      worse: ["Europe", "Northern America"],
      message: "Your Middle Eastern path shows rapid progress, with women now leading in university enrollment."
    },
    "Europe": {
      better: ["Africa", "Asia", "Middle East & North Africa", "Latin America & the Caribbean"],
      worse: ["Northern America"],
      message: "Your European path has strong education access, with women dominating higher education."
    },
    "Latin America & the Caribbean": {
      better: ["Africa", "Asia", "Middle East & North Africa"],
      worse: ["Europe", "Northern America", "Oceania"],
      message: "Your Latin American path shows girls overtaking boys in both secondary and tertiary education."
    },
    "Northern America": {
      better: ["Africa", "Asia", "Middle East & North Africa", "Latin America & the Caribbean", "Europe"],
      worse: [],
      message: "Your North American path has the highest education access globally, with women far exceeding men in universities."
    },
    "Oceania": {
      better: ["Africa", "Asia", "Middle East & North Africa"],
      worse: [],
      message: "Your Oceanic path shows the strongest female advantage in university enrollment worldwide."
    }
  };
  
  const comp = comparisons[currentRegion];
  if (!comp) return;
  
  const compSection = d3.select("#path-comparison");
  compSection.style("display", "block");
  
  const comparisonHTML = `
    <div class="path-comparison">
      <h3>How your ${currentRegion} path compares to others</h3>
      <p>${comp.message}</p>
      <div class="comparison-bars">
        ${comp.better.map(r => `<div class="better">Better than ${r}: Your path had more opportunities</div>`).join('')}
        ${comp.worse.map(r => `<div class="worse">Behind ${r}: They had better opportunities</div>`).join('')}
      </div>
    </div>
  `;
  
  compSection.html(comparisonHTML)
    .style("opacity", 0)
    .transition()
    .duration(500)
    .style("opacity", 1);
}
