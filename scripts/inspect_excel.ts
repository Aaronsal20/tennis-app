import * as XLSX from 'xlsx';
import * as fs from 'fs';

const buf = fs.readFileSync('Updated Points Table.xlsx');
const wb = XLSX.read(buf);

console.log("Sheet Names:", wb.SheetNames);

for (const sheetName of wb.SheetNames) {
  console.log(`\n--- Sheet: ${sheetName} ---`);
  const sheet = wb.Sheets[sheetName];
  // Get a larger range or just raw dump to see structure
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // header: 1 gives array of arrays
  // Print first 50 rows to get an idea
  console.log(JSON.stringify(data.slice(0, 50), null, 2));
}
