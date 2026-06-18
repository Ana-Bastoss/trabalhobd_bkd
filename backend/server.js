import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const mpClient = new MercadoPagoConfig({
    accessToken: 'TEST-SEU-ACCESS-TOKEN-AQUI',
    options: { timeout: 5000 }
});

import Stripe from 'stripe';
const stripe = new Stripe('sk_test_51TjiOjKovEjRHOi6brX861Toeq3PooG0kVDX555dOXF83u5FCxx6XbCdCyvxLYXk6cZaVivYljseVzLr0HCdLd9000KqjxV2zC');

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const app        = express();
const PORT       = 3000;

// =========================================
// 1. UPLOAD (Multer)
// =========================================
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename:    (req, file, cb) => {
        const safe = file.originalname.replace(/\s+/g, '-');
        cb(null, Date.now() + '-' + safe);
    }
});
const upload = multer({ storage });

app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadDir));

let db;

// =========================================
// 2. BANCO DE DADOS
// =========================================
async function setupDatabase() {
    db = await open({ filename: path.join(__dirname, 'database.sqlite'), driver: sqlite3.Database });
    console.log('✅ Banco conectado!');

    await db.exec(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            senha TEXT NOT NULL,
            tipo TEXT CHECK(tipo IN ('admin','patrocinador','parceiro','prestador','cliente')) NOT NULL,
            cpf TEXT,
            status TEXT DEFAULT 'Ativo'
        );
        CREATE TABLE IF NOT EXISTS inscricoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_usuario INTEGER, id_evento INTEGER,
            metodo TEXT, valor REAL, status TEXT DEFAULT 'Pendente',
            codigo_gateway TEXT,
            data_compra DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(id_usuario) REFERENCES usuarios(id),
            FOREIGN KEY(id_evento)  REFERENCES eventos(id)
        );
        CREATE TABLE IF NOT EXISTS eventos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL, categoria TEXT NOT NULL,
            local TEXT NOT NULL,  data_evento TEXT NOT NULL,
            horario TEXT NOT NULL, parceiro TEXT NOT NULL, heads TEXT NOT NULL,
            descricao TEXT, valor REAL, conteudo TEXT,
            certificacao_inclusa TEXT, texto_certificacao TEXT,
            status TEXT DEFAULT 'Pendente', imagem TEXT
        );
        CREATE TABLE IF NOT EXISTS faturas_assinatura (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_usuario INTEGER, mes_referencia TEXT,
            metodo TEXT, valor REAL, status TEXT DEFAULT 'Pendente',
            codigo_gateway TEXT, data_geracao DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS parceiros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            tipo TEXT CHECK(tipo IN ('patrocinador','parceiro')) NOT NULL,
            cnpj TEXT, email TEXT, telefone TEXT, endereco TEXT,
            status TEXT DEFAULT 'Ativo',
            id_usuario INTEGER, FOREIGN KEY(id_usuario) REFERENCES usuarios(id)
        );
        CREATE TABLE IF NOT EXISTS prestadores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL, segmento TEXT, email TEXT, telefone TEXT,
            descricao TEXT, status TEXT DEFAULT 'Ativo', plano TEXT DEFAULT 'Básico',
            avaliacao REAL DEFAULT 0,
            id_usuario INTEGER, FOREIGN KEY(id_usuario) REFERENCES usuarios(id)
        );
        CREATE TABLE IF NOT EXISTS servicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL, categoria TEXT, descricao TEXT,
            valor REAL, status TEXT DEFAULT 'Pendente',
            avaliacao REAL DEFAULT 0, total_avaliacoes INTEGER DEFAULT 0,
            destaque INTEGER DEFAULT 0, imagem TEXT,
            id_prestador INTEGER, nome_prestador TEXT,
            data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(id_prestador) REFERENCES prestadores(id)
        );
        CREATE TABLE IF NOT EXISTS avaliacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_servico   INTEGER NOT NULL,
            id_usuario   INTEGER,
            autor_nome   TEXT NOT NULL,
            nota         INTEGER NOT NULL CHECK(nota BETWEEN 1 AND 5),
            comentario   TEXT,
            data_avaliacao DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(id_servico)  REFERENCES servicos(id),
            FOREIGN KEY(id_usuario)  REFERENCES usuarios(id)
        );
        CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_usuario     INTEGER,
            nome_remetente TEXT NOT NULL,
            tipo_remetente TEXT DEFAULT 'cliente',
            assunto        TEXT NOT NULL,
            mensagem       TEXT NOT NULL,
            status         TEXT DEFAULT 'Aberto',
            data_abertura  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(id_usuario) REFERENCES usuarios(id)
        );
    `);

    // Colunas extras em tabelas já existentes (safe)
    const alters = [
        "ALTER TABLE usuarios ADD COLUMN cpf TEXT",
        "ALTER TABLE usuarios ADD COLUMN status TEXT DEFAULT 'Ativo'"
    ];
    for (const sql of alters) {
        try { await db.exec(sql); } catch (_) {}
    }

    // ---- Seeds ----
    const checkUser = await db.get("SELECT COUNT(*) as c FROM usuarios WHERE email='patrocinador@cisco.com'");
    if (checkUser.c === 0) {
        await db.run("DELETE FROM usuarios");
        const users = [
            ['Admin WE Corp','admin@wecorp.com','123','admin','','Ativo'],
            ['Cisco Academy','patrocinador@cisco.com','123','patrocinador','','Ativo'],
            ['SENAI','parceiro@senai.com','123','parceiro','','Ativo'],
            ['TechSecurity','prestador@servico.com','123','prestador','','Ativo'],
            ['Ana Beatriz','cliente@email.com','123','cliente','000.000.000-00','Ativo']
        ];
        for (const u of users)
            await db.run('INSERT INTO usuarios(nome,email,senha,tipo,cpf,status) VALUES(?,?,?,?,?,?)', u);
        console.log('Seeds usuários inseridos');
    }

    const checkEvt = await db.get("SELECT COUNT(*) as c FROM eventos WHERE parceiro='Cisco Academy'");
    if (checkEvt.c === 0) {
        await db.run("DELETE FROM eventos");
        await db.run(`INSERT INTO eventos(titulo,categoria,local,data_evento,horario,parceiro,heads,descricao,valor,conteudo,certificacao_inclusa,texto_certificacao,status,imagem) VALUES
            ('Bootcamp: Escalonamento Ágil for Startups','Startups e Inovação','Hub de Inovação Tecnológica','2026-10-15','09:00 - 12:00','SENAI','Diretores SENAI e Convidados','Aprenda metodologias ágeis modernas.',299.00,'Como escalar equipas em ambientes de incerteza.','sim','Certificado de imersão validado pelo SENAI.','Pendente',null),
            ('Treinamento: Certificação Cisco CCNA','Certificação','Plataforma Online WE Corp','2026-08-15','19:00 - 22:00','Cisco Academy','Instrutores Oficiais Cisco','Treinamento oficial para a certificação Cisco CCNA.',199.00,'Fundamentos de Redes, Conectividade IP e Segurança.','sim','Voucher de desconto para a prova.','Ativo',null),
            ('Workshop: Alfabetização Tecnológica','Educação','Hub de Iniciação Científica','2026-11-20','14:00 - 16:00','Cisco Academy','Educadores Cisco','Introdução à tecnologia para iniciantes.',0.00,'Navegação segura na internet e letramento digital.','nao',null,'Ativo',null)`);
        console.log('Seeds eventos inseridos');
    }

    const checkPar = await db.get("SELECT COUNT(*) as c FROM parceiros");
    if (checkPar.c === 0) {
        const cisco = await db.get("SELECT id FROM usuarios WHERE email='patrocinador@cisco.com'");
        const senai = await db.get("SELECT id FROM usuarios WHERE email='parceiro@senai.com'");
        await db.run(`INSERT INTO parceiros(nome,tipo,cnpj,email,telefone,endereco,status,id_usuario) VALUES
            ('Cisco Academy','patrocinador','00.111.222/0001-33','contato@cisco.academy.com','(11) 9999-9999','Av. Paulista, 1000 - São Paulo, SP','Ativo',?),
            ('SENAI','parceiro','03.777.078/0001-53','contato@senai.com','(11) 8888-8888','Rua Monsenhor Andrade, 298 - São Paulo, SP','Ativo',?)`,
            [cisco?.id ?? null, senai?.id ?? null]);
        console.log('Seeds parceiros inseridos');
    }

    const checkPre = await db.get("SELECT COUNT(*) as c FROM prestadores");
    if (checkPre.c === 0) {
        const tech = await db.get("SELECT id FROM usuarios WHERE email='prestador@servico.com'");
        const pres = [
            ['TechSecurity','Tecnologia','contato@techsecurity.com','(61) 99999-0001','Especialistas em segurança de redes.','Ativo','Profissional (Ouro)',5.0,tech?.id??null],
            ['BuildTech Engenharia','Engenharia','contato@buildtech.com','(11) 99997-0003','Infraestrutura inteligente corporativa.','Ativo','Profissional (Ouro)',4.9,null],
            ['EducaPro Corp','Educação','contato@educapro.com','(21) 99996-0004','Capacitação em metodologias ágeis.','Ativo','Básico',4.2,null],
            ['CloudSys IT','Tecnologia','contato@cloudsys.com','(11) 99998-0002','Soluções em nuvem.','Ativo','Básico',4.7,null],
            ['NovaEng Soluções','Engenharia','contato@novaeng.com','(31) 99995-0005','Auditoria de plantas industriais.','Ativo','Básico',4.0,null]
        ];
        for (const p of pres)
            await db.run('INSERT INTO prestadores(nome,segmento,email,telefone,descricao,status,plano,avaliacao,id_usuario) VALUES(?,?,?,?,?,?,?,?,?)',p);
        console.log('Seeds prestadores inseridos');
    }

    const checkSvc = await db.get("SELECT COUNT(*) as c FROM servicos");
    if (checkSvc.c === 0) {
        const t = await db.get("SELECT id FROM prestadores WHERE nome='TechSecurity'");
        const b = await db.get("SELECT id FROM prestadores WHERE nome='BuildTech Engenharia'");
        const e = await db.get("SELECT id FROM prestadores WHERE nome='EducaPro Corp'");
        const c = await db.get("SELECT id FROM prestadores WHERE nome='CloudSys IT'");
        const n = await db.get("SELECT id FROM prestadores WHERE nome='NovaEng Soluções'");
        const svcs = [
            ['Consultoria em Cibersegurança e Redes','Tecnologia','Análise de vulnerabilidades e firewalls.',2500.00,'Ativo',5.0,12,1,null,t?.id,'TechSecurity'],
            ['Projeto de Infraestrutura Ágil','Engenharia','Infraestrutura para ambientes modernos.',3200.00,'Ativo',4.9,8,1,null,b?.id,'BuildTech Engenharia'],
            ['Treinamento em Metodologias Ágeis','Educação','Scrum e Kanban para equipes.',1200.00,'Ativo',4.2,21,0,null,e?.id,'EducaPro Corp'],
            ['Desenvolvimento de Sistemas Cloud','Tecnologia','Soluções em nuvem personalizadas.',4500.00,'Ativo',4.7,15,0,null,c?.id,'CloudSys IT'],
            ['Auditoria Estrutural e de Processos','Engenharia','Auditoria de plantas industriais.',2800.00,'Ativo',4.0,9,0,null,n?.id,'NovaEng Soluções']
        ];
        for (const s of svcs)
            await db.run('INSERT INTO servicos(titulo,categoria,descricao,valor,status,avaliacao,total_avaliacoes,destaque,imagem,id_prestador,nome_prestador) VALUES(?,?,?,?,?,?,?,?,?,?,?)',s);
        console.log('Seeds serviços inseridos');
    }
}

// =========================================
// PAGAMENTOS
// =========================================
app.post('/api/comprar', async (req, res) => {
    const { id_evento, id_usuario, metodo, valor, email_cliente } = req.body;
    try {
        const r = await db.run(
            "INSERT INTO inscricoes(id_usuario,id_evento,metodo,valor,status) VALUES(?,?,?,?,'Pendente')",
            [id_usuario, id_evento, metodo, valor]
        );
        if (metodo === 'pix') {
            const payment   = new Payment(mpClient);
            const respostaMP = await payment.create({ body: {
                transaction_amount: Number(valor),
                description: `Inscrição Evento #${id_evento} - WE Corp`,
                payment_method_id: 'pix',
                payer: { email: email_cliente || 'test_user_wecorp@test.com' }
            }});
            return res.json({
                sucesso: true, id_inscricao: r.lastID,
                qr_code_base64:     respostaMP.point_of_interaction.transaction_data.qr_code_base64,
                qr_code_copia_cola: respostaMP.point_of_interaction.transaction_data.qr_code
            });
        }
        res.json({ sucesso: true, id_inscricao: r.lastID, mensagem: 'Pedido gerado!' });
    } catch (err) {
        console.error('Erro MP:', err);
        res.status(500).json({ sucesso: false, mensagem: 'Erro no pagamento.' });
    }
});

