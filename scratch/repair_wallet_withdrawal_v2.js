import fs from 'fs';

const filePath = 'c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const BOTCHED = `                      ))
            </button>`;

const REPAIR = `                      ))
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      }
      case 'WITHDRAWAL_REQUEST': {
        return (
        <div className={\`h-full w-full p-6 overflow-y-auto pb-40 transition-colors duration-300 bg-[#0f0502]\`}>
          <div className="flex items-center space-x-4 mb-8">
            <button onClick={() => setCurrentScreen('WALLET')} className={\`w-11 h-11 rounded-2xl flex items-center justify-center border chocolate-inner-card-v2\`}>
              <i className="fas fa-chevron-left text-white\"></i>
            </button>`;

if (content.includes(BOTCHED)) {
    content = content.replace(BOTCHED, REPAIR);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully repaired WALLET/WITHDRAWAL_REQUEST via string replacement.');
} else {
    console.error('Botched string not found. Trying flexible search...');
    const regex = /                      \)\)\n            <\/button>/;
    if (regex.test(content)) {
        content = content.replace(regex, REPAIR);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Successfully repaired via regex.');
    } else {
        console.error('Still not found.');
    }
}
