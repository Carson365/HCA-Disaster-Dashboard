import { disastersByFips } from '../apis.js';
import { getStateAbbreviationByFips } from '../script.js';

/**
 * Creates the disaster table dynamically using D3.
 * Two sections are rendered: county disasters and state disasters.
 * Rows are clickable; clicking shows a modal with details.
 *
 * @param {object} d3 - The D3 instance.
 * @param {string|number} fipsStateCode - The FIPS state code.
 * @param {string|number} fipsCountyCode - The FIPS county code.
 */
export function createDisasterList(d3, fipsStateCode, fipsCountyCode) {
  // Select the table body container.
  const container = d3.select("#disasterList");
  if (container.empty()) return;

  // Get disasters for the state and sort by date (most recent first)
  let stateDisasters = disastersByFips[fipsStateCode]
    ? Object.values(disastersByFips[fipsStateCode])
    : [];
  stateDisasters.sort(
    (a, b) => new Date(b.declarationDate) - new Date(a.declarationDate)
  );

  // This Set will track disasterNumbers already shown in the county section.
  const displayedDisasterNumbers = new Set();

  // Filter disasters for the current county.
  const countyDisasters = stateDisasters.filter(disaster => {
    return (
      String(disaster.fips_county_code) === String(fipsCountyCode) &&
      !displayedDisasterNumbers.has(disaster.disasterNumber)
    );
  });
  countyDisasters.forEach(d => displayedDisasterNumbers.add(d.disasterNumber));

  // Clear any previous table content.
  container.html("");

  // --- County Data Section ---
  // County Data header
  container
    .append("tr")
    .html(
      '<th scope="col" colspan="4" class="text-center">County Data</th>'
    );
  // County column headers
  container
    .append("tr")
    .html(`
      <th scope="col">Disaster Type</th>
      <th scope="col">Area Affected</th>
      <th scope="col">Declaration Title</th>
      <th scope="col">Date</th>
    `);

  // County disaster rows – bind each row to its disaster object.
  container
    .selectAll(".county-row")
    .data(countyDisasters)
    .enter()
    .append("tr")
    .attr("class", "clickable-row")
    .html(d => `
      <td>${d.incidentType}</td>
      <td>${d.designatedArea}</td>
      <td>${d.declarationTitle}</td>
      <td>${new Date(d.declarationDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      })}</td>
    `)
    .on("click", function (event, d) {
      // Prepare content for the modal.
      const allCountiesAffected = getAllCountiesAffected(fipsStateCode, d.disasterNumber);
      const disasterBeginAndEnd = `${new Date(d.declarationDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      })} - ${new Date(d.incidentEndDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      })}`;
      const contentHTML = `
        <h3>${d.declarationTitle}</h3>
        <p><strong>Disaster Type:</strong> ${d.incidentType}</p>
        <p><strong>Areas Affected in ${getStateAbbreviationByFips(fipsStateCode)}:</strong> ${allCountiesAffected.join(", ")}</p>
        <p>${disasterBeginAndEnd}</p>
      `;
      showModal(contentHTML);
    });

  // --- State Data Section ---
  // Add state data header rows.
  container
    .append("tr")
    .html(
      '<th scope="col" colspan="4" class="text-center">State Data</th>'
    );
  container
    .append("tr")
    .html(`
      <th scope="col">Disaster Type</th>
      <th scope="col">Area Affected</th>
      <th scope="col">Declaration Title</th>
      <th scope="col">Date</th>
    `);

  // Filter state disasters not already shown as county disasters.
  const stateOnlyDisasters = stateDisasters.filter(
    d => !displayedDisasterNumbers.has(d.disasterNumber)
  );

  // Create state disaster rows.
  container
    .selectAll(".state-row")
    .data(stateOnlyDisasters)
    .enter()
    .append("tr")
    .attr("class", "clickable-row")
    .html(d => `
      <td>${d.incidentType}</td>
      <td>${d.designatedArea}</td>
      <td>${d.declarationTitle}</td>
      <td>${new Date(d.declarationDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      })}</td>
    `)
    .on("click", function (event, d) {
      const allCountiesAffected = getAllCountiesAffected(fipsStateCode, d.disasterNumber);
      const disasterBeginAndEnd = `${new Date(d.declarationDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      })} - ${new Date(d.incidentEndDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      })}`;
      const contentHTML = `
        <h3>${d.declarationTitle}</h3>
        <p><strong>Disaster Type:</strong> ${d.incidentType}</p>
        <p><strong>Areas Affected in ${getStateAbbreviationByFips(fipsStateCode)}:</strong> ${allCountiesAffected.join(", ")}</p>
        <p>${disasterBeginAndEnd}</p>
      `;
      showModal(d3, contentHTML);
    });
}

/**
 * Creates and shows a modal overlay using D3.
 * The modal is appended to the body and centered on the screen.
 *
 * @param {string} contentHTML - The HTML content to display in the modal.
 */
function showModal(d3, contentHTML) {
  // Create or select the overlay.
  let overlay = d3.select("body").select("#modal-overlay");
  if (overlay.empty()) {
    overlay = d3
      .select("body")
      .append("div")
      .attr("id", "modal-overlay")
      .style("position", "fixed")
      .style("top", "0")
      .style("left", "0")
      .style("width", "100%")
      .style("height", "100%")
      .style("background", "rgba(0, 0, 0, 0.5)")
      .style("display", "none")
      // Clicking outside the modal hides it.
      .on("click", hideModal);
  }
  // Clear previous modal content.
  overlay.html("");

  // Create the modal container.
  const modalContainer = overlay
    .append("div")
    .attr("id", "modal-container")
    .style("position", "absolute")
    .style("left", "50%")
    .style("top", "50%")
    .style("transform", "translate(-50%, -50%)")
    .style("background", "white")
    .style("padding", "20px")
    .style("border-radius", "5px")
    .style("box-shadow", "0 2px 8px rgba(0, 0, 0, 0.3)")
    // Prevent clicks within the modal from closing it.
    .on("click", event => event.stopPropagation());

  // Add a close button.
  modalContainer
    .append("span")
    .attr("class", "modal-close")
    .text("×")
    .style("position", "absolute")
    .style("top", "10px")
    .style("right", "15px")
    .style("cursor", "pointer")
    .style("font-size", "24px")
    .on("click", hideModal);

  // Insert the content into the modal.
  modalContainer.append("div")
    .attr("class", "modal-content")
    .html(contentHTML);

  // Display the overlay and center the modal.
  overlay
    .style("display", "flex")
    .style("align-items", "center")
    .style("justify-content", "center");
}

/**
 * Hides the modal overlay.
 */
function hideModal() {
  d3.select("#modal-overlay").style("display", "none");
}

/**
 * Returns an array of unique designated areas (counties) affected by a given disaster.
 *
 * @param {string|number} stateFips - The state FIPS code.
 * @param {string|number} disasterNumber - The disaster number.
 * @returns {Array} An array of designated area names.
 */
function getAllCountiesAffected(stateFips, disasterNumber) {
  const designatedAreas = new Set();
  if (!disastersByFips[stateFips]) {
    return [];
  }
  Object.values(disastersByFips[stateFips]).forEach(disaster => {
    if (disaster.disasterNumber == disasterNumber) {
      designatedAreas.add(disaster.designatedArea);
    }
  });
  return Array.from(designatedAreas);
}
