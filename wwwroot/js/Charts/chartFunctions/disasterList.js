import { stateData, countyData, getCountyNameByFips, getStateNameByFips } from "../main.js";

export async function createDisasterList(d3, fipsStateCode, fipsCountyCode) {
    let countyName = await getCountyNameByFips(d3, fipsStateCode, fipsCountyCode)
    let stateName = await getStateNameByFips(fipsStateCode)

    // Select separate containers for county and state data
    const countyContainer = d3.select("#countyDisasterList");
    const stateContainer = d3.select("#stateDisasterList");

    // Ensure both containers exist
    if (countyContainer.empty() || stateContainer.empty()) return;

    const stateDisasters = stateData;
    stateDisasters.sort((a, b) => new Date(b.DeclarationDate) - new Date(a.DeclarationDate));

    const displayedDisasterNumbers = new Set();
    const countyDisasters = stateDisasters.filter(
        d => String(d.FIPSCountyCode) === String(fipsCountyCode) && !displayedDisasterNumbers.has(d.DisasterNumber)
    );
    countyDisasters.forEach(d => displayedDisasterNumbers.add(d.DisasterNumber));

    // Clear the containers
    countyContainer.html("");
    stateContainer.html("");

    // Modified createTableSection to accept a container parameter
    function createTableSection(container, title, data, rowClass) {
        container.append("tr")
            .attr("id", "header")
            .html(`<th scope="col" colspan="4" class="text-center">${title}</th>`);

      //  container.append("tr")
      //      .attr("id", "subheader")
      //      .html(`
      //  <th scope="col">Disaster Type</th>
      //  <th scope="col">Area Affected</th>
      //  <th scope="col">Declaration Title</th>
      //  <th scope="col">Date</th>
      //`);

      //  container.selectAll(`.${rowClass}`)
      //      .data(data)
      //      .enter()
      //      .append("tr")
      //      .attr("class", "clickable-row")
      //      .html(d => `
      //  <td>${d.IncidentType}</td>
      //  <td>${d.DesignatedArea}</td>
      //  <td>${d.DeclarationTitle}</td>
      //  <td>${new Date(d.DeclarationDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td>
        //`)
        container.append("tr")
            .attr("id", "subheader")
            .html(`
        <th scope="col">Disaster Type</th>
        <th scope="col">      Declaration Title</th>
        <th scope="col">Date</th>
    `);

        container.selectAll(`.${rowClass}`)
            .data(data)
            .enter()
            .append("tr")
            .attr("class", "clickable-row")
            .html(d => `
        <td>${d.IncidentType}</td>
        <td id="descCenter">${d.DeclarationTitle}</td>
        <td id="dateNoWrap">${new Date(d.DeclarationDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" })}</td>
    `)
            .on("click", (event, d) => showDisasterModal(d3, fipsStateCode, d));
    }

    // Create table sections in their respective containers
    createTableSection(countyContainer, `${countyName} County Data`, countyDisasters, "county-row");

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

    createTableSection(stateContainer, `${stateName} State Data`, stateOnlyDisasters, "state-row");
}

function showDisasterModal(d3, fipsStateCode, disaster) {
    const modalId = `modal-${disaster.DisasterNumber}`;
    let modalContainer = d3.select("body").select(`#${modalId}`);

    if (modalContainer.empty()) {
        const allCountiesAffected = getAllCountiesAffected(fipsStateCode, disaster.DisasterNumber);
        const disasterBeginAndEnd = `${new Date(disaster.DeclarationDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} - ${new Date(disaster.IncidentEndDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`;
        const disasterDamageData = getPropertiesAffected(disaster)

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
              <p><strong>Areas Affected in ${disaster.State}:</strong><br> ${allCountiesAffected.join(", ")}</p>
              <p><strong>${disasterDamageData == "" ? "" : "Availible Property Damage Statistics:"}</strong></p>
              <p>${disasterDamageData}</p>
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
    stateData.forEach(d => {
        if (d.FIPSStateCode == stateFips && d.DisasterNumber == disasterNumber) {
            designatedAreas.add(d.DesignatedArea);
        }
    });
    return Array.from(designatedAreas);
}

function getPropertiesAffected(disaster) {
    let damageCategoryCounts = {};

    disaster.Damages.forEach(obj => {
        if (obj.DamageCategory !== "N/A") {
            if (!damageCategoryCounts[obj.DamageCategory]) {
                damageCategoryCounts[obj.DamageCategory] = 0;
            }
            damageCategoryCounts[obj.DamageCategory] += Number(obj.NumberOfProperties);
        }
    });

    let result = "";
    for (let category in damageCategoryCounts) {
        result += `Damage Category: ${category}, Total Properties Affected: ${damageCategoryCounts[category]} <br>`;
    }

    return result;
}