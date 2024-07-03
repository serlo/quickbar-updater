const fs = require("fs")

const inputData = require("../_output/meta_data.json")

export function createSitemapItems() {
  const sitemapItems = inputData.reduce((accumulator, entry) => {
    if (!entry.meta || !entry.meta.uuid || entry.meta.uuid.trashed) {
      return accumulator // Skip entries without metadata, uuid, or if trashed
    }

    const alias = entry.meta.uuid.alias
    if(alias.startsWith('/entity/repository/') || alias.startsWith('/user/')){
      return accumulator
    }

    const lastMod = entry.meta.uuid.currentRevision?.date?.split('T')[0]

    let url = alias

    if(entry.meta.uuid.__typename === 'CoursePage'){
      return accumulator
    }

    if(entry.meta.uuid.__typename === 'Course'){
      const coursePageId = entry.id.split('#')[1]
      const content = parseDocumentString(entry.meta.uuid.currentRevision?.content) as CourseDocument

      const pages = content?.state?.pages
      if (!pages || !pages.length) return accumulator

      const pageIndex = Math.max(
        pages.findIndex(({ id }) => coursePageId && id.startsWith(coursePageId)),
        0
      )
      const page = pages.at(pageIndex)
      if (!page) return accumulator

      if(pageIndex > 0){
        url = buildCoursePageUrl(alias, coursePageId, page.title)
      }
    }

    const item = {
      url,
      lastMod
    }

    accumulator.push(item)

    return accumulator
  }, [])

  // Write the sitemap items and summary to files
  fs.writeFileSync(
    "_output/sitemap.json",
    JSON.stringify(sitemapItems, null, 2)
  )

  console.log(
    "Sitemap items have been successfully updated.",
    sitemapItems.length
  )

  return sitemapItems
}

createSitemapItems()




// copied from frontend
export function buildCoursePageUrl(
  courseAlias: string,
  coursePageId: string,
  title: string
) {
  const aliasParts = courseAlias.split('/')
  if (aliasParts.length !== 4) {
    throw new Error('Invalid course alias')
  }
  const base = aliasParts.slice(0, -1).join('/')
  return `${base}/${coursePageId.split('-')[0]}/${toSlug(title)}`
}

// Copied from https://github.com/serlo/api.serlo.org/blob/ce94045b513e59da1ddd191b498fe01f6ff6aa0a/packages/server/src/schema/uuid/abstract-uuid/resolvers.ts#L685-L703
function toSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/ /g, '-') // replace spaces with hyphens
    .replace(/[^\w-]+/g, '') // remove all non-word chars including _
    .replace(/--+/g, '-') // replace multiple hyphens
    .replace(/^-+/, '') // trim starting hyphen
    .replace(/-+$/, '') // trim end hyphen
}

export function parseDocumentString(input?: string): object | undefined {
  if (!input || !input.startsWith('{')) return

  try {
    return JSON.parse(input) as object
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('error parsing', e)
    return
  }
}

interface CourseDocument {
  plugin: 'Course'
  state: {
      pages: [
        {
          id: string,
          title: string
          content: unknown
        }
      ]
  }
}