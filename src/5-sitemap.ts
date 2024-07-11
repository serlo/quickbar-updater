import { buildCoursePageUrl, getIndexAndCoursePage } from  "./utils/course-helper"
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
      const result = getIndexAndCoursePage(entry.id,entry.meta.uuid.currentRevision?.content)
      
      if (!result) return accumulator

      if(result.pageIndex > 0){
        url = buildCoursePageUrl(alias, result.page.id, result.page.title)
      }
    }

    accumulator.push( { url, lastMod} )

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

