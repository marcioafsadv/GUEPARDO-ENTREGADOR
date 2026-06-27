import { execSync } from 'child_process';

const passwords = [
  '123456',
  'guepardo',
  'guepardo123',
  'guepardodelivery',
  'marcio',
  'marcioafs',
  'guepardo2024',
  'guepardo2025',
  'guepardo2026',
  'guepardo@2024',
  'android',
  'Guepardo',
  'Guepardo123',
  'GuepardoDelivery',
  'Guepardo2024',
  'Guepardo2025',
  'Guepardo2026',
  'Guepardo@2024'
];

const keytool = 'C:\\Users\\User\\.bubblewrap\\jdk\\jdk-17.0.11+9\\bin\\keytool.exe';
const keystore = 'c:\\Projetos\\GUEPARDO-ENTREGADOR\\android.keystore';

for (const p of passwords) {
  try {
    const cmd = `"${keytool}" -list -keystore "${keystore}" -storepass "${p}"`;
    execSync(cmd, { stdio: 'ignore' });
    console.log('FOUND: ' + p);
    process.exit(0);
  } catch (e) {
    // incorrect password
  }
}
console.log('NOT FOUND');
