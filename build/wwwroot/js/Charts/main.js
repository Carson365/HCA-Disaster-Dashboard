//Get all the data passed in via an exported function which is called by C#.


//Then, call the function that will actually do the work of creating the chart.
//This function is called with the data as a parameter.

import { disastersByFips } from './apis.js';


window.onload = () => createCharts([]);

import { createChartsWithData } from "./charts.js";

/*let globalData = [];*/

export async function createCharts(fip, data) {
	Object.assign(disastersByFips, JSON.parse(data));
	createChartsWithData(fip);
	//try {
	//  const response = await fetch('./data.json');
	//  const jsonData = await response.json();  // Wait for the JSON content to be parsed
	//  Object.assign(disastersByFips, jsonData); // Merge the data into disastersByFips
	  
	//  // After fetch completes, assign the value to globalData
	//  globalData = jsonData;
  
	//  // Call createChartsWithData only after the data is ready
	//  createChartsWithData(fip);
	//} catch (error) {
	//  console.error('Error loading the JSON file:', error);
	//}
  }
  
