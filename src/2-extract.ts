import fs from 'fs';
import readline from 'readline';
const resolver = require('../resolver.json');

const INPUT_FILE_NAME = './v2_current_de_serlo.org_visits.csv'
const OUTPUT_FILE_NAME = './quicklinks.json'

const visitCounts = {};

const visitsFileReader = readline.createInterface({
  input: fs.createReadStream(INPUT_FILE_NAME),
  terminal: false,
});

// Function to extract ID from the given path using the original regex
const extractIdFromPath = (path) => {
  // Remove protocol and domain
  const cleanedPath = path.replace(/^https?:\/\/de.serlo.org/, '');
  // Original regular expression for matching ID patterns in the path
  const reg =
    /^\/(?<subject>[\w-]+\/)?(?<id>\d+)(?<coursePageId>\/[0-9a-f]+)?\/(?<title>[^/]*)$/;

  const simpleReg = /^\/(?<id>\d+)$/;
  const match = reg.exec(cleanedPath) ?? simpleReg.exec(cleanedPath);

  // Parse the ID from regex match groups
  if (match && match.groups?.id) {
    const id = parseInt(match.groups.id);
    const coursePageId = match.groups.coursePageId?.substring(1);

    if(coursePageId) return `${id}#${coursePageId}`
    return id
  }

  // Attempt to resolve ID using the resolver mapping
  const resolvedId = resolver.path2uuid[cleanedPath];
  return resolvedId > 0 ? resolvedId : -1;
};

// Process each line from the CSV file
visitsFileReader.on('line', (line) => {
  const columns = line.split(',');

  // Skip lines that are too short or contain headers
  if (columns.length < 5 || columns[0].includes('added_date')) return;

  const id = extractIdFromPath(columns[1]);
  if (id === -1) return; // Skip if no valid ID is extracted

  // Increment visit count for the extracted ID
  visitCounts[id] = (visitCounts[id] || 0) + 1;
});


// Sort visit counts and save file
visitsFileReader.on('close', () => {
  const sortedVisits = Object.entries(visitCounts)
    .map(([id, count]) => ({ id, count: count as number}))
    .sort((a, b) => b.count - a.count);
  fs.writeFileSync(OUTPUT_FILE_NAME, JSON.stringify(sortedVisits));
  console.log(`Processed ${sortedVisits.length} entries.`);
});
