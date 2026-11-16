import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { gerarPkce, urlAutorizacao, lerCliente, criarProvedorDeToken, entrar, desconectar, ESCOPOS } from '../src/google-auth.js';
import { enviarParaDrive } from '../src/enviar.js';

const CLIENTE = { installed: { client_id: 'CID.apps.googleusercontent.com', client_secret: 'SEGREDO' } };
async function pasta(cliente = CLIENTE) {
  const d = await mkdtemp(join(tmpdir(), 'toxic-g-'));
  if (cliente) await writeFile(join(d, 'google-cliente.json'), JSON.stringify(cliente));
  return d;
}
const json = (obj, ok = true, status = 200) => ({ ok, status, json: async () => obj });

test('PKCE: o desafio é o SHA-256 do verificador', () => {
  const { verifier, challenge } = gerarPkce();
  assert.equal(challenge, createHash('sha256').update(verifier).digest('base64url'));
  assert.ok(verifier.length >= 43);
});

test('link de login: S256, acesso permanente e só os 2 escopos de Drive', () => {
  const u = new URL(urlAutorizacao({ clientId: 'C', redirect: 'http://127.0.0.1:1', challenge: 'X', state: 'S' }));
  assert.equal(u.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(u.searchParams.get('access_type'), 'offline');
  assert.equal(u.searchParams.get('scope'), ESCOPOS.join(' '));
  assert.deepEqual(ESCOPOS, ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/drive.file']);
});

test('lê o arquivo do cliente (installed ou web) e reclama se faltar', async () => {
  assert.equal((await lerCliente(await pasta())).clientId, 'CID.apps.googleusercontent.com');
  assert.equal((await lerCliente(await pasta({ web: CLIENTE.installed }))).clientSecret, 'SEGREDO');
  await assert.rejects(lerCliente(await pasta(null)), /Não achei/);
  await assert.rejects(lerCliente(await pasta({ installed: {} })), /Aplicativo para computador/);
});

test('token: sem login pede entrar-google; renova e guarda em memória', async () => {
  const d = await pasta();
  await assert.rejects(criarProvedorDeToken(d, async () => json({}))(), /entrar-google/);
  await writeFile(join(d, 'google-token.json'), JSON.stringify({ refresh_token: 'RT' }));
  let pedidos = 0; let corpo;
  const f = async (url, o) => { pedidos++; corpo = new URLSearchParams(o.body); return json({ access_token: 'AT' + pedidos, expires_in: 3600 }); };
  let agora = 0; const tok = criarProvedorDeToken(d, f, () => agora);
  assert.equal(await tok(), 'AT1'); assert.equal(await tok(), 'AT1');
  assert.equal(pedidos, 1);
  assert.equal(corpo.get('grant_type'), 'refresh_token'); assert.equal(corpo.get('refresh_token'), 'RT');
  agora = 3600 * 1000; // passou da validade
  assert.equal(await tok(), 'AT2');
});

test('token expirado (invalid_grant) explica o que fazer, sem vazar segredo', async () => {
  const d = await pasta(); await writeFile(join(d, 'google-token.json'), JSON.stringify({ refresh_token: 'RT-SECRETO' }));
  const f = async () => json({ error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }, false, 400);
  await assert.rejects(criarProvedorDeToken(d, f)(), (e) => /expirou/.test(e.message) && !/RT-SECRETO|SEGREDO/.test(e.message));
});

test('login completo: porta local recebe o código e o token fica salvo', async () => {
  const d = await pasta(); let troca;
  const f = async (url, o) => { troca = new URLSearchParams(o.body); return json({ access_token: 'AT', refresh_token: 'RT-NOVO', expires_in: 3600 }); };
  await entrar(d, { fetchFn: f, tempoMs: 5000, mostrar: (link) => {
    const u = new URL(link);
    const ret = new URL(u.searchParams.get('redirect_uri'));
    ret.searchParams.set('code', 'CODIGO'); ret.searchParams.set('state', u.searchParams.get('state'));
    fetch(ret).catch(() => {}); // o "navegador" volta para a porta local
  } });
  assert.equal(troca.get('code'), 'CODIGO');
  assert.ok(troca.get('code_verifier'));
  assert.equal(JSON.parse(await readFile(join(d, 'google-token.json'), 'utf8')).refresh_token, 'RT-NOVO');
});

test('login com "state" errado é recusado e nada é salvo', async () => {
  const d = await pasta();
  await assert.rejects(entrar(d, { fetchFn: async () => json({}), tempoMs: 5000, mostrar: (link) => {
    const ret = new URL(new URL(link).searchParams.get('redirect_uri'));
    ret.searchParams.set('code', 'X'); ret.searchParams.set('state', 'ERRADO'); fetch(ret).catch(() => {});
  } }), /não confere/);
  await assert.rejects(access(join(d, 'google-token.json')));
});

test('login que passa do tempo desiste', async () => {
  await assert.rejects(entrar(await pasta(), { fetchFn: async () => json({}), tempoMs: 50, mostrar: () => {} }), /Passou o tempo/);
});

test('desconectar revoga e apaga o token', async () => {
  const d = await pasta(); await writeFile(join(d, 'google-token.json'), JSON.stringify({ refresh_token: 'RT' }));
  let url; assert.equal(await desconectar(d, async (u) => { url = u; return json({}); }), true);
  assert.match(url, /revoke\?token=RT/);
  await assert.rejects(access(join(d, 'google-token.json')));
  assert.equal(await desconectar(d, async () => json({})), false);
});

test('enviar: manda só os arquivos que existem', async () => {
  const d = await mkdtemp(join(tmpdir(), 'toxic-e-'));
  await writeFile(join(d, 'engine-status.json'), '{"a":1}'); await writeFile(join(d, 'pendentes.json'), '{"b":2}');
  const gravados = []; const drive = { pasta: async (n) => 'PASTA-' + n, gravarJson: async (p, nome) => gravados.push([p, nome]) };
  assert.deepEqual(await enviarParaDrive(drive, d), ['engine-status.json', 'pendentes.json']);
  assert.deepEqual(gravados[0], ['PASTA-Toxic Engine', 'engine-status.json']);
});
