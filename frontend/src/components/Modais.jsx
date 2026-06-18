import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import '../assets/style.css'; // Mantém o estilo original

const Modais = () => {
    // 1. Puxa as variáveis de inteligência do Contexto
    const { isLoginOpen, isRegisterOpen, openModals, login } = useContext(AuthContext);

    // Estados locais para os inputs de login
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');

    // Função para lidar com o envio do formulário de login
    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        const resultado = await login(email, senha);
        if (!resultado.sucesso) {
            alert(resultado.mensagem);
        }
    };

    // 2. Se nenhum modal estiver aberto, não renderiza nada na tela (deixa o site leve)
    if (!isLoginOpen && !isRegisterOpen) return null;

    // 3. Renderiza o HTML (JSX) do modal que estiver ativo
    return (
        <>
            {/* MODAL DE LOGIN */}
            {isLoginOpen && (
                <div id="loginModal" className="modal-overlay active" onClick={(e) => { if (e.target.id === 'loginModal') openModals.closeAll(); }}>
                    <div className="login-container">
                        <button className="close-modal" onClick={openModals.closeAll}>
                            <i className="fas fa-times"></i>
                        </button>
                        <div className="login-art">
                            <img src="/login.png" alt="Arte WE Corp" className="login-bg-image" />
                        </div>
                        <div className="login-form-box">
                            <h2>Login</h2>
                            <form id="formLogin" onSubmit={handleLoginSubmit}>
                                <div className="input-group">
                                    <label>E-mail</label>
                                    <input 
                                        type="email" 
                                        placeholder="Digite seu e-mail" 
                                        required 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Senha</label>
                                    <input 
                                        type="password" 
                                        placeholder="Digite sua senha" 
                                        required 
                                        value={senha}
                                        onChange={(e) => setSenha(e.target.value)}
                                    />
                                </div>
                                <a href="#" className="forgot-pass">Esqueci minha senha</a>
                                <button type="submit" className="btn-submit">Acessar</button>
                            </form>
                            <div className="register-link">
                                <p>Ainda não possui uma conta?</p>
                                <button type="button" className="btn-register" onClick={openModals.register}>
                                    Criar conta
                                </button>
                            </div>
                            <div className="social-login">
                                <a href="#"><i className="fab fa-facebook social-icon-fb"></i></a>
                                <a href="#"><i className="fab fa-google social-icon-g"></i></a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE CADASTRO */}
            {isRegisterOpen && (
                <div id="registerModal" className="modal-overlay active" onClick={(e) => { if (e.target.id === 'registerModal') openModals.closeAll(); }}>
                    <div className="login-container">
                        <button className="close-modal" onClick={openModals.closeAll}>
                            <i className="fas fa-times"></i>
                        </button>
                        <div className="login-art">
                            <img src="/login.png" alt="Arte WE Corp" className="login-bg-image" />
                        </div>
                        <div className="login-form-box">
                            <h2>Criar Conta</h2>
                            <form>
                                <div className="input-group">
                                    <label>Nome Completo</label>
                                    <input type="text" placeholder="Digite seu nome" required />
                                </div>
                                <div className="input-group">
                                    <label>E-mail</label>
                                    <input type="email" placeholder="Digite seu e-mail" required />
                                </div>
                                <div className="input-group">
                                    <label>Senha</label>
                                    <input type="password" placeholder="Crie uma senha" required />
                                </div>
                                <button type="submit" className="btn-submit" style={{ marginTop: '15px' }}>
                                    Cadastrar
                                </button>
                            </form>
                            <div className="register-link">
                                <p>Já possui uma conta?</p>
                                <button type="button" className="btn-register" onClick={openModals.login}>
                                    Fazer Login
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Modais;