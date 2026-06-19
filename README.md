# 🚀 WE Corp — Plataforma de Eventos e Parcerias

A **WE Corp** é uma aplicação web Full Stack que conecta empresas, prestadores de serviço e clientes em um único ecossistema: gestão de eventos, venda de ingressos, vitrine de serviços com avaliações, administração de assinaturas para parceiros institucionais e central de suporte via tickets.

[Assista ao vídeo de demonstração](https://youtu.be/51kPsZMEhKQ)

---

## 📑 Índice

1. [Visão Geral e Arquitetura](#1-visão-geral-e-arquitetura)
2. [Estrutura Completa de Arquivos](#2-estrutura-completa-de-arquivos)
3. [Tecnologias e Dependências](#3-tecnologias-e-dependências)
4. [Lógica de Negócio e Papéis de Usuário](#4-lógica-de-negócio-e-papéis-de-usuário)
5. [Banco de Dados — Como Foi Construído](#5-banco-de-dados--como-foi-construído)
6. [Onde Está o Seed (Dados Iniciais)](#6-onde-está-o-seed-dados-iniciais)
7. [Sistema de Pagamentos Híbrido: PIX vs Cartão vs Boleto](#7-sistema-de-pagamentos-híbrido-pix-vs-cartão-vs-boleto)
8. [Upload de Arquivos com Multer](#8-upload-de-arquivos-com-multer)
9. [Geração de Contratos em PDF (jsPDF)](#9-geração-de-contratos-em-pdf-jspdf)
10. [API RESTful — Referência Completa de Endpoints](#10-api-restful--referência-completa-de-endpoints)
11. [Autenticação e Sessão](#11-autenticação-e-sessão)
12. [Mapa de Páginas do Frontend](#12-mapa-de-páginas-do-frontend)
13. [Componentes Compartilhados do Frontend](#13-componentes-compartilhados-do-frontend)
14. [Problemas Encontrados e Corrigidos (Histórico Completo)](#14-problemas-encontrados-e-corrigidos-histórico-completo)
15. [⚠️ Aviso de Segurança — Chaves Removidas do Repositório](#15-️-aviso-de-segurança--chaves-removidas-do-repositório)
16. [Como Executar o Projeto na Sua Máquina](#16-como-executar-o-projeto-na-sua-máquina)
17. [Testando a API via Postman/Insomnia](#17-testando-a-api-via-postmaninsomnia)
18. [Limitações Conhecidas e Próximos Passos](#18-limitações-conhecidas-e-próximos-passos)

---

## 1. Visão Geral e Arquitetura

O projeto é dividido em duas pastas independentes, cada uma com seu próprio `package.json`:

```
trabalhobd_bkd/
├── backend/      → API REST em Node.js + Express + SQLite
└── frontend/     → SPA em React 19 + Vite 8
```

- O **backend** expõe uma API RESTful em `http://localhost:3000` e serve os arquivos de upload estaticamente.
- O **frontend** roda em `http://localhost:5173` (porta padrão do Vite) durante o desenvolvimento e se comunica com o backend via proxy configurado em `vite.config.js` — não há necessidade de configurar CORS manualmente em desenvolvimento.
- A persistência é feita em **SQLite**, um banco relacional leve armazenado fisicamente em `backend/database.sqlite` (ignorado pelo Git).
- Os pagamentos são processados por **dois gateways diferentes ao mesmo tempo**: Mercado Pago para PIX e Stripe para Cartão de Crédito e Boleto. Veja a [seção 7](#7-sistema-de-pagamentos-híbrido-pix-vs-cartão-vs-boleto) para o detalhamento completo.

```
┌─────────────┐      fetch('/api/...')      ┌──────────────┐
│   React     │ ───────────────────────────▶ │   Express    │
│ (Vite :5173)│ ◀─────────────────────────── │   (:3000)    │
└─────────────┘         proxy dev             └──────┬───────┘
                                                       │
                                       ┌───────────────┼────────────────┐
                                       ▼               ▼                ▼
                                  SQLite DB      Mercado Pago        Stripe
                               (database.sqlite)   (PIX)        (Cartão/Boleto)
```

---

## 2. Estrutura Completa de Arquivos

```
trabalhobd_bkd/
│
├── .gitignore
├── README.md                          ← este arquivo
│
├── backend/
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json                  ← infraestrutura preparada p/ futura migração TS (não usado hoje)
│   ├── server.js                      ← ARQUIVO ÚNICO com toda a API, models e seed
│   ├── uploads/                       ← criado em runtime, guarda imagens enviadas via Multer
│   └── database.sqlite                ← criado em runtime, ignorado pelo Git
│
└── frontend/
    ├── .gitignore
    ├── README.md                      ← README genérico gerado pelo Vite (não atualizado)
    ├── eslint.config.js
    ├── index.html                     ← shell HTML, injeta /src/main.jsx
    ├── package.json
    ├── package-lock.json
    ├── vite.config.js                 ← configura o proxy /api e /uploads para o backend
    ├── assets/
    │   └── style.css                  ← CSS legado solto na raiz (não importado por nada — resíduo da versão Vanilla JS)
    └── src/
        ├── App.jsx                    ← define as rotas (react-router-dom)
        ├── main.jsx                   ← ponto de entrada React, importa o CSS de toasts
        ├── assets/
        │   └── style.css              ← CSS REAL usado por toda a aplicação
        ├── components/
        │   ├── CheckoutModal.jsx      ← modal de pagamento com abas PIX / Cartão+Boleto
        │   ├── Footer.jsx
        │   ├── Modais.jsx             ← modais globais de Login e Cadastro
        │   ├── Navbar.jsx
        │   ├── StarRating.jsx         ← componente de estrelas — ÓRFÃO, não é importado em nenhum lugar
        │   ├── ui.css                 ← estilos do sistema de toast/confirm
        │   └── ui.jsx                 ← exporta `UiHost`, renderiza toasts e confirm dialogs
        ├── context/
        │   └── AuthContext.jsx        ← contexto global de autenticação (login/logout/modais)
        ├── lib/
        │   └── ui.js                  ← pub-sub singleton de toasts e confirmDialog (sem dependência de Context)
        ├── pages/
        │   ├── AdminDashboard.jsx     ← painel do Administrador (maior arquivo do projeto)
        │   ├── EventoDetalhes.jsx     ← página pública de detalhes + checkout de um evento
        │   ├── Home.jsx               ← landing page pública (hero, planos, eventos, parceiros)
        │   ├── ParceiroDashboard.jsx  ← painel de Parceiro/Patrocinador
        │   ├── PrestadorDashboard.jsx ← painel de Prestador de Serviço
        │   └── Servicos.jsx           ← vitrine pública de serviços + avaliações
        └── services/
            └── api.js                 ← client HTTP auxiliar — DEFINIDO MAS NÃO USADO pelas páginas atuais (todas usam `fetch` direto)
```

> **Nota sobre arquivos órfãos:** `StarRating.jsx` e `services/api.js` existem no repositório mas não são importados por nenhuma página atualmente. Cada página de avaliação (`Servicos.jsx`, `PrestadorDashboard.jsx`) implementa sua própria renderização de estrelas inline. Isso é uma duplicação de código que pode ser refatorada futuramente (ver [seção 18](#18-limitações-conhecidas-e-próximos-passos)).

---

## 3. Tecnologias e Dependências

### Backend (Node.js, ESM — `"type": "module"`)

| Pacote | Versão | Função |
|---|---|---|
| `express` | ^5.2.1 | Framework do servidor e das rotas REST |
| `sqlite3` | ^6.0.1 | Driver nativo do SQLite |
| `sqlite` | ^5.1.1 | Wrapper assíncrono (`open`, `db.run`, `db.get`, `db.all`) sobre o `sqlite3` |
| `multer` | ^2.1.1 | Middleware de upload de arquivos `multipart/form-data` |
| `mercadopago` | ^3.0.0 | SDK oficial do Mercado Pago — usado **exclusivamente para PIX** |
| `stripe` | ^22.2.1 | SDK oficial da Stripe — usado **exclusivamente para Cartão e Boleto** |
| `nodemon` (dev) | ^3.1.14 | Reinício automático do servidor em desenvolvimento |

### Frontend (React 19 + Vite 8)

| Pacote | Versão | Função |
|---|---|---|
| `react` / `react-dom` | ^19.2.6 | Biblioteca de UI |
| `react-router-dom` | ^7.18.0 | Roteamento SPA |
| `@stripe/stripe-js` | ^9.8.0 | Loader do SDK JS da Stripe |
| `@stripe/react-stripe-js` | ^6.6.0 | Bindings React do Stripe (`Elements`, `PaymentElement`, `useStripe`, `useElements`) |
| `jspdf` | ^4.2.1 | Geração de PDFs **inteiramente no navegador** (contratos) |
| `vite` (dev) | ^8.0.12 | Bundler e dev server |
| `@vitejs/plugin-react` (dev) | ^6.0.1 | Suporte a JSX/Fast Refresh no Vite |
| `eslint` + plugins (dev) | ^10.x | Lint de código |

### Requisitos de versão do Node.js

O `package-lock.json` do backend exige `sqlite3` com Node **≥ 20.17.0**, e o Vite 8 do frontend exige Node **^20.19.0 || >=22.12.0**. Na prática:

> ✅ **Use Node.js 20 LTS ou 22 LTS.** Versões abaixo de 20 vão falhar na instalação do `sqlite3` ou na inicialização do Vite.

---

## 4. Lógica de Negócio e Papéis de Usuário

O sistema usa **Role-Based Access Control (RBAC)** simples, com o papel (`tipo`) do usuário decidindo qual dashboard e quais permissões ele recebe após o login.

```
Usuário deseja participar de um evento, cadastrar empresa ou ser parceiro?
│
├── NÃO → Visitante (apenas visualização pública, sem comprar ingresso)
│
└── SIM → Possui cadastro?
          │
          ├── NÃO → Direcionado ao cadastro (modal de Registro)
          │
          └── SIM → Login → roteamento por `tipo`:
                     │
                     ├── admin         → /dashboard/admin      (acesso total)
                     ├── parceiro       ┐
                     ├── patrocinador   ┘→ /dashboard/parceiro  (gestão dos próprios eventos)
                     ├── prestador     → /dashboard/prestador  (gestão dos próprios serviços)
                     └── cliente       → navegação pública + compra de ingressos/serviços
```

| Papel | O que pode fazer |
|---|---|
| **Administrador** | CRUD completo de Parceiros, Prestadores, Serviços, Eventos e Clientes; aprovação/recusa de eventos e serviços pendentes; moderação de avaliações; gestão da Central de Suporte (tickets) |
| **Prestador de Serviço** | Gerencia o próprio portfólio de serviços (CRUD), visualiza avaliações recebidas e pode excluí-las, abre tickets de suporte, acompanha o "Dashboard Financeiro" e baixa o contrato em PDF |
| **Parceiro/Patrocinador** | Cria e gerencia os próprios eventos, vê participantes inscritos por evento, adiciona participantes manualmente, abre tickets de suporte, paga a mensalidade e baixa o contrato em PDF |
| **Cliente** | Navega eventos e serviços, compra ingressos (PIX/Cartão/Boleto), avalia serviços contratados |
| **Visitante** | Acesso somente de leitura às páginas públicas (Home, Serviços, Detalhes do Evento), sem poder comprar |

---

## 5. Banco de Dados — Como Foi Construído

O banco é **SQLite**, e **toda a definição do schema vive dentro do próprio `backend/server.js`**, na função `async function setupDatabase()`. Não existe um arquivo `.sql` de migration separado — o schema é criado (ou atualizado) automaticamente toda vez que o servidor sobe, usando `CREATE TABLE IF NOT EXISTS`.

### 5.1 Tabelas e relacionamentos

```
usuarios ──┬──< parceiros (id_usuario)
           ├──< prestadores (id_usuario)
           ├──< inscricoes (id_usuario)
           ├──< avaliacoes (id_usuario)
           └──< tickets (id_usuario)

eventos ───< inscricoes (id_evento)

prestadores ───< servicos (id_prestador)

servicos ───< avaliacoes (id_servico)
```

| Tabela | Colunas principais | Observações |
|---|---|---|
| `usuarios` | `id`, `nome`, `email` (UNIQUE), `senha`, `tipo` (CHECK: admin/patrocinador/parceiro/prestador/cliente), `cpf`, `status` | Tabela central de autenticação |
| `eventos` | `id`, `titulo`, `categoria`, `local`, `data_evento`, `horario`, `parceiro`, `heads`, `descricao`, `valor`, `conteudo`, `certificacao_inclusa`, `texto_certificacao`, `status`, `imagem` | `status` controla o fluxo de aprovação (Pendente → Ativo/Recusado) |
| `inscricoes` | `id`, `id_usuario`, `id_evento`, `metodo`, `valor`, `status`, `codigo_gateway`, `data_compra` | Registra toda compra de ingresso, seja PIX, Stripe ou manual |
| `parceiros` | `id`, `nome`, `tipo` (CHECK: patrocinador/parceiro), `cnpj`, `email`, `telefone`, `endereco`, `status`, `id_usuario` | |
| `prestadores` | `id`, `nome`, `segmento`, `email`, `telefone`, `descricao`, `status`, `plano`, `avaliacao`, `id_usuario` | `avaliacao` é a **média calculada automaticamente** a partir da tabela `avaliacoes` |
| `servicos` | `id`, `titulo`, `categoria`, `descricao`, `valor`, `status`, `avaliacao`, `total_avaliacoes`, `destaque`, `imagem`, `id_prestador`, `nome_prestador`, `data_criacao` | `avaliacao` e `total_avaliacoes` são recalculados a cada nova avaliação publicada ou excluída |
| `avaliacoes` | `id`, `id_servico`, `id_usuario`, `autor_nome`, `nota` (CHECK 1–5), `comentario`, `data_avaliacao` | Cada `INSERT`/`DELETE` aqui dispara um `UPDATE` na tabela `servicos` para recalcular a média (`AVG(nota)`) e o total |
| `tickets` | `id`, `id_usuario`, `nome_remetente`, `tipo_remetente`, `assunto`, `mensagem`, `status` (Aberto/Resolvido), `data_abertura` | Alimenta a Central de Suporte do Admin |
| `faturas_assinatura` | `id`, `id_usuario`, `mes_referencia`, `metodo`, `valor`, `status`, `codigo_gateway`, `data_geracao` | Tabela criada no schema, mas **sem rota de CRUD dedicada** — estrutural, reservada para uso futuro |

### 5.2 Migrações idempotentes (`ALTER TABLE`)

Como o projeto evoluiu adicionando colunas (`cpf`, `status`) à tabela `usuarios` que já existia em bancos antigos, o `setupDatabase()` roda também:

```javascript
const alters = [
    "ALTER TABLE usuarios ADD COLUMN cpf TEXT",
    "ALTER TABLE usuarios ADD COLUMN status TEXT DEFAULT 'Ativo'"
];
for (const sql of alters) {
    try { await db.exec(sql); } catch (_) {} // ignora erro se a coluna já existir
}
```

Isso garante que, mesmo se você já tiver um `database.sqlite` de uma versão anterior do projeto, ele será atualizado automaticamente ao subir o servidor, sem precisar apagar o arquivo.

---

## 6. Onde Está o Seed (Dados Iniciais)

**Não existe um arquivo `seed.js` separado.** O seed também está dentro de `backend/server.js`, na mesma função `setupDatabase()`, logo após a criação das tabelas. Cada bloco de seed verifica se já existem dados antes de inserir (idempotência), então é seguro reiniciar o servidor várias vezes sem duplicar registros.

### Ordem de inserção (respeita as Foreign Keys)

| Ordem | Tabela | Quantidade | Detalhe |
|---|---|---|---|
| 1 | `usuarios` | 5 | Um usuário de cada papel (ver tabela de credenciais abaixo) |
| 2 | `eventos` | 3 | 1 Pendente, 2 Ativos |
| 3 | `parceiros` | 2 | Linkados a `usuarios.id_usuario` (Cisco Academy e SENAI) |
| 4 | `prestadores` | 5 | Apenas o primeiro (TechSecurity) está linkado a um usuário real |
| 5 | `servicos` | 5 | Cada um linkado ao seu `prestador` correspondente, 2 marcados como `destaque=1` |

### Credenciais de teste geradas pelo seed

| E-mail | Senha | Papel |
|---|---|---|
| `admin@wecorp.com` | `123` | admin |
| `patrocinador@cisco.com` | `123` | patrocinador |
| `parceiro@senai.com` | `123` | parceiro |
| `prestador@servico.com` | `123` | prestador |
| `cliente@email.com` | `123` | cliente |

### Como forçar o seed a rodar de novo do zero

Basta apagar o arquivo do banco e reiniciar o servidor:

```bash
rm backend/database.sqlite
npm run dev   # dentro de backend/
```

O `setupDatabase()` vai recriar todo o schema e popular novamente com os dados acima.

---

## 7. Sistema de Pagamentos Híbrido: PIX vs Cartão vs Boleto

Esta é a parte mais particular da arquitetura: **o projeto usa dois gateways de pagamento diferentes ao mesmo tempo**, cada um responsável por um conjunto de métodos.

```
                    ┌─────────────────────────┐
                    │      CheckoutModal       │
                    │   (duas abas visuais)    │
                    └───────────┬───────────────┘
                                │
              ┌─────────────────┴──────────────────┐
              ▼                                     ▼
        Aba "PIX"                         Aba "Cartão / Boleto"
              │                                     │
              ▼                                     ▼
     POST /api/comprar                  POST /api/comprar-stripe
              │                                     │
              ▼                                     ▼
       Mercado Pago SDK                        Stripe SDK
   (MercadoPagoConfig + Payment)      (stripe.paymentIntents.create)
              │                                     │
              ▼                                     ▼
   { qr_code_base64,                       { clientSecret }
     qr_code_copia_cola }                          │
                                                     ▼
                                    Elements + PaymentElement (layout: tabs)
                                    renderiza Cartão e Boleto como sub-abas
```

### 7.1 PIX — Mercado Pago

| | |
|---|---|
| **Rota** | `POST /api/comprar` |
| **SDK** | `mercadopago` (`MercadoPagoConfig`, `Payment`) |
| **Credencial** | `accessToken` na configuração do `MercadoPagoConfig` |
| **Fluxo no backend** | 1) Insere a inscrição como `Pendente` no SQLite. 2) Chama `payment.create()` com `transaction_amount`, `payment_method_id: 'pix'` e o e-mail do pagador. 3) Retorna `qr_code_base64` (imagem) e `qr_code_copia_cola` (texto) do Mercado Pago. |
| **Fluxo no frontend** | O sub-componente `PanelPix` (dentro de `CheckoutModal.jsx`) exibe um botão "Gerar QR Code PIX". Ao clicar, busca a API, renderiza a imagem `base64` e o campo de texto copia-e-cola com botão "Copiar". Mostra aviso de expiração de 10 minutos. |

### 7.2 Cartão de Crédito e Boleto — Stripe

| | |
|---|---|
| **Rotas** | `POST /api/comprar-stripe` (compra de evento) e `POST /api/pagar-assinatura` (mensalidade de parceiro/prestador) |
| **SDK** | `stripe` (backend) + `@stripe/stripe-js` e `@stripe/react-stripe-js` (frontend) |
| **Credencial** | Chave secreta (`sk_test_...`) no backend e chave pública (`pk_test_...`) no frontend |
| **Fluxo no backend** | 1) (Apenas em `/api/comprar-stripe`) Insere a inscrição como `Pendente`, `metodo: 'stripe'`. 2) Chama `stripe.paymentIntents.create()` com `amount` **em centavos**, `currency: 'brl'` e `payment_method_types: ['card', 'boleto']`. 3) Retorna apenas o `clientSecret`. |
| **Fluxo no frontend** | O sub-componente `StripeForm` monta um `<Elements>` do Stripe usando o `clientSecret` retornado, com `<PaymentElement options={{ layout: 'tabs' }} />`, que renderiza **Cartão e Boleto como abas internas automáticas geradas pelo próprio Stripe**. Antes de confirmar, chama `elements.submit()` para validar os campos, depois `stripe.confirmPayment()`. |
| **Particularidade técnica** | A busca do `clientSecret` é **lazy**: só dispara quando o usuário clica na aba "Cartão / Boleto" do `CheckoutModal`, evitando uma chamada desnecessária à Stripe se o usuário for pagar via PIX. |

### 7.3 Diferença conceitual entre os dois fluxos

| Aspecto | PIX (Mercado Pago) | Cartão/Boleto (Stripe) |
|---|---|---|
| Forma de exibição | Imagem (QR Code) + texto puro | Componente de UI pronto da própria Stripe (`PaymentElement`) |
| Quem renderiza o formulário | O frontend desenha manualmente (HTML simples) | A biblioteca `@stripe/react-stripe-js` injeta um iframe seguro |
| Confirmação do pagamento | Não há "confirmação" no frontend — o usuário paga fora do app (app do banco) e o Mercado Pago atualiza o status via webhook (não implementado neste projeto) | `stripe.confirmPayment()` é chamado explicitamente no frontend |
| Expiração | 10 minutos (informativo, não há lógica de expiração automática no backend) | Sem expiração — o `PaymentIntent` permanece válido até ser confirmado ou cancelado |

> ⚠️ **Sobre o status de "Pendente":** nenhum dos dois fluxos atualiza automaticamente o `status` da inscrição para "Pago"/"Confirmado" após o pagamento real ser efetivado, pois **não há webhooks configurados** (nem do Mercado Pago, nem da Stripe). Isso é uma limitação conhecida — veja a [seção 18](#18-limitações-conhecidas-e-próximos-passos).

---

## 8. Upload de Arquivos com Multer

Toda imagem enviada pela plataforma (banners de eventos e de serviços) passa pelo mesmo pipeline `multer`, configurado uma única vez no topo de `server.js`:

```javascript
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const safe = file.originalname.replace(/\s+/g, '-');
        cb(null, Date.now() + '-' + safe);
    }
});
const upload = multer({ storage });
```

- **Campo esperado em todo `form-data`:** sempre `imagem` (singular, um arquivo só por requisição).
- **Nome final do arquivo:** `<timestamp>-<nome-original-sem-espacos>`, o que evita colisões entre uploads simultâneos.
- **O que é salvo no banco:** apenas o **nome do arquivo** (string), nunca o caminho completo nem o binário.
- **Como o arquivo é servido:** `app.use('/uploads', express.static(uploadDir))` — qualquer imagem fica acessível publicamente em `http://localhost:3000/uploads/<nome-do-arquivo>`.

### Rotas que usam `upload.single('imagem')`

| Rota | Método |
|---|---|
| `/api/eventos` | `POST` |
| `/api/eventos/:id` | `PUT` |
| `/api/eventos/:id` | `PATCH` |
| `/api/servicos` | `POST` |
| `/api/servicos/:id` | `PUT` |

Em todos os casos, se nenhum arquivo for enviado na edição (`PUT`), o backend mantém a imagem já existente no banco (não sobrescreve com `null`).

---

## 9. Geração de Contratos em PDF (jsPDF)

A geração de PDF acontece **inteiramente no navegador**, usando a biblioteca `jspdf` — **não existe geração de PDF no backend**.

### Onde está implementado

| Arquivo | Função | Quem usa |
|---|---|---|
| `AdminDashboard.jsx` | `handleDownloadContratoParceiro(parceiro)` | Admin, na lista de Parceiros |
| `AdminDashboard.jsx` | `handleDownloadContratoPrestador(prestador)` | Admin, na lista de Prestadores |
| `ParceiroDashboard.jsx` | `handleDownloadContrato()` | O próprio parceiro logado, na aba Assinatura |
| `PrestadorDashboard.jsx` | `handleDownloadContrato()` | O próprio prestador logado, na aba Assinatura |

### Padrão de geração usado em todas as 4 funções

```javascript
const doc = new jsPDF();
doc.setFont("helvetica", "bold");
doc.setFontSize(16);
doc.text("CONTRATO DE [PARCERIA|PRESTAÇÃO DE SERVIÇOS] WE CORP", 105, 20, { align: "center" });

doc.setFont("helvetica", "normal");
doc.setFontSize(12);

const textoContrato = [ /* array de linhas */ ];
doc.text(textoContrato, 20, 40);

doc.save(`Contrato_WECorp_${nome.replace(/\s+/g, '_')}.pdf`);
```

### Conteúdo dos dois tipos de contrato

- **Contrato de Parceria** (parceiros/patrocinadores): cláusulas de visibilidade prioritária, suporte VIP, taxa de mediação de **15%** e mensalidade de **R$ 1.250,00**.
- **Contrato de Prestação de Serviços** (prestadores): cláusulas de taxa de mediação de **10%** e mensalidade de **R$ 149,90** para o plano "Visibilidade Ouro".

O nome do arquivo final segue sempre o padrão `Contrato_WECorp_<Nome_Da_Empresa_Ou_Pessoa>.pdf`, com espaços trocados por underscore.

---

## 10. API RESTful — Referência Completa de Endpoints

**URL base:** `http://localhost:3000`
**Formato de resposta:** todas as rotas retornam JSON no padrão `{ sucesso: boolean, ...dados, mensagem?: string }`.

### 🔐 Autenticação

| Método | Rota | Body (JSON) | Descrição |
|---|---|---|---|
| `POST` | `/api/login` | `{ email, senha }` | Autentica e retorna `{ id, nome, email, tipo }` |

### 💳 Pagamentos

| Método | Rota | Body | Descrição |
|---|---|---|---|
| `POST` | `/api/comprar` | `{ id_evento, id_usuario, metodo:'pix', valor, email_cliente }` | Gera PIX via Mercado Pago. Retorna `qr_code_base64` + `qr_code_copia_cola` |
| `POST` | `/api/comprar-stripe` | `{ id_evento, id_usuario, valor, email_cliente }` | Cria `PaymentIntent` Stripe para Cartão/Boleto. Retorna `clientSecret` |
| `POST` | `/api/pagar-assinatura` | `{ id_usuario, valor, email_cliente, descricao }` | Cria `PaymentIntent` Stripe para mensalidade. Retorna `clientSecret` |

### 🎟️ Eventos

| Método | Rota | Body | Descrição |
|---|---|---|---|
| `GET` | `/api/eventos` | — | Lista todos os eventos |
| `GET` | `/api/eventos/:id` | — | Detalhe de um evento |
| `POST` | `/api/eventos` | `form-data`: título, categoria, local, data_evento, horario, parceiro, heads, descricao, valor, conteudo, certificacao_inclusa, texto_certificacao, tipoCriador, status, **imagem** (file) | Cria evento (status auto: Ativo se `tipoCriador==='admin'`, senão Pendente) |
| `PUT` | `/api/eventos/:id` | mesmo `form-data` acima | Edição completa (com ou sem nova imagem) |
| `PUT` | `/api/eventos/:id/status` | `{ status }` | Rota isolada para Admin aprovar/recusar |
| `PATCH` | `/api/eventos/:id` | `form-data` parcial | Atualização dinâmica de qualquer subconjunto de colunas |
| `DELETE` | `/api/eventos/:id` | — | Exclui definitivamente |

### 🤝 Parceiros

| Método | Rota | Body | Descrição |
|---|---|---|---|
| `GET` | `/api/parceiros` | — | Lista, ordenado por nome |
| `GET` | `/api/parceiros/:id` | — | Detalhe |
| `POST` | `/api/parceiros` | `{ nome, tipo, cnpj, email, telefone, endereco, status }` | Cria |
| `PUT` | `/api/parceiros/:id` | mesmo body | Atualiza |
| `DELETE` | `/api/parceiros/:id` | — | Exclui |

### 🛠️ Prestadores

| Método | Rota | Body | Descrição |
|---|---|---|---|
| `GET` | `/api/prestadores` | — | Lista, ordenado por nome |
| `GET` | `/api/prestadores/:id` | — | Detalhe |
| `POST` | `/api/prestadores` | `{ nome, segmento, email, telefone, descricao, status, plano }` | Cria |
| `PUT` | `/api/prestadores/:id` | mesmo body | Atualiza |
| `DELETE` | `/api/prestadores/:id` | — | Exclui |

### 🧰 Serviços (postagens dos prestadores)

| Método | Rota | Body | Descrição |
|---|---|---|---|
| `GET` | `/api/servicos` | — | Lista, ordenado por `data_criacao DESC` |
| `GET` | `/api/servicos/:id` | — | Detalhe |
| `POST` | `/api/servicos` | `form-data`: titulo, categoria, descricao, valor, id_prestador, nome_prestador, tipoCriador, destaque, status, **imagem** (file) | Cria (status auto: Ativo se `tipoCriador==='admin'`, senão Pendente) |
| `PUT` | `/api/servicos/:id` | mesmo `form-data` | Edição completa |
| `PUT` | `/api/servicos/:id/status` | `{ status }` | Aprovação/recusa pelo Admin |
| `DELETE` | `/api/servicos/:id` | — | Exclui |

### 👥 Clientes

| Método | Rota | Body | Descrição |
|---|---|---|---|
| `GET` | `/api/clientes` | — | Lista usuários com `tipo='cliente'` |
| `GET` | `/api/clientes/:id` | — | Detalhe |
| `POST` | `/api/clientes` | `{ nome, email, senha, cpf, status }` | Cria (valida e-mail único). `senha` default `'123456'` se omitida |
| `PUT` | `/api/clientes/:id` | `{ nome, email, senha?, cpf, status }` | Atualiza. `senha` só é alterada se enviada |
| `DELETE` | `/api/clientes/:id` | — | Exclui |

### ⭐ Avaliações

| Método | Rota | Body | Descrição |
|---|---|---|---|
| `GET` | `/api/avaliacoes/:id_servico` | — | Lista avaliações de um serviço, mais recentes primeiro |
| `POST` | `/api/avaliacoes` | `{ id_servico, id_usuario, autor_nome, nota (1-5), comentario }` | Cria avaliação **e recalcula automaticamente** `avaliacao` e `total_avaliacoes` na tabela `servicos` |
| `DELETE` | `/api/avaliacoes/:id` | — | Exclui avaliação **e recalcula** a média do serviço afetado |

### 🎫 Tickets de Suporte

| Método | Rota | Body | Descrição |
|---|---|---|---|
| `GET` | `/api/tickets` | — | Lista todos os tickets (usado pelo Admin) |
| `GET` | `/api/tickets/usuario/:id_usuario` | — | Lista tickets de um único usuário (parceiro/prestador) |
| `POST` | `/api/tickets` | `{ id_usuario, nome_remetente, tipo_remetente, assunto, mensagem }` | Abre um ticket com status `Aberto` |
| `PUT` | `/api/tickets/:id/status` | `{ status }` | Admin marca como `Resolvido` (ou outro status) |
| `DELETE` | `/api/tickets/:id` | — | Exclui o ticket |

### 🧾 Inscrições / Participantes

| Método | Rota | Body | Descrição |
|---|---|---|---|
| `GET` | `/api/inscricoes/evento/:id_evento` | — | Lista participantes inscritos em um evento (`JOIN` com `usuarios`) |
| `POST` | `/api/inscricoes/manual` | `{ id_evento, nome, email, cpf }` | Cadastro manual de participante feito pelo parceiro (cria usuário se o e-mail não existir, com senha padrão `'wecorp2026'`) |
| `GET` | `/api/inscricoes/usuario/:id_usuario` | — | Histórico de inscrições de um cliente (`JOIN` com `eventos`) |

### ⚙️ Diversos

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/status` | Health-check simples (`{ status: 'Online' }`) |
| `GET` | `/` | Serve `index.html` |

---

## 11. Autenticação e Sessão

A autenticação é **stateless e simplificada**, adequada para um projeto acadêmico/MVP — não usa JWT nem sessões de servidor:

1. `POST /api/login` recebe `{ email, senha }` em texto plano e valida diretamente contra o SQLite (`SELECT ... WHERE email=? AND senha=?`).
2. Se válido, o backend retorna `{ id, nome, email, tipo }`.
3. O **frontend** armazena esse objeto inteiro em `localStorage.usuarioLogado` (`AuthContext.jsx`).
4. Em **toda** página protegida (dashboards), o `useEffect` inicial lê o `localStorage`, valida se o `tipo` é compatível com aquele dashboard e redireciona para `/` se não for.
5. **Não há criptografia de senha** (sem `bcrypt`/hash) nem expiração de sessão — a "sessão" dura até o `localStorage` ser limpo manualmente (botão Sair) ou o navegador apagar os dados.

> ⚠️ Esse modelo é adequado apenas para ambiente de desenvolvimento/demonstração. Veja recomendações na [seção 18](#18-limitações-conhecidas-e-próximos-passos).

---

## 12. Mapa de Páginas do Frontend

| Rota | Componente | Acesso | Descrição |
|---|---|---|---|
| `/` | `Home.jsx` | Público | Hero, planos de assinatura, lista filtrável de eventos ativos, parceiros em destaque |
| `/servicos` | `Servicos.jsx` | Público | Vitrine de serviços ativos com filtros (texto/setor/avaliação), modal de detalhes com avaliações reais e formulário de nova avaliação |
| `/evento-detalhes?id=N` | `EventoDetalhes.jsx` | Público (compra exige login) | Detalhes completos do evento + `CheckoutModal` |
| `/dashboard/admin` | `AdminDashboard.jsx` | `tipo==='admin'` | CRUD de Parceiros/Prestadores/Serviços/Eventos/Clientes, aprovação de pendências, moderação de avaliações, Central de Suporte |
| `/dashboard/parceiro` | `ParceiroDashboard.jsx` | `tipo` ∈ {parceiro, patrocinador} | Dashboard financeiro (parcialmente estático), gestão dos próprios eventos, participantes reais por evento, assinatura |
| `/dashboard/prestador` | `PrestadorDashboard.jsx` | `tipo==='prestador'` | Dashboard financeiro (parcialmente estático), gestão dos próprios serviços, avaliações recebidas, tickets de suporte, assinatura |

---

## 13. Componentes Compartilhados do Frontend

| Componente | Função |
|---|---|
| `Navbar.jsx` | Barra de navegação pública. Auto-oculta dentro de `/dashboard/*` (cada dashboard tem seu próprio header) |
| `Footer.jsx` | Rodapé público. Mesma lógica de auto-ocultação |
| `Modais.jsx` | Modais globais de Login/Cadastro, controlados pelo `AuthContext` |
| `CheckoutModal.jsx` | Modal de pagamento com as duas abas PIX/Stripe descritas na [seção 7](#7-sistema-de-pagamentos-híbrido-pix-vs-cartão-vs-boleto). Reutilizado em `EventoDetalhes`, `ParceiroDashboard` e `PrestadorDashboard` |
| `ui.jsx` (`UiHost`) | Renderiza a pilha de toasts e o `ConfirmDialog`, lendo o estado do pub-sub em `lib/ui.js` |
| `lib/ui.js` | Substitui `alert()`/`confirm()` nativos do navegador por toasts (`toastSuccess`, `toastError`, `toastInfo`, `toastWarn`) e um `confirmDialog()` assíncrono baseado em Promise |

---

## 14. Problemas Encontrados e Corrigidos (Histórico Completo)

Esta seção documenta, em ordem cronológica, **todos** os problemas identificados durante o desenvolvimento e a respectiva correção aplicada.

### 14.1 Chaves de pagamento placeholder
**Problema:** `server.js` continha `'sk_test_SUA_CHAVE_SECRETA_AQUI'` e `CheckoutModal.jsx` continha `'pk_test_SUA_CHAVE_PUBLICA_AQUI'` — os pagamentos via Cartão/Boleto simplesmente não funcionavam.
**Correção:** chaves de teste reais foram inseridas temporariamente para validação e depois removidas do código entregue (ver [seção 15](#15-️-aviso-de-segurança--chaves-removidas-do-repositório)).

### 14.2 PIX ausente das opções de pagamento
**Problema:** o `CheckoutModal` só tinha integração Stripe — não existia nenhuma opção visual de PIX.
**Correção:** criada a aba dedicada **"PIX"**, com o sub-componente `PanelPix`, que chama `/api/comprar` e renderiza QR Code + texto copia-e-cola.

### 14.3 Migração para arquitetura de pagamento híbrida
**Mudança solicitada:** usar PIX via Mercado Pago e Cartão/Boleto via Stripe **simultaneamente**, em vez de centralizar tudo na Stripe.
**Correção:** `server.js` passou a importar os dois SDKs ao mesmo tempo. A rota `/api/comprar` ficou exclusiva para PIX (Mercado Pago); foi criada a nova rota `/api/comprar-stripe` exclusiva para Cartão/Boleto; e `/api/pagar-assinatura` para as mensalidades recorrentes via Stripe.

### 14.4 Funcionalidades inteiramente hardcoded (dados fictícios fixos)
Uma auditoria completa revelou que diversas telas exibiam dados estáticos sem nenhuma comunicação real com o banco:

- Avaliações/comentários de serviços eram texto fixo (`"Carlos E."`) em `Servicos.jsx`, `AdminDashboard.jsx` e `PrestadorDashboard.jsx`.
- O botão **"Publicar Avaliação"** só disparava um toast de sucesso, sem gravar nada.
- A **Central de Suporte** do Admin tinha uma única linha fixa, sem listar tickets reais.
- O botão **"Enviar Ticket"** em `ParceiroDashboard.jsx` e `PrestadorDashboard.jsx` só disparava um toast.
- A lista de **Participantes** em `ParceiroDashboard.jsx` era uma linha fixa, sem relação com inscrições reais.
- Não existiam as tabelas `avaliacoes` e `tickets` no banco.
- Não existia a rota `/api/clientes`, embora `AdminDashboard.jsx` já dependesse dela.

**Correção:**
- Criadas as tabelas `avaliacoes` e `tickets` (com recálculo automático de médias).
- Criadas as rotas `/api/avaliacoes/*` e `/api/tickets/*` completas.
- Criadas as rotas `/api/inscricoes/*` para participantes reais.
- Criada a rota `/api/clientes` completa (CRUD).
- `Servicos.jsx` ganhou formulário de avaliação 100% funcional (estrelas clicáveis, exige login, `POST` real, atualização da lista e da média em tempo real).
- `AdminDashboard.jsx`: Central de Suporte lista tickets reais (com ações **Resolver** e **Excluir**); modal de Moderação de Feedbacks carrega avaliações reais por serviço, com exclusão funcional; badge do menu lateral conta tickets `Aberto` dinamicamente.
- `ParceiroDashboard.jsx`: aba Participantes busca inscritos reais por evento selecionado; modal "Adicionar Participante" grava via API; modal de Ajuda envia ticket real.
- `PrestadorDashboard.jsx`: modal de Detalhes do Serviço mostra avaliações reais com exclusão; modal de Suporte envia ticket real, com histórico próprio do prestador.

### 14.5 Regressão grave de fidelidade ao implementar o item 14.4
**Problema:** ao corrigir os itens acima, `PrestadorDashboard.jsx` e `ParceiroDashboard.jsx` foram **reescritos do zero** em vez de editados incrementalmente, o que causou perda de conteúdo que já existia e não tinha relação com a correção solicitada:

| Arquivo | Antes | Depois (reescrito, errado) | Perdas |
|---|---|---|---|
| `PrestadorDashboard.jsx` | 584 linhas | 418 linhas | Aba inteira **"Meus Clientes"**, tabela financeira "Últimas Vendas" detalhada, campos "Cliente Relacionado"/"Motivo" no modal de suporte |
| `ParceiroDashboard.jsx` | 703 linhas | 515 linhas | Colunas "Inscritos"/"Custo por Lead" na tabela financeira, seletor "Parceiro (Autoria)" desabilitado, botão "Emitir Certificado" |

**Correção:** ambos os arquivos foram **reconstruídos a partir do texto original exato**, e as novas funcionalidades foram reaplicadas via **edição cirúrgica** (apenas os blocos estritamente necessários), preservando 100% do conteúdo pré-existente. Resultado final: **719 linhas** (Prestador) e **837 linhas** (Parceiro) — sempre maiores que o original, nunca menores.

### 14.6 AdminDashboard.jsx — feito corretamente desde o início
Diferente do item 14.5, o `AdminDashboard.jsx` foi corrigido desde a primeira tentativa por **edição cirúrgica** (substituições pontuais, sem reescrita total), preservando as 1468 linhas originais e adicionando ~125 linhas novas (tickets reais, moderação de avaliações reais, badge dinâmico).

> **Exceção documentada explicitamente:** o botão **"Resolver"** de um ticket existe, chama a API real (`PUT /api/tickets/:id/status`) e marca o status como `Resolvido` — mas **não há** fluxo adicional de resposta ao remetente nem histórico de conversa no ticket. Essa foi uma exceção combinada explicitamente durante o desenvolvimento.

### 14.7 Chaves do Stripe removidas para permitir push ao GitHub
Ver detalhamento completo na próxima seção.

---

## 15. ⚠️ Aviso de Segurança — Chaves Removidas do Repositório

> **As chaves do Stripe foram removidas de `backend/server.js` para permitir o push deste repositório ao GitHub.**

O GitHub possui um sistema de **Secret Scanning** que bloqueia automaticamente qualquer `push` contendo segredos reconhecíveis (como chaves `sk_test_...` da Stripe) hardcoded diretamente no código-fonte. Como a chave secreta da Stripe estava escrita literalmente dentro de `server.js`, o push era recusado.

### O que isso significa para quem for rodar o projeto

No arquivo `backend/server.js` entregue neste repositório, a linha de inicialização do Stripe está com um **placeholder**, por exemplo:

```javascript
const stripe = new Stripe('sk_test_SUA_CHAVE_SECRETA_AQUI');
```

Para que os pagamentos via **Cartão e Boleto** funcionem, você precisa:

1. Criar uma conta gratuita em [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register).
2. No Dashboard, ativar o **modo de teste** (toggle no canto superior).
3. Ir em **Developers → API keys** e copiar:
   - A **Secret key** (`sk_test_...`) → cole em `backend/server.js`, na linha `new Stripe('...')`.
   - A **Publishable key** (`pk_test_...`) → cole em `frontend/src/components/CheckoutModal.jsx`, na chamada `loadStripe('...')`.

O mesmo princípio se aplica ao Mercado Pago: a constante `accessToken: 'TEST-SEU-ACCESS-TOKEN-AQUI'` em `server.js` precisa ser substituída por um Access Token de teste gerado em [https://www.mercadopago.com.br/developers/panel](https://www.mercadopago.com.br/developers/panel) → Suas integrações → Credenciais de teste.

### Recomendação para produção

Hardcoded no código-fonte **não é uma boa prática mesmo em ambiente de testes**. O ideal é mover ambas as chaves para variáveis de ambiente:

```javascript
// server.js
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
```

E criar um arquivo `.env` na pasta `backend/` (já presente no `.gitignore` da raiz do projeto, então nunca será commitado):

```env
STRIPE_SECRET_KEY=sk_test_...
MP_ACCESS_TOKEN=TEST-...
```

Use o pacote `dotenv` (`npm install dotenv` e `import 'dotenv/config'` no topo de `server.js`) para carregar essas variáveis automaticamente.

---

## 16. Como Executar o Projeto na Sua Máquina

### 16.1 Pré-requisitos

| Requisito | Versão mínima | Como verificar |
|---|---|---|
| **Node.js** | 20.x LTS (recomendado: 20 ou 22) | `node -v` |
| **npm** | (vem com o Node) | `npm -v` |
| Conta Stripe (modo teste) | — | necessária só para testar Cartão/Boleto |
| Conta Mercado Pago (modo teste) | — | necessária só para testar PIX |

### 16.2 Clonando e instalando

```bash
git clone https://github.com/Ana-Bastoss/trabalhobd_bkd.git
cd trabalhobd_bkd
```

#### Passo 1 — Backend

```bash
cd backend
npm install
```

Isso instala: `express`, `sqlite3`, `sqlite`, `multer`, `mercadopago`, `stripe` e (dev) `nodemon`.

Em seguida, **edite `server.js`** e insira suas próprias chaves de teste (ver [seção 15](#15-️-aviso-de-segurança--chaves-removidas-do-repositório)):
- `new Stripe('sk_test_...')`
- `accessToken: 'TEST-...'` dentro de `MercadoPagoConfig`

Suba o servidor:

```bash
npm run dev      # com nodemon (recarrega automaticamente)
# ou
npm start        # sem nodemon
```

O backend sobe em **`http://localhost:3000`**. No primeiro start, ele cria automaticamente:
- O arquivo `backend/database.sqlite` com todas as tabelas (ver [seção 5](#5-banco-de-dados--como-foi-construído));
- A pasta `backend/uploads/` para receber imagens;
- O seed completo de dados de teste (ver [seção 6](#6-onde-está-o-seed-dados-iniciais)).

#### Passo 2 — Frontend (em outro terminal)

```bash
cd frontend
npm install
```

Isso instala: `react`, `react-dom`, `react-router-dom`, `@stripe/stripe-js`, `@stripe/react-stripe-js`, `jspdf` e as devDependencies (`vite`, `eslint`, etc.).

Em seguida, **edite `src/components/CheckoutModal.jsx`** e insira sua chave pública da Stripe:
```javascript
const stripePromise = loadStripe('pk_test_...');
```

Suba o frontend:

```bash
npm run dev
```

O frontend sobe em **`http://localhost:5173`** (porta padrão do Vite) e já está configurado (`vite.config.js`) para redirecionar automaticamente todas as chamadas `/api/*` e `/uploads/*` para `http://localhost:3000` — **não é necessário configurar CORS**.

### 16.3 Acessando o sistema

Abra `http://localhost:5173` no navegador. Use uma das credenciais da [tabela de seed](#credenciais-de-teste-geradas-pelo-seed) para fazer login, por exemplo:

```
E-mail: admin@wecorp.com
Senha:  123
```

### 16.4 Resumo de comandos (copiar e colar)

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run dev

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

### 16.5 Resetando o banco do zero

```bash
cd backend
rm database.sqlite
npm run dev   # recria o schema e roda o seed novamente
```

---

## 17. Testando a API via Postman/Insomnia

URL base: `http://localhost:3000`

### Exemplo — Login

```
POST /api/login
Content-Type: application/json

{ "email": "admin@wecorp.com", "senha": "123" }
```

### Exemplo — Criar evento (com imagem)

```
POST /api/eventos
Content-Type: multipart/form-data

titulo: Workshop de IA Generativa
categoria: Tecnologia
local: Hub de Inovação
data_evento: 2026-12-01
horario: 19:00 - 22:00
parceiro: WE Corp Oficial
heads: Equipe Técnica
valor: 49.90
tipoCriador: admin
imagem: <arquivo .png ou .jpg>
```

### Exemplo — Gerar PIX

```
POST /api/comprar
Content-Type: application/json

{
  "id_evento": 1,
  "id_usuario": 5,
  "metodo": "pix",
  "valor": 199.00,
  "email_cliente": "cliente@email.com"
}
```

### Exemplo — Iniciar pagamento com Cartão/Boleto

```
POST /api/comprar-stripe
Content-Type: application/json

{
  "id_evento": 1,
  "id_usuario": 5,
  "valor": 199.00,
  "email_cliente": "cliente@email.com"
}
```
*(A resposta traz um `clientSecret` — a confirmação real do pagamento acontece no frontend via SDK da Stripe, não há como "completar" o pagamento somente pelo Postman.)*

### Exemplo — Publicar avaliação

```
POST /api/avaliacoes
Content-Type: application/json

{
  "id_servico": 1,
  "id_usuario": 5,
  "autor_nome": "Ana Beatriz",
  "nota": 5,
  "comentario": "Serviço excelente, recomendo!"
}
```

---

## 18. Limitações Conhecidas e Próximos Passos

Esta seção documenta honestamente o que **não** está implementado, para que qualquer pessoa continuando o projeto saiba exatamente onde focar.

| Limitação | Detalhe | Sugestão de próximo passo |
|---|---|---|
| **Sem webhooks de pagamento** | Nenhuma rota recebe confirmação assíncrona do Mercado Pago ou da Stripe. O `status` da inscrição fica em `'Pendente'` mesmo após o pagamento ser efetivado no gateway. | Implementar `POST /api/webhooks/mercadopago` e `POST /api/webhooks/stripe`, validando a assinatura de cada provedor e atualizando `inscricoes.status`. |
| **Senha em texto plano** | `usuarios.senha` é comparada diretamente, sem hash. | Migrar para `bcrypt` (`bcrypt.hash` no cadastro, `bcrypt.compare` no login). |
| **Sem JWT/expiração de sessão** | A "sessão" no `localStorage` nunca expira sozinha. | Implementar JWT com expiração e refresh token, ou ao menos um timeout de sessão no frontend. |
| **Dashboards financeiros parcialmente estáticos** | As tabelas "Últimas Vendas" (Prestador) e "Desempenho por Evento"/Total Investido (Parceiro) ainda exibem números fixos de exemplo, não calculados a partir de `inscricoes`. | Criar rotas agregadoras, ex. `GET /api/financeiro/prestador/:id`, somando `inscricoes.valor` filtrado por `id_evento`/`id_servico` do dono. |
| **"Meus Clientes" do Prestador é estático** | A tabela na aba "Meus Clientes" de `PrestadorDashboard.jsx` lista 2 linhas fixas, sem relação com `inscricoes` reais de serviços. | Como hoje não existe uma tabela de "contratação de serviço" (apenas `inscricoes` de eventos), seria necessário criar uma tabela `contratacoes_servico` análoga a `inscricoes`. |
| **Botão "Resolver" de ticket é simples** | Marca o ticket como `Resolvido`, mas não há resposta nem histórico de mensagens. | Criar uma tabela `ticket_respostas` para permitir conversas de ida e volta. |
| **`StarRating.jsx` e `services/api.js` são órfãos** | Não são importados em nenhuma página atualmente; cada tela duplica sua própria lógica de estrelas e `fetch`. | Refatorar `Servicos.jsx` e `PrestadorDashboard.jsx` para reutilizar `StarRating.jsx`; migrar todos os `fetch` diretos para usar `services/api.js`. |
| **`frontend/assets/style.css` (raiz) é resíduo** | Existe um CSS idêntico ao de `src/assets/style.css`, mas fora da árvore importada pelo React (sobra da versão anterior em Vanilla JS). | Pode ser excluído com segurança. |
| **`tsconfig.json` do backend não é usado** | O backend roda em JavaScript puro (ESM); o `tsconfig.json` foi deixado propositalmente para uma futura migração a TypeScript, mas nenhum arquivo `.ts` existe hoje. | Migração futura opcional. |
| **Tabela `faturas_assinatura` sem rotas** | Existe no schema, mas nenhuma rota lê ou escreve nela — as "faturas" mostradas nos dashboards são valores fixos (R$ 1.250 / R$ 149,90). | Conectar `POST /api/pagar-assinatura` para também gravar uma linha em `faturas_assinatura`, e criar `GET /api/faturas/:id_usuario` para listar o histórico real. |
| **Upload aceita apenas 1 imagem por evento/serviço** | Sem galeria de múltiplas fotos. | Trocar `upload.single('imagem')` por `upload.array('imagens', N)` e ajustar o schema para uma tabela `imagens` separada. |
