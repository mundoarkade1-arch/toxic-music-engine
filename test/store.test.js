import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gravarJson, lerJson } from '../src/store.js';

const semEspera = async () => {};
const erro = (codigo) => Object.assign(new Error(`${codigo} de mentira`), { code: codigo });

test('arquivo ocupado (EPERM): tenta de novo e acaba salvando', async () => {
  const d = await mkdtemp(join(tmpdir(), 'toxic-store-'));
  const arq = join(d, 'a.json');
  let chamadas = 0;
  const renomear = async (de, para) => {
    chamadas++;
    if (chamadas <= 3) throw erro('EPERM');
    return rename(de, para);
  };
  await gravarJson(arq, { ok: 1 }, { esperar: semEspera, renomear });
  assert.equal(chamadas, 4);
  assert.deepEqual(await lerJson(arq, null), { ok: 1 });
  assert.deepEqual(await readdir(d), ['a.json']); // sem .tmp sobrando
});

test('arquivo sempre ocupado: desiste, avisa com mensagem clara e não deixa .tmp', async () => {
  const d = await mkdtemp(join(tmpdir(), 'toxic-store-'));
  const arq = join(d, 'a.json');
  await gravarJson(arq, { velho: true });
  let chamadas = 0;
  const renomear = async () => { chamadas++; throw erro('EBUSY'); };
  await assert.rejects(
    gravarJson(arq, { novo: true }, { tentativas: 4, esperar: semEspera, renomear }),
    (e) => /Não consegui salvar/.test(e.message) && /OneDrive/.test(e.message),
  );
  assert.equal(chamadas, 4);
  assert.deepEqual(await lerJson(arq, null), { velho: true }); // o arquivo antigo continua inteiro
  assert.deepEqual(await readdir(d), ['a.json']);
});

test('erro de verdade (disco cheio) não repete', async () => {
  const d = await mkdtemp(join(tmpdir(), 'toxic-store-'));
  let chamadas = 0;
  const renomear = async () => { chamadas++; throw erro('ENOSPC'); };
  await assert.rejects(
    gravarJson(join(d, 'a.json'), { x: 1 }, { esperar: semEspera, renomear }),
    /Não consegui salvar/,
  );
  assert.equal(chamadas, 1);
});

test('a espera cresce entre as tentativas', async () => {
  const d = await mkdtemp(join(tmpdir(), 'toxic-store-'));
  const esperas = [];
  const renomear = async () => { throw erro('EACCES'); };
  await assert.rejects(gravarJson(join(d, 'a.json'), {}, { tentativas: 4, esperaMs: 100, esperar: async (ms) => { esperas.push(ms); }, renomear }));
  assert.deepEqual(esperas, [100, 200, 300]);
});
