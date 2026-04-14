import fs from 'fs';

const filePath = 'c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

const ORDERS_CODE = `      case 'ORDERS': {
        return (
          <div className={'h-full w-full p-6 overflow-y-auto pb-40 transition-colors duration-300 bg-[#0f0502]'}>
            <h1 className={'text-3xl font-black italic mb-2 text-white tracking-tight'}>Como podemos te ajudar?</h1>
            <p className="text-chocolate-muted font-bold text-xs uppercase tracking-widest mb-8">Central de Ajuda Guepardo</p>

            <div className="relative mb-10">
              <div className={'absolute left-5 top-1/2 -translate-y-1/2 text-[#FF6B00]'}>
                <i className="fas fa-search text-lg"></i>
              </div>
              <input
                type="text"
                placeholder="Digite sua dúvida aqui..."
                className={'w-full h-16 pl-14 pr-6 rounded-[24px] border border-white/10 outline-none font-bold text-sm transition-all bg-black/40 text-white placeholder:font-normal placeholder:text-zinc-600 focus:border-[#FF6B00]/50 focus:bg-black/60 shadow-xl'}
              />
            </div>

            <div className="mb-10">
              <h3 className={'text-chocolate-muted font-black uppercase text-[10px] tracking-[0.25em] mb-4 flex items-center gap-2'}>
                <i className="fas fa-star text-[#FFD700] text-[8px]"></i>
                <span>Perguntas Frequentes</span>
              </h3>
              <div className="space-y-3">
                {["Estou disponível e não recebo pedidos", "Quero alterar meu modal de entrega", "Não recebi o repasse"].map((item, index) => (
                  <button key={index} className={'w-full p-5 rounded-[24px] border chocolate-list-item flex justify-between items-center transition-all'}>
                    <span className={'text-xs font-black text-white'}>{item}</span>
                    <i className={'fas fa-chevron-right text-xs text-[#FF6B00]/40 group-active:text-[#FF6B00]'}></i>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <h3 className={'text-chocolate-muted font-black uppercase text-[10px] tracking-[0.25em] mb-4 flex items-center gap-2'}>
                <i className="fas fa-layer-group text-[#FF6B00] text-[8px]"></i>
                <span>Outros Assuntos</span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Entregas", icon: "fa-motorcycle", color: "#FF6B00" },
                  { label: "Cadastro", icon: "fa-id-card", color: "#33CCFF" },
                  { label: "Repasse", icon: "fa-hand-holding-dollar", color: "#00FF94" },
                  { label: "Guepardo", icon: "fa-paw", color: "#FFD700" }
                ].map((item, index) => (
                  <button key={index} className={'p-6 rounded-[28px] border chocolate-inner-card-v2 flex flex-col items-center space-y-3 transition-all bg-black/40 group'}>
                    <div className={'w-12 h-12 rounded-2xl flex items-center justify-center bg-black/60 border border-white/5 group-hover:scale-110 transition-transform'} style={{ color: item.color }}>
                      <i className={'fas ' + item.icon + ' text-xl'}></i>
                    </div>
                    <span className={'text-[10px] font-black uppercase tracking-widest text-white'}>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      }`;

const NOTIFICATIONS_CODE = `      case 'NOTIFICATIONS': {
        return (
          <div className={'h-full w-full p-6 overflow-y-auto pb-40 transition-colors duration-300 bg-[#0f0502]'}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <button onClick={() => setCurrentScreen('HOME')} className={'w-11 h-11 rounded-2xl flex items-center justify-center border chocolate-inner-card-v2'}>
                  <i className={'fas fa-chevron-left text-white'}></i>
                </button>
                <h1 className={'text-2xl font-black italic text-white tracking-tight'}>Avisos</h1>
              </div>
              <button
                onClick={markAllNotificationsRead}
                className={'text-[10px] font-black uppercase tracking-widest text-[#FF6B00] active:scale-95 transition-transform px-3 py-1 bg-[#FF6B00]/10 rounded-full'}
              >
                Limpar
              </button>
            </div>

            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-center opacity-40">
                <div className={'w-24 h-24 rounded-full flex items-center justify-center mb-6 bg-black/40 border border-white/5'}>
                  <i className="fas fa-bell-slash text-3xl text-[#FF6B00]"></i>
                </div>
                <p className={'text-sm font-black text-chocolate-muted uppercase tracking-[0.2em]'}>Silêncio na Savana</p>
                <p className="text-[10px] font-bold text-chocolate-muted mt-2">Sem novas notificações.</p>
              </div>
            ) : (
              <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                {notifications.map((notification) => {
                  const style = getNotificationIcon(notification.type);
                  return (
                    <div
                      key={notification.id}
                      className={'p-6 rounded-[32px] border relative transition-all duration-300 chocolate-list-item ' + (!notification.read ? 'border-[#FF6B00]/40 bg-[#FF6B00]/5' : '')}
                    >
                      <div className="flex items-start space-x-5 relative z-10">
                        <div className={'w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ' + style.bg + ' ' + style.color}>
                          <i className={'fas ' + style.icon + ' text-xl'}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start pt-1">
                            <h3 className={'text-[15px] font-black text-white mb-1 truncate pr-6 tracking-tight'}>{notification.title}</h3>
                            {!notification.read && <div className="w-2.5 h-2.5 rounded-full bg-[#FF6B00] shrink-0 mt-2 shadow-[0_0_10px_#FF6B00]"></div>}
                          </div>
                          <p className={'text-xs leading-relaxed mb-3 line-clamp-2 text-chocolate-muted'}>{notification.body}</p>
                          <p className={'text-[9px] font-black uppercase tracking-[0.2em] opacity-60 text-white'}>{notification.date}</p>
                        </div>
                      </div>
                      <div className="absolute top-4 right-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                          className={'w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-red-500/20 active:scale-90 text-chocolate-muted hover:text-red-500'}
                        >
                          <i className="fas fa-trash-can text-xs"></i>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }`;

const startIndex = lines.findIndex(l => l.includes("case 'ORDERS':"));
const endIndex = lines.findIndex(l => l.includes("case 'SETTINGS':"));

if (startIndex !== -1 && endIndex !== -1) {
    const head = lines.slice(0, startIndex);
    const tail = lines.slice(endIndex);
    const newContent = [...head, ORDERS_CODE, NOTIFICATIONS_CODE, ...tail].join('\n');
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Successfully repaired ORDERS and NOTIFICATIONS cases.');
} else {
    console.error('Could not find start/end marks.', { startIndex, endIndex });
}
