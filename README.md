# 🐆 Guepardo Entregador

Sistema completo de gestão de entregas para entregadores autônomos, desenvolvido com React, TypeScript e Supabase.

[![TypeScript](https://img.shields.io/badge/TypeScript-90.6%25-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2.0-61dafb)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0.8-646cff)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Latest-3ecf8e)](https://supabase.com/)

---

## 📋 Sobre o Projeto

O **Guepardo Entregador** é uma plataforma moderna que permite aos entregadores gerenciar suas entregas, acompanhar ganhos, visualizar histórico e muito mais. O sistema inclui:

- 📦 **Gestão de Entregas**: Acompanhamento em tempo real de entregas ativas e histórico completo
- 💰 **Controle Financeiro**: Visualização de ganhos diários, semanais e mensais
- 📊 **Dashboard Analítico**: Estatísticas e métricas de desempenho
- 👤 **Onboarding Completo**: Processo de cadastro guiado para novos entregadores
- 🔐 **Autenticação Segura**: Sistema de login integrado com Supabase
- 🗺️ **Mapas Interativos**: Visualização de rotas com Leaflet
- 📱 **Interface Responsiva**: Design moderno e intuitivo

---

## 🚀 Tecnologias Utilizadas

- **React** 18.2.0 + **TypeScript** - Framework e tipagem
- **Vite** 5.0.8 - Build tool e dev server ultrarrápido
- **Supabase** - Backend as a Service (autenticação e banco de dados)
- **Leaflet** - Mapas interativos
- **CSS Modules** - Estilização componentizada

---

## 📦 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** (versão 16 ou superior) - [Download](https://nodejs.org/)
- **npm** ou **yarn**
- Conta no [Supabase](https://supabase.com) (gratuita)

---

## ⚙️ Instalação e Configuração

### 1️⃣ Clone o Repositório

```bash
git clone https://github.com/marcioafsadv/GUEPARDO-ENTREGADOR.git
cd GUEPARDO-ENTREGADOR
```

### 2️⃣ Instale as Dependências

```bash
npm install
```

### 3️⃣ Configure as Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env.local`:

```bash
# Windows
copy .env.example .env.local

# Linux/Mac
cp .env.example .env.local
```

Edite o arquivo `.env.local` e adicione suas credenciais do Supabase:

```env
VITE_SUPABASE_URL=sua_url_do_supabase_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
```

> **⚠️ IMPORTANTE**: Nunca commite o arquivo `.env.local` no Git! Ele contém informações sensíveis.

### 4️⃣ Configure o Banco de Dados Supabase

1. Acesse seu projeto no [Supabase Dashboard](https://app.supabase.com/)
2. Vá em **SQL Editor**
3. Execute o script SQL localizado em `migrations/` para criar as tabelas necessárias

### 5️⃣ Execute o Projeto Localmente

```bash
npm run dev
```

O aplicativo estará disponível em `http://localhost:5173`

---

## 🌐 Deploy na Hostinger

### Preparação do Build

1. **Configure as variáveis de produção**:

   Copie `.env.production.example` para `.env.production`:
   ```bash
   copy .env.production.example .env.production
   ```

   Edite `.env.production` e adicione suas credenciais do Supabase.

2. **Crie o build de produção**:

   ```bash
   npm run build
   ```

   Isso criará uma pasta `dist/` com os arquivos otimizados.

### Upload para Hostinger

1. **Acesse o hPanel da Hostinger**: https://hpanel.hostinger.com/

2. **Abra o File Manager** (Gerenciador de Arquivos)

3. **Navegue até `public_html`**

4. **Delete todos os arquivos antigos** em `public_html`

5. **Faça upload dos arquivos**:
   - Abra a pasta `dist` no seu computador
   - Selecione **TODOS** os arquivos e pastas **DENTRO** de `dist`
   - Arraste para `public_html` no File Manager
   - **Importante**: Envie o **conteúdo** de `dist`, não a pasta em si

6. **Copie o arquivo `.htaccess`**:
   - Faça upload do arquivo `.htaccess` (da raiz do projeto) para `public_html`
   - Este arquivo é essencial para que as rotas funcionem corretamente

### Estrutura Final em `public_html`

```
public_html/
├── index.html
├── .htaccess
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   ├── react-vendor-[hash].js
│   ├── supabase-[hash].js
│   └── leaflet-[hash].js
└── [outros arquivos estáticos]
```

### Verificação

1. Aguarde 2-3 minutos após o upload
2. Limpe o cache do navegador (Ctrl + Shift + R)
3. Acesse seu domínio

---

## 🛠️ Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria build de produção otimizado
- `npm run preview` - Preview do build de produção localmente

---

## 📁 Estrutura do Projeto

```
guepardo-entregador/
├── components/          # Componentes React reutilizáveis
├── utils/              # Funções utilitárias
├── migrations/         # Scripts SQL do banco de dados
├── public/             # Arquivos estáticos
├── App.tsx             # Componente principal da aplicação
├── supabase.ts         # Configuração e funções do Supabase
├── types.ts            # Definições de tipos TypeScript
├── constants.tsx       # Constantes da aplicação
├── vite.config.ts      # Configuração do Vite
├── .htaccess           # Configuração Apache para SPA
└── package.json        # Dependências e scripts
```

---

## 🔑 Funcionalidades Principais

### Onboarding de Entregadores
- Cadastro completo com validação de dados
- Upload de documentos (CNH, comprovante de residência)
- Informações de veículo e conta bancária
- Validação em tempo real

### Dashboard do Entregador
- Visualização de entregas ativas
- Histórico completo de entregas
- Estatísticas de desempenho
- Controle financeiro detalhado

### Sistema de Entregas
- Status em tempo real
- Navegação integrada com mapas
- Confirmação de entrega
- Avaliação de clientes

### Mapas Interativos
- Visualização de rotas com Leaflet
- Marcadores personalizados
- Rastreamento em tempo real

---

## 🔒 Segurança

- ✅ Todas as credenciais sensíveis em variáveis de ambiente
- ✅ `.env.local` e `.env.production` no `.gitignore`
- ✅ Row Level Security (RLS) no Supabase
- ✅ Autenticação via Supabase Auth
- ✅ Headers de segurança configurados no `.htaccess`

---

## 🐛 Troubleshooting

### Página em branco após deploy

**Causa**: Arquivos não foram enviados corretamente ou falta o `.htaccess`

**Solução**:
1. Verifique se `index.html` está em `public_html`
2. Verifique se a pasta `assets` está em `public_html`
3. Certifique-se de que o `.htaccess` foi copiado
4. Limpe o cache do navegador

### Erro 404 nas rotas

**Causa**: Arquivo `.htaccess` ausente ou mal configurado

**Solução**: Copie o arquivo `.htaccess` do projeto para `public_html`

### Erro de conexão com Supabase

**Causa**: Variáveis de ambiente não configuradas no build

**Solução**:
1. Verifique se `.env.production` está preenchido
2. Refaça o build: `npm run build`
3. Faça upload novamente

### Build falha com erro de módulo

**Causa**: Dependências não instaladas ou corrompidas

**Solução**:
```bash
# Limpe e reinstale
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

---

## 📝 Licença

Este projeto está sob a licença MIT.

---

## 👥 Autores

**Torres & Silva - Papaléguas**

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique a seção de [Troubleshooting](#-troubleshooting)
2. Abra uma [Issue](https://github.com/marcioafsadv/GUEPARDO-ENTREGADOR/issues)
3. Consulte a [documentação do Supabase](https://supabase.com/docs)

---

## 🎯 Roadmap

- [ ] Notificações push
- [ ] Chat em tempo real com clientes
- [ ] Modo offline
- [ ] App mobile nativo
- [ ] Integração com múltiplas plataformas de delivery

---

Desenvolvido com ❤️ para facilitar a vida dos entregadores autônomos.
