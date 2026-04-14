import fs from 'fs';
const content = fs.readFileSync('c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx', 'utf8');
const lines = content.split('\n');
let openB = 0;
let closeB = 0;
for (let i = 3664; i < 4182; i++) {
  const line = lines[i];
  openB += (line.match(/{/g) || []).length;
  closeB += (line.match(/}/g) || []).length;
  if (openB < closeB) {
      console.log(`EXTRA CLOSE AT LINE ${i+1}: ${line}`);
      break;
  }
}
