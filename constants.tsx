
import React from 'react';
import { NotificationModel, NotificationType } from './types';

export const COLORS = {
  primary: '#FF6B00', // Guepardo Orange
  secondary: '#FFFFFF',
  accent: '#FFD700', // Gold Yellow
  background: '#121212', // Dark Mode Default
  card: '#1E1E1E',
  text: '#FFFFFF',
  textMuted: '#A0A0A0',
  success: '#22C55E',
  danger: '#EF4444'
};

export const DEFAULT_AVATAR = "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix";

/**
 * Motor de cálculo de ganhos Guepardo baseado na distância (Base iFood 2025/26)
 */
export const calculateEarnings = (distance: number): number => {
  const MIN_FEE = 7.50;
  const KM_RATE = 1.50;

  const calculated = distance * KM_RATE;
  return Math.max(MIN_FEE, calculated);
};

export const MOCK_STORES = [
  {
    name: 'Burguer King - Itu',
    address: 'Av. Dr. Otaviano Pereira Mendes, 363 - Liberdade, Itu - SP',
    items: ['1x Whopper Especial', '1x Batata Média', '1x Coca-Cola 500ml'],
    collectionCode: '5520'
  },
  {
    name: 'Restaurante Tonilu Café e Cervejaria',
    address: 'Plaza Shopping, Av. Dr. Ermelindo Maffei, 1199 - Jardim Paraiso, Itu - SP',
    items: ['1x Almoço Executivo', '1x Café Expresso Gourmet', '1x Cerveja Artesanal'],
    collectionCode: '0981'
  },
  {
    name: 'Padaria e Conveniência Rebeca',
    address: 'Av. Dr. Otaviano Pereira Mendes, 1060 - Liberdade, Itu - SP',
    items: ['10x Pão Francês', '1x Leite Integral 1L', '1x Presunto e Queijo 200g'],
    collectionCode: '1025'
  },
  {
    name: 'Big Lanches',
    address: 'Av. Caetano Ruggieri, 2383 - Parque Res. Mayard, Itu - SP',
    items: ['1x X-Tudo Completo', '1x Porção de Batata G', '1x Suco de Laranja 500ml'],
    collectionCode: '4400'
  }
];

export const MOCK_CUSTOMERS = [
  {
    name: 'Washington Torres',
    address: 'Rua das Andradas, 468, Sala 3, Centro - Itu/SP',
    phoneSuffix: '6461'
  },
  {
    name: 'Marcio Silva',
    address: 'Rua Carlos Scalet, 58, Presid. Medici, Itu/SP',
    phoneSuffix: '1759'
  },
  {
    name: 'Ricardo Silva',
    address: 'Rua Paula Souza, 500 - Centro, Itu - SP',
    phoneSuffix: '9545'
  }
];

export const MOCK_MISSION: any = {
  id: 'PL-9842',
  storeName: MOCK_STORES[0].name,
  storeAddress: MOCK_STORES[0].address,
  customerName: MOCK_CUSTOMERS[2].name,
  customerAddress: MOCK_CUSTOMERS[2].address,
  customerPhoneSuffix: MOCK_CUSTOMERS[2].phoneSuffix,
  distanceToStore: '0.8 km',
  distanceToCustomer: '2.1 km',
  totalDistance: 2.9,
  earnings: 8.00,
  timeLimit: 25,
  collectionCode: MOCK_STORES[0].collectionCode,
  items: MOCK_STORES[0].items
};

export const MOCK_HISTORY = [
  { id: '1', type: 'Entrega #PL-9801', amount: 12.40, time: '14:20', status: 'COMPLETED' },
  { id: '2', type: 'Entrega #PL-9788', amount: 18.20, time: '13:15', status: 'COMPLETED' },
  { id: '3', type: 'Entrega #PL-9750', amount: 9.90, time: '12:05', status: 'COMPLETED' },
  { id: '4', type: 'Bônus de Incentivo', amount: 5.00, time: '11:00', status: 'COMPLETED' },
];

// Added missing mock data for weekly payouts
export const weeklyPayouts = [
  { id: '1', period: '12 Out - 18 Out', amount: 450.20, status: 'PAGO' },
  { id: '2', period: '05 Out - 11 Out', amount: 380.15, status: 'PAGO' },
  { id: '3', period: '28 Set - 04 Out', amount: 510.50, status: 'PAGO' },
];

// Added missing mock data for past orders
export const pastOrders = [
  { id: 'PL-9801', store: 'Burguer King - Itu', value: 12.40, date: 'Hoje, 14:20', status: 'ENTREGUE', summary: '1x Whopper + Batata' },
  { id: 'PL-9788', store: 'Big Lanches', value: 18.20, date: 'Ontem, 13:15', status: 'ENTREGUE', summary: '2x X-Tudo' },
  { id: 'PL-9750', store: 'Tonilu Café', value: 9.90, date: '21/10, 12:05', status: 'ENTREGUE', summary: '1x Almoço Executivo' },
];

export const MOCK_NOTIFICATIONS: NotificationModel[] = [
  {
    id: '1',
    type: NotificationType.FINANCIAL,
    title: 'Nova Gorjeta Recebida',
    body: 'Você recebeu uma gorjeta de R$ 5,00 na entrega #PL-9801. Continue assim!',
    date: 'Hoje, 14:30',
    read: false
  },
  {
    id: '2',
    type: NotificationType.URGENT,
    title: 'Atenção ao seu Documento',
    body: 'Sua CNH vence em 15 dias. Atualize seus dados para continuar recebendo rotas.',
    date: 'Hoje, 09:00',
    read: false
  },
  {
    id: '3',
    type: NotificationType.PROMOTION,
    title: 'Missão Noturna',
    body: 'Ganhe +20% em todas as entregas realizadas na região Central hoje entre 18h e 22h.',
    date: 'Ontem, 16:00',
    read: true
  },
  {
    id: '4',
    type: NotificationType.SYSTEM,
    title: 'Atualização do App',
    body: 'Uma nova versão do Guepardo Delivery está disponível. Atualize para ver as novidades.',
    date: '20 Out, 10:00',
    read: true
  }
];
