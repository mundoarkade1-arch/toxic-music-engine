import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baixarCharts } from '../src/charts.js';

const TEXTO = 'window.CHARTS=' + JSON.stringify({ atualizado: 'x', listas: { a: { nome: 'A', faixas: [] } } }) + ';';

test('baixa e confere o charts.js antes de entregar', async () => {
  const texto = await baixarCharts('http://x', async () => ({ ok: true, status: 200, text: async () => TEXTO }));
  assert.equal(texto, TEXTO);
});
test('erro de rede/repositório privado dá mensagem clara', async () => {
  await assert.rejects(baixarCharts('http://x', async () => ({ ok: false, status: 404 })), /erro 404.*privado/);
});
test('arquivo estragado não é gravado', async () => {
  await assert.rejects(baixarCharts('http://x', async () => ({ ok: true, status: 200, text: async () => '<html>oops</html>' })));
});
