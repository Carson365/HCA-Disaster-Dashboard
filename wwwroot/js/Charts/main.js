//Get all the data passed in via an exported function which is called by C#.

//Then, call the function that will actually do the work of creating the chart.
//This function is called with the data as a parameter.

import { createChartsWithData } from "./charts.js";

export let stateData = [];
export let countyData = [];

export let stateFip = "";
export let countyFip = "";

export let countyFipNameData = {};

export async function createCharts(fip, data, counties) {

	Object.assign(stateData, JSON.parse(data));
	Object.assign(countyFipNameData, JSON.parse(counties));

	stateFip = fip[0] + fip[1];
	countyFip = fip[2] + fip[3] + fip[4];

	Object.assign(stateData, JSON.parse(data));

	countyData = stateData.filter(d => d.FIPSCountyCode === countyFip);

	createChartsWithData();

}

export async function getCountyNameByFips(countyFips) {
	return countyFipNameData[countyFips];
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
    "53": "Washington", "54": "West Virginia", "55": "Wisconsin", "56": "Wyoming",
	"72": "Puerto Rico"
};
