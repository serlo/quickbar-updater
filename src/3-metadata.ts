import { request } from 'graphql-request'
import fs from 'fs'

const quicklinks = require('../quicklinks.json')
let metaData = []

const isFastMode = process.env.FAST
// Determines the API endpoint based on the environment mode
const endpoint = isFastMode
  ? 'https://api.serlo-staging.dev/graphql'
  : 'https://api.serlo.org/graphql'

// Set the limit based on the fast mode flag
const limit = isFastMode ? 100000 : 1800

async function run() {
  console.log('Starting update process...')

  // Fetch metadata cache
  // TODO? : Use upload artifacts instead?
  try {
    const res = await fetch(
      'https://serlo.github.io/quickbar-updater/meta_data.json',
    )
    metaData = await res.json()
  } catch (e) {
    console.log('Failed to load previous metadata')
  }

  // Step 1: Add new items from quicklinks to metaData if they don't already exist
  const existingIds = new Set(metaData.map((entry) => entry.id))
  quicklinks.forEach((entry) => {
    if (!existingIds.has(entry.id)) {
      metaData.push({ ...entry, time: 0 }) // Initialize time if not present
    }
  })

  // Step 2: Determine which entries need fetching based on time and existence in quicklinks
  const quicklinkIds = new Set(quicklinks.map((entry) => entry.id))
  const timeCap = Date.now() - 24 * 60 * 60 * 1000 // 24 hours ago

  const toFetch = metaData.filter((entry) => {
    const isRecentEnough = entry.time && entry.time > timeCap
    const isInQuicklinks = quicklinkIds.has(entry.id)
    const hasValidType =
      !entry.meta ||
      ['Page', 'TaxonomyTerm', 'Article', 'Course'].includes(
        entry.meta?.uuid?.__typename,
      )

    return isInQuicklinks && !isRecentEnough && hasValidType
  })

  console.log(`Entries to fetch: ${toFetch.length}, limit: ${limit}`)

  // Step 3: Sort entries by time for prioritization
  toFetch.sort((a, b) => (a.time || -2) - (b.time || -2))

  const numberOfEntries = Math.min(toFetch.length, limit)
  // Step 4: Fetch and update metadata for limited number of entries
  for (let i = 0; i < numberOfEntries; i++) {
    const entry = toFetch[i]
    try {
      console.log(`Fetching ${entry.id} (${(i / numberOfEntries) * 100}%)`)

      // remove coursePageId
      const id = entry.id.split('#')[0]

      const data = await request(endpoint, buildQuery(id))
      entry.meta = data
      entry.time = Date.now()
      if (!isFastMode) {
        await sleep(50) // Throttle requests unless in fast mode
      }
    } catch (error) {
      console.error(`Error fetching ${entry.id}:`, error)
      await sleep(500) // Longer wait on error
    }

    // Periodically save progress
    if ((i + 1) % 250 === 0 || i === toFetch.length - 1) {
      console.log(`Saving progress at ${i + 1} entries...`)
      saveMetaData(metaData)
    }
  }
}

function saveMetaData(data) {
  const outputDir = '_output'
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir)
  }
  fs.writeFileSync(`${outputDir}/meta_data.json`, JSON.stringify(data, null, 2))
}

function buildQuery(id) {
  return gql`
  {
    uuid (id: ${id}) {
      __typename
      alias
      title
      trashed

      ... on AbstractTaxonomyTermChild {
        taxonomyTerms {
          nodes {
            ...pathToRoot
          }
        }
      }

      ... on AbstractEntity {
        currentRevision {
          date
        }
      }

      ... on Course {
        currentRevision {
          content
        }
      }

      ... on Page {
        currentRevision {
          date
        }
      }

      ... on TaxonomyTerm {
        ...pathToRoot
      }

    }
  }
  
  fragment pathToRoot on TaxonomyTerm {
    title
    alias
    id
    parent {
      title
      alias
      id
      parent {
        title
        alias
        id
        parent {
          title
          alias
          id
          parent {
            title
            alias
            id
            parent {
              title
              alias
              id
              parent {
                title
                alias
                id
                parent {
                  title
                  alias
                  id
                  parent {
                    title
                    alias
                    id
                    parent {
                      title
                      alias
                      id
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  `
}

/**
 * This marker is used by https://github.com/serlo/unused-graphql-properties
 * to detect graphql statements.
 */
function gql(strings: TemplateStringsArray, ...expr: string[]): string {
  return strings.reduce((result, str, i) => {
    return result + expr[i - 1] + str
  })
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

run().catch((error) => console.error('Failed to update metadata:', error))
