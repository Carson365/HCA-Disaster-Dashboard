import { stateData, countyData } from "../main.js";
import { showTooltip, hideTooltip, positionTooltip } from "../tooltip.js";

// Function to calculate average disasters per month for the state
function getAverageDisastersPerMonth(fipsStateCode) {
    const disasters = stateData.filter(d => d.FIPSStateCode === fipsStateCode);
    if (!disasters.length) return {};

    const monthTotals = {};
    const yearCounts = {};
    const disasterNumbersByMonth = {};

    disasters.forEach(({ DisasterNumber, DeclarationDate }) => {
        if (DeclarationDate && DisasterNumber) {
            const date = new Date(DeclarationDate);
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');

            if (!monthTotals[month]) {
                monthTotals[month] = 0;
                yearCounts[month] = new Set();
                disasterNumbersByMonth[month] = new Set();
            }

            if (!disasterNumbersByMonth[month].has(DisasterNumber)) {
                monthTotals[month]++;
                disasterNumbersByMonth[month].add(DisasterNumber);
            }

            yearCounts[month].add(year);
        }
    });

    const monthlyAverages = {};
    Object.keys(monthTotals).forEach(month => {
        const totalDisasters = monthTotals[month];
        const yearCount = yearCounts[month].size;
        monthlyAverages[month] = parseFloat((totalDisasters / yearCount).toFixed(2));
    });

    return monthlyAverages;
}

// Function to calculate average disasters per month for the county
function getAverageCountyDisastersPerMonth(fipsStateCode, fipsCountyCode) {
    const disasters = countyData.filter(d => d.FIPSStateCode === fipsStateCode && d.FIPSCountyCode === fipsCountyCode);
    if (!disasters.length) return null;

    const monthTotals = {};
    const yearCounts = {};
    const disasterNumbersByMonth = {};

    disasters.forEach(({ DisasterNumber, DeclarationDate }) => {
        if (DeclarationDate && DisasterNumber) {
            const date = new Date(DeclarationDate);
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');

            if (!monthTotals[month]) {
                monthTotals[month] = 0;
                yearCounts[month] = new Set();
                disasterNumbersByMonth[month] = new Set();
            }

            if (!disasterNumbersByMonth[month].has(DisasterNumber)) {
                monthTotals[month]++;
                disasterNumbersByMonth[month].add(DisasterNumber);
            }

            yearCounts[month].add(year);
        }
    });

    const monthlyAverages = {};
    Object.keys(monthTotals).forEach(month => {
        const totalDisasters = monthTotals[month];
        const yearCount = yearCounts[month].size;
        monthlyAverages[month] = parseFloat((totalDisasters / yearCount).toFixed(2));
    });

    return monthlyAverages;
}

// Create the stacked bar chart
export function createStackedBarChart(d3, fipsStateCode, fipsCountyCode) {
    const stateMonthlyAverages = getAverageDisastersPerMonth(fipsStateCode);
    const countyMonthlyAverages = fipsCountyCode ? getAverageCountyDisastersPerMonth(fipsStateCode, fipsCountyCode) : null;

    const data = [];

    Object.keys(stateMonthlyAverages).forEach(month => {
        data.push({ month, average: stateMonthlyAverages[month], type: "State" });
    });

    if (countyMonthlyAverages) {
        Object.keys(countyMonthlyAverages).forEach(month => {
            data.push({ month, average: countyMonthlyAverages[month], type: "County" });
        });
    }

    data.sort((a, b) => parseInt(a.month) - parseInt(b.month));

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

        svg.selectAll("rect")
            .data(data)
            .enter().append("rect")
            .attr("x", d => xScale(d.month) + (d.type === 'County' ? xScale.bandwidth() / 2 : 0))
            .attr("y", d => yScale(d.average))
            .attr("width", xScale.bandwidth() / 2)
            .attr("height", d => height - yScale(d.average))
            .attr("fill", d => colorScale(d.type))
            .on("mouseover", function (event, d) {
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const state = stateData.find(s => s.FIPSStateCode === fipsStateCode)?.State || "Unknown State";
                const county = countyData.find(c => c.FIPSCountyCode === fipsCountyCode);
                const countyName = county ? county.DesignatedArea : "Unknown County";

                const content = `<strong>${monthNames[parseInt(d.month) - 1]} ${d.type === 'State' ? state : countyName}</strong><br>
                                 Avg Disasters/Year: ${d.average.toFixed(2)}`;
                showTooltip(content, event);
            })
            .on("mousemove", function (event) {
                positionTooltip(event);
            })
            .on("mouseout", function () {
                hideTooltip();
            });

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickFormat(d => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(d) - 1]))
            .selectAll("text")
            .style("font-size", "12px")
            .attr("text-anchor", "middle");

        svg.append("g")
            .call(d3.axisLeft(yScale).ticks(10));

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text(`Avg Natural Disasters By Month in ${stateData.find(s => s.FIPSStateCode === fipsStateCode)?.State || "Unknown State"}`);

    }

    renderChart();
    window.addEventListener("resize", renderChart);
}
