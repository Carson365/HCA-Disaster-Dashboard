import { stateData, getCountyNameByFips } from "../main.js";
import { showTooltip, hideTooltip, positionTooltip } from "../tooltip.js";

export async function createDamageStackedBarChart(d3, fipsStateCode) {

    // Aggregate data for all counties in the state by FIPS code
    const countyDamageMap = new Map();

    let localStateData = JSON.parse(JSON.stringify(stateData)); // Deep copy to avoid mutation

    localStateData
        .filter(d => d.FIPSStateCode === fipsStateCode && d.FIPSCountyCode !== "000")
        .forEach(d => {
            if (!countyDamageMap.has(d.FIPSCountyCode)) {
                countyDamageMap.set(d.FIPSCountyCode, { county: d.FIPSCountyCode, damages: {}, total: 0 });
            }
            const countyEntry = countyDamageMap.get(d.FIPSCountyCode);

            d.Damages.forEach(damage => {
                if (damage.DamageCategory !== "N/A" && damage.DamageCategory !== "Unknown") {
                    const category = damage.DamageCategory;
                    const numProperties = Number(damage.NumberOfProperties);
                    if (!isNaN(numProperties) && numProperties > 0) {
                        countyEntry.damages[category] = (countyEntry.damages[category] || 0) + numProperties;
                        countyEntry.total += numProperties;
                    }
                }
            });
        });

    // Build processed data array that uses FIPS codes (not names)
    let processedData = [...countyDamageMap.values()];

    // Build a mapping from FIPS to county name
    const countyNameMap = {};
    await Promise.all(processedData.map(async entry => {
        countyNameMap[entry.county] = await getCountyNameByFips(entry.county);
    }));

    const categories = new Set();
    processedData = processedData.map(countyEntry => {
        Object.keys(countyEntry.damages).forEach(cat => categories.add(cat));
        return { county: countyEntry.county, total: countyEntry.total, ...countyEntry.damages };
    });

    // Sort data by total properties affected, descending
    processedData.sort((a, b) => b.total - a.total);

    // Function to extract the numeric portion from category labels
    function extractNumber(category) {
        const match = category.match(/\d+/); // Find the first number in the string
        return match ? parseInt(match[0], 10) : Infinity; // Default to Infinity if not found
    }

    // Sort categories numerically based on extracted numbers
    const categoryList = Array.from(categories).sort((a, b) => extractNumber(a) - extractNumber(b));

    function renderChart() {
        const container = document.getElementById("stateDamageBarChart");
        if (!container) return;

        // Use 95% of container dimensions
        const containerWidth = container.clientWidth * 0.95;
        const containerHeight = container.clientHeight * 0.95;

        // Initial margin settings
        let margin = { top: 50, right: 30, bottom: 30, left: 120 };

        // Compute available height
        const height = containerHeight - margin.top - margin.bottom;
        // Determine the y scale using the current left margin (we don't need left margin here but width is affected later)
        let y = d3.scaleBand()
            .domain(processedData.map(d => d.county))
            .range([0, height])
            .padding(0.1);

        // Set a threshold for label visibility based on band height (adjust as needed)
        const labelThreshold = 7;
        let showLabels = true;
        if (y.bandwidth() < labelThreshold) {
            showLabels = false;
            // Reduce left margin to shift the chart left
            margin.left = 20;
        }

        // With the (possibly adjusted) margin, compute the width
        const width = containerWidth - margin.left - margin.right;

        // Remove any existing SVG
        d3.select("#stateDamageBarChart svg").remove();

        const svg = d3.select("#stateDamageBarChart")
            .append("svg")
            .attr("width", containerWidth)
            .attr("height", containerHeight)
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        // Recreate the y scale with the updated height (it remains the same, but left margin changed width only)
        y = d3.scaleBand()
            .domain(processedData.map(d => d.county))
            .range([0, height])
            .padding(0.1);

        // x scale
        const x = d3.scaleLinear()
            .domain([0, d3.max(processedData, d => d3.sum(categoryList, cat => d[cat] || 0))])
            .range([0, width]);

        const color = d3.scaleOrdinal(d3.schemeCategory10).domain(categoryList);

        // Stack the data
        const stack = d3.stack().keys(categoryList);
        const stackedData = stack(processedData);

        // Draw bars
        svg.append("g")
            .selectAll("g")
            .data(stackedData)
            .enter().append("g")
            .attr("fill", d => color(d.key))
            .selectAll("rect")
            .data(d => d)
            .enter().append("rect")
            .attr("y", d => y(d.data.county))
            .attr("x", d => x(d[0]))
            .attr("width", d => x(d[1]) - x(d[0]))
            .attr("height", y.bandwidth())
            .on("mouseover", function (event, d) {
                const category = d3.select(this.parentNode).datum().key;
                const countyLabel = countyNameMap[d.data.county] || d.data.county;
                showTooltip(
                    `<strong>${countyLabel}</strong><br><strong>${category}:</strong> ${d[1] - d[0]} properties`,
                    event
                );
                d3.select(this).style("opacity", 0.7);
            })
            .on("mousemove", function (event) {
                positionTooltip(event);
            })
            .on("mouseout", function () {
                hideTooltip();
                d3.select(this).style("opacity", 1);
            });

        // Axes
        svg.append("g")
            .call(d3.axisLeft(y)
                .tickFormat(d => showLabels ? (countyNameMap[d] || d) : "")
                .tickSize(0));

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x));

        // Title
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -20)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text(`Property Damage Severity and Quantity by County`);
    }

    renderChart();
    window.addEventListener("resize", renderChart);
}
