{\rtf1\ansi\ansicpg1252\cocoartf2870
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 const express = require('express');\
const axios = require('axios');\
const cors = require('cors');\
const app = express();\
\
const PORT = process.env.PORT || 3000;\
const API_BASE = "https://www.prevoirparceiros.com/B2BPartnerAPI/api";\
\
app.use(cors());\
app.use(express.json());\
\
let tokenCache = null;\
let tokenExpiresAt = 0;\
\
app.post('/auth', async (req, res) => \{\
  try \{\
    const \{ username, password \} = req.body;\
    if (!username || !password) return res.status(400).json(\{ error: "Credenciais obrigat\'f3rias" \});\
\
    const response = await axios.post(`$\{API_BASE\}/account`, \{ username, password \}, \{\
      headers: \{ 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' \},\
      timeout: 20000\
    \});\
\
    if (response.data.isValid && response.data.dados) \{\
      tokenCache = response.data.dados;\
      tokenExpiresAt = Date.now() + 50 * 60 * 1000;\
      res.json(\{ isValid: true, dados: tokenCache \});\
    \} else \{\
      res.status(401).json(\{ isValid: false, Aviso: "Credenciais inv\'e1lidas" \});\
    \}\
  \} catch (err) \{\
    res.status(500).json(\{ isValid: false, Aviso: "Erro conex\'e3o: " + (err.code || err.message) \});\
  \}\
\});\
\
app.post('/call', async (req, res) => \{\
  try \{\
    const \{ endpoint, method = 'GET', payload \} = req.body;\
    if (!endpoint) return res.status(400).json(\{ error: "Endpoint obrigat\'f3rio" \});\
\
    if (!tokenCache || Date.now() > tokenExpiresAt) \{\
      return res.status(401).json(\{ isValid: false, Aviso: "Token expirado" \});\
    \}\
\
    const options = \{\
      method: method.toUpperCase(),\
      headers: \{\
        'Authorization': 'Bearer ' + tokenCache,\
        'Content-Type': 'application/json',\
        'Accept': 'application/json',\
        'User-Agent': 'Mozilla/5.0'\
      \},\
      timeout: 30000\
    \};\
    if (payload && options.method === 'POST') options.data = payload;\
\
    const response = await axios(API_BASE + endpoint, options);\
    res.json(response.data);\
  \} catch (err) \{\
    const status = err.response?.status || 500;\
    const data = err.response?.data || \{ isValid: false, Aviso: "Erro: " + (err.code || err.message) \};\
    res.status(status).json(data);\
  \}\
\});\
\
app.get('/', (req, res) => res.json(\{ status: "online", service: "Prevoir Proxy" \}));\
\
app.listen(PORT, () => console.log("Proxy rodando na porta " + PORT));}