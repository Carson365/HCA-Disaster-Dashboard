import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { dotNetCountyClick } from "./runMapThings.js"

export function getDefaultCountyStyle(feature) {
	return {
		weight: 0.5,
		color: "#aaa",
		fillColor: "#eee",
		fillOpacity: 0.2,
		opacity: 0.3,
	};
}
export let countyLayer = null; // Define global reference

export async function fetchCountyData(mapInstance, countyData) {
	//const data = await d3.json(
	//    "https://gist.githubusercontent.com/sdwfrost/d1c73f91dd9d175998ed166eb216994a/raw/"
	//);
	const data = JSON.parse(countyData)

	//console.log(data)


	if (!mapInstance.getPane("countyHoverPane")) {
		mapInstance.createPane("countyHoverPane");
		mapInstance.getPane("countyHoverPane").style.zIndex = 600; // Below hexes
	}

	countyLayer = L.geoJSON(data, {
		pane: "countyHoverPane",
		style: getDefaultCountyStyle,
		onEachFeature: function (feature, layer) {
			layer.on({
				mouseover: function (e) {
					e.target.setStyle({
						weight: 2,
						color: "#03173E",
						fillColor: "#E05929",
						fillOpacity: 0.3,
					});
					e.target.bringToFront();
				},
				mouseout: function (e) {
					countyLayer.resetStyle(e.target);
				},
				click: function (e) {
					const props = e.target.feature.properties;
					const fipCode = `${props.STATEFP}${props.COUNTYFP}`;
					dotNetCountyClick(fipCode);
				},
			});
		},
	}).addTo(mapInstance);

	return countyLayer;
}


export function updateCountyStyles(countyLayer) {
	if (countyLayer) {
		countyLayer.setStyle(getDefaultCountyStyle);
	}
}
