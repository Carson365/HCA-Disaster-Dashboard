import { stateData, countyData } from "../main.js";

export async function createPieChart(d3, fipsStateCode, fipsCountyCode = null) {
    function filterDisasters(data, stateCode, countyCode = null) {
        return data
            .filter(d => d.FIPSStateCode === stateCode && (!countyCode || d.FIPSCountyCode === countyCode))
            .reduce((acc, item) => {
                if (!acc.has(item.DisasterNumber)) {
                    acc.set(item.DisasterNumber, item.IncidentType); // Count only unique DisasterNumbers
                }
                return acc;
            }, new Map());
    }

    const disasterMap = fipsCountyCode
        ? filterDisasters(countyData, fipsStateCode, fipsCountyCode)
        : filterDisasters(stateData, fipsStateCode);

    const disasterCounts = Array.from(disasterMap.values()).reduce((acc, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});

    const dataEntries = Object.entries(disasterCounts).map(([type, count]) => ({ type, count }));
    const totalDisasters = dataEntries.reduce((sum, d) => sum + d.count, 0);
    const containerId = fipsCountyCode ? "#countyPieChart" : "#statePieChart";

    function renderChart() {
        const container = d3.select(containerId);
        container.selectAll("*").remove();

        const width = container.node().clientWidth * 0.9;
        const height = container.node().clientHeight * 0.9;
        const radius = Math.min(width, height) / 2.5;

        const svg = container.append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${width / 2}, ${height / 2})`);

        const pie = d3.pie().value(d => d.count);
        const pieData = pie(dataEntries);

        const arc = d3.arc().innerRadius(0).outerRadius(radius);
        const color = d3.scaleOrdinal(d3.schemeCategory10);

        const tooltip = d3.select("body").append("div")
            .attr("id", "tooltip")
            .style("position", "absolute")
            .style("background", "#fff")
            .style("padding", "5px 10px")
            .style("border", "1px solid #ddd")
            .style("border-radius", "5px")
            .style("box-shadow", "0px 0px 5px rgba(0,0,0,0.3)")
            .style("pointer-events", "none")
            .style("opacity", 0);

        svg.selectAll("path")
            .data(pieData)
            .enter().append("path")
            .attr("d", arc)
            .attr("fill", d => color(d.data.type))
            .attr("stroke", "white")
            .style("stroke-width", "2px")
            .on("mouseover", function (event, d) {
                const percentage = ((d.data.count / totalDisasters) * 100).toFixed(2);
                tooltip.style("opacity", 1)
                    .html(`<strong>${d.data.type}</strong><br>${percentage}%`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY + 10) + "px");

                d3.select(this).style("opacity", 0.7);
            })
            .on("mousemove", function (event) {
                tooltip.style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY + 10) + "px");
            })
            .on("mouseout", function () {
                tooltip.style("opacity", 0);
                d3.select(this).style("opacity", 1);
            });
    }

    renderChart();
    window.addEventListener("resize", renderChart);
}
