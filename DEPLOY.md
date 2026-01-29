# 🚀 Guia de Deploy na Hostinger

Este guia fornece instruções passo a passo para fazer deploy do Guepardo Entregador na Hostinger.

---

## 📋 Pré-requisitos

- ✅ Conta na Hostinger com hospedagem ativa
- ✅ Node.js instalado (versão 16+)
- ✅ Projeto clonado do GitHub
- ✅ Credenciais do Supabase

---

## 🔧 Passo 1: Preparação Local

### 1.1 Clone o Repositório (se ainda não fez)

```bash
git clone https://github.com/marcioafsadv/GUEPARDO-ENTREGADOR.git
cd GUEPARDO-ENTREGADOR
```

### 1.2 Instale as Dependências

```bash
npm install
```

### 1.3 Configure Variáveis de Produção

Copie o arquivo de exemplo:

```bash
copy .env.production.example .env.production
```

Edite `.env.production` e adicione suas credenciais:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
```

---

## 🏗️ Passo 2: Criar Build de Produção

Execute o comando de build:

```bash
npm run build
```

Isso criará uma pasta `dist/` com os arquivos otimizados para produção.

**Verifique se a pasta `dist` foi criada** e contém:
- `index.html`
- Pasta `assets/` com arquivos JS e CSS

---

## 📤 Passo 3: Upload para Hostinger

### 3.1 Acesse o hPanel

1. Faça login em: https://hpanel.hostinger.com/
2. Selecione seu site/domínio
3. Clique em **"File Manager"** (Gerenciador de Arquivos)

### 3.2 Limpe a Pasta `public_html`

1. Navegue até a pasta `public_html`
2. Selecione **TODOS** os arquivos (Ctrl + A)
3. Clique em **"Delete"** (Excluir)
4. Confirme a exclusão

> **⚠️ IMPORTANTE**: Delete tudo para evitar conflitos!

### 3.3 Faça Upload dos Arquivos

**Método 1: Arrastar e Soltar (Recomendado)**

1. Abra a pasta `dist` no seu computador
2. Selecione **TODOS** os arquivos e pastas **DENTRO** de `dist`
3. Arraste para a janela do File Manager (dentro de `public_html`)
4. Aguarde o upload completar

**Método 2: Upload Manual**

1. No File Manager, clique em **"Upload"**
2. Selecione todos os arquivos de dentro da pasta `dist`
3. Aguarde o upload completar

### 3.4 Copie o Arquivo `.htaccess`

1. Volte para a raiz do projeto no seu computador
2. Localize o arquivo `.htaccess`
3. Faça upload deste arquivo para `public_html`

> **📌 NOTA**: O `.htaccess` é essencial para que as rotas do React funcionem!

---

## ✅ Passo 4: Verificação

### 4.1 Estrutura Final

Verifique se `public_html` tem esta estrutura:

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
└── [outros arquivos]
```

### 4.2 Teste o Site

1. Aguarde **2-3 minutos** para propagação
2. Limpe o cache do navegador (Ctrl + Shift + R)
3. Acesse seu domínio
4. Verifique se a aplicação carrega corretamente

### 4.3 Teste as Funcionalidades

- [ ] Página inicial carrega
- [ ] Login funciona
- [ ] Dashboard aparece
- [ ] Mapas carregam
- [ ] Sem erros no console (F12)

---

## 🔍 Troubleshooting

### ❌ Problema: Página em Branco

**Possíveis Causas**:
1. Arquivos não foram enviados corretamente
2. Falta o arquivo `.htaccess`
3. Caminhos incorretos

**Soluções**:

1. **Verifique os arquivos**:
   - Confirme que `index.html` está em `public_html`
   - Confirme que a pasta `assets` está em `public_html`

2. **Verifique o Console do Navegador**:
   - Pressione F12
   - Vá na aba "Console"
   - Veja se há erros de carregamento

3. **Refaça o upload**:
   - Delete tudo em `public_html`
   - Faça upload novamente

### ❌ Problema: Erro 404 nas Rotas

**Causa**: Arquivo `.htaccess` ausente

**Solução**:
1. Verifique se `.htaccess` está em `public_html`
2. Se não estiver, copie da raiz do projeto
3. Limpe o cache do navegador

### ❌ Problema: Erro de Conexão com Supabase

**Possíveis Causas**:
1. Variáveis de ambiente não configuradas
2. Credenciais incorretas

**Soluções**:

1. **Verifique `.env.production`**:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anonima
   ```

2. **Refaça o build**:
   ```bash
   npm run build
   ```

3. **Faça upload novamente**

### ❌ Problema: CSS/JS Não Carregam

**Causa**: Caminhos incorretos no build

**Solução**:

1. **Verifique `vite.config.ts`**:
   ```typescript
   export default defineConfig({
     base: '/', // Deve ser '/'
     // ...
   });
   ```

2. **Refaça o build**:
   ```bash
   rm -rf dist
   npm run build
   ```

3. **Faça upload novamente**

---

## 🔄 Atualizações Futuras

Quando fizer mudanças no código:

1. **Faça as alterações localmente**
2. **Teste localmente**: `npm run dev`
3. **Crie novo build**: `npm run build`
4. **Delete arquivos antigos** em `public_html`
5. **Faça upload** dos novos arquivos de `dist`
6. **Limpe o cache** do navegador

---

## 🎯 Checklist de Deploy

Use este checklist para garantir que tudo foi feito corretamente:

- [ ] Dependências instaladas (`npm install`)
- [ ] `.env.production` configurado com credenciais corretas
- [ ] Build criado sem erros (`npm run build`)
- [ ] Pasta `dist` gerada com sucesso
- [ ] `public_html` limpo (arquivos antigos deletados)
- [ ] Conteúdo de `dist` enviado para `public_html`
- [ ] Arquivo `.htaccess` copiado para `public_html`
- [ ] Aguardou 2-3 minutos para propagação
- [ ] Cache do navegador limpo
- [ ] Site testado e funcionando
- [ ] Console sem erros (F12)
- [ ] Login testado
- [ ] Dashboard testado
- [ ] Mapas funcionando

---

## 📞 Suporte

Se continuar com problemas:

1. Tire um print do erro no console (F12)
2. Verifique os logs no hPanel da Hostinger
3. Abra uma issue no GitHub
4. Consulte a documentação da Hostinger

---

## 🔗 Links Úteis

- [Hostinger hPanel](https://hpanel.hostinger.com/)
- [Documentação Hostinger](https://support.hostinger.com/)
- [Documentação Vite](https://vitejs.dev/guide/static-deploy.html)
- [Documentação Supabase](https://supabase.com/docs)

---

**Boa sorte com o deploy!** 🚀
