# 🐆 Guepardo Entregador

Sistema completo de gestão de entregas para entregadores autônomos, desenvolvido com React, TypeScript e Supabase.

## 📋 Sobre o Projeto

O **Guepardo Entregador** é uma plataforma moderna que permite aos entregadores gerenciar suas entregas, acompanhar ganhos, visualizar histórico e muito mais. O sistema inclui:

- 📦 **Gestão de Entregas**: Acompanhamento em tempo real de entregas ativas e histórico completo
- 💰 **Controle Financeiro**: Visualização de ganhos diários, semanais e mensais
- 📊 **Dashboard Analítico**: Estatísticas e métricas de desempenho
- 👤 **Onboarding Completo**: Processo de cadastro guiado para novos entregadores
- 🔐 **Autenticação Segura**: Sistema de login integrado com Supabase
- 📱 **Interface Responsiva**: Design moderno e intuitivo

## 🚀 Tecnologias Utilizadas

- **React** + **TypeScript** - Framework e tipagem
- **Vite** - Build tool e dev server
- **Supabase** - Backend as a Service (autenticação e banco de dados)
- **Lucide React** - Ícones modernos
- **CSS Modules** - Estilização componentizada

## 📦 Pré-requisitos

- **Node.js** (versão 16 ou superior)
- **npm** ou **yarn**
- Conta no [Supabase](https://supabase.com)

## ⚙️ Configuração do Projeto

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/guepardo-entregador.git
cd guepardo-entregador
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie o arquivo `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Edite o arquivo `.env.local` e adicione suas credenciais do Supabase:

```env
VITE_SUPABASE_URL=sua_url_do_supabase_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
```

> **⚠️ IMPORTANTE**: Nunca commite o arquivo `.env.local` no Git! Ele contém informações sensíveis.

### 4. Configure o banco de dados Supabase

Execute a migration SQL localizada em `migrations/` no seu projeto Supabase para criar as tabelas necessárias.

### 5. Execute o projeto

```bash
npm run dev
```

O aplicativo estará disponível em `http://localhost:5173`

## 📁 Estrutura do Projeto

```
guepardo-entregador/
├── components/          # Componentes React reutilizáveis
├── utils/              # Funções utilitárias
├── migrations/         # Scripts SQL do banco de dados
├── public/             # Arquivos estáticos
├── App.tsx             # Componente principal
├── supabase.ts         # Configuração do Supabase
├── types.ts            # Definições de tipos TypeScript
└── constants.tsx       # Constantes da aplicação
```

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
- Navegação integrada
- Confirmação de entrega
- Avaliação de clientes

## 🛠️ Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria build de produção
- `npm run preview` - Preview do build de produção

## 🔒 Segurança

- Todas as credenciais sensíveis devem estar em `.env.local`
- O arquivo `.env.local` está no `.gitignore` e **nunca** deve ser commitado
- Use Row Level Security (RLS) no Supabase para proteger os dados
- Autenticação via Supabase Auth

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT.

## 👥 Autores

**Torres & Silva - Papaléguas**

---

Desenvolvido com ❤️ para facilitar a vida dos entregadores autônomos.
