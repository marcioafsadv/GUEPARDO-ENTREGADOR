import React, { useState, useEffect, useRef } from 'react';
import { DeliveryMission, ChatMessage, SenderType, ChatRoomType } from '../types';
import { supabase } from '../supabase';

interface ChatMultilateralModalProps {
  order: DeliveryMission | null;
  onClose: () => void;
  currentUser: { name: string };
  initialTab?: ChatRoomType;
  theme?: string;
}

export const ChatMultilateralModal: React.FC<ChatMultilateralModalProps> = ({ onClose, order, currentUser, initialTab = 'STORE_COURIER', theme = 'dark' }) => {
  const isOpen = !!order;
  // Inicia na aba solicitada (padrão Loja para o Entregador)
  const [activeTab, setActiveTab] = useState<ChatRoomType>(initialTab);

  // Sincronizar activeTab quando o modal abrir com uma nova prop
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Initial Messages & Setup Realtime
  useEffect(() => {
    if (!order || !isOpen) return;

    const fetchMessages = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('order_messages')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data.map(m => ({
          id: m.id,
          orderId: m.order_id,
          senderType: m.sender_type as SenderType,
          senderName: m.sender_name,
          text: m.content,
          timestamp: new Date(m.created_at),
          room: m.room_type as ChatRoomType
        })));
      }
      setIsLoading(false);
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`order-chat-${order.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'order_messages',
        filter: `order_id=eq.${order.id}`
      }, (payload) => {
        const newMessage: ChatMessage = {
          id: payload.new.id,
          orderId: payload.new.order_id,
          senderType: payload.new.sender_type as SenderType,
          senderName: payload.new.sender_name,
          text: payload.new.content,
          timestamp: new Date(payload.new.created_at),
          room: payload.new.room_type as ChatRoomType
        };
        setMessages(prev => {
           // Evitar duplicatas de mensagens enviadas por mim (já que o insert retorna via realtime)
           if (prev.some(m => m.id === newMessage.id)) return prev;
           return [...prev, newMessage];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order, isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  const handleSend = async () => {
    if (!message.trim() || !order) return;

    const textToSend = message.trim();
    setMessage(''); // Optimistic clear

    const { error } = await supabase
      .from('order_messages')
      .insert({
        order_id: order.id,
        room_type: activeTab,
        sender_type: 'COURIER',
        sender_name: currentUser.name || 'Guepardo',
        content: textToSend
      });

    if (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!isOpen || !order) return null;

  const currentMessages = messages.filter(m => m.room === activeTab);
  const isHistorical = order.status === 'completed' || order.status === 'cancelled';

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="w-full max-w-lg bg-[#0f0502] border border-[#FF6B00]/20 rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col h-[85vh] max-h-[750px] animate-in zoom-in-95 duration-500 relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF6B00]/5 rounded-full blur-[100px] pointer-events-none"></div>
        
        {/* HEADER */}
        <div className="p-8 pb-6 bg-gradient-to-b from-[#1a0a05] to-[#0f0502] border-b border-white/5 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-[#FF6B00]/10 border border-[#FF6B00]/20 rounded-2xl shadow-[0_0_20px_rgba(255,107,0,0.1)] flex items-center justify-center">
              <i className="fas fa-comment-dots text-[#FF6B00] text-2xl animate-pulse"></i>
            </div>
            <div>
              <h3 className="text-xl font-black italic tracking-tighter uppercase text-white leading-none neon-orange-glow-text">Messenger</h3>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-[10px] font-black text-[#FFC099]/40 uppercase tracking-[0.2em]">Pedido #{order.displayId || order.id.slice(-4)}</p>
                {isHistorical && (
                  <span className="bg-[#FF6B00]/10 text-[#FF6B00] px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border border-[#FF6B00]/20">Histórico</span>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-12 h-12 bg-white/5 hover:bg-[#FF6B00]/20 rounded-2xl transition-all text-white/40 hover:text-[#FF6B00] flex items-center justify-center border border-white/5 hover:border-[#FF6B00]/30"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* TABS */}
        <div className="px-6 py-4 bg-[#0f0502] flex gap-3 relative z-10">
          <button
            onClick={() => setActiveTab('STORE_COURIER')}
            className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center justify-center gap-2 border ${
              activeTab === 'STORE_COURIER' 
              ? 'bg-[#FF6B00] border-[#FF6B00] text-white shadow-[0_15px_30px_rgba(255,107,0,0.3)]' 
              : 'bg-white/5 border-white/5 text-[#FFC099]/40 hover:text-[#FFC099] hover:bg-white/10'
            }`}
          >
            <i className="fas fa-store text-xs" /> Loja
          </button>
          <button
            onClick={() => setActiveTab('COURIER_CLIENT')}
            className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center justify-center gap-2 border ${
              activeTab === 'COURIER_CLIENT' 
              ? 'bg-white/10 border-white/20 text-white shadow-xl' 
              : 'bg-white/5 border-white/5 text-[#FFC099]/40 hover:text-[#FFC099] hover:bg-white/10'
            }`}
          >
            <i className="fas fa-user text-xs" /> Cliente
          </button>
        </div>

        {/* MESSAGES AREA */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 bg-black/20 scrollbar-hide relative z-10"
        >
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(255,107,0,0.2)]"></div>
              <p className="mt-5 text-[10px] font-black uppercase tracking-[0.3em] text-[#FFC099]/30 italic">Sincronizando Caça...</p>
            </div>
          ) : currentMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-10">
              <i className="fas fa-comment-slash text-6xl mb-6 text-[#FF6B00]"></i>
              <p className="text-sm font-black uppercase tracking-[0.4em] text-white">Silêncio no Canal</p>
            </div>
          ) : (
            currentMessages.map((msg) => {
              const isMine = msg.senderType === 'COURIER';
              return (
                <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-4 fade-in duration-700`}>
                  <div className={`max-w-[85%] p-5 rounded-[1.8rem] relative group transition-all ${
                    isMine 
                    ? 'bg-gradient-to-br from-[#FF6B00] to-[#CC5200] text-white rounded-tr-none shadow-[0_15px_35px_rgba(255,107,0,0.25)]' 
                    : 'bg-[#1a0a05] border border-[#FF6B00]/20 text-[#FFC099] rounded-tl-none shadow-2xl'
                  }`}>
                    {!isMine && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#FF6B00] opacity-80">
                          {msg.senderName}
                        </span>
                      </div>
                    )}
                    {isMine && (
                      <div className="flex items-center gap-2 mb-2 justify-end">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                          Guepardo
                        </span>
                      </div>
                    )}
                    <p className="text-[15px] font-bold leading-relaxed tracking-tight">{msg.text}</p>
                  </div>
                  <span className="text-[9px] font-black text-[#FFC099]/20 mt-2.5 uppercase tracking-[0.2em] px-2 italic">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* INPUT AREA */}
        {!isHistorical ? (
          <div className="p-8 bg-gradient-to-t from-[#0f0502] to-transparent border-t border-white/5 backdrop-blur-3xl pb-10 relative z-10">
            <div className="flex gap-4 p-3 pr-3 bg-white/5 rounded-[2.5rem] border border-white/10 focus-within:border-[#FF6B00]/40 focus-within:bg-white/[0.08] transition-all duration-500 shadow-2xl">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Digitar..."
                className="flex-1 bg-transparent border-none focus:outline-none text-[15px] font-bold text-white px-5 placeholder:text-[#FFC099]/20"
              />
              <button
                onClick={handleSend}
                disabled={!message.trim()}
                className="w-14 h-14 bg-[#FF6B00] rounded-2xl text-white flex items-center justify-center hover:scale-110 active:scale-90 transition-all disabled:opacity-20 disabled:scale-100 shadow-[0_10px_25px_rgba(255,107,0,0.4)] heartbeat-pulse"
              >
                <i className="fas fa-paper-plane text-xl transform rotate-[15deg]"></i>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-10 bg-[#0f0502] border-t border-white/5 backdrop-blur-3xl pb-12 flex flex-col items-center justify-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/20 mb-1">
              <i className="fas fa-lock text-sm"></i>
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/20">Transmissão Encerrada</p>
            <p className="text-[10px] font-bold text-[#FFC099]/10 text-center uppercase tracking-widest leading-relaxed">Este canal está arquivado.</p>
          </div>
        )}
      </div>
    </div>
  );
};
