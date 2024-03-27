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

    const item = {
      url: alias,
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
