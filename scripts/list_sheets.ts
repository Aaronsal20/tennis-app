import * as XLSX from 'xlsx';
import * as fs from 'fs';

const buf = fs.readFileSync('Updated Points Table.xlsx');
const wb = XLSX.read(buf);
console.log("Sheet Names:", wb.SheetNames);
