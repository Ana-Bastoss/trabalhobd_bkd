import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../assets/style.css';
// ── Única adição: UiHost para exibir toasts disparados na página ─────────────
import UiHost from '../components/Ui';
// ────────────────────────────────────────────────────────────────────────────

const Home = () => {
    // ── Auth context (substitui o sistema duplicado de modal que estava aqui) ──
    const { openModals } = useContext(AuthContext);

    // ── Dados de eventos (carregados via API) ──
    const [eventosGlobais, setEventosGlobais] = useState([]);

    // ── Filtros ──
    const [filtroTexto, setFiltroTexto]             = useState('');
    const [filtroDataInicio, setFiltroDataInicio]   = useState('');
    const [filtroDataFim, setFiltroDataFim]         = useState('');
    const [filtroCategoria, setFiltroCategoria]     = useState('all');

    // ── Carrega eventos ativos do backend ──
    useEffect(() => {
        const carregarEventos = async () => {
            try {
                const resposta = await fetch('/api/eventos');
                const dados    = await resposta.json();
                if (dados.sucesso) {
                    setEventosGlobais(dados.eventos.filter(e => e.status === 'Ativo'));
                }
            } catch (erro) {
                console.error('Erro ao carregar eventos:', erro);
            }
        };
        carregarEventos();
    }, []);

    // ── Filtragem derivada do estado (sem window.filtrarEventosPublicos) ──
    const eventosFiltrados = eventosGlobais.filter(evento => {
        const texto    = filtroTexto.toLowerCase();
        const matchTexto =
            evento.titulo.toLowerCase().includes(texto)   ||
            evento.local.toLowerCase().includes(texto)    ||
            evento.parceiro.toLowerCase().includes(texto);

        let matchData = true;
        if (filtroDataInicio && evento.data_evento < filtroDataInicio) matchData = false;
        if (filtroDataFim    && evento.data_evento > filtroDataFim)    matchData = false;

        const matchCategoria = filtroCategoria === 'all'
            ? true
            : evento.categoria === filtroCategoria;

        return matchTexto && matchData && matchCategoria;
    });

    return (
        <>
            {/* ── UiHost renderiza toasts flutuantes ── */}
            <UiHost />

            <div className="site-background-gradient"></div>

            <main>
                {/* ── SOBRE ── */}
                <section id="sobre" className="hero-section">
                    <h1>A empresa que ajuda o seu negócio a crescer</h1>
                    <p className="subtitle">
                        A WE Corp é uma empresa voltada aos campos de engenharia, tecnologia e educação,
                        que acredita no poder das conexões para impulsionar a expansão de negócios.
                        Nosso objetivo é ampliar a visibilidade da sua marca e ajudar você a gerar
                        impacto real no mercado, promovendo suas iniciativas de forma estratégica e eficaz.
                    </p>

                    <div className="cards-grid">
                        <div className="card floating">
                            <h3>Mais visibilidade</h3>
                            <p>Através da nossa plataforma, oferecemos um espaço onde indivíduos e empresas podem não apenas se conectar, mas promover ativamente seus negócios.</p>
                        </div>
                        <div className="card floating">
                            <h3>Feedback ativo</h3>
                            <p>Amplie seu negócio com a avaliação de clientes. Mantemos um compromisso com a melhoria contínua através do feedback ativo para garantir a máxima qualidade.</p>
                        </div>
                        <div className="card floating">
                            <h3>Campanhas promocionais</h3>
                            <p>Tem alguma iniciativa ou projeto que pode agregar valor a sua empresa? Nós te ajudamos! Oferecemos canais de comunicação para patrocinadores e parceiros promoverem seus eventos e alcançarem novos públicos.</p>
                        </div>
                        <div className="card floating">
                            <h3>Parcerias</h3>
                            <p>Conectar é ampliar! Criamos uma rede que une inovação à busca por novos serviços, estabelecendo acordos que aumentam o alcance da sua audiência.</p>
                        </div>
                    </div>
                </section>

                {/* ── PLANOS ── */}
                <section id="planos" className="plans-section">
                    <h2>Planos e Parcerias</h2>
                    <p className="plans-subtitle">Escolha o modelo ideal para impulsionar seu negócio na plataforma WE Corp</p>

                    <div className="plans-container">
                        {/* Bloco Prestadores */}
                        <div className="plans-block">
                            <div className="plans-block-header">
                                <i className="fas fa-briefcase"></i>
                                <h3>Para Prestadores de Serviço</h3>
                                <p>Foco em Vendas e Volume</p>
                            </div>
                            <div className="plans-grid">
                                <div className="plan-card">
                                    <div className="plan-badge free">Gratuito</div>
                                    <h4>Plano Essencial</h4>
                                    <div className="plan-price">
                                        <span className="price-value">R$ 0</span>
                                        <span className="price-period">/mês</span>
                                    </div>
                                    <p className="plan-description">Ideal para quem está começando e quer testar a plataforma sem custo inicial.</p>
                                    <ul className="plan-features">
                                        <li><i className="fas fa-check"></i> Cadastro na plataforma</li>
                                        <li><i className="fas fa-check"></i> Listagem na busca geral</li>
                                        <li><i className="fas fa-check"></i> Recebimento de pedidos</li>
                                        <li className="highlight-negative"><i className="fas fa-percent"></i> Taxa de intermediação: <strong>15% a 20%</strong></li>
                                    </ul>
                                    {/* openModals.login vem do AuthContext — sem duplicação */}
                                    <button className="btn-plan btn-plan-free" onClick={openModals.login}>
                                        <i className="fas fa-user-plus"></i> Começar Grátis
                                    </button>
                                </div>

                                <div className="plan-card featured">
                                    <div className="plan-badge gold"><i className="fas fa-crown"></i> Recomendado</div>
                                    <h4>Visibilidade Ouro</h4>
                                    <div className="plan-price">
                                        <span className="price-currency">R$</span>
                                        <span className="price-value">149</span>
                                        <span className="price-cents">,90</span>
                                        <span className="price-period">/mês</span>
                                    </div>
                                    <p className="plan-description">Maximize sua exposição e conquiste mais clientes com benefícios exclusivos.</p>
                                    <ul className="plan-features">
                                        <li><i className="fas fa-star"></i> Destaque na aba "Recomendações do Mês"</li>
                                        <li><i className="fas fa-check-circle"></i> Selo de <strong>Profissional Verificado</strong></li>
                                        <li><i className="fas fa-percent"></i> Taxa de intermediação reduzida: <strong>apenas 10%</strong></li>
                                        <li><i className="fas fa-chart-line"></i> Relatórios de desempenho</li>
                                        <li><i className="fas fa-headset"></i> Suporte prioritário</li>
                                    </ul>
                                    <button className="btn-plan btn-plan-gold" onClick={openModals.login}>
                                        <i className="fas fa-rocket"></i> Assinar Agora
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Bloco Parceiros */}
                        <div className="plans-block">
                            <div className="plans-block-header institutional">
                                <i className="fas fa-handshake"></i>
                                <h3>Para Parceiros e Patrocinadores</h3>
                                <p>Foco Institucional e B2B</p>
                            </div>
                            <div className="plans-grid institutional-grid">
                                <div className="plan-card institutional-card">
                                    <div className="plan-icon-top"><i className="fas fa-graduation-cap"></i></div>
                                    <h4>Parceiro de Conteúdo</h4>
                                    <p className="plan-description">Para empresas e instituições que desejam lançar cursos, workshops e eventos na plataforma.</p>
                                    <ul className="plan-features">
                                        <li><i className="fas fa-check"></i> Publicação de cursos e eventos</li>
                                        <li><i className="fas fa-check"></i> Divisão de receita dos ingressos</li>
                                        <li><i className="fas fa-check"></i> Acesso ao painel de gestão</li>
                                        <li><i className="fas fa-check"></i> Relatórios de participação</li>
                                        <li><i className="fas fa-check"></i> Suporte dedicado</li>
                                    </ul>
                                    <a href="mailto:parcerias@wecorp.com?subject=Interesse%20-%20Parceiro%20de%20Conteúdo" className="btn-plan btn-plan-contact">
                                        <i className="fas fa-comments"></i> Falar com Consultor
                                    </a>
                                </div>

                                <div className="plan-card institutional-card master">
                                    <div className="plan-icon-top"><i className="fas fa-building"></i></div>
                                    <h4>Patrocinador Master</h4>
                                    <p className="plan-description">Para grandes empresas que buscam máxima visibilidade e acesso estratégico aos nossos eventos.</p>
                                    <ul className="plan-features">
                                        <li><i className="fas fa-star"></i> Logo nos banners e materiais</li>
                                        <li><i className="fas fa-star"></i> Estandes exclusivos em eventos</li>
                                        <li><i className="fas fa-star"></i> Acesso à lista de leads</li>
                                        <li><i className="fas fa-star"></i> Menção em comunicações oficiais</li>
                                        <li><i className="fas fa-star"></i> Relatórios de ROI e engajamento</li>
                                    </ul>
                                    <a href="mailto:parcerias@wecorp.com?subject=Interesse%20-%20Patrocinador%20Master" className="btn-plan btn-plan-master">
                                        <i className="fas fa-phone-alt"></i> Falar com Consultor
                                    </a>
                                </div>
                            </div>
                            <div className="institutional-note">
                                <i className="fas fa-info-circle"></i>
                                <p>Parcerias institucionais são personalizadas de acordo com as necessidades de cada empresa. Entre em contato para uma proposta sob medida.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── EVENTOS ── */}
                <section id="eventos" className="events-section">
                    <h2>Próximos Eventos &amp; Treinamentos</h2>

                    <div className="search-wrapper">
                        <div className="search-container" style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr', gap: '15px', alignItems: 'end' }}>
                            <div className="input-group-search">
                                <label>Pesquisar</label>
                                <input
                                    type="text"
                                    placeholder="Título, local ou parceiro..."
                                    className="search-input"
                                    value={filtroTexto}
                                    onChange={e => setFiltroTexto(e.target.value)}
                                />
                            </div>
                            <div className="input-group-search">
                                <label>Período (Início e Fim)</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input type="date" className="date-input" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} title="Data Inicial" />
                                    <input type="date" className="date-input" value={filtroDataFim}    onChange={e => setFiltroDataFim(e.target.value)}    title="Data Final" />
                                </div>
                            </div>
                            <div className="input-group-search">
                                <label>Categoria</label>
                                <select className="filter-select" value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
                                    <option value="all">Todas as Categorias</option>
                                    <option value="Startups e Inovação">Startups &amp; Inovação</option>
                                    <option value="Certificação">Certificações em Alta</option>
                                    <option value="Educação">Educação Digital</option>
                                    <option value="Tecnologia">Tecnologia</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Lista dinâmica de eventos — renderizada via .map, sem div#listaDeEventos vazia */}
                    <div className="events-list" id="listaDeEventos">
                        {eventosFiltrados.length === 0 ? (
                            <p style={{ textAlign: 'center', width: '100%', color: '#666', marginTop: '20px' }}>
                                Nenhum evento encontrado com estes filtros.
                            </p>
                        ) : (
                            eventosFiltrados.map(evento => (
                                <div key={evento.id} className="event-item">
                                    <div className="event-details">
                                        <span className="tag">{evento.categoria}</span>
                                        <h4>{evento.titulo}</h4>
                                        <p><strong>Local:</strong> {evento.local}</p>
                                        <p><strong>Data e Hora:</strong> {new Date(evento.data_evento).toLocaleDateString('pt-BR')} | {evento.horario}</p>
                                        <p><strong>Parceiro:</strong> {evento.parceiro}</p>
                                        <p><strong>Heads:</strong> {evento.heads}</p>
                                        <a
                                            href={`/evento-detalhes?id=${evento.id}`}
                                            className="btn-service"
                                            style={{ display: 'inline-flex', width: 'auto', marginTop: '15px', padding: '8px 20px', fontSize: '0.9rem' }}
                                        >
                                            Adquirir Ingresso <i className="fas fa-ticket-alt" style={{ marginLeft: '8px' }}></i>
                                        </a>
                                    </div>
                                    <img
                                        src={evento.imagem ? `/uploads/${evento.imagem}` : '/eventos.png'}
                                        alt="Imagem do Evento"
                                        className="event-img"
                                        style={{ objectFit: 'cover' }}
                                    />
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* ── PARCEIROS ── */}
                <section id="parceiros" className="partners-section">
                    <h2>Nossos Parceiros e Patrocinadores</h2>
                    <p>Conectando inovação com a busca e procura de novos serviços.</p>
                    <div className="partners-grid">
                        <div className="partner-card">
                            <h4>Hackers do Bem</h4>
                            <p>Cursos de Cibersegurança e formação de talentos na área de proteção de dados.</p>
                            <a href="https://site-externo.com" target="_blank" rel="noreferrer" className="partner-link">Acessar portal <i className="fas fa-external-link-alt"></i></a>
                        </div>
                        <div className="partner-card">
                            <h4>SENAI</h4>
                            <p>Formação profissionalizante, Indústria 4.0 e inovação tecnológica industrial.</p>
                            <a href="https://site-externo.com" target="_blank" rel="noreferrer" className="partner-link">Conheça os cursos <i className="fas fa-external-link-alt"></i></a>
                        </div>
                        <div className="partner-card">
                            <h4>Cisco Academy</h4>
                            <p>Treinamentos e certificações globais em redes e infraestrutura de TI.</p>
                            <a href="https://site-externo.com" target="_blank" rel="noreferrer" className="partner-link">Ver certificações <i className="fas fa-external-link-alt"></i></a>
                        </div>
                        <div className="partner-card">
                            <h4>Universidades Parceiras</h4>
                            <p>Centros de ensino públicos e privados promovendo pesquisa e iniciação científica.</p>
                            <a href="https://site-externo.com" target="_blank" rel="noreferrer" className="partner-link">Ver rede <i className="fas fa-external-link-alt"></i></a>
                        </div>
                    </div>
                </section>
            </main>

            {/*
             * NÃO re-renderiza os modais de login/cadastro aqui.
             * O componente <Modais /> global em App.jsx, alimentado pelo AuthContext,
             * já gerencia isLoginOpen / isRegisterOpen para todas as páginas.
             * Duplicar aqui criava dois sistemas de modal concorrentes com estados
             * separados, o que impedia o login de funcionar corretamente na Home.
             */}
        </>
    );
};

export default Home;