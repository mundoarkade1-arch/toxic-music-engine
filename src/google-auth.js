// Login do motor no Google (aplicativo de computador: porta local + PKCE). Nada de senha passa por aqui.
// O usuário baixa o arquivo do cliente no Google Cloud e salva em dados/google-cliente.json (fora do GitHub).
// O "token de renovação" fica em dados/google-token.json, só neste PC. `desconectar` apaga e revoga.
import { createServer } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { join } from 'node:path';
import { readFile, writeFile, rm, mkdir } from 'node:fs/promises';

export const ESCOPOS = [
  'https://www.googleapis.com/auth/drive.readonly', // ler a biblioteca
  'https://www.googleapis.com/auth/drive.file',     // gravar só os arquivos que o próprio motor cria
];
const URL_AUTORIZAR = 'https://accounts.google.com/o/oauth2/v2/auth';
const URL_TOKEN = 'https://oauth2.googleapis.com/token';
const URL_REVOGAR = 'https://oauth2.googleapis.com/revoke';

export class ErroGoogle extends Error {}

export async function lerCliente(dados) {
  const caminho = join(dados, 'google-cliente.json');
  let texto;
  try { texto = await readFile(caminho, 'utf8'); }
  catch { throw new ErroGoogle(`Não achei ${caminho}. Salve ali o arquivo que você baixou do Google Cloud.`); }
  let obj;
  try { obj = JSON.parse(texto); } catch { throw new ErroGoogle('O arquivo google-cliente.json não é um JSON válido.'); }
  const c = obj.installed ?? obj.web;
  if (!c?.client_id || !c?.client_secret) {
    throw new ErroGoogle('O google-cliente.json não tem client_id e client_secret. Crie o cliente do tipo "Aplicativo para computador".');
  }
  return { clientId: c.client_id, clientSecret: c.client_secret };
}

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function gerarPkce() {
  const verifier = b64url(randomBytes(48));
  return { verifier, challenge: b64url(createHash('sha256').update(verifier).digest()) };
}

export function urlAutorizacao({ clientId, redirect, challenge, state }) {
  const p = new URLSearchParams({
    client_id: clientId, redirect_uri: redirect, response_type: 'code', scope: ESCOPOS.join(' '),
    code_challenge: challenge, code_challenge_method: 'S256', access_type: 'offline', prompt: 'consent', state,
  });
  return `${URL_AUTORIZAR}?${p}`;
}

async function pedirToken(corpo, fetchFn) {
  const r = await fetchFn(URL_TOKEN, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(corpo).toString(),
  });
  let j = {};
  try { j = await r.json(); } catch { /* resposta sem JSON */ }
  if (!r.ok) {
    if (j.error === 'invalid_grant') throw new ErroGoogle('O acesso do motor ao Google expirou ou foi cancelado. Dê dois cliques em 1-entrar-google.bat');
    // só o código do erro: nunca repete token nem segredo na mensagem
    throw new ErroGoogle(`O Google recusou o pedido (${String(j.error ?? r.status).slice(0, 60)}).`);
  }
  return j;
}

const arqToken = (dados) => join(dados, 'google-token.json');

/** Devolve uma função que entrega um token de acesso válido (renova sozinha, guarda só em memória). */
export function criarProvedorDeToken(dados, fetchFn = fetch, relogio = () => Date.now()) {
  let cache = null;
  return async function token() {
    if (cache && cache.expira > relogio() + 60_000) return cache.valor;
    let salvo;
    try { salvo = JSON.parse(await readFile(arqToken(dados), 'utf8')); }
    catch { throw new ErroGoogle('O motor ainda não está conectado ao Google. Dê dois cliques em 1-entrar-google.bat'); }
    const c = await lerCliente(dados);
    const j = await pedirToken({ client_id: c.clientId, client_secret: c.clientSecret, refresh_token: salvo.refresh_token, grant_type: 'refresh_token' }, fetchFn);
    cache = { valor: j.access_token, expira: relogio() + (Number(j.expires_in) || 3000) * 1000 };
    return cache.valor;
  };
}

/** Login: abre uma porta local só para receber a resposta do Google. `mostrar` recebe o link para o usuário abrir. */
export async function entrar(dados, { fetchFn = fetch, mostrar = console.log, tempoMs = 5 * 60_000 } = {}) {
  const c = await lerCliente(dados);
  const { verifier, challenge } = gerarPkce();
  const state = b64url(randomBytes(16));
  const servidor = createServer();
  await new Promise((ok, erro) => { servidor.once('error', erro); servidor.listen(0, '127.0.0.1', ok); });
  const redirect = `http://127.0.0.1:${servidor.address().port}`;
  try {
    const code = await new Promise((ok, erro) => {
      const timer = setTimeout(() => erro(new ErroGoogle('Passou o tempo e o login não terminou. Tente de novo.')), tempoMs);
      servidor.on('request', (req, res) => {
        const u = new URL(req.url, redirect);
        const recebido = u.searchParams.get('code');
        const err = u.searchParams.get('error');
        if (!recebido && !err) { res.writeHead(404).end(); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<p>Pode fechar esta janela e voltar para o motor.</p>');
        clearTimeout(timer);
        if (u.searchParams.get('state') !== state) erro(new ErroGoogle('Resposta do Google não confere. Tente de novo.'));
        else if (err) erro(new ErroGoogle(`O Google não liberou o acesso (${err.slice(0, 60)}).`));
        else ok(recebido);
      });
      mostrar(urlAutorizacao({ clientId: c.clientId, redirect, challenge, state }));
    });
    const j = await pedirToken({
      code, client_id: c.clientId, client_secret: c.clientSecret, redirect_uri: redirect,
      grant_type: 'authorization_code', code_verifier: verifier,
    }, fetchFn);
    if (!j.refresh_token) throw new ErroGoogle('O Google não devolveu o acesso permanente. Tente de novo.');
    await mkdir(dados, { recursive: true });
    await writeFile(arqToken(dados), JSON.stringify({ refresh_token: j.refresh_token, escopos: ESCOPOS, criado: new Date().toISOString() }), { encoding: 'utf8', mode: 0o600 });
  } finally {
    servidor.close();
  }
}

export async function desconectar(dados, fetchFn = fetch) {
  let salvo = null;
  try { salvo = JSON.parse(await readFile(arqToken(dados), 'utf8')); } catch { return false; }
  try { await fetchFn(`${URL_REVOGAR}?token=${encodeURIComponent(salvo.refresh_token)}`, { method: 'POST' }); } catch { /* sem internet: apaga mesmo assim */ }
  await rm(arqToken(dados), { force: true });
  return true;
}
