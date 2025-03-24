//Get all the data passed in via an exported function which is called by C#.

//Then, call the function that will actually do the work of creating the chart.
//This function is called with the data as a parameter.

import { createChartsWithData } from "./charts.js";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

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

    document.getElementById("statsTitle").innerHTML = `${await getCountyNameByFips(d3, stateFip, countyFip)} County, ${getStateNameByFips(stateFip)}`
  }
  
  export async function getCountyNameByFips(d3, stateFips, countyFips) {
    const geojsonUrl = "https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json";
    let name = 'Unkown'
    const geoData = await d3.json(geojsonUrl);

    Object.values(geoData.features).forEach(obj => {
        if (obj.properties.STATE === stateFips && obj.properties.COUNTY === countyFips && obj.properties.NAME != undefined) {
            name = obj.properties.NAME
        }
    });
    return name
}

export function getStateNameByFips(fipsCode) {
    const abbreviation = fipsToName[fipsCode];
    if (abbreviation) {
        return abbreviation;
    }
}

const fipsToName = {
    "01": "Alabama", "02": "Alaska", "04": "Arizona", "05": "Arkansas", "06": "California",
    "08": "Colorado", "09": "Connecticut", "10": "Delaware", "11": "District of Columbia",
    "12": "Florida", "13": "Georgia", "15": "Hawaii", "16": "Idaho", "17": "Illinois",
    "18": "Indiana", "19": "Iowa", "20": "Kansas", "21": "Kentucky", "22": "Louisiana",
    "23": "Maine", "24": "Maryland", "25": "Massachusetts", "26": "Michigan", "27": "Minnesota",
    "28": "Mississippi", "29": "Missouri", "30": "Montana", "31": "Nebraska", "32": "Nevada",
    "33": "New Hampshire", "34": "New Jersey", "35": "New Mexico", "36": "New York",
    "37": "North Carolina", "38": "North Dakota", "39": "Ohio", "40": "Oklahoma", "41": "Oregon",
    "42": "Pennsylvania", "44": "Rhode Island", "45": "South Carolina", "46": "South Dakota",
    "47": "Tennessee", "48": "Texas", "49": "Utah", "50": "Vermont", "51": "Virginia",
    "53": "Washington", "54": "West Virginia", "55": "Wisconsin", "56": "Wyoming"
};
