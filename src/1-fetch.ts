import fs from 'node:fs'
import 'dotenv/config'
import { Readable } from 'node:stream'

const saEndpoint =
  'https://simpleanalytics.com/api/export/visits?hostname=de.serlo.org'
  const DAY = 24 * 60 * 60 * 1000;

async function run() {
  const currentTime = Date.now();
  const endTime = timestampToDate(currentTime - DAY);
  const startTime = timestampToDate(currentTime - 21 * DAY);
  const timeRange = `&start=${startTime}&end=${endTime}`;

  console.log(`Start fetching stats from: ${startTime} to ${endTime}`);

  const resPW = await fetch(saEndpoint + timeRange, {
    headers: {
      'Api-Key': process.env.SA_KEY,
    } as HeadersInit,
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
