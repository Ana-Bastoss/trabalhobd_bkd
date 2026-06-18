import React, { createContext, useState, useEffect } from 'react';

// Criando o Contexto Global
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // ==========================================
    // ESTADOS GERAIS DE AUTENTICAÇÃO E MODAIS
    // ==========================================
    const [user, setUser] = useState(null);
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);

    // ==========================================
    // EFEITO: Checar se já existe alguém logado
    // ==========================================
    useEffect(() => {
        const storedUser = localStorage.getItem('usuarioLogado');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    // ==========================================
    // FUNÇÕES DE LOGIN E LOGOUT (Antigo auth.js)
    // ==========================================
    const login = async (email, senha) => {
        try {
            const resposta = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });
            
            const dados = await resposta.json();

            if (dados.sucesso) {
                setUser(dados.usuario);
                localStorage.setItem('usuarioLogado', JSON.stringify(dados.usuario));
                setIsLoginOpen(false); // Fecha o modal ao logar
                return { sucesso: true, usuario: dados.usuario };
            } else {
                return { sucesso: false, mensagem: dados.mensagem };
            }
        } catch (erro) {
            console.error("Erro no login:", erro);
            return { sucesso: false, mensagem: "Erro ao conectar com o servidor." };
        }
    };

    const logout = () => {
        if (window.confirm("Deseja sair da sua conta?")) {
            setUser(null);
            localStorage.removeItem('usuarioLogado');
            window.location.href = '/';
        }
    };

    // ==========================================
    // CONTROLE DOS MODAIS (Antigo main.js)
    // ==========================================
    const openModals = {
        login: () => {
            setIsRegisterOpen(false);
            setIsLoginOpen(true);
        },
        register: () => {
            setIsLoginOpen(false);
            setIsRegisterOpen(true);
        },
        closeAll: () => {
            setIsLoginOpen(false);
            setIsRegisterOpen(false);
        }
    };

    // Disponibiliza as variáveis e funções para todo o projeto
    return (
        <AuthContext.Provider value={{ user, login, logout, isLoginOpen, isRegisterOpen, openModals }}>
            {children}
        </AuthContext.Provider>
    );
};