import React, { useState, useEffect } from 'react';
import '../assets/style.css';
// ── Única adição: importar os helpers de UI ──────────────────────────────────
import { toastSuccess, toastError, confirmDialog } from '../lib/ui';
import UiHost from '../components/Ui';
// ────────────────────────────────────────────────────────────────────────────

const AdminDashboard = () => {
    // ==========================================
    // ESTADOS GERAIS E NAVEGAÇÃO
    // ==========================================
    const [user, setUser] = useState({ nome: 'Administrador', email: '', tipo: 'admin' });
    const [activeTab, setActiveTab]         = useState('parceiros');
    const [openSubmenus, setOpenSubmenus]   = useState({ parceiros: false, prestadores: false });
    const [activeModal, setActiveModal]     = useState(null);

    // ==========================================
    // ESTADOS DE DADOS (API)
    // ==========================================
    const [parceirosGlobais,   setParceirosGlobais]   = useState([]);
    const [prestadoresGlobais, setPrestadoresGlobais] = useState([]);
    const [servicosGlobais,    setServicosGlobais]    = useState([]);
    const [eventosGlobais,     setEventosGlobais]     = useState([]);

    // ==========================================
    // ESTADOS DE FILTROS
    // ==========================================
    const [filtroBuscaParceiro,     setFiltroBuscaParceiro]     = useState('');
    const [filtroBuscaPrestador,    setFiltroBuscaPrestador]    = useState('');
    const [filtroSegmentoPrestador, setFiltroSegmentoPrestador] = useState('Todos');
    const [filtroBuscaServico,      setFiltroBuscaServico]      = useState('');
    const [filtroStatusServico,     setFiltroStatusServico]     = useState('Todos');
    const [filtroEmpresaServico,    setFiltroEmpresaServico]    = useState('Todos');
    const [filtroNomeEvento,        setFiltroNomeEvento]        = useState('');
    const [filtroStatusEvento,      setFiltroStatusEvento]      = useState('Todos');
    const [filtroParceiroEvento,    setFiltroParceiroEvento]    = useState('Todos');
    const [filtroDataInicio,        setFiltroDataInicio]        = useState('');
    const [filtroDataFim,           setFiltroDataFim]           = useState('');

    // ==========================================
    // ESTADOS DE FORMULÁRIOS (CRUD)
    // ==========================================
    const [formParceiro, setFormParceiro] = useState({
        id: '', nome: '', tipo: 'parceiro', cnpj: '', email: '', telefone: '', endereco: '', status: 'Ativo'
    });
    const [formPrestador, setFormPrestador] = useState({
        id: '', nome: '', segmento: '', email: '', telefone: '', descricao: '', plano: 'Básico', status: 'Ativo'
    });
    const [formServico, setFormServico] = useState({
        id: '', titulo: '', categoria: 'Tecnologia', valor: '', descricao: '', id_prestador: '', destaque: false, imagem: null
    });
    const [formEvento, setFormEvento] = useState({
        id: '', imagem: null, parceiro: 'WE Corp Oficial', heads: '', titulo: '',
        categoria: 'Startups e Inovação', valor: '', data: '', horario: '',
        local: '', descricao: '', conteudo: '', certificacao: 'nao', textocert: ''
    });
    const [certificacaoInclusa, setCertificacaoInclusa] = useState('nao');

    // Itens selecionados para modais de visualização
    const [parceiroSelecionado, setParceiroSelecionado] = useState(null);
    const [servicoSelecionado,  setServicoSelecionado]  = useState(null);

    // ==========================================
    // ⚠️ CORREÇÃO: openModal e closeModals definidos AQUI,
    //    antes de qualquer CRUD que os chame.
    //    No original, eram const declarados depois → ReferenceError.
    // ==========================================
    const openModal   = (modalName) => setActiveModal(modalName);
    const closeModals = () => {
        setActiveModal(null);
        setParceiroSelecionado(null);
        setServicoSelecionado(null);
    };

    const toggleSubmenu = (menuName) => {
        setOpenSubmenus(prev => ({ ...prev, [menuName]: !prev[menuName] }));
    };

    // ── window.confirm → confirmDialog ──────────────────────────────────────
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
    // ────────────────────────────────────────────────────────────────────────

    // ==========================================
    // EFEITO: Verificar sessão e carregar dados
    // ==========================================
    useEffect(() => {
        const userStr = localStorage.getItem("usuarioLogado");
        if (userStr) {
            const usuario = JSON.parse(userStr);
            setUser(usuario);
            if (usuario.tipo !== 'admin') {
                window.location.href = '/';
            } else {
                carregarTabelasEventos();
                carregarListaParceiros();
                carregarListaPrestadores();
                carregarListaServicos();
            }
        } else {
            window.location.href = '/';
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ==========================================
    // CARREGAMENTO DE DADOS (API)
    // ==========================================
    const carregarTabelasEventos = async () => {
        try {
            const r = await fetch('/api/eventos');
            const d = await r.json();
            if (d.sucesso) setEventosGlobais(d.eventos);
        } catch (e) { console.error("Erro ao carregar eventos:", e); }
    };

    const carregarListaParceiros = async () => {
        try {
            const r = await fetch('/api/parceiros');
            const d = await r.json();
            if (d.sucesso) setParceirosGlobais(d.parceiros);
        } catch (e) { console.error("Erro ao carregar parceiros:", e); }
    };

    const carregarListaPrestadores = async () => {
        try {
            const r = await fetch('/api/prestadores');
            const d = await r.json();
            if (d.sucesso) setPrestadoresGlobais(d.prestadores);
        } catch (e) { console.error("Erro ao carregar prestadores:", e); }
    };

    const carregarListaServicos = async () => {
        try {
            const r = await fetch('/api/servicos');
            const d = await r.json();
            if (d.sucesso) setServicosGlobais(d.servicos);
        } catch (e) { console.error("Erro ao carregar serviços:", e); }
    };

    // ==========================================
    // FILTRAGEM DERIVADA DO ESTADO
    // ==========================================
    const parceirosFiltrados = parceirosGlobais.filter(p => {
        const busca = filtroBuscaParceiro.toLowerCase();
        return p.nome.toLowerCase().includes(busca) ||
            (p.cnpj && p.cnpj.toLowerCase().includes(busca)) ||
            (p.tipo && p.tipo.toLowerCase().includes(busca));
    });

    const prestadoresFiltrados = prestadoresGlobais.filter(p => {
        const busca = filtroBuscaPrestador.toLowerCase();
        const matchBusca    = p.nome.toLowerCase().includes(busca) || (p.segmento && p.segmento.toLowerCase().includes(busca));
        const matchSegmento = filtroSegmentoPrestador === 'Todos' ? true : p.segmento === filtroSegmentoPrestador;
        return matchBusca && matchSegmento;
    });

    const servicosFiltrados = servicosGlobais.filter(s => {
        const busca = filtroBuscaServico.toLowerCase();
        const matchBusca   = s.titulo.toLowerCase().includes(busca) || (s.nome_prestador && s.nome_prestador.toLowerCase().includes(busca));
        let matchStatus    = true;
        if (filtroStatusServico === 'Ativo')    matchStatus = s.status === 'Ativo';
        else if (filtroStatusServico === 'Pendente')  matchStatus = s.status === 'Pendente';
        else if (filtroStatusServico === 'Recusado') matchStatus = s.status === 'Recusado';
        const matchEmpresa = filtroEmpresaServico === 'Todos' ? true : s.nome_prestador === filtroEmpresaServico;
        return matchBusca && matchStatus && matchEmpresa;
    });

    const empresasServicos = [...new Set(servicosGlobais.map(s => s.nome_prestador).filter(Boolean))];

    const eventosFiltrados = eventosGlobais.filter(evento => {
        const matchNome    = evento.titulo.toLowerCase().includes(filtroNomeEvento.toLowerCase());
        let matchStatus    = true;
        if (filtroStatusEvento === 'Pendentes')  matchStatus = evento.status === 'Pendente';
        else if (filtroStatusEvento === 'Ativos')   matchStatus = evento.status === 'Ativo';
        else if (filtroStatusEvento === 'Recusados') matchStatus = evento.status === 'Recusado';
        const matchParceiro = filtroParceiroEvento === 'Todos' ? true : evento.parceiro === filtroParceiroEvento;
        let matchData = true;
        if (filtroDataInicio && evento.data_evento < filtroDataInicio) matchData = false;
        if (filtroDataFim    && evento.data_evento > filtroDataFim)    matchData = false;
        return matchNome && matchStatus && matchParceiro && matchData;
    });

    // ==========================================
    // HELPER: estrelas de avaliação
    // ==========================================
    const renderEstrelas = (avaliacao) => {
        const estrelas = [];
        for (let i = 1; i <= 5; i++) {
            if (avaliacao >= i)          estrelas.push(<i key={i} className="fas fa-star"></i>);
            else if (avaliacao >= i-0.5) estrelas.push(<i key={i} className="fas fa-star-half-alt"></i>);
            else                         estrelas.push(<i key={i} className="far fa-star"></i>);
        }
        return estrelas;
    };

    // ==========================================
    // PARCEIROS - CRUD
    // ==========================================
    const abrirCadastroParceiro = () => {
        setFormParceiro({ id: '', nome: '', tipo: 'parceiro', cnpj: '', email: '', telefone: '', endereco: '', status: 'Ativo' });
        openModal('modalCadastroParceiro');
    };

    const abrirEdicaoParceiro = (id) => {
        const p = parceirosGlobais.find(x => x.id === id);
        if (!p) return;
        setFormParceiro({ id: p.id, nome: p.nome, tipo: p.tipo, cnpj: p.cnpj || '', email: p.email || '', telefone: p.telefone || '', endereco: p.endereco || '', status: p.status || 'Ativo' });
        openModal('modalCadastroParceiro');
    };

    const abrirPerfilParceiro = (id) => {
        const p = parceirosGlobais.find(x => x.id === id);
        if (!p) return;
        setParceiroSelecionado(p);
        openModal('modalParceiro');
    };

    // ── alert → toast, window.confirm → confirmDialog ───────────────────────
    const salvarParceiro = async () => {
        if (!formParceiro.nome || !formParceiro.tipo) {
            toastError('Nome e Tipo são obrigatórios.');
            return;
        }
        const dados = { nome: formParceiro.nome, tipo: formParceiro.tipo, cnpj: formParceiro.cnpj, email: formParceiro.email, telefone: formParceiro.telefone, endereco: formParceiro.endereco, status: formParceiro.status };
        const url    = formParceiro.id ? `/api/parceiros/${formParceiro.id}` : '/api/parceiros';
        const method = formParceiro.id ? 'PUT' : 'POST';
        try {
            const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
            const d = await r.json();
            if (d.sucesso) { toastSuccess(d.mensagem); closeModals(); carregarListaParceiros(); }
            else toastError('Erro: ' + d.mensagem);
        } catch (e) { toastError('Erro de conexão com o servidor.'); }
    };

    const excluirParceiro = async (id, nome) => {
        const ok = await confirmDialog({
            title: 'Excluir parceiro',
            message: `Tem certeza que deseja excluir o parceiro "${nome}"? Esta ação não pode ser desfeita.`,
            confirmLabel: 'Excluir',
            cancelLabel: 'Cancelar',
            danger: true,
            icon: 'fa-trash'
        });
        if (!ok) return;
        try {
            const r = await fetch(`/api/parceiros/${id}`, { method: 'DELETE' });
            const d = await r.json();
            if (d.sucesso) { toastSuccess(d.mensagem); carregarListaParceiros(); }
            else toastError('Erro: ' + d.mensagem);
        } catch (e) { toastError('Erro de conexão com o servidor.'); }
    };
    // ────────────────────────────────────────────────────────────────────────

    // ==========================================
    // PRESTADORES - CRUD
    // ==========================================
    const abrirCadastroPrestador = () => {
        setFormPrestador({ id: '', nome: '', segmento: '', email: '', telefone: '', descricao: '', plano: 'Básico', status: 'Ativo' });
        openModal('modalCadastroPrestador');
    };

    const abrirEdicaoPrestador = (id) => {
        const p = prestadoresGlobais.find(x => x.id === id);
        if (!p) return;
        setFormPrestador({ id: p.id, nome: p.nome, segmento: p.segmento || '', email: p.email || '', telefone: p.telefone || '', descricao: p.descricao || '', plano: p.plano || 'Básico', status: p.status || 'Ativo' });
        openModal('modalCadastroPrestador');
    };

    // ── alert → toast, window.confirm → confirmDialog ───────────────────────
    const salvarPrestador = async () => {
        if (!formPrestador.nome) {
            toastError('O nome do prestador é obrigatório.');
            return;
        }
        const dados = { nome: formPrestador.nome, segmento: formPrestador.segmento, email: formPrestador.email, telefone: formPrestador.telefone, descricao: formPrestador.descricao, plano: formPrestador.plano, status: formPrestador.status };
        const url    = formPrestador.id ? `/api/prestadores/${formPrestador.id}` : '/api/prestadores';
        const method = formPrestador.id ? 'PUT' : 'POST';
        try {
            const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
            const d = await r.json();
            if (d.sucesso) { toastSuccess(d.mensagem); closeModals(); carregarListaPrestadores(); }
            else toastError('Erro: ' + d.mensagem);
        } catch (e) { toastError('Erro de conexão com o servidor.'); }
    };

    const excluirPrestador = async (id, nome) => {
        const ok = await confirmDialog({
            title: 'Excluir prestador',
            message: `Tem certeza que deseja excluir o prestador "${nome}"? Esta ação não pode ser desfeita.`,
            confirmLabel: 'Excluir',
            cancelLabel: 'Cancelar',
            danger: true,
            icon: 'fa-trash'
        });
        if (!ok) return;
        try {
            const r = await fetch(`/api/prestadores/${id}`, { method: 'DELETE' });
            const d = await r.json();
            if (d.sucesso) { toastSuccess(d.mensagem); carregarListaPrestadores(); }
            else toastError('Erro: ' + d.mensagem);
        } catch (e) { toastError('Erro de conexão com o servidor.'); }
    };
    // ────────────────────────────────────────────────────────────────────────

    // ==========================================
    // SERVIÇOS - CRUD
    // ==========================================
    const abrirCadastroServico = () => {
        setFormServico({ id: '', titulo: '', categoria: 'Tecnologia', valor: '', descricao: '', id_prestador: '', destaque: false, imagem: null });
        openModal('modalAdminNovoServico');
    };

    const abrirEdicaoServico = (id) => {
        const s  = servicosGlobais.find(x => x.id === id);
        if (!s) return;
        const pr = prestadoresGlobais.find(p => p.nome === s.nome_prestador);
        setFormServico({ id: s.id, titulo: s.titulo, categoria: s.categoria || 'Tecnologia', valor: s.valor || '', descricao: s.descricao || '', id_prestador: pr ? String(pr.id) : '', destaque: s.destaque == 1, imagem: null });
        openModal('modalAdminNovoServico');
    };

    const abrirDetalhesServico = (id) => {
        const s = servicosGlobais.find(x => x.id === id);
        if (!s) return;
        setServicoSelecionado(s);
        openModal('modalDetalhesServico');
    };

    // ── alert → toast, window.confirm → confirmDialog ───────────────────────
    const salvarServico = async () => {
        if (!formServico.titulo) {
            toastError('O título da postagem é obrigatório.');
            return;
        }
        const pr = prestadoresGlobais.find(p => String(p.id) === String(formServico.id_prestador));
        const fd = new FormData();
        fd.append('titulo',         formServico.titulo);
        fd.append('categoria',      formServico.categoria);
        fd.append('valor',          formServico.valor || 0);
        fd.append('descricao',      formServico.descricao);
        fd.append('id_prestador',   formServico.id_prestador || '');
        fd.append('nome_prestador', pr ? pr.nome : '');
        fd.append('destaque',       formServico.destaque ? 1 : 0);
        fd.append('tipoCriador',    user.tipo);
        if (formServico.imagem) fd.append('imagem', formServico.imagem);
        const url    = formServico.id ? `/api/servicos/${formServico.id}` : '/api/servicos';
        const method = formServico.id ? 'PUT' : 'POST';
        try {
            const r = await fetch(url, { method, body: fd });
            const d = await r.json();
            if (d.sucesso) { toastSuccess(d.mensagem); closeModals(); carregarListaServicos(); }
            else toastError('Erro: ' + d.mensagem);
        } catch (e) { toastError('Erro de conexão com o servidor.'); }
    };

    const mudarStatusServico = async (id, novoStatus) => {
        const ok = await confirmDialog({
            title: `Marcar como "${novoStatus}"?`,
            message: `O serviço será atualizado para o status "${novoStatus}".`,
            confirmLabel: novoStatus === 'Ativo' ? 'Aprovar' : 'Aplicar',
            cancelLabel: 'Cancelar',
            danger: novoStatus === 'Recusado'
        });
        if (!ok) return;
        try {
            const r = await fetch(`/api/servicos/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: novoStatus }) });
            const d = await r.json();
            if (d.sucesso) carregarListaServicos();
            else toastError('Erro ao atualizar status.');
        } catch (e) { toastError('Erro de conexão.'); }
    };

    const excluirServico = async (id, titulo) => {
        const ok = await confirmDialog({
            title: 'Excluir postagem',
            message: `Excluir a postagem "${titulo}"? Esta ação não pode ser desfeita.`,
            confirmLabel: 'Excluir',
            cancelLabel: 'Cancelar',
            danger: true,
            icon: 'fa-trash'
        });
        if (!ok) return;
        try {
            const r = await fetch(`/api/servicos/${id}`, { method: 'DELETE' });
            const d = await r.json();
            if (d.sucesso) { toastSuccess(d.mensagem); carregarListaServicos(); }
            else toastError('Erro: ' + d.mensagem);
        } catch (e) { toastError('Erro de conexão.'); }
    };
    // ────────────────────────────────────────────────────────────────────────

    // ==========================================
    // EVENTOS - CRUD
    // ==========================================
    const abrirNovoEvento = () => {
        setFormEvento({ id: '', imagem: null, parceiro: 'WE Corp Oficial', heads: '', titulo: '', categoria: 'Startups e Inovação', valor: '', data: '', horario: '', local: '', descricao: '', conteudo: '', certificacao: 'nao', textocert: '' });
        setCertificacaoInclusa('nao');
        openModal('modalAdminNovoEvento');
    };

    const abrirEdicaoEvento = async (idEvento) => {
        try {
            const r = await fetch(`/api/eventos/${idEvento}`);
            const d = await r.json();
            if (d.sucesso) {
                const e = d.evento;
                setFormEvento({ id: e.id, imagem: null, parceiro: e.parceiro || 'WE Corp Oficial', heads: e.heads || '', titulo: e.titulo || '', categoria: e.categoria || 'Startups e Inovação', valor: e.valor || '', data: e.data_evento || '', horario: e.horario || '', local: e.local || '', descricao: e.descricao || '', conteudo: e.conteudo || '', certificacao: e.certificacao_inclusa || 'nao', textocert: e.texto_certificacao || '' });
                setCertificacaoInclusa(e.certificacao_inclusa || 'nao');
                openModal('modalAdminNovoEvento');
            }
        } catch (e) { toastError('Erro ao buscar dados do evento.'); }
    };

    // ── alert → toast, window.confirm → confirmDialog ───────────────────────
    const salvarNovoEvento = async () => {
        if (!formEvento.titulo || !formEvento.data || !formEvento.local) {
            toastError('Preencha pelo menos Título, Data e Local.');
            return;
        }
        const fd = new FormData();
        fd.append('parceiro',            formEvento.parceiro);
        fd.append('heads',               formEvento.heads);
        fd.append('titulo',              formEvento.titulo);
        fd.append('categoria',           formEvento.categoria);
        fd.append('valor',               formEvento.valor || 0);
        fd.append('data_evento',         formEvento.data);
        fd.append('horario',             formEvento.horario);
        fd.append('local',               formEvento.local);
        fd.append('descricao',           formEvento.descricao);
        fd.append('conteudo',            formEvento.conteudo);
        fd.append('certificacao_inclusa',formEvento.certificacao);
        fd.append('texto_certificacao',  formEvento.textocert);
        fd.append('tipoCriador',         user.tipo);
        if (formEvento.imagem) fd.append('imagem', formEvento.imagem);
        const url    = formEvento.id ? `/api/eventos/${formEvento.id}` : '/api/eventos';
        const method = formEvento.id ? 'PUT' : 'POST';
        try {
            const r = await fetch(url, { method, body: fd });
            const d = await r.json();
            if (d.sucesso) { toastSuccess(d.mensagem); closeModals(); carregarTabelasEventos(); }
            else toastError('Erro: ' + d.mensagem);
        } catch (e) { toastError('Erro ao conectar com o servidor.'); }
    };

    const mudarStatusEvento = async (id, novoStatus) => {
        const ok = await confirmDialog({
            title: `Marcar evento como ${novoStatus}?`,
            message: `O status do evento será alterado para "${novoStatus}".`,
            confirmLabel: novoStatus === 'Ativo' ? 'Aprovar' : 'Aplicar',
            cancelLabel: 'Cancelar',
            danger: novoStatus === 'Recusado'
        });
        if (!ok) return;
        try {
            const r = await fetch(`/api/eventos/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: novoStatus }) });
            const d = await r.json();
            if (d.sucesso) carregarTabelasEventos();
            else toastError('Erro ao atualizar status.');
        } catch (e) { toastError('Erro de conexão.'); }
    };

    const excluirEvento = async (id, titulo) => {
        const ok = await confirmDialog({
            title: 'Excluir evento',
            message: `Excluir o evento "${titulo}"? Esta ação não pode ser desfeita.`,
            confirmLabel: 'Excluir',
            cancelLabel: 'Cancelar',
            danger: true,
            icon: 'fa-trash'
        });
        if (!ok) return;
        try {
            const r = await fetch(`/api/eventos/${id}`, { method: 'DELETE' });
            const d = await r.json();
            if (d.sucesso) { toastSuccess(d.mensagem); carregarTabelasEventos(); }
            else toastError('Erro: ' + d.mensagem);
        } catch (e) { toastError('Erro de conexão.'); }
    };
    // ────────────────────────────────────────────────────────────────────────

    // ==========================================
    // RENDER
    // ==========================================
    return (
        <div className="admin-body">
            {/* ── UiHost renderiza toasts e confirm dialog flutuantes ── */}
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

            <div className="dashboard-container">
                {/* SIDEBAR */}
                <aside className="admin-sidebar">
                    <div className="admin-profile">
                        <i className="fas fa-user-shield"></i>
                        <h3>Administrador</h3>
                        <p>Gestão WE Corp</p>
                    </div>
                    <ul className="admin-menu">
                        <li className={`has-submenu ${openSubmenus.parceiros ? 'open' : ''}`}>
                            <div className="menu-item-content" onClick={() => toggleSubmenu('parceiros')}>
                                <i className="fas fa-handshake"></i> Parceiros e Patrocinadores <i className="fas fa-chevron-down arrow-down"></i>
                            </div>
                            <ul className="submenu">
                                <li className={activeTab === 'parceiros' ? 'active' : ''} onClick={() => setActiveTab('parceiros')}>
                                    <i className="fas fa-list" style={{ width: '15px' }}></i> Lista de Parceiros
                                </li>
                                <li className={activeTab === 'parceiros-eventos' ? 'active' : ''} onClick={() => setActiveTab('parceiros-eventos')}>
                                    <i className="far fa-calendar-alt" style={{ width: '15px' }}></i> Gestão de Eventos
                                </li>
                            </ul>
                        </li>
                        <li className={`has-submenu ${openSubmenus.prestadores ? 'open' : ''}`}>
                            <div className="menu-item-content" onClick={() => toggleSubmenu('prestadores')}>
                                <i className="fas fa-briefcase"></i> Prestadores de Serviço <i className="fas fa-chevron-down arrow-down"></i>
                            </div>
                            <ul className="submenu">
                                <li className={activeTab === 'prestadores' ? 'active' : ''} onClick={() => setActiveTab('prestadores')}>
                                    <i className="fas fa-list" style={{ width: '15px' }}></i> Lista de Prestadores
                                </li>
                                <li className={activeTab === 'prestadores-posts' ? 'active' : ''} onClick={() => setActiveTab('prestadores-posts')}>
                                    <i className="fas fa-clipboard-list" style={{ width: '15px' }}></i> Gestão de Postagens
                                </li>
                            </ul>
                        </li>
                        <li className={activeTab === 'clientes' ? 'active' : ''} onClick={() => setActiveTab('clientes')}>
                            <i className="fas fa-users"></i> Clientes
                        </li>
                        <li className={activeTab === 'requisicoes' ? 'active' : ''} onClick={() => setActiveTab('requisicoes')}>
                            <i className="fas fa-inbox"></i> Central de Suporte
                            <span className="notification-badge">1</span>
                        </li>
                    </ul>
                </aside>

                <main className="admin-main-content">

                    {/* ── TAB: LISTA DE PARCEIROS ── */}
                    <section className={`admin-tab-content ${activeTab === 'parceiros' ? 'active' : ''}`}>
                        <div className="tab-header">
                            <h2>Gestão de Parceiros &amp; Patrocinadores</h2>
                            <button className="btn-search" onClick={abrirCadastroParceiro}><i className="fas fa-plus"></i> Novo Parceiro ou Patrocinador</button>
                        </div>
                        <div className="search-wrapper" style={{ padding: '20px', marginBottom: '25px', background: '#fff', borderRadius: '10px', border: '1px solid #eaeaea' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', alignItems: 'end' }}>
                                <div className="input-group-search">
                                    <label>Pesquisar Parceiro/Patrocinador</label>
                                    <input type="text" className="search-input" placeholder="Digite o nome, CNPJ ou tipo..." value={filtroBuscaParceiro} onChange={e => setFiltroBuscaParceiro(e.target.value)} />
                                </div>
                                <button className="btn-search" style={{ height: '45px' }}><i className="fas fa-search"></i> Buscar</button>
                            </div>
                        </div>
                        <table className="admin-table">
                            <thead><tr><th>Empresa</th><th>Tipo</th><th>Status</th><th>Ações</th></tr></thead>
                            <tbody>
                                {parceirosFiltrados.length === 0 ? (
                                    <tr><td colSpan="4" style={{ textAlign: 'center' }}>Nenhum parceiro encontrado.</td></tr>
                                ) : parceirosFiltrados.map(p => (
                                    <tr key={p.id}>
                                        <td><strong>{p.nome}</strong>{p.email && <><br /><small style={{ color: '#888' }}>{p.email}</small></>}</td>
                                        <td>{p.tipo === 'patrocinador' ? 'Patrocinador' : 'Parceiro'}</td>
                                        <td>{p.status === 'Ativo' ? <span className="status-tag active">Ativo</span> : <span className="status-tag pending">Inativo</span>}</td>
                                        <td className="action-buttons">
                                            <button className="btn-icon btn-view"   onClick={() => abrirPerfilParceiro(p.id)}><i className="fas fa-eye"></i> Perfil</button>
                                            <button className="btn-icon btn-view"   onClick={() => openModal('modalAssinaturaAdmin')}><i className="fas fa-file-signature"></i> Assinaturas</button>
                                            <button className="btn-icon btn-edit"   onClick={() => abrirEdicaoParceiro(p.id)}><i className="fas fa-edit"></i> Editar</button>
                                            <button className="btn-icon btn-delete" onClick={() => excluirParceiro(p.id, p.nome)}><i className="fas fa-trash"></i></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    {/* ── TAB: GESTÃO DE EVENTOS ── */}
                    <section className={`admin-tab-content ${activeTab === 'parceiros-eventos' ? 'active' : ''}`}>
                        <div className="tab-header">
                            <h2>Gestão e Aprovação de Eventos</h2>
                            <button className="btn-search" onClick={abrirNovoEvento}><i className="fas fa-plus"></i> Novo Evento</button>
                        </div>
                        <div className="search-wrapper" style={{ padding: '20px', marginBottom: '25px', background: '#fff', borderRadius: '10px', border: '1px solid #eaeaea' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', gap: '15px', alignItems: 'end' }}>
                                <div className="input-group-search">
                                    <label>Nome do Evento</label>
                                    <input type="text" className="search-input" placeholder="Pesquisar evento..." value={filtroNomeEvento} onChange={e => setFiltroNomeEvento(e.target.value)} />
                                </div>
                                <div className="input-group-search">
                                    <label>Status</label>
                                    <select className="filter-select" value={filtroStatusEvento} onChange={e => setFiltroStatusEvento(e.target.value)}>
                                        <option value="Todos">Todos</option>
                                        <option value="Pendentes">Pendentes</option>
                                        <option value="Ativos">Ativos</option>
                                        <option value="Recusados">Recusados</option>
                                    </select>
                                </div>
                                <div className="input-group-search">
                                    <label>Parceiro</label>
                                    <select className="filter-select" value={filtroParceiroEvento} onChange={e => setFiltroParceiroEvento(e.target.value)}>
                                        <option value="Todos">Todos os Parceiros</option>
                                        {parceirosGlobais.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                                    </select>
                                </div>
                                <div className="input-group-search">
                                    <label>De</label>
                                    <input type="date" className="search-input" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} />
                                </div>
                                <div className="input-group-search">
                                    <label>Até</label>
                                    <input type="date" className="search-input" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} />
                                </div>
                            </div>
                        </div>
                        <table className="admin-table">
                            <thead><tr><th>Evento</th><th>Parceiro</th><th>Data</th><th>Status</th><th>Ações</th></tr></thead>
                            <tbody>
                                {eventosFiltrados.length === 0 ? (
                                    <tr><td colSpan="5" style={{ textAlign: 'center' }}>Nenhum evento corresponde aos filtros.</td></tr>
                                ) : eventosFiltrados.map(ev => (
                                    <tr key={ev.id}>
                                        <td><strong>{ev.titulo}</strong></td>
                                        <td>{ev.parceiro}</td>
                                        <td>{ev.data_evento ? new Date(ev.data_evento).toLocaleDateString('pt-BR') : 'Sem data'}</td>
                                        <td>
                                            {ev.status === 'Pendente'  && <span className="status-tag pending">Pendente</span>}
                                            {ev.status === 'Recusado'  && <span className="status-tag" style={{ background: '#fce4e4', color: '#c0392b' }}>Recusado</span>}
                                            {ev.status === 'Ativo'     && <span className="status-tag active">Ativo</span>}
                                        </td>
                                        <td className="action-buttons">
                                            <button className="btn-icon btn-approve" onClick={() => mudarStatusEvento(ev.id, 'Ativo')}    title="Aprovar"><i className="fas fa-check"></i></button>
                                            <button className="btn-icon btn-delete"  onClick={() => mudarStatusEvento(ev.id, 'Recusado')} title="Recusar"><i className="fas fa-times"></i></button>
                                            <button className="btn-icon btn-view"    onClick={() => window.open(`/evento-detalhes?id=${ev.id}`, '_blank')} title="Ver"><i className="fas fa-eye"></i></button>
                                            <button className="btn-icon btn-edit"    onClick={() => abrirEdicaoEvento(ev.id)}             title="Editar"><i className="fas fa-edit"></i></button>
                                            <button className="btn-icon btn-delete"  onClick={() => excluirEvento(ev.id, ev.titulo)}      title="Excluir" style={{ background: '#fce4e4', color: '#c0392b' }}><i className="fas fa-trash"></i></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    {/* ── TAB: LISTA DE PRESTADORES ── */}
                    <section className={`admin-tab-content ${activeTab === 'prestadores' ? 'active' : ''}`}>
                        <div className="tab-header">
                            <h2>Gestão de Prestadores de Serviço</h2>
                            <button className="btn-search" onClick={abrirCadastroPrestador}><i className="fas fa-plus"></i> Novo Prestador</button>
                        </div>
                        <div className="search-wrapper" style={{ padding: '20px', marginBottom: '25px', background: '#fff', borderRadius: '10px', border: '1px solid #eaeaea' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '15px', alignItems: 'end' }}>
                                <div className="input-group-search">
                                    <label>Pesquisar Prestador</label>
                                    <input type="text" className="search-input" placeholder="Nome ou segmento..." value={filtroBuscaPrestador} onChange={e => setFiltroBuscaPrestador(e.target.value)} />
                                </div>
                                <div className="input-group-search">
                                    <label>Segmento</label>
                                    <select className="filter-select" value={filtroSegmentoPrestador} onChange={e => setFiltroSegmentoPrestador(e.target.value)}>
                                        <option value="Todos">Todos os Segmentos</option>
                                        <option value="Tecnologia">Tecnologia</option>
                                        <option value="Infraestrutura Cloud">Infraestrutura Cloud</option>
                                        <option value="Engenharia">Engenharia</option>
                                        <option value="Educação">Educação</option>
                                    </select>
                                </div>
                                <button className="btn-search" style={{ height: '45px' }}><i className="fas fa-search"></i> Buscar</button>
                            </div>
                        </div>
                        <table className="admin-table">
                            <thead><tr><th>Prestador</th><th>Segmento</th><th>Avaliação</th><th>Status</th><th>Ações</th></tr></thead>
                            <tbody>
                                {prestadoresFiltrados.length === 0 ? (
                                    <tr><td colSpan="5" style={{ textAlign: 'center' }}>Nenhum prestador encontrado.</td></tr>
                                ) : prestadoresFiltrados.map(p => (
                                    <tr key={p.id}>
                                        <td><strong>{p.nome}</strong>{p.email && <><br /><small style={{ color: '#888' }}>{p.email}</small></>}</td>
                                        <td>{p.segmento || '-'}</td>
                                        <td>{p.avaliacao > 0 ? <><i className="fas fa-star" style={{ color: '#f39c12' }}></i> {Number(p.avaliacao).toFixed(1)}</> : <span style={{ color: '#aaa' }}>Sem avaliações</span>}</td>
                                        <td>{p.status === 'Ativo' ? <span className="status-tag active">Ativo</span> : <span className="status-tag pending">Inativo</span>}</td>
                                        <td className="action-buttons">
                                            <button className="btn-icon btn-view"   onClick={() => openModal('modalAssinaturaPrestador')}><i className="fas fa-file-signature"></i> Assinaturas</button>
                                            <button className="btn-icon btn-edit"   onClick={() => abrirEdicaoPrestador(p.id)}><i className="fas fa-edit"></i> Editar</button>
                                            <button className="btn-icon btn-delete" onClick={() => excluirPrestador(p.id, p.nome)}><i className="fas fa-trash"></i></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    {/* ── TAB: GESTÃO DE POSTAGENS ── */}
                    <section className={`admin-tab-content ${activeTab === 'prestadores-posts' ? 'active' : ''}`}>
                        <div className="tab-header">
                            <h2>Gestão de Postagens (Anúncios de Serviços)</h2>
                            <button className="btn-search" onClick={abrirCadastroServico}><i className="fas fa-plus"></i> Nova Postagem</button>
                        </div>
                        <div className="search-wrapper" style={{ padding: '20px', marginBottom: '25px', background: '#fff', borderRadius: '10px', border: '1px solid #eaeaea' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '15px', alignItems: 'end' }}>
                                <div className="input-group-search">
                                    <label>Status</label>
                                    <select className="filter-select" value={filtroStatusServico} onChange={e => setFiltroStatusServico(e.target.value)}>
                                        <option value="Todos">Todos</option>
                                        <option value="Ativo">Ativos</option>
                                        <option value="Pendente">Pendentes</option>
                                        <option value="Recusado">Recusados</option>
                                    </select>
                                </div>
                                <div className="input-group-search">
                                    <label>Empresa</label>
                                    <select className="filter-select" value={filtroEmpresaServico} onChange={e => setFiltroEmpresaServico(e.target.value)}>
                                        <option value="Todos">Todas as Empresas</option>
                                        {empresasServicos.map(emp => <option key={emp} value={emp}>{emp}</option>)}
                                    </select>
                                </div>
                                <div className="input-group-search">
                                    <label>Pesquisar</label>
                                    <input type="text" className="search-input" placeholder="Nome da postagem ou empresa..." value={filtroBuscaServico} onChange={e => setFiltroBuscaServico(e.target.value)} />
                                </div>
                                <button className="btn-search" style={{ height: '45px' }}><i className="fas fa-search"></i> Buscar</button>
                            </div>
                        </div>
                        <table className="admin-table">
                            <thead><tr><th>Serviço</th><th>Empresa</th><th>Status</th><th>Avaliação</th><th>Ações</th></tr></thead>
                            <tbody>
                                {servicosFiltrados.length === 0 ? (
                                    <tr><td colSpan="5" style={{ textAlign: 'center' }}>Nenhum serviço encontrado.</td></tr>
                                ) : servicosFiltrados.map(s => (
                                    <tr key={s.id}>
                                        <td><strong>{s.titulo}</strong>{s.destaque == 1 && <i className="fas fa-star" style={{ color: '#f39c12', fontSize: '0.75rem', marginLeft: '5px' }} title="Destaque"></i>}</td>
                                        <td>{s.nome_prestador || '-'}</td>
                                        <td>
                                            {s.status === 'Ativo'    && <span className="status-tag active">Ativo</span>}
                                            {s.status === 'Pendente' && <span className="status-tag pending">Pendente</span>}
                                            {s.status === 'Recusado' && <span className="status-tag" style={{ background: '#fce4e4', color: '#c0392b' }}>Recusado</span>}
                                        </td>
                                        <td>{s.total_avaliacoes > 0 ? <><i className="fas fa-star" style={{ color: '#f39c12' }}></i> {Number(s.avaliacao).toFixed(1)} ({s.total_avaliacoes})</> : '-'}</td>
                                        <td className="action-buttons">
                                            {s.status === 'Pendente' && <>
                                                <button className="btn-icon btn-approve" onClick={() => mudarStatusServico(s.id, 'Ativo')}><i className="fas fa-check"></i> Aprovar</button>
                                                <button className="btn-icon btn-delete"  onClick={() => mudarStatusServico(s.id, 'Recusado')}><i className="fas fa-times"></i> Recusar</button>
                                            </>}
                                            <button className="btn-icon btn-view"   onClick={() => abrirDetalhesServico(s.id)}><i className="fas fa-eye"></i> Detalhes</button>
                                            <button className="btn-icon btn-view"   onClick={() => openModal('modalComentarios')}><i className="fas fa-comments"></i> Feedbacks</button>
                                            <button className="btn-icon btn-edit"   onClick={() => abrirEdicaoServico(s.id)}><i className="fas fa-edit"></i> Editar</button>
                                            <button className="btn-icon btn-delete" onClick={() => excluirServico(s.id, s.titulo)} style={{ background: '#fce4e4', color: '#c0392b' }}><i className="fas fa-trash"></i></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    {/* ── TAB: CLIENTES ── */}
                    <section className={`admin-tab-content ${activeTab === 'clientes' ? 'active' : ''}`}>
                        <div className="tab-header">
                            <h2>Gestão de Clientes</h2>
                            <button className="btn-search" onClick={() => openModal('modalNovoCliente')}><i className="fas fa-plus"></i> Novo Cliente</button>
                        </div>
                        <table className="admin-table">
                            <thead><tr><th>Nome do Cliente</th><th>E-mail</th><th>Status</th><th>Ações</th></tr></thead>
                            <tbody>
                                <tr>
                                    <td><strong>Ana Beatriz</strong></td>
                                    <td>anabastos.redes@gmail.com</td>
                                    <td><span className="status-tag active">Ativo</span></td>
                                    <td className="action-buttons">
                                        <button className="btn-icon btn-view" onClick={() => openModal('modalClientePerfil')}><i className="fas fa-user"></i> Ver Perfil</button>
                                        <button className="btn-icon btn-view" onClick={() => openModal('modalClienteHistorico')}><i className="fas fa-ticket-alt"></i> Histórico</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    {/* ── TAB: SUPORTE ── */}
                    <section className={`admin-tab-content ${activeTab === 'requisicoes' ? 'active' : ''}`}>
                        <div className="tab-header"><h2>Central de Suporte (Help Desk)</h2></div>
                        <table className="admin-table">
                            <thead><tr><th>Remetente</th><th>Tipo</th><th>Assunto</th><th>Status</th><th>Ações</th></tr></thead>
                            <tbody>
                                <tr>
                                    <td><strong>Cisco Academy</strong></td>
                                    <td>Parceiro</td>
                                    <td>Aprovação de Pgto: Aluna Ana Beatriz</td>
                                    <td><span className="status-tag pending">Em Aberto</span></td>
                                    <td className="action-buttons">
                                        <button className="btn-icon btn-view"><i className="fas fa-eye"></i> Detalhes</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </section>
                </main>
            </div>

            {/* ==================== MODAIS ==================== */}

            {/* Cadastro / Edição de Parceiro */}
            {activeModal === 'modalCadastroParceiro' && (
                <div className="modal-overlay active" onClick={e => { if (e.target.classList.contains('modal-overlay')) closeModals(); }}>
                    <div className="admin-profile-modal" style={{ maxWidth: '560px' }}>
                        <button className="close-modal" onClick={closeModals}><i className="fas fa-times"></i></button>
                        <div className="modal-header-profile">
                            <h2>{formParceiro.id ? `Editar: ${formParceiro.nome}` : 'Novo Parceiro / Patrocinador'}</h2>
                            <p>Preencha os dados cadastrais abaixo.</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="input-group-search" style={{ flex: 2 }}>
                                    <label>Nome da Empresa <span style={{ color: 'red' }}>*</span></label>
                                    <input type="text" className="search-input" placeholder="Ex: Cisco Academy" value={formParceiro.nome} onChange={e => setFormParceiro(p => ({ ...p, nome: e.target.value }))} />
                                </div>
                                <div className="input-group-search" style={{ flex: 1 }}>
                                    <label>Tipo <span style={{ color: 'red' }}>*</span></label>
                                    <select className="filter-select" value={formParceiro.tipo} onChange={e => setFormParceiro(p => ({ ...p, tipo: e.target.value }))}>
                                        <option value="parceiro">Parceiro</option>
                                        <option value="patrocinador">Patrocinador</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="input-group-search" style={{ flex: 1 }}><label>CNPJ</label><input type="text" className="search-input" placeholder="00.000.000/0001-00" value={formParceiro.cnpj} onChange={e => setFormParceiro(p => ({ ...p, cnpj: e.target.value }))} /></div>
                                <div className="input-group-search" style={{ flex: 1 }}><label>Telefone</label><input type="text" className="search-input" placeholder="(00) 00000-0000" value={formParceiro.telefone} onChange={e => setFormParceiro(p => ({ ...p, telefone: e.target.value }))} /></div>
                            </div>
                            <div className="input-group-search"><label>E-mail de Contato</label><input type="email" className="search-input" placeholder="contato@empresa.com" value={formParceiro.email} onChange={e => setFormParceiro(p => ({ ...p, email: e.target.value }))} /></div>
                            <div className="input-group-search"><label>Endereço</label><input type="text" className="search-input" placeholder="Rua, Número - Cidade, UF" value={formParceiro.endereco} onChange={e => setFormParceiro(p => ({ ...p, endereco: e.target.value }))} /></div>
                            <div className="input-group-search">
                                <label>Status</label>
                                <select className="filter-select" value={formParceiro.status} onChange={e => setFormParceiro(p => ({ ...p, status: e.target.value }))}>
                                    <option value="Ativo">Ativo</option>
                                    <option value="Inativo">Inativo</option>
                                </select>
                            </div>
                            <button type="button" className="btn-search btn-block" onClick={salvarParceiro}><i className="fas fa-check"></i> Salvar Parceiro</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cadastro / Edição de Prestador */}
            {activeModal === 'modalCadastroPrestador' && (
                <div className="modal-overlay active" onClick={e => { if (e.target.classList.contains('modal-overlay')) closeModals(); }}>
                    <div className="admin-profile-modal" style={{ maxWidth: '560px' }}>
                        <button className="close-modal" onClick={closeModals}><i className="fas fa-times"></i></button>
                        <div className="modal-header-profile">
                            <h2>{formPrestador.id ? `Editar: ${formPrestador.nome}` : 'Novo Prestador de Serviço'}</h2>
                            <p>Preencha os dados cadastrais abaixo.</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="input-group-search" style={{ flex: 2 }}><label>Nome <span style={{ color: 'red' }}>*</span></label><input type="text" className="search-input" value={formPrestador.nome} onChange={e => setFormPrestador(p => ({ ...p, nome: e.target.value }))} /></div>
                                <div className="input-group-search" style={{ flex: 1 }}><label>Segmento</label><input type="text" className="search-input" value={formPrestador.segmento} onChange={e => setFormPrestador(p => ({ ...p, segmento: e.target.value }))} /></div>
                            </div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="input-group-search" style={{ flex: 1 }}><label>E-mail</label><input type="email" className="search-input" value={formPrestador.email} onChange={e => setFormPrestador(p => ({ ...p, email: e.target.value }))} /></div>
                                <div className="input-group-search" style={{ flex: 1 }}><label>Telefone</label><input type="text" className="search-input" value={formPrestador.telefone} onChange={e => setFormPrestador(p => ({ ...p, telefone: e.target.value }))} /></div>
                            </div>
                            <div className="input-group-search"><label>Descrição</label><textarea className="search-input" rows="3" style={{ resize: 'none' }} value={formPrestador.descricao} onChange={e => setFormPrestador(p => ({ ...p, descricao: e.target.value }))}></textarea></div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="input-group-search" style={{ flex: 1 }}>
                                    <label>Plano</label>
                                    <select className="filter-select" value={formPrestador.plano} onChange={e => setFormPrestador(p => ({ ...p, plano: e.target.value }))}>
                                        <option value="Básico">Básico</option>
                                        <option value="Profissional (Ouro)">Profissional (Ouro)</option>
                                        <option value="Enterprise">Enterprise</option>
                                    </select>
                                </div>
                                <div className="input-group-search" style={{ flex: 1 }}>
                                    <label>Status</label>
                                    <select className="filter-select" value={formPrestador.status} onChange={e => setFormPrestador(p => ({ ...p, status: e.target.value }))}>
                                        <option value="Ativo">Ativo</option>
                                        <option value="Inativo">Inativo</option>
                                    </select>
                                </div>
                            </div>
                            <button type="button" className="btn-search btn-block" onClick={salvarPrestador}><i className="fas fa-check"></i> Salvar Prestador</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Criar / Editar Serviço */}
            {activeModal === 'modalAdminNovoServico' && (
                <div className="modal-overlay active" onClick={e => { if (e.target.classList.contains('modal-overlay')) closeModals(); }}>
                    <div className="admin-profile-modal">
                        <button className="close-modal" onClick={closeModals}><i className="fas fa-times"></i></button>
                        <div className="modal-header-profile">
                            <h2>{formServico.id ? `Editar: ${formServico.titulo}` : 'Criar Nova Postagem de Serviço'}</h2>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div className="input-group-search">
                                <label style={{ color: 'var(--theme-teal-elegant)', fontWeight: 600 }}>Prestador</label>
                                <select className="filter-select" style={{ border: '2px solid var(--theme-teal-light)' }} value={formServico.id_prestador} onChange={e => setFormServico(s => ({ ...s, id_prestador: e.target.value }))}>
                                    <option value="">Selecione o Prestador</option>
                                    {prestadoresGlobais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                </select>
                            </div>
                            <div className="input-group-search"><label>Título <span style={{ color: 'red' }}>*</span></label><input type="text" className="search-input" value={formServico.titulo} onChange={e => setFormServico(s => ({ ...s, titulo: e.target.value }))} /></div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="input-group-search" style={{ flex: 1 }}>
                                    <label>Categoria</label>
                                    <select className="filter-select" value={formServico.categoria} onChange={e => setFormServico(s => ({ ...s, categoria: e.target.value }))}>
                                        <option value="Tecnologia">Tecnologia</option>
                                        <option value="Infraestrutura Cloud">Infraestrutura Cloud</option>
                                        <option value="Engenharia">Engenharia</option>
                                        <option value="Educação">Educação</option>
                                    </select>
                                </div>
                                <div className="input-group-search" style={{ flex: 1 }}><label>Valor (R$)</label><input type="number" className="search-input" value={formServico.valor} onChange={e => setFormServico(s => ({ ...s, valor: e.target.value }))} /></div>
                            </div>
                            <div className="input-group-search"><label>Descrição</label><textarea className="search-input" rows="4" style={{ resize: 'none' }} value={formServico.descricao} onChange={e => setFormServico(s => ({ ...s, descricao: e.target.value }))}></textarea></div>
                            <div className="input-group-search">
                                <label><i className="fas fa-image"></i> Imagem (Banner)</label>
                                <input type="file" className="search-input" accept="image/*" style={{ padding: '9px' }} onChange={e => setFormServico(s => ({ ...s, imagem: e.target.files[0] || null }))} />
                            </div>
                            <div className="input-group-search" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                                <input type="checkbox" checked={formServico.destaque} onChange={e => setFormServico(s => ({ ...s, destaque: e.target.checked }))} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                                <label style={{ cursor: 'pointer', margin: 0 }}><i className="fas fa-star" style={{ color: '#f39c12' }}></i> Marcar como <strong>Recomendação do Mês</strong></label>
                            </div>
                            <button type="button" className="btn-search btn-block" onClick={salvarServico}><i className="fas fa-check"></i> Publicar Serviço</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Criar / Editar Evento */}
            {activeModal === 'modalAdminNovoEvento' && (
                <div className="modal-overlay active" onClick={e => { if (e.target.classList.contains('modal-overlay')) closeModals(); }}>
                    <div className="admin-profile-modal">
                        <button className="close-modal" onClick={closeModals}><i className="fas fa-times"></i></button>
                        <div className="modal-header-profile">
                            <h2>{formEvento.id ? 'Editar Evento' : 'Criar Novo Evento'}</h2>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '10px' }}>
                            <div className="input-group-search"><label>Imagem (Banner)</label><input type="file" className="search-input" accept="image/*" style={{ padding: '9px' }} onChange={e => setFormEvento(f => ({ ...f, imagem: e.target.files[0] || null }))} /></div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="input-group-search" style={{ flex: 1 }}>
                                    <label>Parceiro / Autoria</label>
                                    <select className="filter-select" value={formEvento.parceiro} onChange={e => setFormEvento(f => ({ ...f, parceiro: e.target.value }))}>
                                        <option value="WE Corp Oficial">WE Corp Oficial</option>
                                        {parceirosGlobais.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                                    </select>
                                </div>
                                <div className="input-group-search" style={{ flex: 1 }}><label>Heads</label><input type="text" className="search-input" value={formEvento.heads} onChange={e => setFormEvento(f => ({ ...f, heads: e.target.value }))} /></div>
                            </div>
                            <div className="input-group-search"><label>Título <span style={{ color: 'red' }}>*</span></label><input type="text" className="search-input" value={formEvento.titulo} onChange={e => setFormEvento(f => ({ ...f, titulo: e.target.value }))} /></div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="input-group-search" style={{ flex: 1 }}>
                                    <label>Categoria</label>
                                    <select className="filter-select" value={formEvento.categoria} onChange={e => setFormEvento(f => ({ ...f, categoria: e.target.value }))}>
                                        <option value="Startups e Inovação">Startups e Inovação</option>
                                        <option value="Educação">Educação</option>
                                        <option value="Certificação">Certificação</option>
                                        <option value="Tecnologia">Tecnologia</option>
                                    </select>
                                </div>
                                <div className="input-group-search" style={{ flex: 1 }}><label>Valor (R$)</label><input type="number" className="search-input" value={formEvento.valor} onChange={e => setFormEvento(f => ({ ...f, valor: e.target.value }))} /></div>
                            </div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="input-group-search" style={{ flex: 1 }}><label>Data <span style={{ color: 'red' }}>*</span></label><input type="date" className="search-input" value={formEvento.data} onChange={e => setFormEvento(f => ({ ...f, data: e.target.value }))} /></div>
                                <div className="input-group-search" style={{ flex: 1 }}><label>Horário</label><input type="text" className="search-input" placeholder="19:00 - 22:00" value={formEvento.horario} onChange={e => setFormEvento(f => ({ ...f, horario: e.target.value }))} /></div>
                            </div>
                            <div className="input-group-search"><label>Local <span style={{ color: 'red' }}>*</span></label><input type="text" className="search-input" value={formEvento.local} onChange={e => setFormEvento(f => ({ ...f, local: e.target.value }))} /></div>
                            <div className="input-group-search"><label>Descrição</label><textarea className="search-input" rows="3" style={{ resize: 'none' }} value={formEvento.descricao} onChange={e => setFormEvento(f => ({ ...f, descricao: e.target.value }))}></textarea></div>
                            <div className="input-group-search"><label>Conteúdo Abordado</label><textarea className="search-input" rows="3" style={{ resize: 'none' }} value={formEvento.conteudo} onChange={e => setFormEvento(f => ({ ...f, conteudo: e.target.value }))}></textarea></div>
                            <div className="input-group-search">
                                <label>Certificação Inclusa?</label>
                                <select className="filter-select" value={certificacaoInclusa} onChange={e => { setCertificacaoInclusa(e.target.value); setFormEvento(f => ({ ...f, certificacao: e.target.value })); }}>
                                    <option value="nao">Não</option>
                                    <option value="sim">Sim</option>
                                </select>
                            </div>
                            {certificacaoInclusa === 'sim' && (
                                <div className="input-group-search">
                                    <label style={{ color: 'var(--theme-teal-elegant)' }}><i className="fas fa-certificate"></i> Texto da Certificação</label>
                                    <textarea className="search-input" rows="3" style={{ resize: 'none' }} value={formEvento.textocert} onChange={e => setFormEvento(f => ({ ...f, textocert: e.target.value }))}></textarea>
                                </div>
                            )}
                            <button type="button" className="btn-search btn-block" onClick={salvarNovoEvento}><i className="fas fa-check"></i> {formEvento.id ? 'Salvar Alterações' : 'Publicar Evento'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Perfil do Parceiro */}
            {activeModal === 'modalParceiro' && parceiroSelecionado && (
                <div className="modal-overlay active" onClick={e => { if (e.target.classList.contains('modal-overlay')) closeModals(); }}>
                    <div className="admin-profile-modal">
                        <button className="close-modal" onClick={closeModals}><i className="fas fa-times"></i></button>
                        <div className="modal-header-profile">
                            <h2>{parceiroSelecionado.nome} <span className={`status-tag ${parceiroSelecionado.status === 'Ativo' ? 'active' : 'pending'}`} style={{ fontSize: '0.8rem' }}>{parceiroSelecionado.status}</span></h2>
                            <p>{parceiroSelecionado.tipo === 'patrocinador' ? 'Patrocinador Master' : 'Parceiro Institucional'}</p>
                        </div>
                        <div className="detail-list" style={{ marginBottom: '20px', background: '#f8f9fa', padding: '15px', borderRadius: '10px' }}>
                            <h4><i className="fas fa-id-card"></i> Dados Cadastrais</h4>
                            <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.9rem' }}>
                                <li><strong>CNPJ:</strong> {parceiroSelecionado.cnpj || 'Não informado'}</li>
                                <li><strong>E-mail:</strong> {parceiroSelecionado.email || 'Não informado'}</li>
                                <li><strong>Telefone:</strong> {parceiroSelecionado.telefone || 'Não informado'}</li>
                                <li><strong>Endereço:</strong> {parceiroSelecionado.endereco || 'Não informado'}</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Detalhes do Serviço */}
            {activeModal === 'modalDetalhesServico' && servicoSelecionado && (
                <div className="modal-overlay active" onClick={e => { if (e.target.classList.contains('modal-overlay')) closeModals(); }}>
                    <div className="admin-profile-modal" style={{ maxWidth: '700px', maxHeight: '88vh', overflowY: 'auto' }}>
                        <button className="close-modal" onClick={closeModals}><i className="fas fa-times"></i></button>
                        <div className="modal-header-profile" style={{ borderBottom: 'none', marginBottom: '5px' }}>
                            <h2>{servicoSelecionado.titulo}</h2>
                            <p>Oferecido por: <strong style={{ color: 'var(--theme-teal-elegant)' }}>{servicoSelecionado.nome_prestador}</strong> &nbsp;
                               <span className="tag" style={{ background: '#e0f7fa', color: '#00838f' }}>{servicoSelecionado.categoria}</span>
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
                            {servicoSelecionado.imagem && (
                                <img src={`/uploads/${servicoSelecionado.imagem}`} alt="Banner" style={{ width: '100%', maxHeight: '180px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #eee' }} />
                            )}
                            <div className="detail-card" style={{ margin: 0, flex: 1 }}>
                                <p><strong>Valor:</strong> {servicoSelecionado.valor > 0 ? `R$ ${Number(servicoSelecionado.valor).toFixed(2)}` : 'Sob consulta'}</p>
                                <p><strong>Status:</strong> {servicoSelecionado.status}</p>
                                <p><strong>Destaque:</strong> {servicoSelecionado.destaque == 1 ? '⭐ Sim' : 'Não'}</p>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#fdfdfd', padding: '12px', borderRadius: '10px', border: '1px solid #eee', marginTop: '10px' }}>
                                    {servicoSelecionado.total_avaliacoes > 0 ? (
                                        <>
                                            <span style={{ color: '#f39c12' }}>{renderEstrelas(servicoSelecionado.avaliacao)}</span>
                                            <span><strong>{Number(servicoSelecionado.avaliacao).toFixed(1)}</strong> ({servicoSelecionado.total_avaliacoes} avaliações)</span>
                                        </>
                                    ) : <span style={{ color: '#888' }}>Nenhuma avaliação ainda.</span>}
                                </div>
                            </div>
                        </div>
                        <div className="info-section" style={{ padding: '20px', marginBottom: 0 }}>
                            <h3>Descrição</h3>
                            <p style={{ fontSize: '0.95rem', color: '#555', marginTop: '10px', lineHeight: 1.7 }}>{servicoSelecionado.descricao || 'Sem descrição disponível.'}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Assinatura Admin */}
            {activeModal === 'modalAssinaturaAdmin' && (
                <div className="modal-overlay active" onClick={e => { if (e.target.classList.contains('modal-overlay')) closeModals(); }}>
                    <div className="admin-profile-modal" style={{ maxWidth: '600px' }}>
                        <button className="close-modal" onClick={closeModals}><i className="fas fa-times"></i></button>
                        <div className="modal-header-profile"><h2><i className="fas fa-file-invoice-dollar" style={{ color: 'var(--theme-teal-main)' }}></i> Gestão de Assinatura</h2><p>Status do plano do parceiro selecionado.</p></div>
                        <div className="detail-card"><p><strong>Plano:</strong> Patrocinador Master</p><p><strong>Status:</strong> <span className="pay-tag tag-pending">Aguardando Pagamento</span></p></div>
                    </div>
                </div>
            )}

            {/* Assinatura Prestador */}
            {activeModal === 'modalAssinaturaPrestador' && (
                <div className="modal-overlay active" onClick={e => { if (e.target.classList.contains('modal-overlay')) closeModals(); }}>
                    <div className="admin-profile-modal" style={{ maxWidth: '600px' }}>
                        <button className="close-modal" onClick={closeModals}><i className="fas fa-times"></i></button>
                        <div className="modal-header-profile"><h2><i className="fas fa-file-invoice-dollar" style={{ color: 'var(--theme-teal-main)' }}></i> Gestão de Assinatura</h2><p>Status do plano do prestador selecionado.</p></div>
                        <div className="detail-card"><p><strong>Plano:</strong> Profissional (Ouro)</p><p><strong>Status:</strong> <span className="pay-tag tag-pending">Fatura em Aberto</span></p></div>
                    </div>
                </div>
            )}

            {/* Moderação de Feedbacks */}
            {activeModal === 'modalComentarios' && (
                <div className="modal-overlay active" onClick={e => { if (e.target.classList.contains('modal-overlay')) closeModals(); }}>
                    <div className="admin-profile-modal" style={{ maxWidth: '600px' }}>
                        <button className="close-modal" onClick={closeModals}><i className="fas fa-times"></i></button>
                        <div className="modal-header-profile"><h2><i className="fas fa-comments" style={{ color: 'var(--theme-teal-main)' }}></i> Moderação de Feedbacks</h2></div>
                        <div className="reviews-list" style={{ marginTop: '20px', maxHeight: '400px', overflowY: 'auto' }}>
                            <div className="review-item" style={{ borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                    <strong>Carlos E.</strong>
                                    <span style={{ color: '#f39c12', fontSize: '0.8rem' }}><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i></span>
                                </div>
                                <p style={{ fontSize: '0.9rem', color: '#555' }}>Serviço excelente! Identificaram falhas críticas na nossa rede.</p>
                                {/* ── window.confirm → confirmDialog ── */}
                                <button className="btn-icon btn-delete" style={{ padding: '4px 8px', fontSize: '0.75rem', marginTop: '10px' }} onClick={async () => {
                                    const ok = await confirmDialog({ title: 'Excluir comentário', message: 'Remover este comentário da página de serviços?', confirmLabel: 'Excluir', danger: true, icon: 'fa-trash' });
                                    if (ok) { toastSuccess('Comentário removido.'); closeModals(); }
                                }}><i className="fas fa-trash"></i> Excluir</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Novo Cliente */}
            {activeModal === 'modalNovoCliente' && (
                <div className="modal-overlay active" onClick={e => { if (e.target.classList.contains('modal-overlay')) closeModals(); }}>
                    <div className="admin-profile-modal" style={{ maxWidth: '500px' }}>
                        <button className="close-modal" onClick={closeModals}><i className="fas fa-times"></i></button>
                        <div className="modal-header-profile"><h2>Cadastrar Novo Cliente</h2></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div className="input-group-search"><label>Nome Completo</label><input type="text" className="search-input" /></div>
                            <div className="input-group-search"><label>E-mail</label><input type="email" className="search-input" /></div>
                            <div className="input-group-search"><label>CPF</label><input type="text" className="search-input" /></div>
                            {/* ── alert → toast ── */}
                            <button type="button" className="btn-search btn-block" onClick={() => { toastError('Funcionalidade será integrada futuramente!'); closeModals(); }}><i className="fas fa-check"></i> Cadastrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Perfil do Cliente */}
            {activeModal === 'modalClientePerfil' && (
                <div className="modal-overlay active" onClick={e => { if (e.target.classList.contains('modal-overlay')) closeModals(); }}>
                    <div className="admin-profile-modal" style={{ maxWidth: '500px' }}>
                        <button className="close-modal" onClick={closeModals}><i className="fas fa-times"></i></button>
                        <div className="modal-header-profile"><h2>Perfil do Cliente <span className="status-tag active" style={{ fontSize: '0.8rem' }}>Ativa</span></h2></div>
                        <div className="detail-list" style={{ background: '#f8f9fa', padding: '20px', borderRadius: '10px' }}>
                            <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.95rem', lineHeight: 2 }}>
                                <li><strong>Nome:</strong> Ana Beatriz Gonçalves Bastos</li>
                                <li><strong>E-mail:</strong> anabastos.redes@gmail.com</li>
                                <li><strong>CPF:</strong> 000.000.000-00</li>
                                <li><strong>Telefone:</strong> (61) 90000-0000</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Histórico do Cliente */}
            {activeModal === 'modalClienteHistorico' && (
                <div className="modal-overlay active" onClick={e => { if (e.target.classList.contains('modal-overlay')) closeModals(); }}>
                    <div className="admin-profile-modal">
                        <button className="close-modal" onClick={closeModals}><i className="fas fa-times"></i></button>
                        <div className="modal-header-profile"><h2>Histórico de Compras</h2><p>Cliente: <strong>Ana Beatriz</strong></p></div>
                        <div className="detail-list">
                            <ul className="purchase-history">
                                <li><div><strong>Treinamento: Certificação Cisco CCNA</strong><p style={{ fontSize: '0.85rem', color: '#666' }}>10/04/2026 | PIX</p></div><span className="pay-tag tag-approved">🟢 Aprovado</span></li>
                                <li><div><strong>Consultoria em Cibersegurança</strong><p style={{ fontSize: '0.85rem', color: '#666' }}>01/05/2026 | Boleto</p></div><span className="pay-tag tag-pending">🟡 Aguardando</span></li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;