//Get all the data passed in via an exported function which is called by C#.

//Then, call the function that will actually do the work of creating the chart.
//This function is called with the data as a parameter.

import { createChartsWithData } from "./charts.js";

export let stateData = [];
export let countyData = [];

export let stateFip = "";
export let countyFip = "";

export async function createCharts(fip, data) {

	stateFip = fip[0] + fip[1];
	countyFip = fip[2] + fip[3] + fip[4];

	Object.assign(stateData, JSON.parse(data));

	countyData = stateData.filter(d => d.FIPSCountyCode === countyFip);

	// stateData.forEach(obj => {
	// 	obj.Damages.forEach(damage => {
	// 		if (damage.DamageCategory !== "N/A") {
	// 			for (let i = 0; i < damage.NumberOfProperties; i++) {
	// 				console.log(damage.DamageCategory);
	// 			}
	// 		}
	// 	});
	// });

	createChartsWithData();
  }
  
