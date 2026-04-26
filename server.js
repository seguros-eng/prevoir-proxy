const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 3000;

// ── CONFIGURAÇÃO PRÉVOIR ─────────────────────────────────────
const PREV_API_BASE = "https://www.prevoirparceiros.com/B2BPartnerAPI/api";
let prevToken = null, prevTokenExp = 0;

// ── CONFIGURAÇÃO ASISA ───────────────────────────────────────
const ASISA_TOKEN_URL = "https://arqispre.asisa.es/idserver/connect/token";
const ASISA_API_BASE = "https://ursaepre.asisa.es/ASISA/mediadoreswebapipt/api/";
const ASISA_CLIENT_ID = "PTG-SEP.Compeugroup";
const ASISA_CLIENT_SECRET = "3yd15-@x?qRyS-iH";
const ASISA_SCOPE = "PTG-PME.PortalMediadores";
const ASISA_SUB_KEY = "baf5e209eb9540608edeb1181cb79cd0";
let asisaToken = null, asisaTokenExp = 0;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── AUTENTICAÇÃO ASISA ───────────────────────────────────────
async function getAsisaToken() {
  if (asisaToken && Date.now() < asisaTokenExp) return asisaToken;
  const payload = `grant_type=client_credentials&client_id=${encodeURIComponent(ASISA_CLIENT_ID)}&client_secret=${encodeURIComponent(ASISA_CLIENT_SECRET)}&scope=${encodeURIComponent(ASISA_SCOPE)}`;
  const res = await axios.post(ASISA_TOKEN_URL, payload, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 15000
  });
  asisaToken = res.data.access_token;
  asisaTokenExp = Date.now() + (res.data.expires_in - 60) * 1000;
  return asisaToken;
}

// ── ROTA PRÉVOIR (já existente) ──────────────────────────────
app.post('/prev/auth', async (req, res) => {
  try {
    const { username, password } = req.body;
    const response = await axios.post(`${PREV_API_BASE}/account`, { username, password }, {
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      timeout: 20000
    });
    if (response.data.isValid && response.data.dados) {
      prevToken = response.data.dados;
      prevTokenExp = Date.now() + 50 * 60 * 1000;
      res.json({ isValid: true, dados: prevToken });
    } else {
      res.status(401).json({ isValid: false, Aviso: "Credenciais inválidas" });
    }
  } catch (err) {
    res.status(500).json({ isValid: false, Aviso: `Erro conexão: ${err.code || err.message}` });
  }
});

app.post('/prev/call', async (req, res) => {
  try {
    const { endpoint, method = 'GET', payload } = req.body;
    if (!prevToken || Date.now() > prevTokenExp) {
      return res.status(401).json({ isValid: false, Aviso: "Token Prévoir expirado" });
    }
    const options = {
      method: method.toUpperCase(),
      headers: {
        'Authorization': `Bearer ${prevToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 30000
    };
    if (payload && options.method === 'POST') options.data = payload;
    const response = await axios(`${PREV_API_BASE}${endpoint}`, options);
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const data = err.response?.data || { isValid: false, Aviso: `Erro: ${err.code || err.message}` };
    res.status(status).json(data);
  }
});

// ── ROTA ASISA (NOVA) ────────────────────────────────────────
app.post('/asisa/:endpoint', async (req, res) => {
  try {
    const { endpoint } = req.params;
    const token = await getAsisaToken();
    const { method = 'GET', body, headers: extraHeaders = {} } = req.body;

    const url = `${ASISA_API_BASE}${endpoint.replace(/^\//, '')}`;
    const options = {
      method: method.toUpperCase(),
      headers: {
        'Authorization': `Bearer ${token}`,
        'Ocp-Apim-Subscription-Key': ASISA_SUB_KEY,
        'Api-Version': 'V1',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...extraHeaders
      },
      timeout: 30000
    };
    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      options.data = body;
    }

    const response = await axios(url, options);
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const data = err.response?.data || { error: err.message };
    res.status(status).json(data);
  }
});

// ── HEALTH CHECK ─────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: "online", service: "Dual Proxy (Prévoir + ASISA)" }));

app.listen(PORT, () => console.log(`✅ Proxy rodando na porta ${PORT}`));
