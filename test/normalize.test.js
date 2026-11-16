import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chave, normalizarArtista, normalizarTitulo, lerNomeDeArquivo } from '../src/normalize.js';

test('tira acento, maiúscula e pontuação', () => {
  assert.equal(normalizarTitulo('Não Me Toca!'), 'nao me toca');
});
test('remove participação entre parênteses e no fim', () => {
  assert.equal(normalizarTitulo('Dracula (with JENNIE)'), 'dracula');
  assert.equal(normalizarTitulo('Música [feat. Fulano]'), 'musica');
  assert.equal(normalizarTitulo('Música feat. Fulano'), 'musica');
});
test('não remove versão (Ao Vivo continua diferente)', () => {
  assert.notEqual(normalizarTitulo('Recairei (Ao Vivo)'), normalizarTitulo('Recairei'));
});
test('artista: & e "e" ficam iguais', () => {
  assert.equal(normalizarArtista('Henrique & Juliano'), normalizarArtista('Henrique e Juliano'));
});
test('artista: só o principal', () => {
  assert.equal(normalizarArtista('Tame Impala, JENNIE'), 'tame impala');
});
test('chave igual para escritas diferentes', () => {
  assert.equal(chave('Henrique & Juliano', 'Recairei (feat. X)'), chave('henrique e juliano', 'RECAIREI'));
});
test('chave vazia sem título', () => {
  assert.equal(chave('Fulano', '  '), '');
});
test('lê nome de arquivo', () => {
  assert.deepEqual(lerNomeDeArquivo('Henrique e Juliano - Recairei.mp3'), { a: 'Henrique e Juliano', t: 'Recairei' });
  assert.deepEqual(lerNomeDeArquivo('05 - Fulano - Canção.flac'), { a: 'Fulano', t: 'Canção' });
  assert.deepEqual(lerNomeDeArquivo('so-titulo.mp3'), { a: '', t: 'so-titulo' });
});
