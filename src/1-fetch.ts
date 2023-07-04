import fs from 'node:fs'
import 'dotenv/config'
import { Readable } from 'node:stream'

const saEndpoint =
  'https://simpleanalytics.com/api/export/visits?hostname=de.serlo.org'

async function run() {
  const currentTime = Date.now()
  const endTime = currentTime - 24 * 60 * 60 * 1000
  const startTime = currentTime - 21 * 24 * 60 * 60 * 1000

  const timeRange = `&start=${timestampToDate(startTime)}&end=${timestampToDate(
    endTime
  )}`

  console.log('start fetching stats for time range', timeRange)

  const resPW = await fetch(saEndpoint + timeRange, {
    headers: {
      'Api-Key': process.env.SA_KEY,
    },
  })

  // type mismatch between fetch and stream api
  await Readable.fromWeb(resPW.body as any).pipe(
    fs.createWriteStream('./v2_current_de_serlo.org_visits.csv')
  )
}

run()

function timestampToDate(ts) {
  return new Date(ts).toISOString().substring(0, 10)
}
