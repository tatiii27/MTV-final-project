// storyChart.js

const storyData = {
  africa: {
    "1960s": {
      secondary: { girls: 11, boys: 16 },
      tertiary: { girls: 1, boys: 2 },
    },
    "2010s": {
      secondary: { girls: 39, boys: 46 },
      tertiary: { girls: 7.5, boys: 10 },
    },
  },
  asia: {
    "1960s": {
      secondary: { girls: 13, boys: 32 },
      tertiary: { girls: 2, boys: 7 },
    },
    "2010s": {
      secondary: { girls: 66, boys: 66 },
      tertiary: { girls: 21, boys: 22 },
    },
  },
  mena: {
    "1960s": {
      secondary: { girls: 18, boys: 35 },
      tertiary: { girls: 4, boys: 8 },
    },
    "2010s": {
      secondary: { girls: 77, boys: 81 },
      tertiary: { girls: 38, boys: 37 },
    },
  },
  europe: {
    "1960s": {
      secondary: { girls: 80, boys: 83 },
      tertiary: { girls: 24, boys: 25 },
    },
    "2010s": {
      secondary: { girls: 100, boys: 100 },
      tertiary: { girls: 72, boys: 61 },
    },
  },
  latam: {
    "1960s": {
      secondary: { girls: 27, boys: 29 },
      tertiary: { girls: 5, boys: 9 },
    },
    "2010s": {
      secondary: { girls: 97, boys: 91 },
      tertiary: { girls: 54, boys: 42 },
    },
  },
  na: {
    "1960s": {
      tertiary: { girls: 39, boys: 56 },
    },
    "2010s": {
      secondary: { girls: 99, boys: 99 },
      tertiary: { girls: 102, boys: 74 },
    },
  },
  oceania: {
    "1960s": {
      secondary: { girls: 76, boys: 77 },
      tertiary: { girls: 12, boys: 20 },
    },
    "2010s": {
      secondary: { girls: 125, boys: 125 },
      tertiary: { girls: 111, boys: 78 },
    },
  },
};

document.addEventListener("DOMContentLoaded", () => {
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "story-tooltip")
    .style("position", "fixed")
    .style("pointer-events", "none")
    .style("padding", "6px 10px")
    .style("border-radius", "8px")
    .style("background", "rgba(15,23,42,0.95)")
    .style("color", "#f9fafb")
    .style("font-size", "12px")
    .style("line-height", "1.4")
    .style("opacity", 0);

  const maxPercent = 130; // cover 125% cases

  const steps = document.querySelectorAll(".region-step");
  steps.forEach((step) => {
    const regionKey = step.dataset.region;
    const regionObj = storyData[regionKey];
    if (!regionObj) return;

    const periodEls = step.querySelectorAll(".region-period");
    periodEls.forEach((periodEl) => {
      const periodKey = periodEl.dataset.period;
      const metrics = regionObj[periodKey];
      if (!metrics) return;

      const container = periodEl.querySelector(".mini-chart");
      drawMiniChart(container, metrics, maxPercent, tooltip);
    });
  });
});

