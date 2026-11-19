import { test } from 'node:test';
import assert from 'node:assert/strict';
import { relatorioNomesEstranhos } from '../src/library.js';
import { lerNomeDeArquivo } from '../src/normalize.js';

const nomes = [
  'De Trás Pra Frente - Ao Vivo - Henrique & Juliano.mp3',
  'Love Is Gone - Fred Riester & Joachim Garraud Radio Edit Remix - David Guetta, Chris Willis, Fred Riesterer, Joachim Garraud.mp3',
  'YOUR LOVE - THE OUTFIELD (karaoke)-AbCdEfGhIj1.mp3',
  'Linkin Park - The Catalyst (Full Song) HD-cdencHUznBM.mp3',
  'David Guetta - Titanium ft. Sia (Official Video)-JRfuAukYTKg.mp3',
  'Faixa sem traço.mp3',
  'Numb - Linkin Park.mp3',
];
const bib = { faixas: nomes.map((fn) => ({ fn, p: 'x', ...lerNomeDeArquivo(fn) })) };

test('relatório lista cada tipo de nome esquisito', () => {
  const r = relatorioNomesEstranhos(bib);
  assert.match(r, /SEM ARTISTA[^\n]*: 1 ==/);
  assert.match(r, /AO VIVO \/ LIVE: 1 ==/);
  assert.match(r, /KARAOKÊ \/ INSTRUMENTAL: 1 ==/);
  assert.match(r, /VÁRIOS CANTORES NO ARTISTA[^\n]*: 2 ==/);
  assert.match(r, /De Trás Pra Frente - Ao Vivo - Henrique & Juliano\.mp3/);
});

test('relatório mostra no máximo N exemplos por grupo, espalhados', () => {
  const muitas = { faixas: Array.from({ length: 100 }, (_, i) => ({ fn: `Musica ${i} - Ao Vivo - Banda.mp3`, p: '', t: `Musica ${i} - Ao Vivo`, a: 'Banda' })) };
  const r = relatorioNomesEstranhos(muitas, 5);
  const bloco = r.split('== AO VIVO / LIVE: 100 ==')[1].split('==')[0];
  assert.equal(bloco.trim().split('\n').length, 5);
  assert.match(bloco, /Musica 0 /);
  assert.doesNotMatch(bloco, /Musica 1 /); // espalhado, não só os primeiros
});

test('relatório de biblioteca vazia não quebra', () => {
  assert.match(relatorioNomesEstranhos({ faixas: [] }), /0 músicas/);
  assert.match(relatorioNomesEstranhos({}), /0 músicas/);
});
