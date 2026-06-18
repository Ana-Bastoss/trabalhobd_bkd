import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const client = new MercadoPagoConfig({ accessToken: 'TEST-SEU-ACCESS-TOKEN-AQUI', options: { timeout: 5000 } });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// =========================================
// 1. CONFIGURAÇÃO DE UPLOAD DE IMAGENS (Multer)
// =========================================
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, uploadDir); },
    filename: function (req, file, cb) {
        const nomeSeguro = file.originalname.replace(/\s+/g, '-');
        cb(null, Date.now() + '-' + nomeSeguro);
    }
});
const upload = multer({ storage: storage });

app.use(express.json());
// CORREÇÃO: serve os arquivos estáticos da própria pasta raiz do projeto
app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadDir));

let db;

// =========================================
// 2. CONFIGURAÇÃO DO BANCO DE DADOS
// =========================================
async function setupDatabase() {
    db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    console.log('✅ Banco de dados conectado com sucesso!');

    await db.exec(`
        CREATE TABLE IF NOT EXISTS inscricoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_usuario INTEGER,
            id_evento INTEGER,
            metodo TEXT,
            valor REAL,
            status TEXT DEFAULT 'Pendente',
            codigo_gateway TEXT,
            data_compra DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(id_usuario) REFERENCES usuarios(id),
            FOREIGN KEY(id_evento) REFERENCES eventos(id)
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            senha TEXT NOT NULL,
            tipo TEXT CHECK(tipo IN ('admin', 'patrocinador', 'parceiro', 'prestador', 'cliente')) NOT NULL
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS eventos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            categoria TEXT NOT NULL,
            local TEXT NOT NULL,
            data_evento TEXT NOT NULL,
            horario TEXT NOT NULL,
            parceiro TEXT NOT NULL,
            heads TEXT NOT NULL,
            descricao TEXT,
            valor REAL,
            conteudo TEXT,
            certificacao_inclusa TEXT,
            texto_certificacao TEXT,
            status TEXT DEFAULT 'Pendente',
            imagem TEXT
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS faturas_assinatura (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_usuario INTEGER,
            mes_referencia TEXT,
            metodo TEXT,
            valor REAL,
            status TEXT DEFAULT 'Pendente',
            codigo_gateway TEXT,
            data_geracao DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // ---- NOVA: Tabela de parceiros/patrocinadores ----
    await db.exec(`
        CREATE TABLE IF NOT EXISTS parceiros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            tipo TEXT CHECK(tipo IN ('patrocinador', 'parceiro')) NOT NULL,
            cnpj TEXT,
            email TEXT,
            telefone TEXT,
            endereco TEXT,
            status TEXT DEFAULT 'Ativo',
            id_usuario INTEGER,
            FOREIGN KEY(id_usuario) REFERENCES usuarios(id)
        );
    `);

    // ---- NOVA: Tabela de prestadores de serviço ----
    await db.exec(`
        CREATE TABLE IF NOT EXISTS prestadores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            segmento TEXT,
            email TEXT,
            telefone TEXT,
            descricao TEXT,
            status TEXT DEFAULT 'Ativo',
            plano TEXT DEFAULT 'Básico',
            avaliacao REAL DEFAULT 0,
            id_usuario INTEGER,
            FOREIGN KEY(id_usuario) REFERENCES usuarios(id)
        );
    `);

    // ---- NOVA: Tabela de postagens de serviços ----
    await db.exec(`
        CREATE TABLE IF NOT EXISTS servicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            categoria TEXT,
            descricao TEXT,
            valor REAL,
            status TEXT DEFAULT 'Pendente',
            avaliacao REAL DEFAULT 0,
            total_avaliacoes INTEGER DEFAULT 0,
            destaque INTEGER DEFAULT 0,
            imagem TEXT,
            id_prestador INTEGER,
            nome_prestador TEXT,
            data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(id_prestador) REFERENCES prestadores(id)
        );
    `);

    // ---- Seed de usuários ----
    const checkUser = await db.get("SELECT COUNT(*) as count FROM usuarios WHERE email = 'patrocinador@cisco.com'");
    if (checkUser.count === 0) {
        await db.run("DELETE FROM usuarios");
        const usuariosParaInserir = [
            ['Admin WE Corp', 'admin@wecorp.com', '123', 'admin'],
            ['Cisco Academy', 'patrocinador@cisco.com', '123', 'patrocinador'],
            ['SENAI', 'parceiro@senai.com', '123', 'parceiro'],
            ['TechSecurity', 'prestador@servico.com', '123', 'prestador'],
            ['Ana Beatriz', 'cliente@email.com', '123', 'cliente']
        ];
        for (const user of usuariosParaInserir) {
            await db.run('INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)', user);
        }
        console.log('Usuários inseridos automaticamente!');
    }

    // ---- Seed de eventos ----
    const checkEvent = await db.get("SELECT COUNT(*) as count FROM eventos WHERE parceiro = 'Cisco Academy'");
    if (checkEvent.count === 0) {
        await db.run("DELETE FROM eventos");
        await db.run(`
            INSERT INTO eventos (titulo, categoria, local, data_evento, horario, parceiro, heads, descricao, valor, conteudo, certificacao_inclusa, texto_certificacao, status, imagem) 
            VALUES 
            ('Bootcamp: Escalonamento Ágil for Startups', 'Startups e Inovação', 'Hub de Inovação Tecnológica', '2026-10-15', '09:00 - 12:00', 'SENAI', 'Diretores SENAI e Convidados', 'Aprenda metodologias ágeis modernas.', 299.00, 'Como escalar equipas em ambientes de incerteza.', 'sim', 'Certificado de imersão validado pelo SENAI.', 'Pendente', null),
            ('Treinamento: Certificação Cisco CCNA', 'Certificação', 'Plataforma Online WE Corp', '2026-08-15', '19:00 - 22:00', 'Cisco Academy', 'Instrutores Oficiais Cisco', 'Treinamento oficial para a certificação Cisco CCNA.', 199.00, 'Fundamentos de Redes, Conectividade IP e Segurança.', 'sim', 'Voucher de desconto para a prova.', 'Ativo', null),
            ('Workshop: Alfabetização Tecnológica', 'Educação', 'Hub de Iniciação Científica', '2026-11-20', '14:00 - 16:00', 'Cisco Academy', 'Educadores Cisco', 'Introdução à tecnologia para iniciantes.', 0.00, 'Navegação segura na internet e letramento digital.', 'nao', null, 'Ativo', null)
        `);
        console.log('Eventos inseridos automaticamente!');
    }

    // ---- Seed de parceiros ----
    const checkParceiro = await db.get("SELECT COUNT(*) as count FROM parceiros");
    if (checkParceiro.count === 0) {
        const userCisco = await db.get("SELECT id FROM usuarios WHERE email = 'patrocinador@cisco.com'");
        const userSenai = await db.get("SELECT id FROM usuarios WHERE email = 'parceiro@senai.com'");
        await db.run(`
            INSERT INTO parceiros (nome, tipo, cnpj, email, telefone, endereco, status, id_usuario) VALUES
            ('Cisco Academy', 'patrocinador', '00.111.222/0001-33', 'contato@cisco.academy.com', '(11) 9999-9999', 'Av. Paulista, 1000 - São Paulo, SP', 'Ativo', ?),
            ('SENAI', 'parceiro', '03.777.078/0001-53', 'contato@senai.com', '(11) 8888-8888', 'Rua Monsenhor Andrade, 298 - São Paulo, SP', 'Ativo', ?)
        `, [userCisco ? userCisco.id : null, userSenai ? userSenai.id : null]);
        console.log('Parceiros inseridos automaticamente!');
    }

    // ---- Seed de prestadores ----
    const checkPrestador = await db.get("SELECT COUNT(*) as count FROM prestadores");
    if (checkPrestador.count === 0) {
        const userTech = await db.get("SELECT id FROM usuarios WHERE email = 'prestador@servico.com'");
        await db.run(
            `INSERT INTO prestadores (nome, segmento, email, telefone, descricao, status, plano, avaliacao, id_usuario) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['TechSecurity Admin', 'Tecnologia', 'contato@techsecurity.com', '(61) 99999-0001', 'Especialistas em segurança de redes e infraestrutura corporativa, com foco em proteção de dados e compliance LGPD.', 'Ativo', 'Profissional (Ouro)', 5.0, userTech ? userTech.id : null]
        );
        await db.run(
            `INSERT INTO prestadores (nome, segmento, email, telefone, descricao, status, plano, avaliacao, id_usuario) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['BuildTech Engenharia', 'Engenharia', 'contato@buildtech.com', '(11) 99997-0003', 'Planejamento e execução de projetos de infraestrutura inteligente para ambientes corporativos modernos e sustentáveis.', 'Ativo', 'Profissional (Ouro)', 4.9, null]
        );
        await db.run(
            `INSERT INTO prestadores (nome, segmento, email, telefone, descricao, status, plano, avaliacao, id_usuario) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['EducaPro Corp', 'Educação', 'contato@educapro.com', '(21) 99996-0004', 'Capacitação corporativa em metodologias ágeis, Scrum e Kanban para escalar a produtividade de equipes.', 'Ativo', 'Básico', 4.2, null]
        );
        await db.run(
            `INSERT INTO prestadores (nome, segmento, email, telefone, descricao, status, plano, avaliacao, id_usuario) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['CloudSys IT', 'Tecnologia', 'contato@cloudsys.com', '(11) 99998-0002', 'Criação de soluções personalizadas hospedadas em nuvem, garantindo alta disponibilidade e segurança.', 'Ativo', 'Básico', 4.7, null]
        );
        await db.run(
            `INSERT INTO prestadores (nome, segmento, email, telefone, descricao, status, plano, avaliacao, id_usuario) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['NovaEng Soluções', 'Engenharia', 'contato@novaeng.com', '(31) 99995-0005', 'Serviço especializado em auditoria de plantas industriais e mapeamento de riscos operacionais.', 'Ativo', 'Básico', 4.0, null]
        );
        console.log('Prestadores inseridos automaticamente!');
    }

    // ---- Seed de serviços/postagens ----
    const checkServico = await db.get("SELECT COUNT(*) as count FROM servicos");
    if (checkServico.count === 0) {
        const prestTech   = await db.get("SELECT id FROM prestadores WHERE nome = 'TechSecurity Admin'");
        const prestBuild  = await db.get("SELECT id FROM prestadores WHERE nome = 'BuildTech Engenharia'");
        const prestEduca  = await db.get("SELECT id FROM prestadores WHERE nome = 'EducaPro Corp'");
        const prestCloud  = await db.get("SELECT id FROM prestadores WHERE nome = 'CloudSys IT'");
        const prestNova   = await db.get("SELECT id FROM prestadores WHERE nome = 'NovaEng Soluções'");

        // Serviços em destaque (status Ativo, avaliação alta)
        await db.run(
            `INSERT INTO servicos (titulo, categoria, descricao, valor, status, avaliacao, total_avaliacoes, destaque, imagem, id_prestador, nome_prestador) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['Consultoria em Cibersegurança e Redes', 'Tecnologia',
             'Análise de vulnerabilidades, configuração de firewalls e reestruturação de redes corporativas com foco em proteção de dados e compliance com a LGPD.',
             2500.00, 'Ativo', 5.0, 12, 1, null, prestTech ? prestTech.id : null, 'TechSecurity Admin']
        );
        await db.run(
            `INSERT INTO servicos (titulo, categoria, descricao, valor, status, avaliacao, total_avaliacoes, destaque, imagem, id_prestador, nome_prestador) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['Projeto de Infraestrutura Ágil', 'Engenharia',
             'Planejamento e execução de projetos de infraestrutura inteligente para ambientes corporativos modernos e sustentáveis.',
             3200.00, 'Ativo', 4.9, 8, 1, null, prestBuild ? prestBuild.id : null, 'BuildTech Engenharia']
        );
        // Serviços gerais
        await db.run(
            `INSERT INTO servicos (titulo, categoria, descricao, valor, status, avaliacao, total_avaliacoes, destaque, imagem, id_prestador, nome_prestador) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['Treinamento em Metodologias Ágeis', 'Educação',
             'Capacitação completa para equipes em metodologias como Scrum e Kanban para escalar a produtividade do seu negócio.',
             1200.00, 'Ativo', 4.2, 21, 0, null, prestEduca ? prestEduca.id : null, 'EducaPro Corp']
        );
        await db.run(
            `INSERT INTO servicos (titulo, categoria, descricao, valor, status, avaliacao, total_avaliacoes, destaque, imagem, id_prestador, nome_prestador) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['Desenvolvimento de Sistemas Cloud', 'Tecnologia',
             'Criação de soluções personalizadas hospedadas em nuvem, garantindo alta disponibilidade e segurança para seus clientes.',
             4500.00, 'Ativo', 4.7, 15, 0, null, prestCloud ? prestCloud.id : null, 'CloudSys IT']
        );
        await db.run(
            `INSERT INTO servicos (titulo, categoria, descricao, valor, status, avaliacao, total_avaliacoes, destaque, imagem, id_prestador, nome_prestador) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['Auditoria Estrutural e de Processos', 'Engenharia',
             'Serviço especializado em auditoria de plantas industriais e mapeamento de riscos operacionais.',
             2800.00, 'Ativo', 4.0, 9, 0, null, prestNova ? prestNova.id : null, 'NovaEng Soluções']
        );
        console.log('Serviços inseridos automaticamente!');
    }
}

// =========================================
// ROTA DE PAGAMENTO (MERCADO PAGO - PIX)
// =========================================
app.post('/api/comprar', async (req, res) => {
    const { id_evento, id_usuario, metodo, valor, email_cliente } = req.body;
    try {
        const resultDB = await db.run(`
            INSERT INTO inscricoes (id_usuario, id_evento, metodo, valor, status) 
            VALUES (?, ?, ?, ?, 'Pendente')
        `, [id_usuario, id_evento, metodo, valor]);
        const idInscricao = resultDB.lastID;
        if (metodo === 'pix') {
            const payment = new Payment(client);
            const requestOptions = {
                body: {
                    transaction_amount: Number(valor),
                    description: `Inscrição Evento #${id_evento} - WE Corp`,
                    payment_method_id: 'pix',
                    payer: { email: email_cliente || 'test_user_wecorp@test.com' }
                }
            };
            const respostaMP = await payment.create(requestOptions);
            return res.json({
                sucesso: true,
                id_inscricao: idInscricao,
                qr_code_base64: respostaMP.point_of_interaction.transaction_data.qr_code_base64,
                qr_code_copia_cola: respostaMP.point_of_interaction.transaction_data.qr_code
            });
        }
        res.json({ sucesso: true, mensagem: "Pedido gerado com sucesso!" });
    } catch (error) {
        console.error("Erro no pagamento:", error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao processar o pagamento com o Mercado Pago.' });
    }
});