function drawMiniChart(containerEl, metricsObj, maxPercent, tooltip) {
  const metricNames = Object.keys(metricsObj);
  if (!metricNames.length) return;

  // Full labels with parentheses
  const metricLabelFull = {
    secondary: "High school (secondary)",
    tertiary: "University / college (tertiary)",
  };

  // --- layout ---
  const width = 440;           // wider chart
  const labelCol = 190;        // reserved space for text labels
  const rightMargin = 20;
  const chartWidth = width - labelCol - rightMargin;

  const barHeight = 10;
  const rowGap = 42;           // more vertical breathing room

  const topMargin = 10;
  const bottomMargin = 60;     // room for axis + annotation
  const height = topMargin + metricNames.length * rowGap + bottomMargin;

  const svg = d3
    .select(containerEl)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const gRoot = svg.append("g").attr("transform", `translate(0,${topMargin})`);

  const x = d3.scaleLinear().domain([0, maxPercent]).range([0, chartWidth]);

  // One group per metric (row)
  const rows = gRoot
    .selectAll(".metric-row")
    .data(metricNames)
    .enter()
    .append("g")
    .attr("class", "metric-row")
    .attr("transform", (d, i) => `translate(0,${i * rowGap})`);

  // Left labels – sit in their own column, no overlap with bars
  rows
    .append("text")
    .attr("class", "metric-label")
    .attr("x", labelCol - 8)
    .attr("y", barHeight + 4)
    .attr("text-anchor", "end")
    .attr("dominant-baseline", "middle")
    .text((d) => metricLabelFull[d] || d);

  function tooltipHtml(key) {
    const m = metricsObj[key];
    const girls = m.girls;
    const boys = m.boys;
    const diff = girls - boys;
    const gap = Math.abs(diff);

    let aheadText;
    if (gap < 5) {
      aheadText = "Similar enrollment for girls and boys";
    } else {
      const rounded = Math.round(gap);
      aheadText =
        diff > 0
          ? `${rounded}% more girls enrolled`
          : `${rounded}% more boys enrolled`;
    }

    const niceName = metricLabelFull[key] || key;

    return `
      <strong>${niceName}</strong><br>
      Girls: ${girls.toFixed(1)}%<br>
      Boys: ${boys.toFixed(1)}%<br>
      <span style="color:#e5e7eb">${aheadText}</span>
    `;
  }

  // GIRLS bars
  rows
    .append("rect")
    .attr("class", "bar-girls")
    .attr("x", labelCol)
    .attr("y", 0)
    .attr("height", barHeight)
    .attr("width", 0)
    .attr("rx", 4)
    .on("mouseenter", (event, key) => {
      tooltip.style("opacity", 1).html(tooltipHtml(key));
    })
    .on("mousemove", (event) => {
      tooltip
        .style("left", event.clientX + 16 + "px")
        .style("top", event.clientY - 20 + "px");
    })
    .on("mouseleave", () => tooltip.style("opacity", 0))
    .transition()
    .duration(900)
    .attr("width", (key) => x(metricsObj[key].girls));

  // BOYS bars
  rows
    .append("rect")
    .attr("class", "bar-boys")
    .attr("x", labelCol)
    .attr("y", barHeight + 4)
    .attr("height", barHeight)
    .attr("width", 0)
    .attr("rx", 4)
    .on("mouseenter", (event, key) => {
      tooltip.style("opacity", 1).html(tooltipHtml(key));
    })
    .on("mousemove", (event) => {
      tooltip
        .style("left", event.clientX + 16 + "px")
        .style("top", event.clientY - 20 + "px");
    })
    .on("mouseleave", () => tooltip.style("opacity", 0))
    .transition()
    .delay(200)
    .duration(900)
    .attr("width", (key) => x(metricsObj[key].boys));

  // --- axis under bars ---
  const axisY = metricNames.length * rowGap + 14;

  // axis line
  gRoot
    .append("line")
    .attr("x1", labelCol)
    .attr("x2", labelCol + chartWidth)
    .attr("y1", axisY)
    .attr("y2", axisY)
    .attr("stroke", "rgba(148,163,184,0.5)")
    .attr("stroke-width", 0.7);

  // ticks 0,50,100
  const tickValues = [0, 50, 100];
  gRoot
    .selectAll(".mini-tick")
    .data(tickValues)
    .enter()
    .append("text")
    .attr("class", "mini-axis-tick")
    .attr("x", (d) => labelCol + x(d))
    .attr("y", axisY + 16)
    .attr("text-anchor", (d) =>
      d === 0 ? "start" : d === 100 ? "end" : "middle"
    )
    .attr("dominant-baseline", "hanging")
    .text((d) => `${d}%`);

  // axis label
  gRoot
    .append("text")
    .attr("class", "mini-axis-label")
    .attr("x", labelCol + chartWidth / 2)
    .attr("y", axisY + 32)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "hanging")
    .text("Share of kids enrolled (%)");

  // --- centered annotation under the bars ---
  let largestMetric = null;
  let largestDiff = 0;

  metricNames.forEach((key) => {
    const m = metricsObj[key];
    if (!m) return;
    const diff = m.girls - m.boys;
    if (Math.abs(diff) > Math.abs(largestDiff)) {
      largestDiff = diff;
      largestMetric = key;
    }
  });

  if (largestMetric != null) {
    const gap = Math.abs(largestDiff);
    let annotationText;

    if (gap < 5) {
      annotationText = "Similar enrollment for girls and boys.";
    } else {
      const rounded = Math.round(gap);
      const label = metricLabelFull[largestMetric] || largestMetric;
      annotationText =
        largestDiff > 0
          ? `${rounded}% more girls in ${label}.`
          : `${rounded}% more boys in ${label}.`;
    }

    gRoot
      .append("text")
      .attr("class", "story-annotation")
      .attr("x", labelCol + chartWidth / 2)
      .attr("y", axisY - 8)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "alphabetic")
      .text(annotationText);
  }
}
