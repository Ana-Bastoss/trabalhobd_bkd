import React, { useState, useEffect, useContext } from 'react';
import '../assets/style.css';
import { toastSuccess, toastError } from '../lib/ui';
import UiHost from '../components/Ui';
import { AuthContext } from '../context/AuthContext';

const Servicos = () => {
    const { user, openModals } = useContext(AuthContext);

    const [servicosGlobais, setServicosGlobais] = useState([]);
    const [filtroTexto,    setFiltroTexto]    = useState('');
    const [filtroSetor,    setFiltroSetor]    = useState('all');
    const [filtroAvaliacao,setFiltroAvaliacao]= useState('all');
    const [servicoSelecionado, setServicoSelecionado] = useState(null);

    // Avaliações do serviço aberto
    const [avaliacoes,      setAvaliacoes]      = useState([]);
    const [loadingAvs,      setLoadingAvs]      = useState(false);
    const [notaForm,        setNotaForm]        = useState(0);
    const [notaHover,       setNotaHover]       = useState(0);
    const [comentarioForm,  setComentarioForm]  = useState('');
    const [enviandoAv,      setEnviandoAv]      = useState(false);

    useEffect(() => {
        const carregar = async () => {
            try {
                const r = await fetch('/api/servicos');
                const d = await r.json();
                if (d.sucesso) setServicosGlobais(d.servicos.filter(s => s.status === 'Ativo'));
            } catch { console.error('Erro ao carregar serviços'); }
        };
        carregar();
    }, []);

    // Carrega avaliações quando abre o modal de um serviço
    useEffect(() => {
        if (!servicoSelecionado) { setAvaliacoes([]); setNotaForm(0); setComentarioForm(''); return; }
        const buscar = async () => {
            setLoadingAvs(true);
            try {
                const r = await fetch(`/api/avaliacoes/${servicoSelecionado.id}`);
                const d = await r.json();
                if (d.sucesso) setAvaliacoes(d.avaliacoes);
            } catch { console.error('Erro ao buscar avaliações'); }
            setLoadingAvs(false);
        };
        buscar();
    }, [servicoSelecionado]);

    const publicarAvaliacao = async () => {
        if (notaForm === 0) { toastError('Selecione uma nota antes de publicar.'); return; }
        if (!comentarioForm.trim()) { toastError('Escreva um comentário antes de publicar.'); return; }

        if (!user) {
            toastError('Você precisa estar logado para avaliar um serviço.');
            openModals.login();
            return;
        }

        setEnviandoAv(true);
        try {
            const r = await fetch('/api/avaliacoes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_servico:  servicoSelecionado.id,
                    id_usuario:  user.id,
                    autor_nome:  user.nome,
                    nota:        notaForm,
                    comentario:  comentarioForm.trim()
                })
            });
            const d = await r.json();
            if (d.sucesso) {
                toastSuccess('Avaliação publicada com sucesso!');
                setNotaForm(0);
                setComentarioForm('');
                // Atualiza lista de avaliações e média do card
                const ra = await fetch(`/api/avaliacoes/${servicoSelecionado.id}`);
                const da = await ra.json();
                if (da.sucesso) setAvaliacoes(da.avaliacoes);
                // Atualiza média no card da lista
                const rs = await fetch('/api/servicos');
                const ds = await rs.json();
                if (ds.sucesso) {
                    setServicosGlobais(ds.servicos.filter(s => s.status === 'Ativo'));
                    const atualizado = ds.servicos.find(s => s.id === servicoSelecionado.id);
                    if (atualizado) setServicoSelecionado(atualizado);
                }
            } else {
                toastError(d.mensagem || 'Erro ao publicar avaliação.');
            }
        } catch { toastError('Erro de conexão com o servidor.'); }
        setEnviandoAv(false);
    };

    const servicosFiltrados = servicosGlobais.filter(s => {
        const matchTexto  = s.titulo.toLowerCase().includes(filtroTexto.toLowerCase()) ||
                            (s.nome_prestador||'').toLowerCase().includes(filtroTexto.toLowerCase());
        const matchSetor  = filtroSetor === 'all' ? true : s.categoria === filtroSetor;
        let matchAval     = true;
        if (filtroAvaliacao === '5')   matchAval = s.avaliacao >= 4.9;
        if (filtroAvaliacao === '4up') matchAval = s.avaliacao >= 4.0;
        return matchTexto && matchSetor && matchAval;
    });

    const destaques = servicosFiltrados.filter(s => s.destaque == 1);
    const gerais    = servicosFiltrados.filter(s => !s.destaque || s.destaque == 0);

    const renderEstrelas = (val, interactive = false, hoverVal = 0, onHover = null, onClick = null) => {
        const arr = [];
        for (let i = 1; i <= 5; i++) {
            const filled = interactive ? (hoverVal >= i || (!hoverVal && val >= i)) : val >= i;
            const half   = !interactive && val >= i - 0.5 && val < i;
            arr.push(
                <i
                    key={i}
                    className={`${half ? 'fas fa-star-half-alt' : filled ? 'fas fa-star' : 'far fa-star'}`}
                    style={{
                        color: filled || half ? '#f39c12' : '#ccc',
                        cursor: interactive ? 'pointer' : 'default',
                        fontSize: interactive ? '1.6rem' : 'inherit',
                        marginRight: '3px',
                        transition: 'color 0.1s'
                    }}
                    onMouseEnter={interactive ? () => onHover(i) : undefined}
                    onMouseLeave={interactive ? () => onHover(0) : undefined}
                    onClick={interactive ? () => onClick(i) : undefined}
                />
            );
        }
        return arr;
    };

    const tempoRelativo = (dataStr) => {
        const diff = Date.now() - new Date(dataStr).getTime();
        const dias = Math.floor(diff / 86400000);
        if (dias === 0) return 'Hoje';
        if (dias === 1) return 'Ontem';
        if (dias < 7)   return `Há ${dias} dias`;
        if (dias < 30)  return `Há ${Math.floor(dias/7)} semana(s)`;
        return `Há ${Math.floor(dias/30)} mês(es)`;
    };

    return (
        <>
            <UiHost />
            <div className="site-background-gradient"></div>
            <main>
                <section className="services-section">
                    <h2>Nossos Serviços</h2>

                    <div className="search-wrapper">
                        <div className="search-container">
                            <div className="input-group-search">
                                <label>Pesquisar</label>
                                <input type="text" placeholder="Buscar serviço ou empresa..."
                                    className="search-input" value={filtroTexto}
                                    onChange={e => setFiltroTexto(e.target.value)} />
                            </div>
                            <div className="input-group-search">
                                <label>Setor</label>
                                <select className="filter-select" value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)}>
                                    <option value="all">Todos os Setores</option>
                                    <option value="Engenharia">Engenharia</option>
                                    <option value="Tecnologia">Tecnologia</option>
                                    <option value="Educação">Educação</option>
                                </select>
                            </div>
                            <div className="input-group-search">
                                <label>Avaliação</label>
                                <select className="filter-select" value={filtroAvaliacao} onChange={e => setFiltroAvaliacao(e.target.value)}>
                                    <option value="all">Todas as Avaliações</option>
                                    <option value="5">5 Estrelas</option>
                                    <option value="4up">4 Estrelas ou mais</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {destaques.length > 0 && (
                        <div className="services-block">
                            <h3 className="section-subtitle"><i className="fas fa-star highlight-icon"></i> Recomendações do Mês</h3>
                            <div className="services-grid">
                                {destaques.map(s => (
                                    <div key={s.id} className="service-card highlight-card">
                                        <div className="service-header">
                                            <span className="tag">{s.categoria||'-'}</span>
                                            <div className="service-rating">
                                                {renderEstrelas(s.avaliacao)} <span>({Number(s.avaliacao).toFixed(1)})</span>
                                            </div>
                                        </div>
                                        <h4>{s.titulo}</h4>
                                        <p className="service-provider">por <strong style={{color:'var(--theme-teal-elegant)'}}>{s.nome_prestador||'-'}</strong></p>
                                        <p className="service-desc">{s.descricao||''}</p>
                                        <button className="btn-service" onClick={() => setServicoSelecionado(s)}>
                                            Ver Detalhes <i className="fas fa-arrow-right"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="services-block">
                        <h3 className="section-subtitle">Explorar Serviços</h3>
                        <div className="services-grid general-grid">
                            {gerais.length === 0
                                ? <p style={{color:'#888',textAlign:'center',width:'100%',marginTop:'20px'}}>Nenhum serviço encontrado.</p>
                                : gerais.map(s => (
                                    <div key={s.id} className="service-card">
                                        <div className="service-header">
                                            <span className="tag">{s.categoria||'-'}</span>
                                            <div className="service-rating">
                                                {renderEstrelas(s.avaliacao)} <span>({Number(s.avaliacao).toFixed(1)})</span>
                                            </div>
                                        </div>
                                        <h4>{s.titulo}</h4>
                                        <p className="service-provider">por <strong style={{color:'var(--theme-teal-elegant)'}}>{s.nome_prestador||'-'}</strong></p>
                                        <p className="service-desc">{s.descricao||''}</p>
                                        <button className="btn-service" onClick={() => setServicoSelecionado(s)}>
                                            Ver Detalhes <i className="fas fa-arrow-right"></i>
                                        </button>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </section>
            </main>

            {/* Modal Detalhes do Serviço */}
            {servicoSelecionado && (
                <div className="modal-overlay active" onClick={e => { if(e.target.classList.contains('modal-overlay')) setServicoSelecionado(null); }}>
                    <div className="admin-profile-modal" style={{maxWidth:'950px',maxHeight:'90vh',overflowY:'auto'}}>
                        <button className="close-modal" onClick={() => setServicoSelecionado(null)}><i className="fas fa-times"></i></button>

                        <div className="modal-header-profile" style={{borderBottom:'none',marginBottom:'10px'}}>
                            <h2>{servicoSelecionado.titulo}</h2>
                            <p>Oferecido por: <strong style={{color:'var(--theme-teal-elegant)'}}>{servicoSelecionado.nome_prestador||'-'}</strong>
                               <span className="tag" style={{marginLeft:'10px',background:'#e0f7fa',color:'#00838f'}}>{servicoSelecionado.categoria}</span>
                            </p>
                        </div>

                        <div className="event-grid-layout" style={{gap:'30px',gridTemplateColumns:'1.5fr 1fr'}}>
                            <div>
                                <div className="info-section" style={{padding:'20px',marginBottom:'25px'}}>
                                    <h3>Sobre o Serviço</h3>
                                    <p style={{fontSize:'0.95rem',color:'#555',marginTop:'10px',lineHeight:1.7}}>{servicoSelecionado.descricao}</p>
                                </div>

                                {/* Avaliações reais */}
                                <div className="info-section" style={{padding:'20px'}}>
                                    <h3>Avaliações de Clientes</h3>

                                    {/* Resumo */}
                                    <div style={{display:'flex',alignItems:'center',gap:'15px',margin:'15px 0',background:'#fdfdfd',padding:'15px',borderRadius:'10px',border:'1px solid #eee'}}>
                                        <h1 style={{margin:0,color:'#f39c12',fontSize:'3rem',lineHeight:1}}>{Number(servicoSelecionado.avaliacao).toFixed(1)}</h1>
                                        <div>
                                            <div style={{color:'#f39c12',fontSize:'1.2rem'}}>{renderEstrelas(servicoSelecionado.avaliacao)}</div>
                                            <span style={{color:'#666',fontSize:'0.85rem'}}>Baseado em {servicoSelecionado.total_avaliacoes||0} avaliações</span>
                                        </div>
                                    </div>

                                    {/* Lista de avaliações */}
                                    <div style={{marginBottom:'25px',maxHeight:'250px',overflowY:'auto'}}>
                                        {loadingAvs && <p style={{color:'#999',textAlign:'center',padding:'20px'}}>Carregando avaliações...</p>}
                                        {!loadingAvs && avaliacoes.length === 0 && (
                                            <p style={{color:'#aaa',textAlign:'center',padding:'20px',fontStyle:'italic'}}>Nenhuma avaliação ainda. Seja o primeiro!</p>
                                        )}
                                        {avaliacoes.map(av => (
                                            <div key={av.id} style={{borderBottom:'1px solid #eee',paddingBottom:'15px',marginBottom:'15px'}}>
                                                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
                                                    <strong style={{color:'#333'}}>{av.autor_nome}
                                                        <span style={{fontSize:'0.78rem',color:'#aaa',fontWeight:'normal',marginLeft:'8px'}}>
                                                            — {tempoRelativo(av.data_avaliacao)}
                                                        </span>
                                                    </strong>
                                                    <span style={{color:'#f39c12',fontSize:'0.85rem'}}>{renderEstrelas(av.nota)}</span>
                                                </div>
                                                {av.comentario && <p style={{fontSize:'0.9rem',color:'#555',margin:0,lineHeight:1.5}}>{av.comentario}</p>}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Formulário de nova avaliação */}
                                    <div style={{background:'#f8f9fa',padding:'20px',borderRadius:'10px',border:'1px dashed #ccc'}}>
                                        <h4 style={{marginBottom:'12px',color:'#333'}}>
                                            {user ? 'Deixe sua avaliação' : 'Faça login para avaliar'}
                                        </h4>

                                        {user ? (
                                            <>
                                                <p style={{fontSize:'0.82rem',color:'#666',marginBottom:'10px'}}>
                                                    Avaliando como <strong>{user.nome}</strong>
                                                </p>
                                                {/* Estrelas interativas */}
                                                <div style={{marginBottom:'14px'}}>
                                                    {renderEstrelas(notaForm, true, notaHover, setNotaHover, setNotaForm)}
                                                    {notaForm > 0 && (
                                                        <span style={{fontSize:'0.82rem',color:'#006666',marginLeft:'8px',fontWeight:600}}>
                                                            {['','Ruim','Regular','Bom','Muito bom','Excelente'][notaForm]}
                                                        </span>
                                                    )}
                                                </div>
                                                <textarea
                                                    className="search-input"
                                                    rows="3"
                                                    placeholder="Conte-nos como foi sua experiência..."
                                                    style={{marginBottom:'12px',resize:'none'}}
                                                    value={comentarioForm}
                                                    onChange={e => setComentarioForm(e.target.value)}
                                                />
                                                <button
                                                    className="btn-search"
                                                    style={{padding:'8px 20px',fontSize:'0.9rem'}}
                                                    disabled={enviandoAv}
                                                    onClick={publicarAvaliacao}
                                                >
                                                    {enviandoAv
                                                        ? <><i className="fas fa-spinner fa-spin"></i> Publicando...</>
                                                        : <><i className="fas fa-paper-plane" style={{marginRight:'6px'}}></i>Publicar Avaliação</>
                                                    }
                                                </button>
                                            </>
                                        ) : (
                                            <button className="btn-search" onClick={openModals.login} style={{padding:'10px 20px'}}>
                                                <i className="fas fa-sign-in-alt" style={{marginRight:'8px'}}></i>Entrar para avaliar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Card lateral de contato */}
                            <div>
                                <div className="checkout-card" style={{position:'sticky',top:0,padding:'25px',backgroundColor:'#f4f7f6',border:'2px solid var(--theme-teal-light)'}}>
                                    <h3 style={{marginBottom:'5px',color:'var(--theme-teal-elegant)'}}>Pedir Orçamento</h3>
                                    <p style={{fontSize:'0.85rem',color:'#666',textAlign:'center',marginBottom:'20px'}}>Preencha os dados e a empresa entrará em contato.</p>
                                    {servicoSelecionado.valor > 0 && (
                                        <p style={{textAlign:'center',fontWeight:700,color:'#006666',fontSize:'1.3rem',marginBottom:'15px'}}>
                                            A partir de R$ {Number(servicoSelecionado.valor).toLocaleString('pt-BR',{minimumFractionDigits:2})}
                                        </p>
                                    )}
                                    <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                                        <div className="input-group-search"><label style={{fontSize:'0.8rem',color:'#555'}}>Nome Completo</label><input type="text" className="search-input" placeholder="Seu nome" /></div>
                                        <div className="input-group-search"><label style={{fontSize:'0.8rem',color:'#555'}}>E-mail</label><input type="email" className="search-input" placeholder="exemplo@email.com" /></div>
                                        <div className="input-group-search"><label style={{fontSize:'0.8rem',color:'#555'}}>Telefone / WhatsApp</label><input type="tel" className="search-input" placeholder="(00) 00000-0000" /></div>
                                        <div className="input-group-search"><label style={{fontSize:'0.8rem',color:'#555'}}>Sua necessidade (Opcional)</label><textarea className="search-input" rows="2" style={{resize:'none'}} placeholder="Do que você precisa?"></textarea></div>
                                        <button type="button" className="btn-search" style={{width:'100%',height:'50px',marginTop:'5px'}} onClick={() => toastSuccess('Orçamento solicitado! A empresa entrará em contato em breve.')}>
                                            <i className="fas fa-paper-plane" style={{marginRight:'5px'}}></i>Enviar Solicitação
                                        </button>
                                    </div>
                                    <div style={{textAlign:'center',margin:'15px 0',position:'relative'}}>
                                        <hr style={{border:'none',borderTop:'1px solid #ddd'}}/>
                                        <span style={{background:'#f4f7f6',padding:'0 10px',color:'#aaa',fontSize:'0.8rem',position:'absolute',top:'-10px',left:'50%',transform:'translateX(-50%)'}}>OU CONTATE AGORA</span>
                                    </div>
                                    <button className="btn-search" style={{width:'100%',height:'50px',backgroundColor:'#25D366',color:'white'}} onClick={() => window.open('https://wa.me/5511999999999','_blank')}>
                                        <i className="fab fa-whatsapp" style={{fontSize:'1.3rem',marginRight:'8px'}}></i>Falar no WhatsApp
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Servicos;