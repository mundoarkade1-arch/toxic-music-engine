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
test('lê nome "Título - Artista" (Spotify)', () => {
  assert.deepEqual(lerNomeDeArquivo('Último Romance - Los Hermanos.mp3'), { a: 'Los Hermanos', t: 'Último Romance' });
  assert.deepEqual(lerNomeDeArquivo('Acima do Sol - Ao Vivo - Skank.mp3'), { a: 'Skank', t: 'Acima do Sol - Ao Vivo' });
  assert.deepEqual(lerNomeDeArquivo('Traidor - Zé Vaqueiro, Paula Fernandes.mp3'), { a: 'Zé Vaqueiro, Paula Fernandes', t: 'Traidor' });
  assert.deepEqual(lerNomeDeArquivo('05 - Recairei - Henrique e Juliano.flac'), { a: 'Henrique e Juliano', t: 'Recairei' });
  assert.deepEqual(lerNomeDeArquivo('so-titulo.mp3'), { a: '', t: 'so-titulo' });
});
test('lê nome do YouTube "Artista - Título (...)-código"', () => {
  assert.deepEqual(lerNomeDeArquivo('Toto - Africa (Official HD Video)-FTQbiNvZqaY.mp3'), { a: 'Toto', t: 'Africa' });
  assert.deepEqual(lerNomeDeArquivo('Kate Bush - Running Up That Hill - Official Music Video-wp43OdtAAkM.mp3'), { a: 'Kate Bush', t: 'Running Up That Hill' });
  assert.deepEqual(lerNomeDeArquivo('Tate McRae - TIT FOR TAT (Live from the Kia Forum)-RYF9jlBruqA.mp3'), { a: 'Tate McRae', t: 'TIT FOR TAT (Live from the Kia Forum)' });
  assert.deepEqual(lerNomeDeArquivo('Justin Bieber - SPEED DEMON-4WcD2ncHMVs.mp3'), { a: 'Justin Bieber', t: 'SPEED DEMON' });
  assert.deepEqual(lerNomeDeArquivo('Purple Rain (2015 Paisley Park Remaster)-iSBVeZrDfGY.mp3'), { a: '', t: 'Purple Rain (2015 Paisley Park Remaster)' });
});
test('mesma música nos dois formatos dá a mesma chave', () => {
  const x = lerNomeDeArquivo('Africa - Toto.mp3'); const y = lerNomeDeArquivo('Toto - Africa (Official HD Video)-FTQbiNvZqaY.mp3');
  assert.equal(chave(x.a, x.t), chave(y.a, y.t));
});
