import { stateData, countyData, getCountyNameByFips, getStateNameByFips } from "../main.js";

import { showTooltip, hideTooltip, positionTooltip } from "../tooltip.js";

export async function createStackedAreaChart(d3, countyFip, stateFip) {
    let countyName = await getCountyNameByFips(d3, stateFip, countyFip)
    let stateName = await getStateNameByFips(stateFip)

    function aggregateDisastersByYear(data) {
        return data.reduce((acc, item) => {
            const year = new Date(item.DeclarationDate).getFullYear();
            acc[year] = acc[year] || new Set();
            acc[year].add(item.DisasterNumber);
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
        const margin = { top: 50, right: 0, bottom: 25, left: 20 }; // Increased for title

        const svg = d3.select("#stackedAreaChart")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", `0 0 ${width} ${height}`);

        // Add title with the correct format and style
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text(`Natural Disasters in ${countyName}, ${stateName} Since 1968`);

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

        //svg.on("mousemove", function (event) {
        //    const [mouseX] = d3.pointer(event);
        //    let estimatedYear = Math.round(x.invert(mouseX));

        //    // Find the closest available year in mergedData
        //    let yearData = mergedData.reduce((prev, curr) =>
        //        Math.abs(curr.year - estimatedYear) < Math.abs(prev.year - estimatedYear) ? curr : prev
        //    );

        //    if (yearData) {
        //        showTooltip(
        //            `<strong>Year:</strong> ${yearData.year}<br>
        //     <strong>State Disasters:</strong> ${yearData.state}<br>
        //     <strong>County Disasters:</strong> ${yearData.county}`,
        //            event
        //        );
        //    }
        //}).on("mouseout", function () {
        //    hideTooltip();
        //});

        // Append a vertical dashed line that will follow the hovered year
        svg.append("line")
            .attr("id", "hover-line")
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "5,5") // Dashed line
            .style("opacity", 0); // Initially hidden

        svg.on("mousemove", function (event) {
            const [mouseX] = d3.pointer(event);
            let estimatedYear = Math.round(x.invert(mouseX));

            // Find the closest available year in mergedData
            let yearData = mergedData.reduce((prev, curr) =>
                Math.abs(curr.year - estimatedYear) < Math.abs(prev.year - estimatedYear) ? curr : prev
            );

            if (yearData) {
                // Show and move the hover line
                d3.select("#hover-line")
                    .attr("x1", x(yearData.year))
                    .attr("x2", x(yearData.year))
                    .attr("y1", margin.top)
                    .attr("y2", height - margin.bottom)
                    .style("opacity", 1);

                // Update the tooltip
                showTooltip(
                    `<strong>Year:</strong> ${yearData.year}<br>
             <strong>State Disasters:</strong> ${yearData.state}<br>
             <strong>County Disasters:</strong> ${yearData.county}`,
                    event
                );
            }
        })
            .on("mouseout", function () {
                hideTooltip();
                d3.select("#hover-line").style("opacity", 0); // Hide the vertical line
            });



    }

    renderChart();
    window.addEventListener("resize", renderChart);
}