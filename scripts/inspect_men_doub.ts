import * as XLSX from 'xlsx';
import * as fs from 'fs';

const buf = fs.readFileSync('Updated Points Table.xlsx');
const wb = XLSX.read(buf);
const sheet = wb.Sheets['men doub'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
console.log(JSON.stringify(data.slice(0, 20), null, 2));
