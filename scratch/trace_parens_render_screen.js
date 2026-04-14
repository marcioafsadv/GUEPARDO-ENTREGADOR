import fs from 'fs';
const content = fs.readFileSync('c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx', 'utf8');
const lines = content.split('\n');
let balance = 0;
for (let i = 2709; i < 4182; i++) {
  const line = lines[i];
  const open = (line.match(/\(/g) || []).length;
  const close = (line.match(/\)/g) || []).length;
  balance += (open - close);
  if (balance !== 0) {
    // console.log(`${i+1}: Balance: ${balance} -> ${line}`);
  }
}
console.log(`Final Paren Balance: ${balance}`);
