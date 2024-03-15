const fs = require("fs");

const inputData = require("../_output/meta_data.json");
const topLevelItems = require("../backup/top_level_ids.json");
const summary = {};

function constructPath(term) {
  const path = [];
  let topLevelItem;

  while (term && term.title !== "Root" && !topLevelItem) {
    topLevelItem = topLevelItems.find((i) => i.id === parseInt(term.id));

    if (!topLevelItem) {
      path.unshift(term.title.trim());
    } else {
      const { id: tId, rootName: tRootName, rootId: tRootId } = topLevelItem;
      if (tId !== tRootId) {
        path.unshift(topLevelItem?.title);
        if (!tRootName) {
          // todo: Find subject name in parents tree and add it to path
        }
      } else if (!tRootName) {
        path.unshift(term.title);
      }
      if (tRootName) path.unshift(topLevelItem?.rootName.trim());
    }

    term = term.parent;
  }

  return path;
}

const findShortestNodeTree = (nodes: any[]) => {
  let correctNode = null;
  let shortestTreeLength = 10000;
  nodes.forEach((n) => {
    let len = 1;
    let current = n;
    while (current.parent) {
      len++;
      current = current.parent;
    }
    if (len < shortestTreeLength) {
      shortestTreeLength = len;
      correctNode = n;
    }
  });
  return correctNode;
};

export function createQuickBarItems() {
  const quickbarItems = inputData.reduce((accumulator, entry) => {
    if (!entry.meta || !entry.meta.uuid || entry.meta.uuid.trashed) {
      return accumulator; // Skip entries without metadata, uuid, or if trashed
    }

    const uuid = entry.meta.uuid;
    console.log(entry.id, uuid.__typename, JSON.stringify(entry));
    let path = [];
    let title = uuid.currentRevision
      ? uuid.currentRevision.title.trim()
      : uuid.name
      ? uuid.name.trim()
      : "";

    // Path construction based on type
    if (uuid.__typename === "TaxonomyTerm") {
      path = constructPath(uuid);
    } else if (["Article", "CoursePage"].includes(uuid.__typename)) {
      if (uuid.__typename === "Article" && !uuid.taxonomyTerms) path = [];
      else if (uuid.__typename === "CoursePage" && !uuid.course.taxonomyTerms)
        path = [];
      else {
        const nodes =
          uuid.__typename === "CoursePage"
            ? uuid.course.taxonomyTerms.nodes
            : uuid.taxonomyTerms.nodes;
        const nodeToBuild = findShortestNodeTree(nodes);
        path = constructPath(nodeToBuild);
      }
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

    const root = path[0] || "";

    path = path.filter((x) => x != "Themen" && x != "Alle Themen");
    const outpath = [];
    for (let i = path.length - 1; i >= 0; i--) {
      if (path[i] == title) continue;
      if (title.includes(path[i])) continue;
      if (outpath.some((p) => p.includes(path[i]))) continue;
      if (i > 1 && path[i - 1] == path[i]) continue;

      const cur = title + outpath.join("");
      if (cur.length >= 35 && (outpath.length > 0 || i < path.length - 3))
        break;
      if (
        (path[i] + cur).length <= 60 ||
        (outpath.length == 0 && (path[i] + cur).length <= 66)
      ) {
        outpath.unshift(path[i]);
      }
    }

    // Construct quickbar item

    const item = {
      id: entry.id,
      title,
      path: outpath,
      isTax:
        uuid.__typename === "TaxonomyTerm" &&
        !title.toLowerCase().includes("aufgabe"),
      count: entry.count,
      root,
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

  return quickbarItems;
}
