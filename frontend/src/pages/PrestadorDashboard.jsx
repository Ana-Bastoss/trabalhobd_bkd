import React, { useState, useEffect } from 'react';
import '../assets/style.css';
// ── Única adição: importar os helpers de UI ──────────────────────────────────
import { toastSuccess, toastError, toastInfo, confirmDialog } from '../lib/ui';
import UiHost from '../components/Ui';
import { jsPDF } from 'jspdf';
// ── NOVO: Importando o componente global de Checkout ────────────────────────
import CheckoutModal from '../components/CheckoutModal';
// ────────────────────────────────────────────────────────────────────────────

const PrestadorDashboard = () => {
    // ── Sessão ──
    const [user, setUser] = useState(null);

    // ── Aba ativa ──
    const [activeTab, setActiveTab] = useState('financeiro');

    // ── Modal ativo ──
    const [activeModal, setActiveModal] = useState(null);

    // ── Dados reais do banco ──
    const [servicosGlobais, setServicosGlobais] = useState([]);

    // ── Filtro de serviços ──
    const [buscaServico, setBuscaServico] = useState('');

    // ── Serviço selecionado para detalhes ──
    const [servicoSelecionado, setServicoSelecionado] = useState(null);

    // ── Formulário de novo/editar serviço ──
    const [formServico, setFormServico] = useState({
        id: '', titulo: '', categoria: 'Tecnologia', valor: '', descricao: '', imagem: null
    });

    // NOVO: Estado para abrir o Modal do Stripe
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    // NOVO: Avaliações reais do serviço aberto em detalhes
    const [avaliacoesServico, setAvaliacoesServico] = useState([]);
    const [loadingAvaliacoes, setLoadingAvaliacoes] = useState(false);

    // NOVO: Tickets de suporte reais do prestador
    const [tickets, setTickets] = useState([]);
    const [formTicket, setFormTicket] = useState({ clienteRelacionado: '', motivo: 'Dúvida sobre Pagamento de Cliente', mensagem: '' });
    const [enviandoTicket, setEnviandoTicket] = useState(false);

    // ==========================================
    // FUNÇÕES DE MODAL
    // ==========================================
    const openModal   = (name) => setActiveModal(name);
    const closeModals = () => {
        setActiveModal(null);
        setServicoSelecionado(null);
    };

    // ==========================================
    // EFEITO: Verificar sessão e carregar dados
    // ==========================================
    useEffect(() => {
        const userStr = localStorage.getItem("usuarioLogado");
        if (!userStr) {
            window.location.href = '/';
            return;
        }
        const u = JSON.parse(userStr);
        if (u.tipo !== 'prestador') {
            window.location.href = '/';
            return;
        }
        setUser(u);
        carregarServicos(u);
        carregarTickets(u);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ==========================================
    // CARREGAR SERVIÇOS (filtra pelo nome do prestador logado)
    // ==========================================
    const carregarServicos = async (u) => {
        try {
            const resposta = await fetch('/api/servicos');
            const dados    = await resposta.json();
            if (dados.sucesso) {
                const meus = dados.servicos.filter(s => s.nome_prestador === u.nome);
                setServicosGlobais(meus);
            }
        } catch (e) {
            console.error('Erro ao carregar serviços:', e);
        }
    };

    // ==========================================
    // NOVO: CARREGAR TICKETS DO PRESTADOR
    // ==========================================
    const carregarTickets = async (u) => {
        try {
            const resposta = await fetch(`/api/tickets/usuario/${u.id}`);
            const dados    = await resposta.json();
            if (dados.sucesso) setTickets(dados.tickets);
        } catch (e) {
            console.error('Erro ao carregar tickets:', e);
        }
    };

    // ==========================================
    // SERVIÇOS FILTRADOS (busca em tempo real)
    // ==========================================
    const servicosFiltrados = servicosGlobais.filter(s =>
        s.titulo.toLowerCase().includes(buscaServico.toLowerCase())
    );

    // ==========================================
    // NOVA POSTAGEM — envia para a API
    // ==========================================
    const salvarServico = async () => {
        if (!formServico.titulo) { toastError('O título do serviço é obrigatório.'); return; }

        const fd = new FormData();
        fd.append('titulo',         formServico.titulo);
        fd.append('categoria',      formServico.categoria);
        fd.append('valor',          formServico.valor || 0);
        fd.append('descricao',      formServico.descricao);
        fd.append('nome_prestador', user.nome);
        fd.append('tipoCriador',    'prestador'); 

        if (formServico.imagem) fd.append('imagem', formServico.imagem);

        const url    = formServico.id ? `/api/servicos/${formServico.id}` : '/api/servicos';
        const method = formServico.id ? 'PUT' : 'POST';

        try {
            const resposta = await fetch(url, { method, body: fd });
            const dados    = await resposta.json();
            if (dados.sucesso) {
                toastSuccess(formServico.id ? 'Serviço atualizado com sucesso!' : 'Serviço enviado para aprovação da WE Corp!');
                closeModals();
                carregarServicos(user);
            } else {
                toastError('Erro: ' + dados.mensagem);
            }
        } catch (e) {
            toastError('Erro de conexão com o servidor.');
        }
    };

    // ==========================================
    // DETALHES DO SERVIÇO
    // ==========================================
    const abrirDetalhes = async (id) => {
        const s = servicosGlobais.find(x => x.id === id);
        if (!s) return;
        setServicoSelecionado(s);
        openModal('detalhesServico');
        // NOVO: busca avaliações reais do serviço
        setLoadingAvaliacoes(true);
        try {
            const resposta = await fetch(`/api/avaliacoes/${id}`);
            const dados    = await resposta.json();
            if (dados.sucesso) setAvaliacoesServico(dados.avaliacoes);
        } catch (e) {
            console.error('Erro ao buscar avaliações:', e);
        }
        setLoadingAvaliacoes(false);
    };

    // ==========================================
    // EDITAR SERVIÇO
    // ==========================================
    const abrirEdicao = (id) => {
        const s = servicosGlobais.find(x => x.id === id);
        if (!s) return;
        setFormServico({ id: s.id, titulo: s.titulo, categoria: s.categoria || 'Tecnologia', valor: s.valor || '', descricao: s.descricao || '', imagem: null });
        openModal('novoServico');
    };

    const abrirNova = () => {
        setFormServico({ id: '', titulo: '', categoria: 'Tecnologia', valor: '', descricao: '', imagem: null });
        openModal('novoServico');
    };

    // ==========================================
    // NOVO: EXCLUIR AVALIAÇÃO (moderação do prestador)
    // ==========================================
    const excluirAvaliacao = async (idAvaliacao) => {
        const ok = await confirmDialog({
            title: 'Excluir avaliação',
            message: 'Deseja remover esta avaliação do seu serviço?',
            confirmLabel: 'Excluir',
            cancelLabel: 'Cancelar',
            danger: true,
            icon: 'fa-trash'
        });
        if (!ok) return;
        try {
            const resposta = await fetch(`/api/avaliacoes/${idAvaliacao}`, { method: 'DELETE' });
            const dados    = await resposta.json();
            if (dados.sucesso) {
                toastSuccess('Avaliação removida!');
                setAvaliacoesServico(prev => prev.filter(a => a.id !== idAvaliacao));
                carregarServicos(user);
            } else {
                toastError(dados.mensagem);
            }
        } catch (e) {
            toastError('Erro de conexão com o servidor.');
        }
    };

    // ==========================================
    // NOVO: ENVIAR TICKET DE SUPORTE (real, via API)
    // ==========================================
    const enviarTicket = async () => {
        if (!formTicket.mensagem.trim()) { toastError('Escreva uma mensagem antes de enviar.'); return; }
        setEnviandoTicket(true);
        const assunto = formTicket.clienteRelacionado && formTicket.clienteRelacionado !== 'Nenhum / Problema Geral'
            ? `${formTicket.motivo} — ${formTicket.clienteRelacionado}`
            : formTicket.motivo;
        try {
            const resposta = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_usuario: user.id,
                    nome_remetente: user.nome,
                    tipo_remetente: 'prestador',
                    assunto,
                    mensagem: formTicket.mensagem
                })
            });
            const dados = await resposta.json();
            if (dados.sucesso) {
                toastSuccess('Requisição enviada ao administrador!');
                setFormTicket({ clienteRelacionado: '', motivo: 'Dúvida sobre Pagamento de Cliente', mensagem: '' });
                closeModals();
                carregarTickets(user);
            } else {
                toastError(dados.mensagem);
            }
        } catch (e) {
            toastError('Erro de conexão com o servidor.');
        }
        setEnviandoTicket(false);
    };

    const handleLogout = async () => {
        const ok = await confirmDialog({
            title: 'Encerrar sessão',
            message: 'Deseja sair da sua conta?',
            confirmLabel: 'Sair',
            cancelLabel: 'Continuar'
        });
        if (ok) {
            localStorage.removeItem("usuarioLogado");
            window.location.href = '/';
        }
    };

    // ==========================================
    // INICIAR CHECKOUT
    // ==========================================
    const iniciarPagamento = () => {
        setIsCheckoutOpen(true);
    };

    // ==========================================
    // GERAÇÃO DE CONTRATO EM PDF
    // ==========================================
    const handleDownloadContrato = () => {
        const doc = new jsPDF();
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("CONTRATO DE PRESTAÇÃO DE SERVIÇOS WE CORP", 105, 20, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);

        const prestadorNome = user ? user.nome : 'Prestador Parceiro';

        const textoContrato = [
            `CONTRATADO: ${prestadorNome}`,
            `TIPO DE PLANO: Prestador Profissional (Visibilidade Ouro)`,
            `DATA DO DOCUMENTO: ${new Date().toLocaleDateString('pt-BR')}`,
            "",
            "1. OBJETO",
            "O presente contrato estabelece os termos para a oferta, mediação e divulgação",
            "de serviços na vitrine da plataforma WE Corp.",
            "",
            "2. OBRIGAÇÕES E TAXAS",
            "- A WE Corp intermediará a comunicação e transação financeira com os clientes",
            "  e reterá uma taxa de mediação reduzida equivalente a 10% do valor do serviço.",
            "- O Prestador se compromete a pagar a mensalidade do plano (R$ 149,90) até o",
            "  dia 10 de cada mês para garantir a classificação de 'Visibilidade Ouro'.",
            "",
            "3. VALIDADE E ACEITE",
            "A concordância com estes termos é garantida digitalmente pelo aceite na",
            "plataforma durante o cadastro e pagamento da fatura.",
            "",
            "Assinado eletronicamente por:",
            "WE Corp Administração",
            prestadorNome
        ];

        doc.text(textoContrato, 20, 40);
        doc.save(`Contrato_WECorp_${prestadorNome.replace(/\s+/g, '_')}.pdf`);
        toastSuccess('Download do contrato em PDF concluído!');
    };

    // ==========================================
    // RENDER
    // ==========================================
    return (
        <div className="admin-body">
            <UiHost />

            <header className="navbar-direct admin-header">
                <div className="navbar-content" style={{ maxWidth: '100%', padding: '10px 30px' }}>
                    <div className="logo">
                        <a href="/"><img src="/logo.png" alt="WE CORP Logo" style={{ height: '60px' }} /></a>
                    </div>
                    <nav>
                        <a href="/servicos">Ver Serviços</a>
                        <button className="btn-login" onClick={handleLogout}>
                            <i className="fas fa-sign-out-alt"></i> Sair
                        </button>
                    </nav>
                </div>
            </header>

            <div className="dashboard-container">
                <aside className="admin-sidebar">
                    <div className="admin-profile">
                        <i className="fas fa-laptop-code" style={{ color: 'var(--theme-teal-main)' }}></i>
                        <h3>{user ? user.nome : 'Carregando...'}</h3>
                        <p>Prestador de Serviço</p>
                    </div>
                    <ul className="admin-menu">
                        <li className={activeTab === 'financeiro'  ? 'active' : ''} onClick={() => setActiveTab('financeiro')}> <i className="fas fa-chart-pie"></i>          Dashboard Financeiro</li>
                        <li className={activeTab === 'servicos'    ? 'active' : ''} onClick={() => setActiveTab('servicos')}>   <i className="fas fa-box-open"></i>            Meus Serviços</li>
                        <li className={activeTab === 'clientes'    ? 'active' : ''} onClick={() => setActiveTab('clientes')}>   <i className="fas fa-users"></i>               Meus Clientes</li>
                        <li className={activeTab === 'assinatura'  ? 'active' : ''} onClick={() => setActiveTab('assinatura')}> <i className="fas fa-file-invoice-dollar"></i>  Assinatura WE Corp</li>
                    </ul>
                </aside>

                <main className="admin-main-content">

                    {/* ── TAB: FINANCEIRO ── */}
                    <section className={`admin-tab-content ${activeTab === 'financeiro' ? 'active' : ''}`}>
                        <div className="tab-header"><h2>Visão Geral Financeira</h2></div>
                        <div className="finance-cards-grid">
                            <div className="finance-card">
                                <h3><i className="fas fa-arrow-up text-green"></i> Entradas (Serviços)</h3>
                                <span className="amount text-green">R$ 5.400,00</span>
                                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>Total recebido de clientes</p>
                            </div>
                            <div className="finance-card">
                                <h3><i className="fas fa-arrow-down text-red"></i> Saídas (Taxas WE Corp)</h3>
                                <span className="amount text-red">R$ 540,00</span>
                                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>10% de comissão retida</p>
                            </div>
                            <div className="finance-card" style={{ border: '2px solid var(--theme-teal-main)' }}>
                                <h3><i className="fas fa-wallet text-blue"></i> Saldo Líquido</h3>
                                <span className="amount text-blue">R$ 4.860,00</span>
                                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>Disponível para saque</p>
                            </div>
                        </div>
                        <h3 style={{ margin: '30px 0 15px 0', color: '#555' }}>Últimas Vendas</h3>
                        <table className="admin-table">
                            <thead><tr><th>Serviço</th><th>Data</th><th>Valor Total</th><th>Taxa</th><th>Líquido</th></tr></thead>
                            <tbody>
                                <tr>
                                    <td>Consultoria em Cibersegurança</td>
                                    <td>05/04/2026</td>
                                    <td>R$ 1.800,00</td>
                                    <td style={{ color: '#c0392b' }}>- R$ 180,00</td>
                                    <td style={{ color: '#27ae60' }}><strong>R$ 1.620,00</strong></td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    {/* ── TAB: MEUS SERVIÇOS ── */}
                    <section className={`admin-tab-content ${activeTab === 'servicos' ? 'active' : ''}`}>
                        <div className="tab-header">
                            <h2>Meus Serviços (Postagens)</h2>
                            <button className="btn-search" onClick={abrirNova}><i className="fas fa-plus"></i> Nova Postagem</button>
                        </div>

                        <div className="search-wrapper" style={{ padding: '20px', marginBottom: '25px', background: '#fff', borderRadius: '10px', border: '1px solid #eaeaea' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', alignItems: 'end' }}>
                                <div className="input-group-search">
                                    <label>Pesquisar Serviço</label>
                                    <input type="text" className="search-input" placeholder="Pesquisar meus serviços..." value={buscaServico} onChange={e => setBuscaServico(e.target.value)} />
                                </div>
                                <button className="btn-search" style={{ height: '45px' }}><i className="fas fa-search"></i> Buscar</button>
                            </div>
                        </div>

                        <table className="admin-table">
                            <thead>
                                <tr><th>Serviço (Postagem)</th><th>Categoria</th><th>Avaliação</th><th>Status</th><th>Ações</th></tr>
                            </thead>
                            <tbody>
                                {servicosFiltrados.length === 0 ? (
                                    <tr><td colSpan="5" style={{ textAlign: 'center' }}>
                                        {servicosGlobais.length === 0 ? 'Você ainda não tem serviços cadastrados.' : 'Nenhum serviço encontrado.'}
                                    </td></tr>
                                ) : servicosFiltrados.map(s => (
                                    <tr key={s.id}>
                                        <td><strong>{s.titulo}</strong></td>
                                        <td>{s.categoria || '-'}</td>
                                        <td>{s.avaliacao > 0
                                            ? <><i className="fas fa-star" style={{ color: '#f39c12' }}></i> {Number(s.avaliacao).toFixed(1)}</>
                                            : '-'
                                        }</td>
                                        <td>
                                            {s.status === 'Ativo'    && <span className="status-tag active">Ativo</span>}
                                            {s.status === 'Pendente' && <span className="status-tag pending">Pendente (Em Análise)</span>}
                                            {s.status === 'Recusado' && <span className="status-tag" style={{ background: '#fce4e4', color: '#c0392b' }}>Recusado</span>}
                                        </td>
                                        <td className="action-buttons">
                                            <button className="btn-icon btn-view" onClick={() => abrirDetalhes(s.id)} title="Ver Detalhes"><i className="fas fa-eye"></i> Detalhes</button>
                                            <button className="btn-icon btn-edit" onClick={() => abrirEdicao(s.id)} title="Editar"><i className="fas fa-edit"></i> Editar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    {/* ── TAB: MEUS CLIENTES ── */}
                    <section className={`admin-tab-content ${activeTab === 'clientes' ? 'active' : ''}`}>
                        <div className="tab-header"><h2>Meus Clientes</h2></div>
                        <table className="admin-table">
                            <thead><tr><th>Nome do Cliente</th><th>Serviço Adquirido</th><th>Data</th><th>Status Pgto</th><th>Ações</th></tr></thead>
                            <tbody>
                                <tr>
                                    <td>Ana Beatriz</td>
                                    <td>Consultoria em Cibersegurança</td>
                                    <td>01/05/2026</td>
                                    <td><span className="pay-tag tag-pending">🟡 Aguardando</span></td>
                                    <td className="action-buttons">
                                        <button className="btn-icon btn-view" title="Contactar"><i className="fas fa-envelope"></i> Contactar</button>
                                        <button className="btn-icon btn-view" onClick={() => openModal('suporte')} title="Suporte"><i className="fas fa-life-ring"></i> Suporte</button>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Empresa Alpha S.A.</td>
                                    <td>Consultoria em Cibersegurança</td>
                                    <td>05/04/2026</td>
                                    <td><span className="pay-tag tag-approved">🟢 Aprovado</span></td>
                                    <td className="action-buttons">
                                        <button className="btn-icon btn-view" title="Contactar"><i className="fas fa-envelope"></i> Contactar</button>
                                        <button className="btn-icon btn-view" onClick={() => openModal('suporte')} title="Suporte"><i className="fas fa-life-ring"></i> Suporte</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    {/* ── TAB: ASSINATURA ── */}
                    <section className={`admin-tab-content ${activeTab === 'assinatura' ? 'active' : ''}`}>
                        <div className="tab-header"><h2>Assinatura e Contrato WE Corp</h2></div>
                        <div className="event-grid-layout" style={{ gap: '20px' }}>
                            <div className="info-section">
                                <h3><i className="fas fa-file-signature"></i> Seu Plano Atual</h3>
                                <p style={{ marginTop: '15px' }}><strong>Plano:</strong> Prestador Profissional (Visibilidade Ouro)</p>
                                <p><strong>Vencimento:</strong> Dia 10 de cada mês</p>
                                <p><strong>Status:</strong> <span className="pay-tag tag-pending" style={{ display: 'inline-block', marginTop: '10px' }}>Fatura em Aberto</span></p>
                                <br />
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px', marginBottom: '15px' }}>
                                    <button className="btn-search" style={{ backgroundColor: 'var(--theme-teal-elegant)', padding: '8px 15px', fontSize: '0.9rem', width: 'fit-content' }} onClick={() => openModal('contrato')}>
                                        <i className="fas fa-info-circle"></i> Mais Detalhes / Ver Contrato
                                    </button>
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleDownloadContrato(); }} style={{ color: 'var(--theme-teal-elegant)', fontWeight: 600, textDecoration: 'none' }}>
                                        <i className="fas fa-download"></i> Baixar Contrato Assinado (PDF)
                                    </a>
                                </div>
                                
                                <p style={{ fontSize: '0.9rem', color: '#666' }}>O não pagamento pode resultar na suspensão dos seus serviços na vitrine.</p>
                            </div>

                            <div className="checkout-card" style={{ top: 0 }}>
                                <h3>Fatura - Maio/2026</h3>
                                <div className="price-display">
                                    <span className="currency">R$</span>
                                    <span className="amount">149</span>
                                    <span className="cents">,90</span>
                                </div>
                                
                                {/* Botão unificado que chama o Modal Seguro do Stripe */}
                                <button 
                                    className="btn-search btn-checkout-final btn-block" 
                                    style={{ marginTop: '20px' }} 
                                    onClick={iniciarPagamento}
                                >
                                    Pagar Mensalidade <i className="fas fa-lock" style={{ marginLeft: '8px' }}></i>
                                </button>
                                <p className="secure-text" style={{ marginTop: '15px', textAlign: 'center', fontSize: '0.85rem', color: '#666' }}>
                                    <i className="fas fa-shield-alt"></i> Ambiente 100% Seguro
                                </p>
                            </div>
                        </div>
                    </section>
                </main>
            </div>

            {/* ── MODAL DO STRIPE ── */}
            <CheckoutModal 
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                valor={149.90}
                descricao="Assinatura Mensal - Prestador Profissional (Ouro)"
                id_evento={null}
                id_usuario={user?.id}
                email_cliente={user?.email}
            />

            {/* ==================== MODAIS ==================== */}

            {/* Criar / Editar Serviço */}
            {activeModal === 'novoServico' && (
                <div className="modal-overlay active" onClick={e => { if (e.target.classList.contains('modal-overlay')) closeModals(); }}>
                    <div className="admin-profile-modal" style={{ maxWidth: '560px' }}>
                        <button className="close-modal" onClick={closeModals}><i className="fas fa-times"></i></button>
                        <div className="modal-header-profile">
                            <h2>{formServico.id ? `Editar: ${formServico.titulo}` : 'Criar Nova Postagem de Serviço'}</h2>
                            <p>{formServico.id ? 'Atualize os dados abaixo.' : 'A postagem será analisada pela equipe WE Corp.'}</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div className="input-group-search">
                                <label style={{ color: 'var(--theme-teal-elegant)', fontWeight: 600 }}>Publicar como (Autoria)</label>
                                <input type="text" className="search-input" style={{ backgroundColor: '#f5f5f5' }} value={user ? user.nome : ''} readOnly />
                            </div>
                            <div className="input-group-search">
                                <label>Título do Serviço <span style={{ color: 'red' }}>*</span></label>
                                <input type="text" className="search-input" placeholder="Ex: Gestão de Identidade Corporativa" value={formServico.titulo} onChange={e => setFormServico(f => ({ ...f, titulo: e.target.value }))} />
                            </div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="input-group-search" style={{ flex: 1 }}>
                                    <label>Categoria</label>
                                    <select className="filter-select" value={formServico.categoria} onChange={e => setFormServico(f => ({ ...f, categoria: e.target.value }))}>
                                        <option value="Tecnologia">Tecnologia</option>
                                        <option value="Engenharia">Engenharia</option>
                                        <option value="Educação">Educação</option>
                                        <option value="Infraestrutura Cloud">Infraestrutura Cloud</option>
                                    </select>
                                </div>
                                <div className="input-group-search" style={{ flex: 1 }}>
                                    <label>Valor Médio (R$)</label>
                                    <input type="number" className="search-input" placeholder="0.00" value={formServico.valor} onChange={e => setFormServico(f => ({ ...f, valor: e.target.value }))} />
                                </div>
                            </div>
                            <div className="input-group-search">
                                <label>Descrição do Serviço</label>
                                <textarea className="search-input" rows="4" style={{ resize: 'none' }} placeholder="Descreva o que está incluso, diferenciais e entregáveis..." value={formServico.descricao} onChange={e => setFormServico(f => ({ ...f, descricao: e.target.value }))}></textarea>
                            </div>
                            <div className="input-group-search">
                                <label><i className="fas fa-image"></i> Imagem da Postagem (Banner)</label>
                                <input type="file" className="search-input" accept="image/*" style={{ padding: '9px' }} onChange={e => setFormServico(f => ({ ...f, imagem: e.target.files[0] || null }))} />
                            </div>
                            <button type="button" className="btn-search btn-block" onClick={salvarServico}>
                                <i className="fas fa-paper-plane"></i> {formServico.id ? 'Salvar Alterações' : 'Enviar para Aprovação'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detalhes do Serviço */}
            {activeModal === 'detalhesServico' && servicoSelecionado && (
                <div className="modal-overlay active" onClick={e => { if (e.target.classList.contains('modal-overlay')) closeModals(); }}>
                    <div className="admin-profile-modal" style={{ maxWidth: '700px', maxHeight: '88vh', overflowY: 'auto' }}>
                        <button className="close-modal" onClick={closeModals}><i className="fas fa-times"></i></button>
                        <div className="modal-header-profile" style={{ borderBottom: 'none', marginBottom: '5px' }}>
                            <h2>{servicoSelecionado.titulo}</h2>
                            <p>
                                Oferecido por: <strong style={{ color: 'var(--theme-teal-elegant)' }}>{servicoSelecionado.nome_prestador}</strong>
                                &nbsp;<span className="tag" style={{ background: '#e0f7fa', color: '#00838f' }}>{servicoSelecionado.categoria}</span>
                            </p>
                        </div>
                        {servicoSelecionado.imagem && (
                            <img src={`/uploads/${servicoSelecionado.imagem}`} alt="Banner" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #eee', marginBottom: '20px' }} />
                        )}
                        <div className="detail-card" style={{ marginBottom: '15px' }}>
                            <p><strong>Valor:</strong> {servicoSelecionado.valor > 0 ? `R$ ${Number(servicoSelecionado.valor).toFixed(2)}` : 'Sob consulta'}</p>
                            <p><strong>Status:</strong>&nbsp;
                                {servicoSelecionado.status === 'Ativo'    && <span className="status-tag active">Ativo</span>}
                                {servicoSelecionado.status === 'Pendente' && <span className="status-tag pending">Pendente (Em Análise)</span>}
                                {servicoSelecionado.status === 'Recusado' && <span className="status-tag" style={{ background: '#fce4e4', color: '#c0392b' }}>Recusado</span>}
                            </p>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#fdfdfd', padding: '12px', borderRadius: '10px', border: '1px solid #eee', marginTop: '10px' }}>
                                {servicoSelecionado.total_avaliacoes > 0 ? (
                                    <>
                                        <span style={{ color: '#f39c12', fontSize: '1.3rem' }}>{'★'.repeat(Math.round(servicoSelecionado.avaliacao))}</span>
                                        <span><strong>{Number(servicoSelecionado.avaliacao).toFixed(1)}</strong> ({servicoSelecionado.total_avaliacoes} avaliações)</span>
                                    </>
                                ) : <span style={{ color: '#888' }}>Nenhuma avaliação ainda.</span>}
                            </div>
                        </div>
                        <div className="info-section" style={{ padding: '20px', marginBottom: 0 }}>
                            <h3>Descrição do Serviço</h3>
                            <p style={{ fontSize: '0.95rem', color: '#555', marginTop: '10px', lineHeight: 1.7 }}>{servicoSelecionado.descricao || 'Sem descrição disponível.'}</p>
                        </div>

                        {/* NOVO: Avaliações reais vindas da API */}
                        <div className="info-section" style={{ padding: '20px', marginTop: '20px', marginBottom: 0 }}>
                            <h3>Avaliações Recebidas</h3>
                            {loadingAvaliacoes ? (
                                <p style={{ color: '#999', marginTop: '10px' }}><i className="fas fa-spinner fa-spin"></i> Carregando avaliações...</p>
                            ) : avaliacoesServico.length === 0 ? (
                                <p style={{ color: '#aaa', marginTop: '10px', fontStyle: 'italic' }}>Nenhuma avaliação recebida ainda.</p>
                            ) : (
                                <div style={{ marginTop: '15px', maxHeight: '260px', overflowY: 'auto' }}>
                                    {avaliacoesServico.map(av => (
                                        <div key={av.id} style={{ borderBottom: '1px solid #eee', paddingBottom: '12px', marginBottom: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <strong style={{ fontSize: '0.92rem' }}>{av.autor_nome}</strong>
                                                    <span style={{ fontSize: '0.78rem', color: '#aaa', marginLeft: '8px' }}>
                                                        {new Date(av.data_avaliacao).toLocaleDateString('pt-BR')}
                                                    </span>
                                                    <div style={{ color: '#f39c12', fontSize: '0.85rem', marginTop: '3px' }}>
                                                        {'★'.repeat(av.nota)}{'☆'.repeat(5 - av.nota)}
                                                    </div>
                                                </div>
                                                <button
                                                    className="btn-icon btn-delete"
                                                    style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                                                    onClick={() => excluirAvaliacao(av.id)}
                                                    title="Excluir avaliação"
                                                >
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </div>
                                            {av.comentario && <p style={{ fontSize: '0.88rem', color: '#555', marginTop: '6px', lineHeight: 1.5 }}>{av.comentario}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Suporte */}
            {activeModal === 'suporte' && (
                <div className="modal-overlay active" onClick={e => { if (e.target.classList.contains('modal-overlay')) closeModals(); }}>
                    <div className="admin-profile-modal" style={{ maxWidth: '500px' }}>
                        <button className="close-modal" onClick={closeModals}><i className="fas fa-times"></i></button>
                        <div className="modal-header-profile">
                            <h2><i className="fas fa-life-ring" style={{ color: 'var(--theme-terracotta)' }}></i> Acionar Suporte</h2>
                            <p>Relate o problema à moderação da WE Corp.</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div className="input-group-search">
                                <label>Cliente Relacionado</label>
                                <select className="filter-select" value={formTicket.clienteRelacionado} onChange={e => setFormTicket(f => ({ ...f, clienteRelacionado: e.target.value }))}>
                                    <option value="">Selecione...</option>
                                    <option>Ana Beatriz</option>
                                    <option>Empresa Alpha S.A.</option>
                                    <option>Nenhum / Problema Geral</option>
                                </select>
                            </div>
                            <div className="input-group-search">
                                <label>Motivo</label>
                                <select className="filter-select" value={formTicket.motivo} onChange={e => setFormTicket(f => ({ ...f, motivo: e.target.value }))}>
                                    <option>Dúvida sobre Pagamento de Cliente</option>
                                    <option>Problema na Execução do Serviço</option>
                                    <option>Cancelamento / Reembolso</option>
                                    <option>Outros</option>
                                </select>
                            </div>
                            <div className="input-group-search">
                                <label>Mensagem para o Administrador</label>
                                <textarea className="search-input" rows="4" style={{ resize: 'none' }} placeholder="Explique o que ocorreu..." value={formTicket.mensagem} onChange={e => setFormTicket(f => ({ ...f, mensagem: e.target.value }))}></textarea>
                            </div>
                            <button type="button" className="btn-search btn-block" style={{ backgroundColor: 'var(--theme-terracotta)' }} disabled={enviandoTicket} onClick={enviarTicket}>
                                {enviandoTicket ? <><i className="fas fa-spinner fa-spin"></i> Enviando...</> : <><i className="fas fa-envelope"></i> Enviar Ticket</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detalhes do Contrato */}
            {activeModal === 'contrato' && (
                <div className="modal-overlay active" onClick={e => { if (e.target.classList.contains('modal-overlay')) closeModals(); }}>
                    <div className="admin-profile-modal" style={{ maxWidth: '600px' }}>
                        <button className="close-modal" onClick={closeModals}><i className="fas fa-times"></i></button>
                        <div className="modal-header-profile">
                            <h2><i className="fas fa-file-alt"></i> Termos do Plano Contratado</h2>
                            <p>Confira o que está incluso na sua parceria com a WE Corp.</p>
                        </div>
                        <div className="detail-list" style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                <li style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
                                    <strong><i className="fas fa-check-circle" style={{ color: 'var(--theme-teal-main)' }}></i> Visibilidade Prioritária:</strong> Seu perfil aparece no topo das buscas e recomendações do mês.
                                </li>
                                <li style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
                                    <strong><i className="fas fa-check-circle" style={{ color: 'var(--theme-teal-main)' }}></i> Taxa de Mediação Reduzida:</strong> Comissão fixa de apenas 10%.
                                </li>
                                <li style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
                                    <strong><i className="fas fa-check-circle" style={{ color: 'var(--theme-teal-main)' }}></i> Suporte VIP:</strong> Tickets respondidos em até 4 horas úteis.
                                </li>
                            </ul>
                        </div>
                        <div style={{ textAlign: 'right', marginTop: '20px' }}>
                            <button className="btn-search" onClick={closeModals}>Fechar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PrestadorDashboard;