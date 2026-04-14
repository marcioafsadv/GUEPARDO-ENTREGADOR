import fs from 'fs';
const content = fs.readFileSync('c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx', 'utf8');
const lines = content.split('\n');
const subContent = lines.slice(3938, 4015).join('\n');
let openCount = 0;
let closeCount = 0;
let openP = 0;
let closeP = 0;
for (let char of subContent) {
  if (char === '{') openCount++;
  if (char === '}') closeCount++;
  if (char === '(') openP++;
  if (char === ')') closeP++;
}
console.log(`Open: ${openCount}, Close: ${closeCount}`);
console.log(`Paren Open: ${openP}, Paren Close: ${closeP}`);
