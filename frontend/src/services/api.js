async function request(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.mensagem || `HTTP ${res.status}`);
  return data;
}

const json = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

export const api = {
  login: (email, senha) => request('/api/login', json('POST', { email, senha })),

  listarEventos: () => request('/api/eventos'),
  buscarEvento: (id) => request(`/api/eventos/${id}`),
  salvarEvento: (formData, id = null) =>
    request(id ? `/api/eventos/${id}` : '/api/eventos', { method: id ? 'PUT' : 'POST', body: formData }),
  mudarStatusEvento: (id, status) => request(`/api/eventos/${id}/status`, json('PUT', { status })),
  excluirEvento: (id) => request(`/api/eventos/${id}`, { method: 'DELETE' }),

  listarParceiros: () => request('/api/parceiros'),
  salvarParceiro: (dados, id = null) =>
    request(id ? `/api/parceiros/${id}` : '/api/parceiros', json(id ? 'PUT' : 'POST', dados)),
  excluirParceiro: (id) => request(`/api/parceiros/${id}`, { method: 'DELETE' }),

  listarPrestadores: () => request('/api/prestadores'),
  salvarPrestador: (dados, id = null) =>
    request(id ? `/api/prestadores/${id}` : '/api/prestadores', json(id ? 'PUT' : 'POST', dados)),
  excluirPrestador: (id) => request(`/api/prestadores/${id}`, { method: 'DELETE' }),

  listarServicos: () => request('/api/servicos'),
  buscarServico: (id) => request(`/api/servicos/${id}`),
  salvarServico: (formData, id = null) =>
    request(id ? `/api/servicos/${id}` : '/api/servicos', { method: id ? 'PUT' : 'POST', body: formData }),
  mudarStatusServico: (id, status) => request(`/api/servicos/${id}/status`, json('PUT', { status })),
  excluirServico: (id) => request(`/api/servicos/${id}`, { method: 'DELETE' }),

  comprarIngresso: (dados) => request('/api/comprar', json('POST', dados))
};