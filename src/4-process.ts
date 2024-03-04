const fs = require("fs");

const inputData = require("../_output/meta_data.json");

const summary = {};

function constructPath(term) {
  const path = [];
  while (term && term.title !== "Root") {
    path.unshift(term.title.trim());
    term = term.parent;
  }
  return path.slice(0, -1); // Exclude "Root"
}

const quickbarItems = inputData.reduce((accumulator, entry) => {
  if (!entry.meta || !entry.meta.uuid || entry.meta.uuid.trashed) {
    return accumulator; // Skip entries without metadata, uuid, or if trashed
  }

  const uuid = entry.meta.uuid;
  let path = [];
  let title = uuid.currentRevision
    ? uuid.currentRevision.title.trim()
    : uuid.name
    ? uuid.name.trim()
    : "";

  // Path construction based on type
  if (["Article", "CoursePage"].includes(uuid.__typename)) {
    path = uuid.taxonomyTerms ? constructPath(uuid.taxonomyTerms.nodes[0]) : [];
  } else if (uuid.__typename === "TaxonomyTerm") {
    path = constructPath(uuid);
  }

  // Special handling for CoursePage titles
  if (
    uuid.__typename === "CoursePage" &&
    uuid.course &&
    uuid.course.currentRevision
  ) {
    const courseTitle = uuid.course.currentRevision.title.trim();
    path.push(courseTitle);
  }

  // Filter path and avoid duplication
  path = path.filter((p) => p !== title && !title.includes(p));

  if (!title || (uuid.__typename !== "TaxonomyTerm" && path.length === 0)) {
    return accumulator; // Exclude items without a title or path (except TaxonomyTerm)
  }

  // Construct quickbar item
  const item = {
    id: uuid.id,
    title,
    path,
    isTax: uuid.__typename === "TaxonomyTerm",
    count: entry.count,
    root: path[0] || "",
  };

  accumulator.push(item);

  // Update summary with type-specific count
  const summaryType = item.isTax ? "ExerciseFolder" : uuid.__typename;
  summary[summaryType] = summary[summaryType] || { count: 0 };
  summary[summaryType].count += item.count;

  return accumulator;
}, []);

// Write the quickbar items and summary to files
fs.writeFileSync(
  "_output/quickbar_v2.json",
  JSON.stringify(quickbarItems, null, 2)
);
fs.writeFileSync("_output/summary.json", JSON.stringify(summary, null, 2));

console.log(
  "Quickbar items and summary have been successfully updated.",
  quickbarItems.length
);