app.post('/api/comprar-stripe', async (req, res) => {
    const { id_evento, id_usuario, valor, email_cliente } = req.body;
    try {
        const r  = await db.run(
            "INSERT INTO inscricoes(id_usuario,id_evento,metodo,valor,status) VALUES(?,?,'stripe',?,'Pendente')",
            [id_usuario, id_evento, valor]
        );
        const pi = await stripe.paymentIntents.create({
            amount: Math.round(Number(valor) * 100), currency: 'brl',
            payment_method_types: ['card', 'boleto'],
            receipt_email: email_cliente || null,
            metadata: { id_inscricao: String(r.lastID), id_evento: String(id_evento??''), id_usuario: String(id_usuario??'') }
        });
        res.json({ sucesso: true, id_inscricao: r.lastID, clientSecret: pi.client_secret });
    } catch (err) {
        console.error('Erro Stripe:', err.message);
        res.status(500).json({ sucesso: false, mensagem: err.message });
    }
});

app.post('/api/pagar-assinatura', async (req, res) => {
    const { id_usuario, valor, email_cliente, descricao } = req.body;
    try {
        const pi = await stripe.paymentIntents.create({
            amount: Math.round(Number(valor) * 100), currency: 'brl',
            payment_method_types: ['card', 'boleto'],
            receipt_email: email_cliente || null,
            description: descricao || 'Assinatura WE Corp',
            metadata: { id_usuario: String(id_usuario??'') }
        });
        res.json({ sucesso: true, clientSecret: pi.client_secret });
    } catch (err) {
        console.error('Erro Stripe assinatura:', err.message);
        res.status(500).json({ sucesso: false, mensagem: err.message });
    }
});

