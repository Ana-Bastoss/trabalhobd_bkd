# 🚀 WE Corp - Plataforma de Eventos e Parcerias

A **WE Corp** é uma aplicação web Full Stack desenvolvida para conectar empresas, prestadores de serviço e clientes. A plataforma oferece um sistema completo de gestão de eventos, venda de ingressos e administração de assinaturas para parceiros institucionais.

---

## Infraestrutura e Arquitetura

O projeto segue uma arquitetura monolítica simplificada, ideal para o escopo atual, com o backend servindo as rotas da API RESTful e os arquivos estáticos do frontend.

* **Frontend:** Desenvolvido em HTML5, CSS3 e JavaScript (Vanilla).
* **Backend:** Node.js com o framework **Express**.
* **Banco de Dados:** **SQLite** (banco relacional, armazenado fisicamente no arquivo `database.sqlite`).
* **Preparação para React (TypeScript):** O repositório conta com o arquivo `tsconfig.json` configurado para mapear arquivos `.tsx` e `.ts`. Embora o projeto atual utilize Vanilla JavaScript, essa infraestrutura foi deixada propositalmente para facilitar a futura migração para **React.js**.

---

## Tecnologias e Dependências Utilizadas

### Frontend
* HTML5, CSS3, JavaScript (Vanilla)
* Ícones via FontAwesome

### Backend (Node.js)
As seguintes bibliotecas foram instaladas via NPM (`package.json`):
* **`express`**: Framework para criação do servidor e rotas da API RESTful.
* **`sqlite3`** e **`sqlite`**: Para a criação e gestão do banco de dados relacional físico (`database.sqlite`).
* **`multer`**: Middleware para processamento e upload de arquivos (imagens).
* **`mercadopago`**: SDK oficial para integração do sistema de pagamentos via PIX.

---

## Lógica de Negócio e Fluxo de Usuários

O sistema possui um roteamento de autorização dinâmico que define a interface e as permissões de acesso com base no papel (Role) do usuário. O fluxo segue as seguintes regras de negócio:

1. **Intenção Inicial:** O usuário deseja participar de um evento, cadastrar uma empresa ou se tornar parceiro?
   * **Não:** É classificado como **Visitante** (Acesso apenas de visualização pública), não pode adquirir ingressos do evento sem cadastro.
   * **Sim:** O sistema verifica se ele possui cadastro.
      * Se **Não**, é direcionado para **Realizar Cadastro**.
      * Se **Sim**, o sistema verifica seu nível de acesso:

2. **Roteamento por Nível de Acesso (Role-Based Access Control):**
   * **Administrador:** Acesso total ao sistema. Gerenciamento de Prestadores, Patrocinadores, Parceiros, Clientes, aprovação de Eventos e controle de Pagamentos.
   * **Prestador de Serviço:** Acesso ao gerenciamento do próprio negócio (portfólio, avaliações, contratantes) e ao menu de sua assinatura.
   * **Patrocinador ou Parceiro:** Acesso à área restrita para criar/gerenciar seus próprios Eventos associados, relatórios de leads e menu de assinatura.
   * **Cliente:** Acesso ao sistema focado na contratação de serviços e na compra de ingressos para eventos.
   * **Visitante:** Caso não se encaixe em nenhum dos perfis (ou não esteja logado).

---

## Autenticação e Upload de Arquivos (Multer)

A segurança e manipulação de arquivos do lado do servidor foram implementadas utilizando middlewares do Express.

### Autenticação (Login)
A rota `POST /api/login` recebe as credenciais e as valida no banco SQLite de forma assíncrona. Se validadas, o backend retorna um objeto JSON com os dados e o *tipo* (role) do usuário. O frontend armazena essas informações no `localStorage` do navegador para manter a sessão ativa e renderizar as telas correspondentes ao fluxo de negócios descrito acima.

### Upload de Banners (Multer)
O processamento de imagens enviadas nos formulários de criação/edição de eventos (tipo `multipart/form-data`) é gerido pelo middleware **`multer`**.
* As imagens são recebidas e armazenadas fisicamente no diretório raiz `/uploads`.
* O middleware gera um nome seguro e único para cada arquivo, anexando a data da operação (`Date.now() + nomeSeguro`) para evitar sobreposição de arquivos.
* O banco de dados armazena apenas o nome do arquivo, enquanto o Express serve a pasta de forma estática via `app.use('/uploads', express.static(uploadDir))`.

## ~Nota Técnica~ — Integração PIX (Mercado Pago)

A integração PIX da plataforma já está funcional no frontend e backend, incluindo:

* geração de QR Code
* código “Copia e Cola”
* criação de pagamentos e assinaturas

Atualmente, porém, os pagamentos estão em **modo Sandbox (teste)**, ou seja, **não movimentam dinheiro real**.

Isso acontece porque o sistema utiliza uma credencial de testes do Mercado Pago:

```javascript
const client = new MercadoPagoConfig({
  accessToken: 'TEST-SEU-ACCESS-TOKEN-AQUI'
});
```
---

## API RESTful, CRUD e Testes (Postman)

O backend do projeto expõe uma API RESTful. A URL base local para todos os testes é `http://localhost:3000`. 
Abaixo estão os caminhos (endpoints) configurados para testes via **Postman** ou **Insomnia**:

### Autenticação
* `POST /api/login`
  * **Ação:** Autentica o usuário no sistema e roteia conforme a lógica de negócios.
  * **Body (raw/JSON):** `{"email": "admin@wecorp.com", "senha": "123"}`

### Eventos (Operações CRUD)
* **[READ]** `GET /api/eventos`
  * **Ação:** Retorna todos os eventos do banco de dados.
* **[READ]** `GET /api/eventos/:id`
  * **Ação:** Retorna os detalhes de um evento específico.
* **[CREATE]** `POST /api/eventos`
  * **Ação:** Cria um novo evento (com upload de imagem).
  * **Body (form-data):** `titulo`, `categoria`, `local`, `data_evento`, `horario`, `parceiro`, `heads`, e `imagem` (tipo *File*).
* **[UPDATE]** `PUT /api/eventos/:id`
  * **Ação:** Edição completa de um evento (atualização de imagem e dados textuais via multer).
* **[UPDATE]** `PUT /api/eventos/:id/status`
  * **Ação:** Rota isolada para o Admin aprovar ou recusar o evento.
  * **Body (raw/JSON):** `{"status": "Ativo"}`
* **[PATCH]** `PATCH /api/eventos/:id`
  * **Ação:** Atualização parcial dinâmica.
  * **Body (form-data):** Exemplo: key `valor`, value `49.90`.
* **[DELETE]** `DELETE /api/eventos/:id`
  * **Ação:** Exclui o evento do banco de dados definitivamente.
  
  ![Foto Postman](postman.png)

### Pagamentos (Integração Mercado Pago)
* `POST /api/comprar`
  * **Ação:** Registra a inscrição do cliente no banco e consome a API do Mercado Pago para gerar um PIX.
  * **Body (raw/JSON):** `{"id_evento": 1, "id_usuario": 5, "metodo": "pix", "valor": 199.00}`
* `POST /api/pagar-assinatura`
  * **Ação:** Processa a mensalidade de parceiros e devolve o hash PIX da fatura.
  * **Body (raw/JSON):** `{"id_usuario": 2, "metodo": "pix", "valor": 1250.00}`

---

## Como executar o projeto na sua máquina

### 1. Pré-requisitos
* **Node.js** instalado na máquina.

### 2. Instalação
No terminal, na pasta raiz do projeto, instale as dependências:
```bash
npm install express sqlite3 sqlite multer mercadopago
