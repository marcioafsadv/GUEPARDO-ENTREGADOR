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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-lg bg-[#1A0900] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[700px] animate-in fade-in zoom-in duration-300">
        
        {/* HEADER */}
        <div className="p-6 bg-gradient-to-b from-[#2D0F00] to-[#1A0900] border-b border-white/5 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF6B00]/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-[#FF6B00] rounded-2xl shadow-[0_0_20px_rgba(255,107,0,0.3)] flex items-center justify-center">
              <i className="fas fa-comments text-white text-xl"></i>
            </div>
            <div>
              <h3 className="text-lg font-black italic tracking-tighter uppercase text-white leading-none">Chat Multilateral</h3>
              <p className="text-[10px] font-black text-[#FF6B00] uppercase tracking-[0.2em] mt-1.5">Pedido #{order.displayId || order.id.slice(-4)}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-white flex items-center justify-center">
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        {/* TABS */}
        <div className="px-5 py-3 bg-[#1A0900] flex gap-2">
          <button
            onClick={() => setActiveTab('STORE_COURIER')}
            className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 border ${
              activeTab === 'STORE_COURIER' 
              ? 'bg-[#FF6B00] border-[#FF6B00] text-white shadow-[0_10px_20px_rgba(255,107,0,0.2)]' 
              : 'bg-transparent border-white/5 text-white/20 hover:text-white/40 hover:bg-white/5'
            }`}
          >
            <i className="fas fa-store text-xs" /> Loja x Entregador
          </button>
          <button
            onClick={() => setActiveTab('COURIER_CLIENT')}
            className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 border ${
              activeTab === 'COURIER_CLIENT' 
              ? 'bg-white/10 border-white/20 text-white shadow-xl' 
              : 'bg-transparent border-white/5 text-white/20 hover:text-white/40 hover:bg-white/5'
            }`}
          >
            <i className="fas fa-user text-xs" /> Entregador x Cliente
          </button>
        </div>

        {/* MESSAGES AREA */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-5 space-y-5 bg-black/40 scrollbar-hide shadow-inner relative"
        >
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 italic">Sincronizando...</p>
            </div>
          ) : currentMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-10">
              <i className="fas fa-comment-slash text-5xl mb-4 text-white"></i>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-white">Silêncio no Canal</p>
            </div>
          ) : (
            currentMessages.map((msg) => {
              const isMine = msg.senderType === 'COURIER';
              return (
                <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 fade-in duration-500`}>
                  <div className={`max-w-[85%] p-4 rounded-[1.2rem] relative group ${
                    isMine 
                    ? 'bg-[#FF6B00] text-white rounded-tr-none shadow-[0_8px_25px_rgba(255,107,0,0.2)]' 
                    : 'bg-[#121212] border border-white/10 text-white rounded-tl-none shadow-lg'
                  }`}>
                    {!isMine && (
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#FF6B00]">
                          {msg.senderName}
                        </span>
                      </div>
                    )}
                    {isMine && (
                      <div className="flex items-center gap-2 mb-1.5 justify-end">
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/60">
                          Você
                        </span>
                      </div>
                    )}
                    <p className="text-[14px] font-bold leading-relaxed tracking-tight">{msg.text}</p>
                  </div>
                  <span className="text-[8px] font-black text-white/20 mt-1.5 uppercase tracking-widest px-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* INPUT AREA */}
        <div className="p-6 bg-[#2D0F00]/40 border-t border-white/5 backdrop-blur-3xl pb-10">
          <div className="flex gap-3 bg-black/60 p-2 rounded-[1.8rem] border border-white/10 focus-within:border-[#FF6B00]/50 transition-all duration-300">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Digite sua mensagem..."
              className="flex-1 bg-transparent border-none focus:outline-none text-[14px] font-bold text-white px-4 placeholder:text-white/20"
            />
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className="w-12 h-12 bg-[#FF6B00] rounded-2xl text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100 shadow-[0_8px_15px_rgba(255,107,0,0.3)]"
            >
              <i className="fas fa-paper-plane text-lg"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
