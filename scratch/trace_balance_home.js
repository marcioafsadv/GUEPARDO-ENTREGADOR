import fs from 'fs';
const content = fs.readFileSync('c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx', 'utf8');
const lines = content.split('\n');
let openB = 0;
let closeB = 0;
let openP = 0;
let closeP = 0;
for (let i = 2709; i < 3334; i++) {
  const line = lines[i];
  openB += (line.match(/{/g) || []).length;
  closeB += (line.match(/}/g) || []).length;
  openP += (line.match(/\(/g) || []).length;
  closeP += (line.match(/\)/g) || []).length;
  if (openB !== closeB || openP !== closeP) {
    // console.log(`${i+1}: B:${openB}/${closeB} P:${openP}/${closeP}`);
  } else {
    // console.log(`${i+1}: BALANCED`);
  }
}
console.log(`Final: B:${openB}/${closeB} P:${openP}/${closeP}`);
