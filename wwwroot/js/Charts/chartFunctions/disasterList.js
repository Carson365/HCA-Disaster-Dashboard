import { disastersByFips } from '../apis.js';
import { getStateAbbreviationByFips } from '../script.js';

export function createDisasterList(d3, fipsStateCode, fipsCountyCode) {
    const container = d3.select("#disasterList");
    if (container.empty()) return;

    let stateDisasters = disastersByFips[fipsStateCode] ? Object.values(disastersByFips[fipsStateCode]) : [];
    stateDisasters.sort((a, b) => new Date(b.declarationDate) - new Date(a.declarationDate));

    const displayedDisasterNumbers = new Set();
    const countyDisasters = stateDisasters.filter(d => String(d.fips_county_code) === String(fipsCountyCode) && !displayedDisasterNumbers.has(d.disasterNumber));
    countyDisasters.forEach(d => displayedDisasterNumbers.add(d.disasterNumber));

    container.html("");

    function createTableSection(title, data, rowClass) {
        container.append("tr").html(`<th scope="col" colspan="4" class="text-center">${title}</th>`);
        container.append("tr").html(`
      <th scope="col">Disaster Type</th>
      <th scope="col">Area Affected</th>
      <th scope="col">Declaration Title</th>
      <th scope="col">Date</th>
    `);
        container.selectAll(`.${rowClass}`)
            .data(data)
            .enter()
            .append("tr")
            .attr("class", "clickable-row")
            .html(d => `
        <td>${d.incidentType}</td>
        <td>${d.designatedArea}</td>
        <td>${d.declarationTitle}</td>
        <td>${new Date(d.declarationDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td>
      `)
            .on("click", (event, d) => showDisasterModal(d3, fipsStateCode, d));
    }

    createTableSection("County Data", countyDisasters, "county-row");

    const disasterCounts = new Map();

    stateDisasters.forEach(d => {
        disasterCounts.set(d.disasterNumber, (disasterCounts.get(d.disasterNumber) || 0) + 1);
    });

    const stateOnlyDisasters = stateDisasters
        .filter(d => !displayedDisasterNumbers.has(d.disasterNumber) && displayedDisasterNumbers.add(d.disasterNumber))
        .map(d => ({
            ...d,
            designatedArea: disasterCounts.get(d.disasterNumber) > 1
                ? `Multiple Counties (${disasterCounts.get(d.disasterNumber)})`
                : d.designatedArea
        }));

    createTableSection("State Data", stateOnlyDisasters, "state-row");

}

function showDisasterModal(d3, fipsStateCode, disaster) {
    const modalId = `modal-${disaster.disasterNumber}`;
    let modalContainer = d3.select("body").select(`#${modalId}`);

    if (modalContainer.empty()) {
        const allCountiesAffected = getAllCountiesAffected(fipsStateCode, disaster.disasterNumber);
        const disasterBeginAndEnd = `${new Date(disaster.declarationDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} - ${new Date(disaster.incidentEndDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`;

        modalContainer = d3.select("body").append("div")
            .attr("class", "modal fade")
            .attr("id", modalId)
            .attr("tabindex", "-1")
            .attr("aria-labelledby", `${modalId}-label`)
            .attr("aria-hidden", "true")
            .html(`
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="${modalId}-label">${disaster.declarationTitle}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <p><strong>Disaster Type:</strong> ${disaster.incidentType}</p>
              <p><strong>Areas Affected in ${getStateAbbreviationByFips(fipsStateCode)}:</strong> ${allCountiesAffected.join(", ")}</p>
              <p>${disasterBeginAndEnd}</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      `);
    }

    new bootstrap.Modal(document.getElementById(modalId)).show();
}

function getAllCountiesAffected(stateFips, disasterNumber) {
    const designatedAreas = new Set();
    if (!disastersByFips[stateFips]) return [];
    Object.values(disastersByFips[stateFips]).forEach(d => {
        if (d.disasterNumber == disasterNumber) {
            designatedAreas.add(d.designatedArea);
        }
    });
    return Array.from(designatedAreas);
}