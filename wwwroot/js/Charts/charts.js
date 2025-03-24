import { createStackedAreaChart } from './chartFunctions/stackedAreaChart.js';
import { createPieChart } from './chartFunctions/pieChart.js';
import { createStackedBarChart } from './chartFunctions/stackedBarChart.js';
import { createStateHeatMap } from './chartFunctions/stateHeatMap.js';
import { createDisasterList } from './chartFunctions/disasterList.js';
import { createDamagePieChart } from "./chartFunctions/damagePieChart.js"
import { createDamageStackedBarChart } from "./chartFunctions/damageStackedBarChart.js"

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { stateFip, countyFip } from "./main.js";



import { createGlobalTooltip } from "./tooltip.js";



export function createChartsWithData() {
    // Ensure the global tooltip is created
    createGlobalTooltip();

    createStackedAreaChart(d3, countyFip, stateFip);
    createPieChart(d3, stateFip, countyFip);
    createPieChart(d3, stateFip);
    createStackedBarChart(d3, stateFip, countyFip);
    createStateHeatMap(d3, stateFip, countyFip);
    createDisasterList(d3, stateFip, countyFip);
	createDamagePieChart(d3, stateFip);
    createDamagePieChart(d3, stateFip, countyFip);
	createDamageStackedBarChart(d3, stateFip);
}