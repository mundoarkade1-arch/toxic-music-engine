import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lerChartsTexto } from '../src/charts.js';
import { compararLista, juntarPendentes } from '../src/pendentes.js';
import { bibliotecaDeFaixas } from '../src/library.js';
import { executar } from '../src/runner.js';
import { gravarJson, lerJson } from '../src/store.js';
import * as Q from '../src/queue.js';

const CHARTS = {
  atualizado: '2026-11-15T00:00:00Z',
  listas: {
    brasil: { nome: 'Top 200 Brasil', faixas: [
      { id: 1, t: 'Recairei', a: 'Henrique & Juliano' }, { id: 2, t: 'Nova Música', a: 'Fulana' }, { id: 3, t: 'Outra', a: 'Beltrano' } ] },
    sertanejo: { nome: 'Sertanejo em alta', faixas: [
      { id: 2, t: 'Nova Música (feat. X)', a: 'Fulana' }, { id: 4, t: 'Mais Uma', a: 'Ciclano' } ] },
  },
};
const TEXTO = 'window.CHARTS=' + JSON.stringify(CHARTS) + ';';
const BIB = bibliotecaDeFaixas([{ fn: 'r.mp3', p: '', t: 'Recairei', a: 'Henrique e Juliano' }]);

test('lê charts.js com window.CHARTS e ponto e vírgula', () => {
  assert.equal(Object.keys(lerChartsTexto(TEXTO).listas).length, 2);
  assert.throws(() => lerChartsTexto('window.CHARTS={"a":1};'));
});

test('compara lista: o que já tem não é pendente', () => {
  const r = compararLista('brasil', CHARTS, BIB);
  assert.equal(r.jaTem, 1); assert.equal(r.itens.length, 2);
  assert.equal(r.itens[0].posicao, 2);
  assert.throws(() => compararLista('nao-existe', CHARTS, BIB));
});

test('junta pendentes sem repetir (fica a melhor posição)', () => {
  const a = compararLista('brasil', CHARTS, BIB).itens;
  const b = compararLista('sertanejo', CHARTS, BIB).itens;
  const j = juntarPendentes([a, b]);
  assert.equal(j.itens.length, 3);
  const nova = j.itens.find((x) => x.chave === 'fulana|nova musica');
  assert.equal(nova.posicao, 1); // a posição 1 vinha do sertanejo (índice 0)
  assert.equal(j.formato, 'toxic-engine-pendentes');
});

async function preparar() {
  const dados = await mkdtemp(join(tmpdir(), 'toxic-dados-'));
  const charts = join(dados, 'charts.js'); const biblioteca = join(dados, 'biblioteca.json');
  await writeFile(charts, TEXTO); await gravarJson(biblioteca, BIB);
  return { dados, charts, biblioteca };
}

test('executar: roda a fila, grava arquivos e status', async () => {
  const cfg = await preparar();
  const fila = Q.filaVazia();
  Q.adicionar(fila, 'comparar-lista', 'brasil'); Q.adicionar(fila, 'comparar-lista', 'sertanejo');
  Q.adicionar(fila, 'achar-duplicadas', 'biblioteca'); Q.adicionar(fila, 'gerar-playlists', 'artistas');
  await gravarJson(join(cfg.dados, 'fila.json'), fila);
  const r = await executar(cfg);
  assert.equal(r.feitas, 4); assert.equal(r.falhas, 0);
  const st = await lerJson(join(cfg.dados, 'engine-status.json'));
  assert.equal(st.formato, 'toxic-engine-status');
  assert.equal(st.contagem.pendentes, 3); assert.equal(st.contagem.naFila, 0);
  const pend = await lerJson(join(cfg.dados, 'pendentes.json'));
  assert.equal(pend.itens.length, 3);
  const pl = await lerJson(join(cfg.dados, 'playlists-motor.json'));
  assert.equal(pl.formato, 'toxic-playlists'); assert.equal(pl.v, 2);
});

test('executar: tarefa que falha vai para espera e as outras continuam', async () => {
  const cfg = await preparar();
  const fila = Q.filaVazia();
  Q.adicionar(fila, 'comparar-lista', 'lista-que-nao-existe'); Q.adicionar(fila, 'achar-duplicadas', 'biblioteca');
  await gravarJson(join(cfg.dados, 'fila.json'), fila);
  const agora = new Date('2026-11-16T12:00:00Z');
  const r = await executar(cfg, { agora });
  assert.equal(r.feitas, 1); assert.equal(r.falhas, 1);
  assert.equal(r.status.motor.estado, 'erro');
  const f = await lerJson(join(cfg.dados, 'fila.json'));
  const ruim = f.tarefas.find((t) => t.alvo === 'lista-que-nao-existe');
  assert.equal(ruim.estado, 'pendente'); assert.equal(ruim.tentativas, 1);
  assert.ok(ruim.tentarApos > agora.toISOString());
});

test('executar: depois de queda no meio, tarefa "rodando" é retomada', async () => {
  const cfg = await preparar();
  const fila = Q.filaVazia();
  const t = Q.adicionar(fila, 'achar-duplicadas', 'biblioteca'); Q.iniciar(t);
  await gravarJson(join(cfg.dados, 'fila.json'), fila);
  const r = await executar(cfg);
  assert.equal(r.feitas, 1);
});

test('executar: sem biblioteca dá erro claro em português', async () => {
  const dados = await mkdtemp(join(tmpdir(), 'toxic-dados-'));
  await assert.rejects(executar({ dados, charts: join(dados, 'c.js'), biblioteca: join(dados, 'b.json') }), /Não achei a biblioteca/);
});

test('gravação segura não deixa arquivo .tmp para trás', async () => {
  const dados = await mkdtemp(join(tmpdir(), 'toxic-dados-'));
  await gravarJson(join(dados, 'x.json'), { a: 1 });
  assert.equal(JSON.parse(await readFile(join(dados, 'x.json'), 'utf8')).a, 1);
  await assert.rejects(readFile(join(dados, 'x.json.tmp')));
});
