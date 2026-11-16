import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DriveClient } from '../src/drive.js';

// Drive de mentira: guarda arquivos na memória e responde como a API do Google.
function drivefalso({ paginas = 1000, falhas = [] } = {}) {
  const arquivos = []; let n = 0; const chamadas = []; const fila = [...falhas];
  const fetchFn = async (url, opc = {}) => {
    chamadas.push({ url: String(url), metodo: opc.method ?? 'GET', corpo: opc.body, auth: opc.headers?.Authorization });
    if (fila.length) { const st = fila.shift(); return { ok: false, status: st, json: async () => ({}) }; }
    const u = new URL(url);
    const resp = (obj) => ({ ok: true, status: 200, json: async () => obj });
    if (u.pathname === '/drive/v3/files' && (opc.method ?? 'GET') === 'GET') {
      const q = u.searchParams.get('q');
      let lista = arquivos.filter((f) => !f.lixeira);
      const nome = q.match(/name='((?:[^'\\]|\\.)*)'/)?.[1]?.replace(/\\(.)/g, '$1');
      if (nome) lista = lista.filter((f) => f.name === nome);
      if (q.includes("mimeType='application/vnd.google-apps.folder'")) lista = lista.filter((f) => f.mimeType === 'application/vnd.google-apps.folder');
      else if (q.includes("contains 'audio/'")) lista = lista.filter((f) => f.mimeType.startsWith('audio/') || f.mimeType === 'application/octet-stream');
      const pai = q.match(/'([^']+)' in parents/)?.[1];
      if (pai && pai !== 'root') lista = lista.filter((f) => f.parents?.[0] === pai);
      const ini = Number(u.searchParams.get('pageToken') || 0);
      const fatia = lista.slice(ini, ini + paginas);
      return resp({ files: fatia, nextPageToken: ini + paginas < lista.length ? String(ini + paginas) : undefined });
    }
    if (u.pathname === '/drive/v3/files' && opc.method === 'POST') {
      const m = JSON.parse(opc.body); const f = { id: 'p' + ++n, ...m }; arquivos.push(f); return resp({ id: f.id });
    }
    if (u.pathname.startsWith('/upload/drive/v3/files')) {
      const meta = JSON.parse(opc.body.split('\r\n\r\n')[1].split('\r\n')[0]);
      const conteudo = JSON.parse(opc.body.split('\r\n\r\n')[2].split('\r\n--')[0]);
      if (opc.method === 'PATCH') { const id = u.pathname.split('/').pop(); const f = arquivos.find((x) => x.id === id); f.conteudo = conteudo; return resp({ id }); }
      const f = { id: 'a' + ++n, mimeType: 'application/json', ...meta, conteudo }; arquivos.push(f); return resp({ id: f.id });
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  return { fetchFn, arquivos, chamadas };
}
const cliente = (d, extra = {}) => new DriveClient({ token: async () => 'TOKEN', fetchFn: d.fetchFn, esperar: async () => {}, ...extra });

test('lista todas as páginas', async () => {
  const d = drivefalso({ paginas: 2 });
  for (let i = 0; i < 5; i++) d.arquivos.push({ id: 'x' + i, name: `A - M${i}.mp3`, mimeType: 'audio/mpeg', parents: [] });
  const r = await cliente(d).listar("(mimeType contains 'audio/') and trashed=false", 'id,name');
  assert.equal(r.length, 5);
  assert.ok(d.chamadas.every((c) => c.auth === 'Bearer TOKEN'));
});

test('lê biblioteca: caminho de pastas, só áudio, artista e título do nome', async () => {
  const d = drivefalso();
  d.arquivos.push({ id: 'F1', name: 'Músicas do Site', mimeType: 'application/vnd.google-apps.folder', parents: ['root'] });
  d.arquivos.push({ id: 'F2', name: 'Sertanejo', mimeType: 'application/vnd.google-apps.folder', parents: ['F1'] });
  d.arquivos.push({ id: 'm1', name: 'Recairei - Henrique e Juliano.mp3', mimeType: 'audio/mpeg', parents: ['F2'] });
  d.arquivos.push({ id: 'm2', name: 'Solta - Fulano.mp3', mimeType: 'application/octet-stream', parents: ['F1'] });
  d.arquivos.push({ id: 'x1', name: 'planilha.xlsx', mimeType: 'application/octet-stream', parents: ['F1'] });
  const bib = await cliente(d).lerBiblioteca();
  assert.equal(bib.faixas.length, 2);
  const r = bib.faixas.find((f) => f.id === 'm1');
  assert.deepEqual([r.p, r.a, r.t, r.fn], ['Músicas do Site/Sertanejo', 'Henrique e Juliano', 'Recairei', 'Recairei - Henrique e Juliano.mp3']);
  assert.equal(bib.faixas.find((f) => f.id === 'm2').p, 'Músicas do Site');
});

test('tenta de novo em 429 e 503, depois dá certo', async () => {
  const d = drivefalso({ falhas: [429, 503] });
  const esperas = [];
  const r = await cliente(d, { esperar: async (ms) => esperas.push(ms) }).listar('trashed=false', 'id');
  assert.deepEqual(r, []);
  assert.deepEqual(esperas, [1000, 2000]);
});

test('desiste depois de várias falhas e explica em português', async () => {
  const d = drivefalso({ falhas: [500, 500, 500, 500, 500] });
  await assert.rejects(cliente(d).listar('x', 'id'), /erro 500/);
});

test('401 e 403 têm mensagem clara e não repetem', async () => {
  await assert.rejects(cliente(drivefalso({ falhas: [401] })).listar('x', 'id'), /entrar-google/);
  const d = drivefalso({ falhas: [403] });
  await assert.rejects(cliente(d).listar('x', 'id'), /403/);
  assert.equal(d.chamadas.length, 1);
});

test('pasta: acha a existente ou cria uma só vez', async () => {
  const d = drivefalso(); const c = cliente(d);
  const a = await c.pasta('Toxic Engine'); const b = await c.pasta('Toxic Engine');
  assert.equal(a, b);
  assert.equal(d.arquivos.filter((f) => f.name === 'Toxic Engine').length, 1);
});

test('gravarJson cria e depois ATUALIZA o mesmo arquivo (sem duplicar)', async () => {
  const d = drivefalso(); const c = cliente(d);
  const pasta = await c.pasta('Toxic Engine');
  const id1 = await c.gravarJson(pasta, 'engine-status.json', { v: 1 });
  const id2 = await c.gravarJson(pasta, 'engine-status.json', { v: 2 });
  assert.equal(id1, id2);
  assert.equal(d.arquivos.filter((f) => f.name === 'engine-status.json').length, 1);
  assert.deepEqual(d.arquivos.find((f) => f.id === id1).conteudo, { v: 2 });
  assert.deepEqual(d.arquivos.find((f) => f.id === id1).parents, [pasta]);
});

test('nome com aspas não quebra a busca', async () => {
  const d = drivefalso(); const c = cliente(d);
  const pasta = await c.pasta("Rock 'n' Roll");
  assert.ok(pasta);
  assert.ok(d.chamadas.some((x) => (new URL(x.url).searchParams.get('q') ?? '').includes("name='Rock \\'n\\' Roll'")));
});
