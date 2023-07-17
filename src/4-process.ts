const data = require('../_output/meta_data.json')

const quickbar = []

const summary: { [key: string]: { count: number } } = {}

for (const entry of data) {
  if (!entry.meta) {
    continue
  }

  if (entry.meta.uuid === null) {
    console.log(entry)
    continue
  }
  if (entry.meta.uuid.trashed == true) {
    // console.log('trashed', entry.id)
    continue
  }
  const type = entry.meta.uuid.__typename
  let path = undefined
  let title = ''
  if (type == 'Article') {
    path = buildPath(buildFromTaxTerms(entry.meta.uuid.taxonomyTerms.nodes))
    if (entry.meta.uuid.currentRevision)
      title = entry.meta.uuid.currentRevision.title.trim()
  }
  if (type == 'CoursePage') {
    path = buildPath(
      buildFromTaxTerms(entry.meta.uuid.course.taxonomyTerms.nodes)
    )
    if (entry.meta.uuid.currentRevision)
      title = entry.meta.uuid.currentRevision.title.trim()
  }
  if (type == 'Page') {
    path = buildPath(
      buildFromTaxTerms([{ navigation: entry.meta.uuid.navigation }])
    )
    if (entry.meta.uuid.currentRevision)
      title = entry.meta.uuid.currentRevision.title.trim()
  }
  if (type == 'TaxonomyTerm') {
    path = buildPath(
      buildFromTaxTerms([{ navigation: entry.meta.uuid.navigation }])
    )
    title = entry.meta.uuid.name.trim()
  }
  if (title) {
    if (!path) {
      path = []
      console.log('no path', title)
      continue
    }

    if (type == 'CoursePage' && entry.meta.uuid.course.currentRevision) {
      path.push(entry.meta.uuid.course.currentRevision.title.trim())
    }

    path = path.filter((x) => x != 'Themen' && x != 'Alle Themen')
    const outpath = []
    for (let i = path.length - 1; i >= 0; i--) {
      if (path[i] == title) continue
      if (title.includes(path[i])) continue
      if (outpath.some((p) => p.includes(path[i]))) continue
      if (i > 1 && path[i - 1] == path[i]) continue

      const cur = title + outpath.join('')
      if (cur.length >= 35 && (outpath.length > 0 || i < path.length - 3)) break
      if (
        (path[i] + cur).length <= 60 ||
        (outpath.length == 0 && (path[i] + cur).length <= 66)
      ) {
        outpath.unshift(path[i])
      }
    }

    const output = {
      id: entry.id,
      title,
      path: outpath,
      isTax: type == 'TaxonomyTerm' && !title.toLowerCase().includes('aufgabe'),
      count: entry.count,
      root: path[0],
    }
    quickbar.push(output)
  }

  const summaryType =
    type == 'TaxonomyTerm' && !title.toLowerCase().includes('aufgabe')
      ? 'ExerciseFolder'
      : entry.meta.uuid.__typename
  const summaryEntry = (summary[summaryType] = summary[summaryType] ?? {
    count: 0,
  })
  summaryEntry.count += entry.count
}

require('fs').writeFileSync(
  '_output/stats.txt',
  `
Aufrufzahlen in den letzten 3 Wochen (Stand ${new Date().toLocaleString(
    'de-DE'
  )}):

${JSON.stringify(summary, null, 2)}
`
)

require('fs').writeFileSync('_output/quickbar.json', JSON.stringify(quickbar))

function print(val) {
  return `${val.path.join(' > ')}${val.path.length > 0 ? ' > ' : ''}${
    val.title
  }${val.isTax ? ' >' : ''}`
}

function buildPath(arr) {
  if (!arr) return undefined
  return arr.map(({ label }) => label.trim())
}

function buildFromTaxTerms(taxonomyPaths) {
  if (taxonomyPaths === undefined) return undefined
  let breadcrumbs
  let backup

  for (const child of taxonomyPaths) {
    if (!child.navigation) continue
    const path = child.navigation.path.nodes
    if (!breadcrumbs || breadcrumbs.length > path.length) {
      // compat: some paths are short-circuited, ignore them
      if (
        path.some((x) => x.label === 'Mathematik') &&
        !path.some((x) => x.label === 'Alle Themen')
      ) {
        if (!backup || backup.length > path.length) {
          backup = path
        }
        continue
      }

      breadcrumbs = path
    }
  }

  return breadcrumbs || backup
}
