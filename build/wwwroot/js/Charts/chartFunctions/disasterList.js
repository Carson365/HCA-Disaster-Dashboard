import { stateData, countyData } from "../main.js";

export function createDisasterList(d3, fipsStateCode, fipsCountyCode) {
    const container = d3.select("#disasterList");
    if (container.empty()) return;

    const stateDisasters = stateData;
    stateDisasters.sort((a, b) => new Date(b.DeclarationDate) - new Date(a.DeclarationDate));

    const displayedDisasterNumbers = new Set();
    const countyDisasters = stateDisasters.filter(d => String(d.FIPSCountyCode) === String(fipsCountyCode) && !displayedDisasterNumbers.has(d.DisasterNumber));
    countyDisasters.forEach(d => displayedDisasterNumbers.add(d.DisasterNumber));

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
        <td>${d.IncidentType}</td>
        <td>${d.DesignatedArea}</td>
        <td>${d.DeclarationTitle}</td>
        <td>${new Date(d.DeclarationDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td>
      `)
            .on("click", (event, d) => showDisasterModal(d3, fipsStateCode, d));
    }

    createTableSection("County Data", countyDisasters, "county-row");

    const disasterCounts = new Map();
    stateDisasters.forEach(d => {
        disasterCounts.set(d.DisasterNumber, (disasterCounts.get(d.DisasterNumber) || 0) + 1);
    });

    const stateOnlyDisasters = stateDisasters
        .filter(d => !displayedDisasterNumbers.has(d.DisasterNumber) && displayedDisasterNumbers.add(d.DisasterNumber))
        .map(d => ({
            ...d,
            DesignatedArea: disasterCounts.get(d.DisasterNumber) > 1
                ? `Multiple Counties (${disasterCounts.get(d.DisasterNumber)})`
                : d.DesignatedArea
        }));

    createTableSection("State Data", stateOnlyDisasters, "state-row");
}

function showDisasterModal(d3, fipsStateCode, disaster) {
    const modalId = `modal-${disaster.DisasterNumber}`;
    let modalContainer = d3.select("body").select(`#${modalId}`);

    if (modalContainer.empty()) {
        const allCountiesAffected = getAllCountiesAffected(fipsStateCode, disaster.DisasterNumber);
        const disasterBeginAndEnd = `${new Date(disaster.DeclarationDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} - ${new Date(disaster.IncidentEndDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`;

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
              <h5 class="modal-title" id="${modalId}-label">${disaster.DeclarationTitle}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <p><strong>Disaster Type:</strong> ${disaster.IncidentType}</p>
              <p><strong>Areas Affected in ${disaster.State}:</strong> ${allCountiesAffected.join(", ")}</p>
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
    if (!stateData[stateFips]) return [];
    Object.values(stateData[stateFips]).forEach(d => {
        if (d.DisasterNumber == disasterNumber) {
            designatedAreas.add(d.DesignatedArea);
        }
    });
    return Array.from(designatedAreas);
}