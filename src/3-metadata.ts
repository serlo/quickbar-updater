import { request } from 'graphql-request'
import fs from 'fs'

const quicklinks = require('../quicklinks.json')

let metaData = []

const fastMode = process.env.FAST // using staging

const endpoint = fastMode
  ? 'https://api.serlo-staging.dev/graphql'
  : 'https://api.serlo.org/graphql'

const limit = fastMode ? 100000 : 1800

run()

async function run() {
  // Step 0 - fetch metadata cache
  console.log('load from previous build')
  const res = await fetch(
    'https://serlo.github.io/quickbar-updater/meta_data.json'
  )
  let metaData = await res.json()

  // Step 1 add new stuff
  const ids = new Set()
  metaData.forEach((entry) => ids.add(entry.id))
  for (const entry of quicklinks) {
    if (!ids.has(entry.id)) {
      metaData.push(entry)
    }
  }

  // Step 2
  const ids2 = new Set()
  quicklinks.forEach((entry) => ids2.add(entry.id))

  const timeCap = Date.now() - 24 * 60 * 60 * 1000 // 1 day

  const toFetch = metaData.filter((entry) => {
    if (entry.time > 0) {
      if (entry.time > timeCap) {
        return false
      }
    }

    if (ids2.has(entry.id)) {
      if (entry.meta && entry.meta.uuid) {
        if (
          !['Page', 'CoursePage', 'TaxonomyTerm', 'Article'].includes(
            entry.meta.uuid.__typename
          )
        ) {
          return false
        }
      }
      return true
    }
    return false
  })

  console.log('to fetch', toFetch.length)
  console.log('limit', limit)

  // Step 3
  toFetch.sort((a, b) => {
    const timeA = a.time || -2
    const timeB = b.time || -2
    return timeA - timeB
  })

  const todo = toFetch.slice(0, limit)

  // Step 4
  for (let i = 0; i < todo.length; i++) {
    const entry = todo[i]
    try {
      console.log((i / todo.length) * 100, '%', entry.id)
      const data = await request(endpoint, buildQuery(entry.id))
      entry.meta = data
      entry.time = Date.now()
      if (!fastMode) {
        await sleep(50)
      }
    } catch (e) {
      console.log(entry.id, e)
      await sleep(500)
    }
    if ((i + 1) % 250 == 0) {
      console.log('saving at', i + 1)
      save()
    }
  }

  save()

  function save() {
    if (!fs.existsSync('_output')) {
      fs.mkdirSync('_output')
    }
    fs.writeFileSync('_output/meta_data.json', JSON.stringify(metaData))
  }
}

function buildQuery(id) {
  return `
{
  uuid (id: ${id}) {
      __typename
      alias

      ... on Page {
        trashed
        currentRevision {
          title
        }
        navigation {
          path {nodes {label}}
        }
      }

      ... on CoursePage {
        trashed
        currentRevision {
          title
        }
        course {
          currentRevision {
            title
          }
          taxonomyTerms {
            nodes {
              navigation {
                path {
                  nodes {
                    label
                  }
                }
              }
            }
          }
        }
      }
      
      ... on Article {
        trashed
        currentRevision {
          title
        }
        taxonomyTerms {
          nodes {
            navigation {
              path {
                nodes {
                  label
                }
              }
            }
          }
        }
      }

      ... on TaxonomyTerm {
        name
        trashed

        navigation {
          path {
            nodes {
              label
            }
          }
        }
      }
  }
}`
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
