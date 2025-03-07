import { createStackedAreaChart } from './chartFunctions/stackedAreaChart.js';
import { createPieChart } from './chartFunctions/pieChart.js';
import { createStackedBarChart } from './chartFunctions/stackedBarChart.js';
import { createStateHeatMap } from './chartFunctions/stateHeatMap.js';
import { createDisasterList } from './chartFunctions/disasterList.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function createChartsWithData(fip) {
	console.log(fip)
	let stateFip = fip[0] + fip[1];
	let countyFip = fip[2] + fip[3] + fip[4];
	createStackedAreaChart(d3, stateFip, countyFip);
	createPieChart(d3, stateFip, countyFip);
	createPieChart(d3, stateFip, countyFip);
	createStackedBarChart(d3, stateFip, countyFip);
	createStateHeatMap(d3, stateFip, countyFip);
	createDisasterList(d3, stateFip, countyFip);
}