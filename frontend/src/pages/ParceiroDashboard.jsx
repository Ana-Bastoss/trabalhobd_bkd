import React, { useState, useEffect } from 'react';
import '../assets/style.css';
import { toastSuccess, toastError, toastInfo, confirmDialog } from '../lib/ui';
import UiHost from '../components/Ui';
import { jsPDF } from 'jspdf';
// ── NOVO: Importando o componente global de Checkout ────────────────────────
import CheckoutModal from '../components/CheckoutModal';
// ────────────────────────────────────────────────────────────────────────────

const ParceiroDashboard = () => {
    // ==========================================
    // ESTADOS GERAIS E USUÁRIO
    // ==========================================
    const [activeTab, setActiveTab] = useState('financeiro');
    const [user, setUser] = useState({ nome: 'Carregando...', email: '', tipo: '...' });

    // ==========================================
    // ESTADOS DE DADOS (API) E FILTROS
    // ==========================================
    const [eventosGlobais, setEventosGlobais] = useState([]);
    const [filtroNome, setFiltroNome] = useState('');
    const [filtroStatus, setFiltroStatus] = useState('Todos');
    const [filtroDataInicio, setFiltroDataInicio] = useState('');
    const [filtroDataFim, setFiltroDataFim] = useState('');

    // ==========================================
    // ESTADOS DOS MODAIS
    // ==========================================
    const [isNovoEventoOpen, setIsNovoEventoOpen] = useState(false);
    const [isAjudaOpen, setIsAjudaOpen] = useState(false);
    const [isNovoParticipanteOpen, setIsNovoParticipanteOpen] = useState(false);
    const [isDetalhesContratoOpen, setIsDetalhesContratoOpen] = useState(false);
    
    // NOVO: Estado para abrir o Modal do Stripe
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    // ==========================================
    // ESTADOS DO FORMULÁRIO DE EVENTOS
    // ==========================================
    const [formEvento, setFormEvento] = useState({
        id: '', imagem: null, heads: '', titulo: '', categoria: 'Startups e Inovação',
        valor: '', data: '', horario: '', local: '', descricao: '', conteudo: '',
        certificacao: 'nao', textocert: ''
    });

    // ==========================================
    // EFEITOS DE INICIALIZAÇÃO
    // ==========================================
    useEffect(() => {
        const userStr = localStorage.getItem("usuarioLogado");
        if (userStr) {
            setUser(JSON.parse(userStr));
            carregarEventos();
        } else {
            window.location.href = '/';
        }
    }, []);

    const carregarEventos = async () => {
        try {
            const resposta = await fetch('/api/eventos');
            const dados = await resposta.json();
            if (dados.sucesso) {
                setEventosGlobais(dados.eventos);
            }
        } catch (erro) {
            console.error("Erro ao carregar tabelas:", erro);
        }
    };

    // ==========================================
    // LÓGICA DE FILTRAGEM DE EVENTOS
    // ==========================================
    const eventosFiltrados = eventosGlobais.filter(evento => {
        // Regra de Negócio: O Parceiro só vê os próprios eventos
        if (evento.parceiro !== user.nome) return false;

        const matchNome = evento.titulo.toLowerCase().includes(filtroNome.toLowerCase());
        
        let matchStatus = true;
        if (filtroStatus === 'Pendentes') matchStatus = evento.status === 'Pendente';
        else if (filtroStatus === 'Ativos') matchStatus = evento.status === 'Ativo';
        else if (filtroStatus === 'Recusados') matchStatus = evento.status === 'Recusado';

        let matchData = true;
        if (filtroDataInicio && evento.data_evento < filtroDataInicio) matchData = false;
        if (filtroDataFim && evento.data_evento > filtroDataFim) matchData = false;

        return matchNome && matchStatus && matchData;
    });

    // ==========================================
    // LÓGICA DE SALVAR/EDITAR EVENTO
    // ==========================================
    const abrirNovoEvento = () => {
        setFormEvento({
            id: '', imagem: null, heads: '', titulo: '', categoria: 'Startups e Inovação',
            valor: '', data: '', horario: '', local: '', descricao: '', conteudo: '',
            certificacao: 'nao', textocert: ''
        });
        setIsNovoEventoOpen(true);
    };

    const abrirEdicaoEvento = async (idEvento) => {
        try {
            const resposta = await fetch(`/api/eventos/${idEvento}`);
            const dados = await resposta.json();
            if (dados.sucesso) {
                const e = dados.evento;
                setFormEvento({
                    id: e.id, imagem: null, heads: e.heads || '', titulo: e.titulo || '', 
                    categoria: e.categoria || 'Startups e Inovação', valor: e.valor || '', 
                    data: e.data_evento || '', horario: e.horario || '', local: e.local || '', 
                    descricao: e.descricao || '', conteudo: e.conteudo || '',
                    certificacao: e.certificacao_inclusa || 'nao', textocert: e.texto_certificacao || ''
                });
                setIsNovoEventoOpen(true);
            }
        } catch (erro) {
            console.error(erro);
            toastError("Erro ao buscar dados do evento.");
        }
    };

    const salvarNovoEvento = async () => {
        if (!formEvento.titulo || !formEvento.data || !formEvento.local) {
            toastError("Por favor, preencha pelo menos o Título, Data e Local.");
            return;
        }

        const formData = new FormData();
        formData.append('parceiro', user.nome);
        formData.append('heads', formEvento.heads);
        formData.append('titulo', formEvento.titulo);
        formData.append('categoria', formEvento.categoria);
        formData.append('valor', formEvento.valor || 0);
        formData.append('data_evento', formEvento.data);
        formData.append('horario', formEvento.horario);
        formData.append('local', formEvento.local);
        formData.append('descricao', formEvento.descricao);
        formData.append('conteudo', formEvento.conteudo);
        formData.append('certificacao_inclusa', formEvento.certificacao);
        formData.append('texto_certificacao', formEvento.textocert);
        formData.append('tipoCriador', user.tipo);

        if (formEvento.imagem) formData.append('imagem', formEvento.imagem);

        const url = formEvento.id ? `/api/eventos/${formEvento.id}` : '/api/eventos';
        const method = formEvento.id ? 'PUT' : 'POST';

        try {
            const resposta = await fetch(url, { method, body: formData });
            const dadosRetorno = await resposta.json();
            if (dadosRetorno.sucesso) {
                toastSuccess(dadosRetorno.mensagem);
                setIsNovoEventoOpen(false);
                carregarEventos(); 
            } else {
                toastError("Erro: " + dadosRetorno.mensagem);
            }
        } catch (erro) {
            console.error("Erro:", erro);
            toastError("Erro ao conectar com o servidor.");
        }
    };

    // ==========================================
    // FUNÇÕES AUXILIARES
    // ==========================================
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

    const closeModals = () => {
        setIsNovoEventoOpen(false);
        setIsAjudaOpen(false);
        setIsNovoParticipanteOpen(false);
        setIsDetalhesContratoOpen(false);
    };

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
        doc.text("CONTRATO DE PARCERIA WE CORP", 105, 20, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);

        const textoContrato = [
            `CONTRATANTE: ${user.nome}`,
            `TIPO DE PARCERIA: ${user.tipo === 'patrocinador' ? 'Patrocinador Master' : 'Parceiro Institucional'}`,
            `DATA DO DOCUMENTO: ${new Date().toLocaleDateString('pt-BR')}`,
            "",
            "1. OBJETO",
            "O presente contrato tem por objeto firmar a parceria entre a WE Corp e o",
            `${user.nome} para a realização e divulgação de eventos na plataforma.`,
            "",
            "2. OBRIGAÇÕES E BENEFÍCIOS",
            "- A WE Corp se compromete a fornecer visibilidade prioritária, suporte VIP",
            "  (tempo de resposta inferior a 4 horas úteis) e taxa de mediação reduzida (15%).",
            "- O Parceiro/Patrocinador manterá a regularidade do pagamento do valor mensal",
            "  de R$ 1.250,00 para garantir a ativação destes benefícios.",
            "",
            "3. VALIDADE E ACEITE",
            "A concordância com estes termos é garantida digitalmente pelo aceite na",
            "plataforma durante o cadastro e pagamento da fatura.",
            "",
            "Assinado eletronicamente por:",
            "WE Corp Administração",
            user.nome
        ];

        doc.text(textoContrato, 20, 40);
        doc.save(`Contrato_WECorp_${user.nome.replace(/\s+/g, '_')}.pdf`);
        toastSuccess('Download do contrato em PDF concluído!');
    };

    return (
        <div className="admin-body">
            <UiHost />

            {/* HEADER */}
            <header className="navbar-direct admin-header">
                <div className="navbar-content" style={{ maxWidth: '100%', padding: '10px 30px' }}>
                    <div className="logo">
                        <a href="/"><img src="/logo.png" alt="WE CORP Logo" style={{ height: '60px' }} /></a>
                    </div>
                    <nav>
                        <a href="/">Voltar ao Site</a>
                        <button className="btn-login" onClick={handleLogout}>
                            <i className="fas fa-sign-out-alt"></i> Sair
                        </button>
                    </nav>
                </div>
            </header>

            {/* CONTAINER PRINCIPAL */}
            <div className="dashboard-container">
                
                {/* SIDEBAR */}
                <aside className="admin-sidebar">
                    <div className="admin-profile">
                        <i className="fas fa-building" style={{ color: '#f39c12' }}></i>
                        <h3>{user.nome}</h3>
                        <p>{user.tipo === 'patrocinador' ? 'Patrocinador Master' : 'Parceiro Institucional'}</p>
                    </div>
                    <ul className="admin-menu">
                        <li className={activeTab === 'financeiro' ? 'active' : ''} onClick={() => setActiveTab('financeiro')}>
                            <i className="fas fa-chart-pie"></i> Dashboard Financeiro
                        </li>
                        <li className={activeTab === 'meus-eventos' ? 'active' : ''} onClick={() => setActiveTab('meus-eventos')}>
                            <i className="fas fa-calendar-alt"></i> Meus Eventos
                        </li>
                        <li className={activeTab === 'participantes' ? 'active' : ''} onClick={() => setActiveTab('participantes')}>
                            <i className="fas fa-users"></i> Participantes
                        </li>
                        <li className={activeTab === 'assinatura' ? 'active' : ''} onClick={() => setActiveTab('assinatura')}>
                            <i className="fas fa-file-signature"></i> Assinatura WE Corp
                        </li>
                    </ul>
                </aside>

                {/* ÁREA DE CONTEÚDO */}
                <main className="admin-main-content">
                    
                    {/* TAB: FINANCEIRO */}
                    {activeTab === 'financeiro' && (
                        <section className="admin-tab-content active">
                            <div className="tab-header">
                                <h2>Visão Geral de Patrocínio</h2>
                            </div>
                            
                            <div className="finance-cards-grid">
                                <div className="finance-card">
                                    <h3><i className="fas fa-hand-holding-usd text-blue"></i> Total Investido</h3>
                                    <span className="amount text-blue">R$ 45.000,00</span>
                                    <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>Investimento total em eventos</p>
                                </div>
                                <div className="finance-card">
                                    <h3><i className="fas fa-ticket-alt text-green"></i> Receita de Ingressos</h3>
                                    <span className="amount text-green">R$ 12.850,00</span>
                                    <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>Sua parte nas vendas (se aplicável)</p>
                                </div>
                                <div className="finance-card">
                                    <h3><i className="fas fa-users" style={{ color: '#f39c12' }}></i> Alcance / Leads</h3>
                                    <span className="amount" style={{ color: '#f39c12' }}>840</span>
                                    <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>Total de inscritos nos seus eventos</p>
                                </div>
                            </div>

                            <h3 style={{ marginBottom: '15px', color: '#555' }}>Desempenho por Evento</h3>
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Evento Patrocinado</th>
                                        <th>Inscritos</th>
                                        <th>Custo p/ Lead</th>
                                        <th>Status Financeiro</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Certificação Cisco CCNA</td>
                                        <td>450</td>
                                        <td>R$ 33,30</td>
                                        <td><span className="status-tag active">Totalmente Pago</span></td>
                                    </tr>
                                    <tr>
                                        <td>Bootcamp: Redes e Cloud</td>
                                        <td>390</td>
                                        <td>R$ 38,40</td>
                                        <td><span className="status-tag pending">Aguardando Repasse</span></td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>
                    )}

                    {/* TAB: MEUS EVENTOS */}
                    {activeTab === 'meus-eventos' && (
                        <section className="admin-tab-content active">
                            <div className="tab-header">
                                <h2>Gerenciar Meus Eventos</h2>
                                <button className="btn-search" onClick={abrirNovoEvento}>
                                    <i className="fas fa-plus"></i> Criar Novo Evento
                                </button>
                            </div>

                            <div className="search-wrapper" style={{ padding: '20px', marginBottom: '25px', background: '#fff', borderRadius: '10px', border: '1px solid #eaeaea' }}>
                                <div className="search-container" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', gap: '15px', alignItems: 'end' }}>
                                    <div className="input-group-search">
                                        <label><i className="fas fa-search"></i> Nome do Evento</label>
                                        <input type="text" className="search-input" placeholder="Pesquisar evento..." value={filtroNome} onChange={(e) => setFiltroNome(e.target.value)} />
                                    </div>
                                    <div className="input-group-search">
                                        <label><i className="fas fa-filter"></i> Status</label>
                                        <select className="filter-select" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
                                            <option value="Todos">Todos</option>
                                            <option value="Pendentes">Em Análise</option>
                                            <option value="Ativos">Publicados</option>
                                            <option value="Recusados">Recusados</option>
                                        </select>
                                    </div>
                                    <div className="input-group-search">
                                        <label><i className="fas fa-building"></i> Parceiro (Autoria)</label>
                                        <select className="filter-select" disabled style={{ backgroundColor: '#f5f5f5', border: '2px solid var(--theme-teal-light)' }}>
                                            <option>{user.nome}</option>
                                        </select>
                                    </div>
                                    <div className="input-group-search">
                                        <label><i className="far fa-calendar-alt"></i> De</label>
                                        <input type="date" className="search-input" value={filtroDataInicio} onChange={(e) => setFiltroDataInicio(e.target.value)} />
                                    </div>
                                    <div className="input-group-search">
                                        <label><i className="far fa-calendar-alt"></i> Até</label>
                                        <input type="date" className="search-input" value={filtroDataFim} onChange={(e) => setFiltroDataFim(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                            
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Evento</th>
                                        <th>Data</th>
                                        <th>Status de Aprovação</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {eventosFiltrados.length === 0 ? (
                                        <tr><td colSpan="4" style={{ textAlign: 'center' }}>Nenhum evento encontrado.</td></tr>
                                    ) : (
                                        eventosFiltrados.map(evento => (
                                            <tr key={evento.id}>
                                                <td><strong>{evento.titulo}</strong></td>
                                                <td>{evento.data_evento ? new Date(evento.data_evento).toLocaleDateString('pt-BR') : 'Sem data'}</td>
                                                <td>
                                                    {evento.status === 'Pendente' && <span className="status-tag pending">🟡 Em Análise</span>}
                                                    {evento.status === 'Recusado' && <span className="status-tag" style={{ background: '#fce4e4', color: '#c0392b' }}>🔴 Recusado</span>}
                                                    {evento.status === 'Ativo' && <span className="status-tag active">🟢 Publicado</span>}
                                                </td>
                                                <td className="action-buttons">
                                                    <button className="btn-icon btn-view" title="Visualizar Página" onClick={() => window.open(`/evento-detalhes?id=${evento.id}`, '_blank')}><i className="fas fa-eye"></i></button>
                                                    <button className="btn-icon btn-edit" title="Editar Evento" onClick={() => abrirEdicaoEvento(evento.id)}><i className="fas fa-edit"></i> Editar</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </section>
                    )}

                    {/* TAB: PARTICIPANTES */}
                    {activeTab === 'participantes' && (
                        <section className="admin-tab-content active">
                            <div className="tab-header">
                                <h2>Lista de Participantes</h2>
                                <button className="btn-search" onClick={() => setIsNovoParticipanteOpen(true)}><i className="fas fa-user-plus"></i> Adicionar Participante</button>
                            </div>

                            <div className="search-wrapper" style={{ padding: '20px', marginBottom: '25px', background: '#fff', borderRadius: '10px', border: '1px solid #eaeaea' }}>
                                <div className="search-container" style={{ gridTemplateColumns: '1fr auto', gap: '20px', alignItems: 'end' }}>
                                    <div className="input-group-search">
                                        <label>Pesquisar Participante</label>
                                        <input type="text" className="search-input" placeholder="Pesquisar por nome ou email..." />
                                    </div>
                                    <button className="btn-search" style={{ height: '45px' }}><i className="fas fa-search"></i> Buscar</button>
                                </div>
                            </div>

                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Nome do Aluno</th>
                                        <th>Evento Inscrito</th>
                                        <th>Status do Pagamento</th>
                                        <th>Ações e Suporte</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Ana Beatriz</td>
                                        <td>Certificação Cisco CCNA</td>
                                        <td><span className="pay-tag tag-pending">🟡 Pendente</span></td>
                                        <td className="action-buttons">
                                            <button className="btn-icon btn-approve" title="Emitir certificado de participação" onClick={() => toastSuccess('Certificado gerado com sucesso e enviado ao e-mail do participante!')}><i className="fas fa-certificate"></i> Emitir Certificado</button>
                                            <button className="btn-icon btn-view" onClick={() => setIsAjudaOpen(true)} title="Solicitar ajuda à WE Corp"><i className="fas fa-life-ring"></i> Pedir Ajuda</button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>
                    )}

                    {/* TAB: ASSINATURA */}
                    {activeTab === 'assinatura' && (
                        <section className="admin-tab-content active">
                            <div className="tab-header">
                                <h2>Contrato de Patrocínio WE Corp</h2>
                            </div>

                            <div className="event-grid-layout" style={{ gap: '20px' }}>
                                <div className="info-section">
                                    <h3><i className="fas fa-file-contract"></i> Detalhes do Contrato</h3>
                                    <p style={{ marginTop: '15px' }}><strong>Tipo:</strong> Patrocinador Master (Anual)</p>
                                    <p><strong>Vencimento da Parcela:</strong> Todo dia 15</p>
                                    <p><strong>Status:</strong> <span className="pay-tag tag-pending" style={{ display: 'inline-block', marginTop: '10px' }}>Aguardando Pagamento da Parcela 05/12</span></p>
                                    
                                    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <button className="btn-search" style={{ backgroundColor: 'var(--theme-teal-elegant)', width: 'fit-content', fontSize: '0.9rem' }} onClick={() => setIsDetalhesContratoOpen(true)}>
                                            <i className="fas fa-info-circle"></i> Mais Detalhes / Ver Contrato Completo
                                        </button>
                                        <a href="#" onClick={(e) => { e.preventDefault(); handleDownloadContrato(); }} style={{ color: 'var(--theme-teal-elegant)', fontWeight: 600, textDecoration: 'none' }}>
                                            <i className="fas fa-download"></i> Baixar Contrato Assinado (PDF)
                                        </a>
                                    </div>
                                </div>

                                <div className="checkout-card" style={{ top: 0, position: 'relative' }}>
                                    <h3>Parcela Mensal</h3>
                                    <div className="price-display">
                                        <span className="currency">R$</span>
                                        <span className="amount">1.250</span>
                                        <span className="cents">,00</span>
                                    </div>

                                    {/* Botão unificado que chama o Modal Seguro do Stripe */}
                                    <button 
                                        className="btn-search btn-checkout-final btn-block" 
                                        style={{ marginTop: '20px' }} 
                                        onClick={iniciarPagamento}
                                    >
                                        Pagar Parcela <i className="fas fa-lock"></i>
                                    </button>
                                    <p className="secure-text" style={{ marginTop: '15px', textAlign: 'center', fontSize: '0.85rem', color: '#666' }}>
                                        <i className="fas fa-shield-alt"></i> Ambiente 100% Seguro
                                    </p>
                                </div>
                            </div>
                        </section>
                    )}
                </main>
            </div>

            {/* ── MODAL DO STRIPE ── */}
            <CheckoutModal 
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                valor={1250}
                descricao={`Assinatura Mensal - ${user.tipo === 'patrocinador' ? 'Patrocinador Master' : 'Parceiro Institucional'}`}
                id_evento={null}
                id_usuario={user?.id}
                email_cliente={user?.email}
            />

            {/* =========================================
                MODAIS
            ========================================= */}

            {/* Modal de Criação / Edição de Evento */}
            {isNovoEventoOpen && (
                <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModals(); }}>
                    <div className="admin-profile-modal">
                        <button className="close-modal" onClick={closeModals}><i className="fas fa-times"></i></button>
                        <div className="modal-header-profile">
                            <h2>{formEvento.id ? 'Editar Evento' : 'Criar Novo Evento'}</h2>
                            <p>O evento será enviado para a análise da administração WE Corp.</p>
                        </div>
                        <form style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '10px' }}>
                            <div className="input-group-search">
                                <label>Imagem do Evento (Banner)</label>
                                <input type="file" className="search-input" accept="image/*" style={{ padding: '9px' }} onChange={(e) => setFormEvento({ ...formEvento, imagem: e.target.files[0] })} />
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="input-group-search" style={{ flex: 1 }}>
                                    <label style={{ color: 'var(--theme-teal-elegant)', fontWeight: 600 }}>Publicar como (Autoria)</label>
                                    <select className="filter-select" style={{ border: '2px solid var(--theme-teal-light)', backgroundColor: '#f5f5f5' }} disabled>
                                        <option>{user.nome}</option>
                                    </select>
                                </div>
                                <div className="input-group-search" style={{ flex: 1 }}>
                                    <label>Heads (Palestrantes/Instrutores)</label>
                                    <input type="text" className="search-input" placeholder="Nomes dos responsáveis" value={formEvento.heads} onChange={(e) => setFormEvento({ ...formEvento, heads: e.target.value })} />
                                </div>
                            </div>

                            <div className="input-group-search">
                                <label>Título do Evento</label>
                                <input type="text" className="search-input" placeholder="Ex: Workshop de Inovação" value={formEvento.titulo} onChange={(e) => setFormEvento({ ...formEvento, titulo: e.target.value })} />
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="input-group-search" style={{ flex: 1 }}>
                                    <label>Categoria</label>
                                    <select className="filter-select" value={formEvento.categoria} onChange={(e) => setFormEvento({ ...formEvento, categoria: e.target.value })}>
                                        <option value="Startups e Inovação">Startups e Inovação</option>
                                        <option value="Educação">Educação</option>
                                        <option value="Certificação">Certificação</option>
                                        <option value="Tecnologia">Tecnologia</option>
                                    </select>
                                </div>
                                <div className="input-group-search" style={{ flex: 1 }}>
                                    <label>Valor do Ingresso (R$)</label>
                                    <input type="number" className="search-input" placeholder="0.00" value={formEvento.valor} onChange={(e) => setFormEvento({ ...formEvento, valor: e.target.value })} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="input-group-search" style={{ flex: 1 }}>
                                    <label>Data</label>
                                    <input type="date" className="search-input" value={formEvento.data} onChange={(e) => setFormEvento({ ...formEvento, data: e.target.value })} />
                                </div>
                                <div className="input-group-search" style={{ flex: 1 }}>
                                    <label>Horário</label>
                                    <input type="text" className="search-input" placeholder="Ex: 19:00 às 22:00" value={formEvento.horario} onChange={(e) => setFormEvento({ ...formEvento, horario: e.target.value })} />
                                </div>
                            </div>

                            <div className="input-group-search">
                                <label>Local do Evento</label>
                                <input type="text" className="search-input" placeholder="Endereço físico ou link da plataforma" value={formEvento.local} onChange={(e) => setFormEvento({ ...formEvento, local: e.target.value })} />
                            </div>

                            <div className="input-group-search">
                                <label>Sobre o Evento (Descrição Geral)</label>
                                <textarea className="search-input" rows="3" style={{ resize: 'none' }} placeholder="Descreva o propósito do evento..." value={formEvento.descricao} onChange={(e) => setFormEvento({ ...formEvento, descricao: e.target.value })}></textarea>
                            </div>

                            <div className="input-group-search">
                                <label>Conteúdo Abordado</label>
                                <textarea className="search-input" rows="3" style={{ resize: 'none' }} placeholder="Tópicos que serão ensinados ou discutidos..." value={formEvento.conteudo} onChange={(e) => setFormEvento({ ...formEvento, conteudo: e.target.value })}></textarea>
                            </div>

                            <div className="input-group-search">
                                <label>Certificação Inclusa?</label>
                                <select className="filter-select" value={formEvento.certificacao} onChange={(e) => setFormEvento({ ...formEvento, certificacao: e.target.value })}>
                                    <option value="nao">Não</option>
                                    <option value="sim">Sim</option>
                                </select>
                            </div>
                            
                            {formEvento.certificacao === 'sim' && (
                                <div className="input-group-search" style={{ marginTop: '-5px' }}>
                                    <label style={{ color: 'var(--theme-teal-elegant)' }}><i className="fas fa-certificate"></i> Texto da Certificação (O que o aluno recebe?)</label>
                                    <textarea className="search-input" rows="3" style={{ resize: 'none' }} placeholder="Ex: Ao finalizar o treinamento com 75% de presença..." value={formEvento.textocert} onChange={(e) => setFormEvento({ ...formEvento, textocert: e.target.value })}></textarea>
                                </div>
                            )}

                            <button type="button" className="btn-search btn-block" onClick={salvarNovoEvento}>
                                <i className="fas fa-paper-plane"></i> {formEvento.id ? 'Salvar Alterações' : 'Enviar para Aprovação'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Suporte */}
            {isAjudaOpen && (
                <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModals(); }}>
                    <div className="admin-profile-modal" style={{ maxWidth: '500px' }}>
                        <button className="close-modal" onClick={closeModals}><i className="fas fa-times"></i></button>
                        <div className="modal-header-profile">
                            <h2><i className="fas fa-life-ring" style={{ color: 'var(--theme-terracotta)' }}></i> Suporte ao Parceiro</h2>
                            <p>Relate o problema à moderação WE Corp.</p>
                        </div>
                        <textarea className="search-input" rows="4" style={{ resize: 'none' }} placeholder="Descreva o problema ou dúvida..."></textarea>
                        <button type="button" className="btn-search btn-block" style={{ backgroundColor: 'var(--theme-terracotta)' }} onClick={() => { toastSuccess('Requisição enviada!'); closeModals(); }}>Enviar Ticket</button>
                    </div>
                </div>
            )}

            {/* Modal de Novo Participante */}
            {isNovoParticipanteOpen && (
                <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModals(); }}>
                    <div className="admin-profile-modal">
                        <button className="close-modal" onClick={closeModals}><i className="fas fa-times"></i></button>
                        <div className="modal-header-profile">
                            <h2>Adicionar Participante (Inscrição Manual)</h2>
                            <p>Cadastre um cliente diretamente no seu evento.</p>
                        </div>
                        <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div className="input-group-search">
                                <label>Evento Destino</label>
                                <select className="filter-select"><option>Certificação Cisco CCNA</option></select>
                            </div>
                            <div className="input-group-search">
                                <label>Nome Completo</label>
                                <input type="text" className="search-input" placeholder="Nome do aluno/cliente" />
                            </div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="input-group-search" style={{ flex: 1 }}>
                                    <label>CPF</label>
                                    <input type="text" className="search-input" placeholder="000.000.000-00" />
                                </div>
                                <div className="input-group-search" style={{ flex: 1 }}>
                                    <label>E-mail</label>
                                    <input type="email" className="search-input" placeholder="email@exemplo.com" />
                                </div>
                            </div>
                            <button type="button" className="btn-search btn-block" onClick={() => { toastSuccess('Participante cadastrado com sucesso!'); closeModals(); }}><i className="fas fa-check"></i> Cadastrar Participante</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Detalhes do Contrato */}
            {isDetalhesContratoOpen && (
                <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModals(); }}>
                    <div className="admin-profile-modal" style={{ maxWidth: '600px' }}>
                        <button className="close-modal" onClick={closeModals}><i className="fas fa-times"></i></button>
                        <div className="modal-header-profile">
                            <h2><i className="fas fa-file-alt"></i> Termos do Plano Contratado</h2>
                            <p>Confira o que está incluso na sua parceria com a WE Corp.</p>
                        </div>
                        <div className="detail-list" style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                <li style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
                                    <strong><i className="fas fa-check-circle" style={{ color: 'var(--theme-teal-main)' }}></i> Visibilidade Prioritária:</strong> 
                                    Seu perfil aparece no topo das buscas e recomendações do mês.
                                </li>
                                <li style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
                                    <strong><i className="fas fa-check-circle" style={{ color: 'var(--theme-teal-main)' }}></i> Taxa de Mediação Reduzida:</strong> 
                                    Comissão fixa de apenas 15% sobre serviços/ingressos vendidos.
                                </li>
                                <li style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
                                    <strong><i className="fas fa-check-circle" style={{ color: 'var(--theme-teal-main)' }}></i> Suporte VIP:</strong> 
                                    Tickets de suporte respondidos em até 4 horas úteis.
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

export default ParceiroDashboard;