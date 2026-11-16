import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bibliotecaDeFaixas, lerPasta, acharDuplicadas } from '../src/library.js';
import { playlistsPorArtista } from '../src/playlists.js';
import { lerNomeDeArquivo } from '../src/normalize.js';

test('lê pasta com subpastas, só áudio, e não altera nada', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'toxic-'));
  await mkdir(join(raiz, 'Sertanejo', 'Antigas'), { recursive: true });
  await writeFile(join(raiz, 'Um - A.mp3'), 'x');
  await writeFile(join(raiz, 'Sertanejo', 'Dois - B.FLAC'), 'x');
  await writeFile(join(raiz, 'Sertanejo', 'Antigas', 'Três - C.m4a'), 'x');
  await writeFile(join(raiz, 'capa.jpg'), 'x');
  const antes = await readdir(raiz);
  const bib = await lerPasta(raiz);
  assert.equal(bib.faixas.length, 3);
  const dois = bib.faixas.find((f) => f.t === 'Dois');
  assert.equal(dois.p, 'Sertanejo');
  assert.equal(bib.faixas.find((f) => f.t === 'Três').p, 'Sertanejo/Antigas');
  assert.deepEqual(await readdir(raiz), antes);
});

test('acha repetidas mesmo com escrita diferente', () => {
  const bib = bibliotecaDeFaixas([
    { fn: 'a.mp3', p: '', t: 'Recairei', a: 'Henrique & Juliano' },
    { fn: 'b.mp3', p: 'x', t: 'RECAIREI (feat. Y)', a: 'Henrique e Juliano' },
    { fn: 'c.mp3', p: '', t: 'Outra', a: 'Henrique e Juliano' },
  ]);
  const g = acharDuplicadas(bib);
  assert.equal(g.length, 1);
  assert.equal(g[0].arquivos.length, 2);
});

test('versões diferentes não são repetidas', () => {
  const bib = bibliotecaDeFaixas([
    { fn: 'a.mp3', t: 'Recairei', a: 'X' }, { fn: 'b.mp3', t: 'Recairei (Ao Vivo)', a: 'X' },
  ]);
  assert.equal(acharDuplicadas(bib).length, 0);
});

test('playlist por artista só com 10 músicas ou mais, no formato do site', () => {
  const faixas = [];
  for (let i = 0; i < 10; i++) faixas.push({ id: 'id' + i, fn: `a${i}.mp3`, p: 'p', t: 'Musica ' + i, a: 'Nick Romero' });
  faixas.push({ fn: 'z.mp3', t: 'Sozinha', a: 'Fulano' });
  const pl = playlistsPorArtista(bibliotecaDeFaixas(faixas));
  assert.equal(pl.length, 1);
  assert.equal(pl[0].nome, 'Nick Romero');
  assert.deepEqual(pl[0].regra, { tipo: 'artista', nome: 'Nick Romero' });
  assert.equal(pl[0].faixas[0].id, 'id0');
  assert.deepEqual(Object.keys(pl[0].faixas[0]), ['id', 'fn', 'p', 't', 'a']);
});

test('nomes reais do Drive: cantores certos e playlist por cantor', () => {
  const nomes = [
    ...Array.from({ length: 10 }, (_, i) => `Música ${i} - Linkin Park.mp3`),
    ...Array.from({ length: 10 }, (_, i) => `Canção ${i} - Ao Vivo - Henrique & Juliano.mp3`),
    ...Array.from({ length: 4 }, (_, i) => `Faixa ${i} - Pitty.mp3`),
    'Tate McRae - Housewife (Official Video)-DPEodkHzH-s.mp3',
  ];
  const bib = bibliotecaDeFaixas(nomes.map((fn) => ({ fn, p: '', ...lerNomeDeArquivo(fn) })));
  const pl = playlistsPorArtista(bib);
  assert.deepEqual(pl.map((x) => x.nome), ['Henrique & Juliano', 'Linkin Park']);
  assert.equal(bib.faixas.at(-1).a, 'Tate McRae');
});
