document.addEventListener("DOMContentLoaded", () => {
  const highContainer = document.getElementById("dual-highschool-chart");
  const uniContainer  = document.getElementById("dual-university-chart");
  if (!highContainer || !uniContainer || typeof d3 === "undefined") return;

  
  const regions = [
    "Africa",
    "Asia",
    "Middle East & North Africa",
    "Europe",
    "Latin America & the Caribbean",
    "Northern America",
    "Oceania"
  ];

  
  const gapsSecondary = [
    -7,  
     0,  
    -4,  
     0, 
     6,  
     0,  
     0   
  ];

  
  const gapsTertiary = [
    -3,  
    -1,  
     1,  
    11,  
    12,  
    28,  
    33   
  ];

  const dataSecondary = regions.map((name, i) => ({
    region: name,
    gap: gapsSecondary[i]
  }));

  const dataTertiary = regions.map((name, i) => ({
    region: name,
    gap: gapsTertiary[i]
  }));


  function renderHorizontalBars(container, data) {
    const containerWidth = container.clientWidth || 600;
    const width  = containerWidth;
    const height = 280;
    const margin = { top: 30, right: 180, bottom: 50, left: 210 };

    const svg = d3
      .select(container)
      .html("") 
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const innerWidth  = width  - margin.left - margin.right;
    const innerHeight = height - margin.top  - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const y = d3
      .scaleBand()
      .domain(data.map(d => d.region))
      .range([0, innerHeight])
      .padding(0.25);

    const maxAbsGap = d3.max(data, d => Math.abs(d.gap)) || 1;
    const x = d3
      .scaleLinear()
      .domain([0, maxAbsGap + 2])
      .range([0, innerWidth]);

    const yAxis = d3.axisLeft(y).tickSize(0);
    g.append("g")
      .attr("class", "dual-y-axis")
      .call(yAxis)
      .selectAll("text")
      .attr("dy", "0.35em");

    g.selectAll("path.domain").remove();

    g.append("g")
      .attr("class", "dual-x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(x)
          .ticks(4)
          .tickFormat(d => `${d}%`)
      )
      .call(axis => axis.select(".domain").remove());

    g.append("text")
      .attr("class", "dual-axis-title")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 36)
      .attr("text-anchor", "middle")
      .text("Size of gender gap (%)");

    const bars = g
      .selectAll(".dual-bar")
      .data(data)
      .join("g")
      .attr("class", "dual-bar")
      .attr("transform", d => `translate(0,${y(d.region)})`);

    
    bars
      .append("rect")
      .attr("height", y.bandwidth())
      .attr("width", d => x(Math.abs(d.gap)))
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("fill", d => (d.gap >= 0 ? "#ff8fc7" : "#7a96ff")); // pink = girls, blue = boys

    
    bars
      .append("text")
      .attr("x", d => x(Math.abs(d.gap)) + 8)
      .attr("y", y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("class", "dual-bar-label")
      .text(d => {
        const mag = Math.abs(d.gap);
        if (mag < 0.5) return "Similar enrollment";
        const who = d.gap >= 0 ? "girls" : "boys";
        return `${mag}% more ${who}`;
      });
  }

  renderHorizontalBars(highContainer, dataSecondary);
  renderHorizontalBars(uniContainer, dataTertiary);
});
