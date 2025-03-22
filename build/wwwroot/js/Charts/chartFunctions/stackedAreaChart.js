import { stateData, countyData } from "../main.js";

export async function createStackedAreaChart(d3) {
    function aggregateDisastersByYear(data) {
        return data.reduce((acc, item) => {
            const year = new Date(item.DeclarationDate).getFullYear();
            acc[year] = acc[year] || new Set();
            acc[year].add(item.DisasterNumber); // Use DisasterNumber instead of ID
            return acc;
        }, {});
    }


    const rawStateData = aggregateDisastersByYear(stateData);
    const aggregatedStateData = Object.fromEntries(
        Object.entries(rawStateData).map(([year, ids]) => [year, ids.size])
    );

    const rawCountyData = aggregateDisastersByYear(countyData);
    const aggregatedCountyData = Object.fromEntries(
        Object.entries(rawCountyData).map(([year, ids]) => [year, ids.size])
    );

    const allYears = [...new Set([...Object.keys(aggregatedStateData), ...Object.keys(aggregatedCountyData)].map(Number))].sort((a, b) => a - b);

    const mergedData = allYears.map(year => ({
        year,
        state: aggregatedStateData[year] || 0,
        county: aggregatedCountyData[year] || 0
    }));

    function renderChart() {
        d3.select("#stackedAreaChart").selectAll("*").remove();

        const container = document.getElementById("stackedAreaChart");
        const width = container.clientWidth * 0.9;
        const height = container.clientHeight * 0.9;
        const margin = { top: 25, right: 0, bottom: 25, left: 20 };

        const svg = d3.select("#stackedAreaChart")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", `0 0 ${width} ${height}`);

        const x = d3.scaleLinear()
            .domain(d3.extent(mergedData, d => d.year))
            .range([margin.left, width - margin.right]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(mergedData, d => d.state + d.county)])
            .range([height - margin.bottom, margin.top]);

        const stack = d3.stack().keys(["county", "state"]);
        const stackedData = stack(mergedData);

        const area = d3.area()
            .x(d => x(d.data.year))
            .y0(d => y(d[0]))
            .y1(d => y(d[1]));

        svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).tickFormat(d3.format("d")));

        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y));

        svg.selectAll(".area")
            .data(stackedData)
            .enter().append("path")
            .attr("fill", (d, i) => i === 0 ? "#98C9E8" : "#2E8B57")
            .attr("d", area);

        const legend = svg.append("g").attr("transform", `translate(${width - 120}, 20)`);
        ["State", "County"].forEach((name, i) => {
            legend.append("rect").attr("x", 0).attr("y", i * 20).attr("width", 15).attr("height", 15).attr("fill", i === 0 ? "#2E8B57" : "#98C9E8");
            legend.append("text").attr("x", 20).attr("y", i * 20 + 12).text(name).style("font-size", "12px");
        });

        const tooltip = d3.select("#stackedAreaChart")
            .append("div")
            .attr("id", "tooltip")
            .style("position", "absolute")
            .style("background", "white")
            .style("border", "1px solid black")
            .style("padding", "5px")
            .style("border-radius", "5px")
            .style("font-size", "12px")
            .style("display", "none");

        svg.on("mousemove", function (event) {
            const [mouseX] = d3.pointer(event);
            const closestYear = Math.round(x.invert(mouseX));
            const yearData = mergedData.find(d => d.year === closestYear);

            if (yearData) {
                tooltip.style("display", "block")
                    .html(`<strong>Year:</strong> ${closestYear}<br>
                           <strong>State Disasters:</strong> ${yearData.state}<br>
                           <strong>County Disasters:</strong> ${yearData.county}`)
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 20}px`);
            }
        });

        svg.on("mouseout", function () {
            tooltip.style("display", "none");
        });
    }

    renderChart();
    window.addEventListener("resize", renderChart);
}