// =========================================
// API GERAL
// =========================================
app.get('/api/status', (req, res) => res.json({ status: 'Online' }));

app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const u = await db.get('SELECT id,nome,email,tipo FROM usuarios WHERE email=? AND senha=?',[email,senha]);
        u ? res.json({ sucesso: true, usuario: u }) : res.status(401).json({ sucesso: false, mensagem: 'E-mail ou senha incorretos' });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro interno' }); }
});

// ---- EVENTOS ----
app.get('/api/eventos', async (req, res) => {
    try { res.json({ sucesso: true, eventos: await db.all('SELECT * FROM eventos') }); }
    catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar eventos' }); }
});
app.get('/api/eventos/:id', async (req, res) => {
    try {
        const ev = await db.get('SELECT * FROM eventos WHERE id=?',[req.params.id]);
        ev ? res.json({ sucesso: true, evento: ev }) : res.status(404).json({ sucesso: false, mensagem: 'Evento não encontrado' });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro interno' }); }
});
app.post('/api/eventos', upload.single('imagem'), async (req, res) => {
    const { titulo,categoria,local,data_evento,horario,parceiro,heads,descricao,valor,conteudo,certificacao_inclusa,texto_certificacao,tipoCriador,status } = req.body;
    const img = req.file?.filename ?? null;
    const st  = status || (tipoCriador==='admin' ? 'Ativo' : 'Pendente');
    try {
        const r = await db.run(
            'INSERT INTO eventos(titulo,categoria,local,data_evento,horario,parceiro,heads,descricao,valor,conteudo,certificacao_inclusa,texto_certificacao,status,imagem) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            [titulo,categoria,local,data_evento,horario,parceiro,heads,descricao,valor,conteudo,certificacao_inclusa,texto_certificacao,st,img]
        );
        res.json({ sucesso: true, id: r.lastID, mensagem: 'Evento salvo!', status: st });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao salvar evento' }); }
});
app.put('/api/eventos/:id/status', async (req, res) => {
    try {
        await db.run('UPDATE eventos SET status=? WHERE id=?',[req.body.status, req.params.id]);
        res.json({ sucesso: true, mensagem: `Status atualizado!` });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar status' }); }
});
app.put('/api/eventos/:id', upload.single('imagem'), async (req, res) => {
    const { titulo,categoria,local,data_evento,horario,parceiro,heads,descricao,valor,conteudo,certificacao_inclusa,texto_certificacao,status } = req.body;
    try {
        if (req.file)
            await db.run('UPDATE eventos SET titulo=?,categoria=?,local=?,data_evento=?,horario=?,parceiro=?,heads=?,descricao=?,valor=?,conteudo=?,certificacao_inclusa=?,texto_certificacao=?,status=?,imagem=? WHERE id=?',
                [titulo,categoria,local,data_evento,horario,parceiro,heads,descricao,valor,conteudo,certificacao_inclusa,texto_certificacao,status,req.file.filename,req.params.id]);
        else
            await db.run('UPDATE eventos SET titulo=?,categoria=?,local=?,data_evento=?,horario=?,parceiro=?,heads=?,descricao=?,valor=?,conteudo=?,certificacao_inclusa=?,texto_certificacao=?,status=? WHERE id=?',
                [titulo,categoria,local,data_evento,horario,parceiro,heads,descricao,valor,conteudo,certificacao_inclusa,texto_certificacao,status,req.params.id]);
        res.json({ sucesso: true, mensagem: 'Evento atualizado!' });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao editar evento' }); }
});
app.delete('/api/eventos/:id', async (req, res) => {
    try {
        const r = await db.run('DELETE FROM eventos WHERE id=?',[req.params.id]);
        r.changes > 0 ? res.json({ sucesso: true, mensagem: 'Evento eliminado!' }) : res.status(404).json({ sucesso: false, mensagem: 'Evento não encontrado.' });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' }); }
});
app.patch('/api/eventos/:id', upload.single('imagem'), async (req, res) => {
    const campos = req.body;
    if (req.file) campos.imagem = req.file.filename;
    const sets = Object.keys(campos).map(k => `${k}=?`);
    const vals = [...Object.values(campos), req.params.id];
    if (!sets.length) return res.status(400).json({ sucesso: false, mensagem: 'Nenhum campo enviado.' });
    try {
        const r = await db.run(`UPDATE eventos SET ${sets.join(',')} WHERE id=?`, vals);
        r.changes > 0 ? res.json({ sucesso: true, mensagem: 'Evento atualizado (PATCH)!' }) : res.status(404).json({ sucesso: false, mensagem: 'Evento não encontrado.' });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' }); }
});

// ---- PARCEIROS ----
app.get('/api/parceiros', async (req, res) => {
    try { res.json({ sucesso: true, parceiros: await db.all('SELECT * FROM parceiros ORDER BY nome') }); }
    catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar parceiros' }); }
});
app.get('/api/parceiros/:id', async (req, res) => {
    try {
        const p = await db.get('SELECT * FROM parceiros WHERE id=?',[req.params.id]);
        p ? res.json({ sucesso: true, parceiro: p }) : res.status(404).json({ sucesso: false, mensagem: 'Parceiro não encontrado' });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro interno' }); }
});
app.post('/api/parceiros', async (req, res) => {
    const { nome,tipo,cnpj,email,telefone,endereco,status } = req.body;
    try {
        const r = await db.run('INSERT INTO parceiros(nome,tipo,cnpj,email,telefone,endereco,status) VALUES(?,?,?,?,?,?,?)',[nome,tipo,cnpj,email,telefone,endereco,status||'Ativo']);
        res.json({ sucesso: true, id: r.lastID, mensagem: 'Parceiro cadastrado!' });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao cadastrar parceiro' }); }
});
app.put('/api/parceiros/:id', async (req, res) => {
    const { nome,tipo,cnpj,email,telefone,endereco,status } = req.body;
    try {
        const r = await db.run('UPDATE parceiros SET nome=?,tipo=?,cnpj=?,email=?,telefone=?,endereco=?,status=? WHERE id=?',[nome,tipo,cnpj,email,telefone,endereco,status,req.params.id]);
        r.changes > 0 ? res.json({ sucesso: true, mensagem: 'Parceiro atualizado!' }) : res.status(404).json({ sucesso: false, mensagem: 'Parceiro não encontrado.' });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar parceiro' }); }
});
app.delete('/api/parceiros/:id', async (req, res) => {
    try {
        const r = await db.run('DELETE FROM parceiros WHERE id=?',[req.params.id]);
        r.changes > 0 ? res.json({ sucesso: true, mensagem: 'Parceiro removido!' }) : res.status(404).json({ sucesso: false, mensagem: 'Parceiro não encontrado.' });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro interno' }); }
});

// ---- PRESTADORES ----
app.get('/api/prestadores', async (req, res) => {
    try { res.json({ sucesso: true, prestadores: await db.all('SELECT * FROM prestadores ORDER BY nome') }); }
    catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar prestadores' }); }
});
app.get('/api/prestadores/:id', async (req, res) => {
    try {
        const p = await db.get('SELECT * FROM prestadores WHERE id=?',[req.params.id]);
        p ? res.json({ sucesso: true, prestador: p }) : res.status(404).json({ sucesso: false, mensagem: 'Prestador não encontrado' });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro interno' }); }
});
app.post('/api/prestadores', async (req, res) => {
    const { nome,segmento,email,telefone,descricao,status,plano } = req.body;
    try {
        const r = await db.run('INSERT INTO prestadores(nome,segmento,email,telefone,descricao,status,plano) VALUES(?,?,?,?,?,?,?)',[nome,segmento,email,telefone,descricao,status||'Ativo',plano||'Básico']);
        res.json({ sucesso: true, id: r.lastID, mensagem: 'Prestador cadastrado!' });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao cadastrar prestador' }); }
});
app.put('/api/prestadores/:id', async (req, res) => {
    const { nome,segmento,email,telefone,descricao,status,plano } = req.body;
    try {
        const r = await db.run('UPDATE prestadores SET nome=?,segmento=?,email=?,telefone=?,descricao=?,status=?,plano=? WHERE id=?',[nome,segmento,email,telefone,descricao,status,plano,req.params.id]);
        r.changes > 0 ? res.json({ sucesso: true, mensagem: 'Prestador atualizado!' }) : res.status(404).json({ sucesso: false, mensagem: 'Prestador não encontrado.' });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar prestador' }); }
});
app.delete('/api/prestadores/:id', async (req, res) => {
    try {
        const r = await db.run('DELETE FROM prestadores WHERE id=?',[req.params.id]);
        r.changes > 0 ? res.json({ sucesso: true, mensagem: 'Prestador removido!' }) : res.status(404).json({ sucesso: false, mensagem: 'Prestador não encontrado.' });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro interno' }); }
});

// ---- SERVIÇOS ----
app.get('/api/servicos', async (req, res) => {
    try { res.json({ sucesso: true, servicos: await db.all('SELECT * FROM servicos ORDER BY data_criacao DESC') }); }
    catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar serviços' }); }
});
app.get('/api/servicos/:id', async (req, res) => {
    try {
        const s = await db.get('SELECT * FROM servicos WHERE id=?',[req.params.id]);
        s ? res.json({ sucesso: true, servico: s }) : res.status(404).json({ sucesso: false, mensagem: 'Serviço não encontrado' });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro interno' }); }
});
app.post('/api/servicos', upload.single('imagem'), async (req, res) => {
    const { titulo,categoria,descricao,valor,id_prestador,nome_prestador,tipoCriador,destaque,status } = req.body;
    const img = req.file?.filename ?? null;
    const st  = status || (tipoCriador==='admin' ? 'Ativo' : 'Pendente');
    try {
        const r = await db.run('INSERT INTO servicos(titulo,categoria,descricao,valor,status,destaque,imagem,id_prestador,nome_prestador) VALUES(?,?,?,?,?,?,?,?,?)',
            [titulo,categoria,descricao,valor||0,st,destaque||0,img,id_prestador||null,nome_prestador||'']);
        res.json({ sucesso: true, id: r.lastID, mensagem: 'Serviço criado!', status: st });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao criar serviço' }); }
});
app.put('/api/servicos/:id', upload.single('imagem'), async (req, res) => {
    const { titulo,categoria,descricao,valor,nome_prestador,destaque,status } = req.body;
    try {
        if (req.file)
            await db.run('UPDATE servicos SET titulo=?,categoria=?,descricao=?,valor=?,nome_prestador=?,destaque=?,status=?,imagem=? WHERE id=?',
                [titulo,categoria,descricao,valor,nome_prestador,destaque||0,status||'Ativo',req.file.filename,req.params.id]);
        else
            await db.run('UPDATE servicos SET titulo=?,categoria=?,descricao=?,valor=?,nome_prestador=?,destaque=?,status=? WHERE id=?',
                [titulo,categoria,descricao,valor,nome_prestador,destaque||0,status||'Ativo',req.params.id]);
        res.json({ sucesso: true, mensagem: 'Serviço atualizado!' });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar serviço' }); }
});
app.put('/api/servicos/:id/status', async (req, res) => {
    try {
        await db.run('UPDATE servicos SET status=? WHERE id=?',[req.body.status,req.params.id]);
        res.json({ sucesso: true, mensagem: `Serviço marcado como ${req.body.status}!` });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar status' }); }
});
app.delete('/api/servicos/:id', async (req, res) => {
    try {
        const r = await db.run('DELETE FROM servicos WHERE id=?',[req.params.id]);
        r.changes > 0 ? res.json({ sucesso: true, mensagem: 'Serviço removido!' }) : res.status(404).json({ sucesso: false, mensagem: 'Serviço não encontrado.' });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro interno' }); }
});

// ---- CLIENTES ----
app.get('/api/clientes', async (req, res) => {
    try { res.json({ sucesso: true, clientes: await db.all("SELECT id,nome,email,cpf,status FROM usuarios WHERE tipo='cliente' ORDER BY nome") }); }
    catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar clientes' }); }
});
app.get('/api/clientes/:id', async (req, res) => {
    try {
        const c = await db.get("SELECT id,nome,email,cpf,status FROM usuarios WHERE id=? AND tipo='cliente'",[req.params.id]);
        c ? res.json({ sucesso: true, cliente: c }) : res.status(404).json({ sucesso: false, mensagem: 'Cliente não encontrado' });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro interno' }); }
});
app.post('/api/clientes', async (req, res) => {
    const { nome,email,senha,cpf,status } = req.body;
    try {
        const existe = await db.get('SELECT id FROM usuarios WHERE email=?',[email]);
        if (existe) return res.status(400).json({ sucesso: false, mensagem: 'E-mail já cadastrado.' });
        const r = await db.run("INSERT INTO usuarios(nome,email,senha,tipo,cpf,status) VALUES(?,?,?,'cliente',?,?)",[nome,email,senha||'123456',cpf||'',status||'Ativo']);
        res.json({ sucesso: true, id: r.lastID, mensagem: 'Cliente cadastrado!' });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao cadastrar cliente' }); }
});
app.put('/api/clientes/:id', async (req, res) => {
    const { nome,email,senha,cpf,status } = req.body;
    try {
        let sql    = "UPDATE usuarios SET nome=?,email=?,cpf=?,status=? WHERE id=? AND tipo='cliente'";
        let params = [nome,email,cpf||'',status||'Ativo',req.params.id];
        if (senha) { sql = "UPDATE usuarios SET nome=?,email=?,cpf=?,status=?,senha=? WHERE id=? AND tipo='cliente'"; params = [nome,email,cpf||'',status||'Ativo',senha,req.params.id]; }
        const r = await db.run(sql, params);
        r.changes > 0 ? res.json({ sucesso: true, mensagem: 'Cliente atualizado!' }) : res.status(404).json({ sucesso: false, mensagem: 'Cliente não encontrado.' });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar cliente' }); }
});
app.delete('/api/clientes/:id', async (req, res) => {
    try {
        const r = await db.run("DELETE FROM usuarios WHERE id=? AND tipo='cliente'",[req.params.id]);
        r.changes > 0 ? res.json({ sucesso: true, mensagem: 'Cliente removido!' }) : res.status(404).json({ sucesso: false, mensagem: 'Cliente não encontrado.' });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro interno' }); }
});

// ---- AVALIAÇÕES / COMENTÁRIOS ----
// Listar avaliações de um serviço
app.get('/api/avaliacoes/:id_servico', async (req, res) => {
    try {
        const avs = await db.all(
            'SELECT * FROM avaliacoes WHERE id_servico=? ORDER BY data_avaliacao DESC',
            [req.params.id_servico]
        );
        res.json({ sucesso: true, avaliacoes: avs });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar avaliações' }); }
});
// Criar avaliação e recalcular média do serviço
app.post('/api/avaliacoes', async (req, res) => {
    const { id_servico, id_usuario, autor_nome, nota, comentario } = req.body;
    if (!id_servico || !autor_nome || !nota)
        return res.status(400).json({ sucesso: false, mensagem: 'id_servico, autor_nome e nota são obrigatórios.' });
    try {
        const r = await db.run(
            'INSERT INTO avaliacoes(id_servico,id_usuario,autor_nome,nota,comentario) VALUES(?,?,?,?,?)',
            [id_servico, id_usuario||null, autor_nome, nota, comentario||'']
        );
        // Recalcula média e total de avaliações no serviço
        const stats = await db.get(
            'SELECT AVG(nota) as media, COUNT(*) as total FROM avaliacoes WHERE id_servico=?',
            [id_servico]
        );
        await db.run(
            'UPDATE servicos SET avaliacao=?, total_avaliacoes=? WHERE id=?',
            [Math.round(stats.media * 10) / 10, stats.total, id_servico]
        );
        res.json({ sucesso: true, id: r.lastID, mensagem: 'Avaliação publicada!' });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao publicar avaliação' }); }
});
// Excluir avaliação (admin) e recalcular média
app.delete('/api/avaliacoes/:id', async (req, res) => {
    try {
        const av = await db.get('SELECT id_servico FROM avaliacoes WHERE id=?',[req.params.id]);
        if (!av) return res.status(404).json({ sucesso: false, mensagem: 'Avaliação não encontrada.' });
        await db.run('DELETE FROM avaliacoes WHERE id=?',[req.params.id]);
        const stats = await db.get('SELECT AVG(nota) as media, COUNT(*) as total FROM avaliacoes WHERE id_servico=?',[av.id_servico]);
        await db.run('UPDATE servicos SET avaliacao=?, total_avaliacoes=? WHERE id=?',
            [stats.media ? Math.round(stats.media * 10) / 10 : 0, stats.total, av.id_servico]);
        res.json({ sucesso: true, mensagem: 'Avaliação excluída!' });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro interno' }); }
});

// ---- TICKETS DE SUPORTE ----
// Listar todos os tickets (admin)
app.get('/api/tickets', async (req, res) => {
    try {
        const tickets = await db.all('SELECT * FROM tickets ORDER BY data_abertura DESC');
        res.json({ sucesso: true, tickets });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar tickets' }); }
});
// Listar tickets de um usuário
app.get('/api/tickets/usuario/:id_usuario', async (req, res) => {
    try {
        const tickets = await db.all('SELECT * FROM tickets WHERE id_usuario=? ORDER BY data_abertura DESC',[req.params.id_usuario]);
        res.json({ sucesso: true, tickets });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar tickets' }); }
});
// Criar ticket
app.post('/api/tickets', async (req, res) => {
    const { id_usuario, nome_remetente, tipo_remetente, assunto, mensagem } = req.body;
    if (!nome_remetente || !assunto || !mensagem)
        return res.status(400).json({ sucesso: false, mensagem: 'nome_remetente, assunto e mensagem são obrigatórios.' });
    try {
        const r = await db.run(
            'INSERT INTO tickets(id_usuario,nome_remetente,tipo_remetente,assunto,mensagem,status) VALUES(?,?,?,?,?,?)',
            [id_usuario||null, nome_remetente, tipo_remetente||'cliente', assunto, mensagem, 'Aberto']
        );
        res.json({ sucesso: true, id: r.lastID, mensagem: 'Ticket enviado! A equipe WE Corp entrará em contato.' });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao enviar ticket' }); }
});
// Fechar ticket (admin marca como Resolvido)
app.put('/api/tickets/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        const r = await db.run('UPDATE tickets SET status=? WHERE id=?',[status, req.params.id]);
        r.changes > 0 ? res.json({ sucesso: true, mensagem: `Ticket marcado como ${status}!` }) : res.status(404).json({ sucesso: false, mensagem: 'Ticket não encontrado.' });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro interno' }); }
});
// Excluir ticket (admin)
app.delete('/api/tickets/:id', async (req, res) => {
    try {
        const r = await db.run('DELETE FROM tickets WHERE id=?',[req.params.id]);
        r.changes > 0 ? res.json({ sucesso: true, mensagem: 'Ticket excluído!' }) : res.status(404).json({ sucesso: false, mensagem: 'Ticket não encontrado.' });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro interno' }); }
});

// ---- PARTICIPANTES DE EVENTOS (INSCRIÇÕES) ----
app.get('/api/inscricoes/evento/:id_evento', async (req, res) => {
    try {
        const inscritos = await db.all(
            `SELECT i.id, i.metodo, i.valor, i.status, i.data_compra,
                    u.nome, u.email, u.cpf
             FROM inscricoes i
             LEFT JOIN usuarios u ON u.id = i.id_usuario
             WHERE i.id_evento=? ORDER BY i.data_compra DESC`,
            [req.params.id_evento]
        );
        res.json({ sucesso: true, inscritos });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar participantes' }); }
});
app.post('/api/inscricoes/manual', async (req, res) => {
    const { id_evento, nome, email, cpf } = req.body;
    if (!id_evento || !nome || !email)
        return res.status(400).json({ sucesso: false, mensagem: 'id_evento, nome e email são obrigatórios.' });
    try {
        let usuario = await db.get('SELECT id FROM usuarios WHERE email=?',[email]);
        if (!usuario) {
            const u = await db.run("INSERT INTO usuarios(nome,email,senha,tipo,cpf,status) VALUES(?,?,'wecorp2026','cliente',?,?)",[nome,email,cpf||'','Ativo']);
            usuario = { id: u.lastID };
        }
        const r = await db.run(
            "INSERT INTO inscricoes(id_usuario,id_evento,metodo,valor,status) VALUES(?,?,'manual',0,'Confirmado')",
            [usuario.id, id_evento]
        );
        res.json({ sucesso: true, id: r.lastID, mensagem: 'Participante adicionado!' });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao adicionar participante' }); }
});

// ---- INSCRICOES do usuario (histórico cliente) ----
app.get('/api/inscricoes/usuario/:id_usuario', async (req, res) => {
    try {
        const rows = await db.all(
            `SELECT i.id, i.metodo, i.valor, i.status, i.data_compra,
                    e.titulo as evento_titulo
             FROM inscricoes i
             LEFT JOIN eventos e ON e.id = i.id_evento
             WHERE i.id_usuario=? ORDER BY i.data_compra DESC`,
            [req.params.id_usuario]
        );
        res.json({ sucesso: true, inscricoes: rows });
    } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar histórico' }); }
});

// ---- RAIZ ----
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

setupDatabase()
    .then(() => app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`)))
    .catch(err => console.error('❌ Erro:', err));