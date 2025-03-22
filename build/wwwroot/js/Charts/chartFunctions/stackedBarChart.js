import { getAverageDisastersPerMonth } from "../script.js";
import { getAverageCountyDisastersPerMonth } from "../script.js";
import { getStateAbbreviationByFips } from "../script.js";
import { getCountyNameByFips } from "../script.js";

export function createStackedBarChart(d3, fipsStateCode, fipsCountyCode) {
    function renderChart() {
        const container = d3.select("#stackedBarChart");
        if (container.empty()) return;

        container.html("");

        const scaleFactor = 0.8;
        const width = container.node().clientWidth * scaleFactor;
        const height = container.node().clientHeight * scaleFactor;

        const svg = container.append("svg")
            .attr("width", container.node().clientWidth)
            .attr("height", container.node().clientHeight)
            .append("g")
            .attr("transform", `translate(${(container.node().clientWidth - width) / 2}, ${(container.node().clientHeight - height) / 2})`);

        const stateData = Object.entries(getAverageDisastersPerMonth(fipsStateCode))
            .map(([month, average]) => ({ month, average: +average, type: 'State' }));

        const countyData = Object.entries(getAverageCountyDisastersPerMonth(fipsStateCode, fipsCountyCode))
            .map(([month, average]) => ({ month, average: +average, type: 'County' }));

        const data = [...stateData, ...countyData].sort((a, b) => +a.month - +b.month);

        const xScale = d3.scaleBand()
            .domain([...new Set(data.map(d => d.month))])
            .range([0, width])
            .padding(0.2);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.average)])
            .nice()
            .range([height, 0]);

        const colorScale = d3.scaleOrdinal()
            .domain(['State', 'County'])
            .range(['purple', '#00BFFF']);

        // Tooltip setup
        const tooltip = d3.select("body").append("div")
            .style("position", "absolute")
            .style("background", "#fff")
            .style("padding", "5px 10px")
            .style("border", "1px solid #ddd")
            .style("border-radius", "5px")
            .style("box-shadow", "0px 0px 5px rgba(0,0,0,0.3)")
            .style("pointer-events", "none")
            .style("display", "none");

        // Bars
        svg.selectAll("rect")
            .data(data)
            .enter().append("rect")
            .attr("x", d => xScale(d.month) + (d.type === 'County' ? xScale.bandwidth() / 2 : 0))
            .attr("y", d => yScale(d.average))
            .attr("width", xScale.bandwidth() / 2)
            .attr("height", d => height - yScale(d.average))
            .attr("fill", d => colorScale(d.type))
            .on("mouseover", async function (event, d) {
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const name = d.type === 'State' ? getStateAbbreviationByFips(fipsStateCode) : await getCountyNameByFips(fipsStateCode, fipsCountyCode);
                tooltip.style("display", "block")
                    .html(`<strong>${name}</strong><br>Avg Disasters/Year: ${d.average}`)
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 10}px`);
            })
            .on("mousemove", function (event) {
                tooltip.style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 10}px`);
            })
            .on("mouseout", function () {
                tooltip.style("display", "none");
            });

        // X Axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickFormat(d => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+d - 1]))
            .selectAll("text")
            .style("font-size", "12px")
            .attr("text-anchor", "middle");

        // Y Axis
        svg.append("g")
            .call(d3.axisLeft(yScale).ticks(10));

        // Title
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text(`Avg Natural Disasters By Month in ${getStateAbbreviationByFips(fipsStateCode)}`);

        // Legend (closer to the top-right corner)
        const legend = svg.append("g")
            .attr("transform", `translate(${width - 20}, 10)`);

        legend.append("rect")
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", "purple");

        legend.append("text")
            .attr("x", 16)
            .attr("y", 10)
            .style("font-size", "12px")
            .text("State");

        legend.append("rect")
            .attr("y", 18)
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", "#00BFFF");

        legend.append("text")
            .attr("x", 16)
            .attr("y", 28)
            .style("font-size", "12px")
            .text("County");
    }

    renderChart();
    window.addEventListener("resize", renderChart);
}
