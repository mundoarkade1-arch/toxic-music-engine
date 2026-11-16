import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../src/queue.js';

const T0 = new Date('2026-11-16T12:00:00Z');
const mais = (min) => new Date(T0.getTime() + min * 60000);

test('não duplica tarefa pendente igual', () => {
  const f = Q.filaVazia();
  const a = Q.adicionar(f, 'comparar-lista', 'brasil', T0);
  const b = Q.adicionar(f, 'comparar-lista', 'brasil', T0);
  assert.equal(a, b);
  assert.equal(f.tarefas.length, 1);
});
test('ids crescem', () => {
  const f = Q.filaVazia();
  Q.adicionar(f, 'x', '1', T0); const t2 = Q.adicionar(f, 'x', '2', T0);
  assert.equal(t2.id, 't-0002');
});
test('falha espera cada vez mais e para na 5ª', () => {
  const f = Q.filaVazia();
  const t = Q.adicionar(f, 'x', '1', T0);
  const esperas = [];
  for (let i = 0; i < 4; i++) {
    Q.falhar(t, 'boom', T0);
    assert.equal(t.estado, 'pendente');
    esperas.push((new Date(t.tentarApos) - T0) / 60000);
  }
  assert.deepEqual(esperas, [1, 5, 15, 60]);
  Q.falhar(t, 'boom', T0);
  assert.equal(t.estado, 'erro');
  assert.equal(t.tentativas, 5);
  assert.equal(Q.proxima(f, mais(10000)), null);
});
test('tarefa em espera só volta a rodar depois da hora', () => {
  const f = Q.filaVazia();
  const t = Q.adicionar(f, 'x', '1', T0);
  Q.falhar(t, 'boom', T0);
  assert.equal(Q.proxima(f, mais(0.5)), null);
  assert.equal(Q.proxima(f, mais(2)), t);
});
test('recuperar: "rodando" volta a pendente', () => {
  const f = Q.filaVazia();
  const t = Q.adicionar(f, 'x', '1', T0);
  Q.iniciar(t, T0);
  assert.equal(Q.recuperar(f, T0), 1);
  assert.equal(t.estado, 'pendente');
});
test('tentar de novo zera as tentativas', () => {
  const f = Q.filaVazia();
  const t = Q.adicionar(f, 'x', '1', T0);
  for (let i = 0; i < 5; i++) Q.falhar(t, 'e', T0);
  Q.tentarDeNovo(t, T0);
  assert.equal(t.estado, 'pendente'); assert.equal(t.tentativas, 0);
});
test('mensagem de erro é cortada em 300 letras', () => {
  const f = Q.filaVazia(); const t = Q.adicionar(f, 'x', '1', T0);
  Q.falhar(t, 'a'.repeat(1000), T0);
  assert.equal(t.ultimoErro.length, 300);
});
test('limparFeitas tira só feitas e canceladas', () => {
  const f = Q.filaVazia();
  const a = Q.adicionar(f, 'x', '1', T0); const b = Q.adicionar(f, 'x', '2', T0); const c = Q.adicionar(f, 'x', '3', T0); Q.adicionar(f, 'x', '4', T0);
  Q.concluir(a, T0); Q.cancelar(b, T0); Q.iniciar(c, T0);
  assert.equal(Q.limparFeitas(f), 2);
  assert.deepEqual(f.tarefas.map((t) => t.alvo), ['3', '4']);
});