// =========================================
// 3. ROTAS DA API - ORIGINAIS
// =========================================
app.get('/api/status', (req, res) => res.json({ status: 'Online' }));

app.post('/api/login', async (req, res) => {
    const { email, senha } = req.body;
    try {
        const usuario = await db.get('SELECT id, nome, email, tipo FROM usuarios WHERE email = ? AND senha = ?', [email, senha]);
        if (usuario) res.json({ sucesso: true, usuario: usuario });
        else res.status(401).json({ sucesso: false, mensagem: 'E-mail ou senha incorretos' });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno' });
    }
});

app.get('/api/eventos', async (req, res) => {
    try {
        const eventos = await db.all('SELECT * FROM eventos');
        res.json({ sucesso: true, eventos: eventos });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar eventos' });
    }
});

app.get('/api/eventos/:id', async (req, res) => {
    try {
        const evento = await db.get('SELECT * FROM eventos WHERE id = ?', [req.params.id]);
        if (evento) res.json({ sucesso: true, evento: evento });
        else res.status(404).json({ sucesso: false, mensagem: 'Evento não encontrado' });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno' });
    }
});

app.post('/api/eventos', upload.single('imagem'), async (req, res) => {
    const { titulo, categoria, local, data_evento, horario, parceiro, heads, descricao, valor, conteudo, certificacao_inclusa, texto_certificacao, tipoCriador } = req.body;
    const nomeImagem = req.file ? req.file.filename : null;
    const statusInicial = (tipoCriador === 'admin') ? 'Ativo' : 'Pendente';
    try {
        const resultado = await db.run(`
            INSERT INTO eventos (titulo, categoria, local, data_evento, horario, parceiro, heads, descricao, valor, conteudo, certificacao_inclusa, texto_certificacao, status, imagem) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [titulo, categoria, local, data_evento, horario, parceiro, heads, descricao, valor, conteudo, certificacao_inclusa, texto_certificacao, statusInicial, nomeImagem]);
        res.json({ sucesso: true, id: resultado.lastID, mensagem: 'Evento salvo com sucesso!', status: statusInicial });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao salvar evento' });
    }
});

app.put('/api/eventos/:id/status', express.json(), async (req, res) => {
    const { status } = req.body;
    try {
        await db.run('UPDATE eventos SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ sucesso: true, mensagem: `Evento marcado como ${status}!` });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar status' });
    }
});

app.put('/api/eventos/:id', upload.single('imagem'), async (req, res) => {
    const { titulo, categoria, local, data_evento, horario, parceiro, heads, descricao, valor, conteudo, certificacao_inclusa, texto_certificacao } = req.body;
    try {
        if (req.file) {
            await db.run(`UPDATE eventos SET titulo=?, categoria=?, local=?, data_evento=?, horario=?, parceiro=?, heads=?, descricao=?, valor=?, conteudo=?, certificacao_inclusa=?, texto_certificacao=?, imagem=? WHERE id=?`,
                [titulo, categoria, local, data_evento, horario, parceiro, heads, descricao, valor, conteudo, certificacao_inclusa, texto_certificacao, req.file.filename, req.params.id]);
        } else {
            await db.run(`UPDATE eventos SET titulo=?, categoria=?, local=?, data_evento=?, horario=?, parceiro=?, heads=?, descricao=?, valor=?, conteudo=?, certificacao_inclusa=?, texto_certificacao=? WHERE id=?`,
                [titulo, categoria, local, data_evento, horario, parceiro, heads, descricao, valor, conteudo, certificacao_inclusa, texto_certificacao, req.params.id]);
        }
        res.json({ sucesso: true, mensagem: 'Evento atualizado com sucesso!' });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao editar evento' });
    }
});

app.delete('/api/eventos/:id', async (req, res) => {
    try {
        const resultado = await db.run('DELETE FROM eventos WHERE id = ?', [req.params.id]);
        if (resultado.changes > 0) res.json({ sucesso: true, mensagem: 'Evento eliminado com sucesso!' });
        else res.status(404).json({ sucesso: false, mensagem: 'Evento não encontrado.' });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao eliminar o evento.' });
    }
});

app.patch('/api/eventos/:id', upload.single('imagem'), async (req, res) => {
    const id = req.params.id;
    const camposRecebidos = req.body;
    let queryAtualizacao = [];
    let valores = [];
    if (req.file) camposRecebidos.imagem = req.file.filename;
    for (const [coluna, valor] of Object.entries(camposRecebidos)) {
        queryAtualizacao.push(`${coluna} = ?`);
        valores.push(valor);
    }
    if (queryAtualizacao.length === 0) return res.status(400).json({ sucesso: false, mensagem: 'Nenhum campo enviado para atualização.' });
    valores.push(id);
    const sql = `UPDATE eventos SET ${queryAtualizacao.join(', ')} WHERE id = ?`;
    try {
        const resultado = await db.run(sql, valores);
        if (resultado.changes > 0) res.json({ sucesso: true, mensagem: 'Evento atualizado com sucesso (PATCH)!' });
        else res.status(404).json({ sucesso: false, mensagem: 'Evento não encontrado.' });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao atualizar o evento.' });
    }
});

// =========================================
// 4. ROTAS DA API - PARCEIROS
// =========================================
app.get('/api/parceiros', async (req, res) => {
    try {
        const parceiros = await db.all('SELECT * FROM parceiros ORDER BY nome');
        res.json({ sucesso: true, parceiros });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar parceiros' });
    }
});

app.get('/api/parceiros/:id', async (req, res) => {
    try {
        const parceiro = await db.get('SELECT * FROM parceiros WHERE id = ?', [req.params.id]);
        if (parceiro) res.json({ sucesso: true, parceiro });
        else res.status(404).json({ sucesso: false, mensagem: 'Parceiro não encontrado' });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno' });
    }
});

app.post('/api/parceiros', async (req, res) => {
    const { nome, tipo, cnpj, email, telefone, endereco, status } = req.body;
    try {
        const resultado = await db.run(
            'INSERT INTO parceiros (nome, tipo, cnpj, email, telefone, endereco, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nome, tipo, cnpj, email, telefone, endereco, status || 'Ativo']
        );
        res.json({ sucesso: true, id: resultado.lastID, mensagem: 'Parceiro cadastrado com sucesso!' });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao cadastrar parceiro' });
    }
});

app.put('/api/parceiros/:id', async (req, res) => {
    const { nome, tipo, cnpj, email, telefone, endereco, status } = req.body;
    try {
        const resultado = await db.run(
            'UPDATE parceiros SET nome=?, tipo=?, cnpj=?, email=?, telefone=?, endereco=?, status=? WHERE id=?',
            [nome, tipo, cnpj, email, telefone, endereco, status, req.params.id]
        );
        if (resultado.changes > 0) res.json({ sucesso: true, mensagem: 'Parceiro atualizado com sucesso!' });
        else res.status(404).json({ sucesso: false, mensagem: 'Parceiro não encontrado.' });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar parceiro' });
    }
});

app.delete('/api/parceiros/:id', async (req, res) => {
    try {
        const resultado = await db.run('DELETE FROM parceiros WHERE id = ?', [req.params.id]);
        if (resultado.changes > 0) res.json({ sucesso: true, mensagem: 'Parceiro removido com sucesso!' });
        else res.status(404).json({ sucesso: false, mensagem: 'Parceiro não encontrado.' });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno' });
    }
});

// =========================================
// 5. ROTAS DA API - PRESTADORES
// =========================================
app.get('/api/prestadores', async (req, res) => {
    try {
        const prestadores = await db.all('SELECT * FROM prestadores ORDER BY nome');
        res.json({ sucesso: true, prestadores });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar prestadores' });
    }
});

app.get('/api/prestadores/:id', async (req, res) => {
    try {
        const prestador = await db.get('SELECT * FROM prestadores WHERE id = ?', [req.params.id]);
        if (prestador) res.json({ sucesso: true, prestador });
        else res.status(404).json({ sucesso: false, mensagem: 'Prestador não encontrado' });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno' });
    }
});

app.post('/api/prestadores', async (req, res) => {
    const { nome, segmento, email, telefone, descricao, status, plano } = req.body;
    try {
        const resultado = await db.run(
            'INSERT INTO prestadores (nome, segmento, email, telefone, descricao, status, plano) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nome, segmento, email, telefone, descricao, status || 'Ativo', plano || 'Básico']
        );
        res.json({ sucesso: true, id: resultado.lastID, mensagem: 'Prestador cadastrado com sucesso!' });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao cadastrar prestador' });
    }
});

app.put('/api/prestadores/:id', async (req, res) => {
    const { nome, segmento, email, telefone, descricao, status, plano } = req.body;
    try {
        const resultado = await db.run(
            'UPDATE prestadores SET nome=?, segmento=?, email=?, telefone=?, descricao=?, status=?, plano=? WHERE id=?',
            [nome, segmento, email, telefone, descricao, status, plano, req.params.id]
        );
        if (resultado.changes > 0) res.json({ sucesso: true, mensagem: 'Prestador atualizado com sucesso!' });
        else res.status(404).json({ sucesso: false, mensagem: 'Prestador não encontrado.' });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar prestador' });
    }
});

app.delete('/api/prestadores/:id', async (req, res) => {
    try {
        const resultado = await db.run('DELETE FROM prestadores WHERE id = ?', [req.params.id]);
        if (resultado.changes > 0) res.json({ sucesso: true, mensagem: 'Prestador removido com sucesso!' });
        else res.status(404).json({ sucesso: false, mensagem: 'Prestador não encontrado.' });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno' });
    }
});

// =========================================
// 6. ROTAS DA API - SERVIÇOS (POSTAGENS)
// =========================================
app.get('/api/servicos', async (req, res) => {
    try {
        const servicos = await db.all('SELECT * FROM servicos ORDER BY data_criacao DESC');
        res.json({ sucesso: true, servicos });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar serviços' });
    }
});

app.get('/api/servicos/:id', async (req, res) => {
    try {
        const servico = await db.get('SELECT * FROM servicos WHERE id = ?', [req.params.id]);
        if (servico) res.json({ sucesso: true, servico });
        else res.status(404).json({ sucesso: false, mensagem: 'Serviço não encontrado' });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno' });
    }
});

app.post('/api/servicos', upload.single('imagem'), async (req, res) => {
    const { titulo, categoria, descricao, valor, id_prestador, nome_prestador, tipoCriador, destaque } = req.body;
    const nomeImagem = req.file ? req.file.filename : null;
    const statusInicial = (tipoCriador === 'admin') ? 'Ativo' : 'Pendente';
    try {
        const resultado = await db.run(
            'INSERT INTO servicos (titulo, categoria, descricao, valor, status, destaque, imagem, id_prestador, nome_prestador) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [titulo, categoria, descricao, valor || 0, statusInicial, destaque || 0, nomeImagem, id_prestador || null, nome_prestador || '']
        );
        res.json({ sucesso: true, id: resultado.lastID, mensagem: 'Postagem de serviço criada com sucesso!', status: statusInicial });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao criar serviço' });
    }
});

app.put('/api/servicos/:id', upload.single('imagem'), async (req, res) => {
    const { titulo, categoria, descricao, valor, nome_prestador, destaque } = req.body;
    try {
        if (req.file) {
            await db.run(
                'UPDATE servicos SET titulo=?, categoria=?, descricao=?, valor=?, nome_prestador=?, destaque=?, imagem=? WHERE id=?',
                [titulo, categoria, descricao, valor, nome_prestador, destaque || 0, req.file.filename, req.params.id]
            );
        } else {
            await db.run(
                'UPDATE servicos SET titulo=?, categoria=?, descricao=?, valor=?, nome_prestador=?, destaque=? WHERE id=?',
                [titulo, categoria, descricao, valor, nome_prestador, destaque || 0, req.params.id]
            );
        }
        res.json({ sucesso: true, mensagem: 'Serviço atualizado com sucesso!' });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar serviço' });
    }
});

app.put('/api/servicos/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        await db.run('UPDATE servicos SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ sucesso: true, mensagem: `Serviço marcado como ${status}!` });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar status do serviço' });
    }
});

app.delete('/api/servicos/:id', async (req, res) => {
    try {
        const resultado = await db.run('DELETE FROM servicos WHERE id = ?', [req.params.id]);
        if (resultado.changes > 0) res.json({ sucesso: true, mensagem: 'Serviço removido com sucesso!' });
        else res.status(404).json({ sucesso: false, mensagem: 'Serviço não encontrado.' });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno' });
    }
});

// =========================================
// ROTA RAIZ
// =========================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

setupDatabase().then(() => {
    app.listen(PORT, () => console.log(`🚀 Servidor rodando em: http://localhost:${PORT}`));
}).catch(err => console.error('❌ Erro:', err));