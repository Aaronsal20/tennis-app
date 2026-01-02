import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(process.cwd(), '2nd edition.xlsx');
const workbook = xlsx.readFile(filePath);

const sheetName = 'Contact Details';
const sheet = workbook.Sheets[sheetName];

// Convert sheet to JSON to see the structure
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log(`First 10 rows of ${sheetName}:`);
data.slice(0, 10).forEach((row, index) => {
  console.log(index, row);
});
