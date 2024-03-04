const fs = require('fs');

export interface QuickbarItem {
  id: string;
  title: string;
  path: string[]; 
  isTax: boolean;
  count: number;
  root: string;
}

const data = require('../_output/meta_data.json');
const quickbar: QuickbarItem[] = [];
const summary = {};

function buildPath(arr) {
  return arr ? arr.map(({ label }) => label?.trim()).filter(Boolean) : [];
}

function buildFromTaxTerms(taxonomyTerms) {
  if (!taxonomyTerms) return [];
  let path = [];

  taxonomyTerms.forEach(term => {
    if (term.navigation) {
      const { nodes } = term.navigation.path;
      if (!path.length || path.length > nodes.length) {
        path = nodes;
      }
    }
  });

  return buildPath(path);
}

function addPathForCoursePage(entry, path) {
  if (entry.meta.uuid.course.currentRevision) {
    const courseTitle = entry.meta.uuid.course.currentRevision.title.trim();
    if (!path.includes(courseTitle)) {
      path.push(courseTitle);
    }
  }
}

function filterAndReversePath(path, title) {
  return path
    .filter(p => p !== 'Themen' && p !== 'Alle Themen' && p !== title && !title.includes(p))
    .reverse()
    .reduce((acc, cur) => {
      if (!acc.some(p => p.includes(cur)) && !cur.includes(title) && cur.length + acc.join('').length <= 60) {
        acc.unshift(cur);
      }
      return acc;
    }, []);
}

data.forEach(entry => {
  if (!entry.meta || !entry.meta.uuid || entry.meta.uuid.trashed) {
    return;
  }

  const { uuid } = entry.meta;
  let path = [];
  let title = uuid.currentRevision ? uuid.currentRevision.title.trim() : '';

  switch (uuid.__typename) {
    case 'Article':
    case 'CoursePage':
      path = buildFromTaxTerms(uuid.taxonomyTerms?.nodes || []);
      break;
    case 'Page':
      break; // Path remains an empty array
    case 'TaxonomyTerm':
      path = buildPath([{ label: uuid.name }]);
      title = uuid.name.trim();
      break;
  }

  if (uuid.__typename === 'CoursePage') {
    addPathForCoursePage(entry, path);
  }

  if (title) {
    path = filterAndReversePath(path, title);
    const isTax = uuid.__typename === 'TaxonomyTerm' && !title.toLowerCase().includes('aufgabe');
    quickbar.push({
      id: entry.id,
      title,
      path,
      isTax,
      count: entry.count,
      root: path[0] || '',
    });

    const summaryType = isTax ? 'ExerciseFolder' : uuid.__typename;
    summary[summaryType] = (summary[summaryType] || { count: 0 });
    summary[summaryType].count += entry.count;
  }
});

fs.writeFileSync('_output/stats_new.txt', `
Aufrufzahlen in den letzten 3 Wochen (Stand ${new Date().toLocaleString('de-DE')}):
${JSON.stringify(summary, null, 2)}
`);

fs.writeFileSync('_output/quickbar_v2.json', JSON.stringify(quickbar));
