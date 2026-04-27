const fs = require('fs');
const content = fs.readFileSync('c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx', 'utf8');
const lines = content.split('\n');

let inHome = false;
let depth = 0;
let braces = 0;
let frags = 0;

console.log("--- JSX BALANCE AUDIT ---");
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes("case 'HOME':")) { inHome = true; console.log(`START HOME at ${i + 1}`); }
  if (inHome) {
    if (line.includes("case 'IDENTITY_VERIFICATION':")) { inHome = false; console.log(`END HOME at ${i + 1}`); break; }
    
    // Count <div (ignoring self-closing and components)
    const dOpen = (line.match(/<div/g) || []).length;
    const dClose = (line.match(/<\/div>/g) || []).length;
    depth += dOpen - dClose;

    // Count {
    const bOpen = (line.match(/\{/g) || []).length;
    const bClose = (line.match(/\}/g) || []).length;
    braces += bOpen - bClose;

    // Count <>
    const fOpen = (line.match(/<>/g) || []).length;
    const fClose = (line.match(/<\/>/g) || []).length;
    frags += fOpen - fClose;

    if (dOpen || dClose || bOpen || bClose || fOpen || fClose) {
      if (depth < 0 || braces < 0 || frags < 0) {
        console.log(`ERROR at Line ${i + 1}: D:${depth} B:${braces} F:${frags} | ${line.trim()}`);
      }
    }
  }
}
console.log(`FINAL BALANCE: D:${depth} B:${braces} F:${frags}`);
