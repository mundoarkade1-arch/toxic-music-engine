// Biblioteca local (cópia para comparar rápido). Na etapa 3 ela passa a ser preenchida pelo Google Drive.
// Formato: { formato: "toxic-biblioteca", v: 1, faixas: [ { id?, fn, p, t, a } ] }  (mesmos campos do toxic-playlists v2)
import { readdir } from 'node:fs/promises';
import { join, relative, sep, basename, dirname } from 'node:path';
import { chave, lerNomeDeArquivo } from './normalize.js';

const AUDIO = /\.(mp3|flac|wav|m4a|aac|ogg|opus)$/i;

export function bibliotecaDeFaixas(faixas) {
  return { formato: 'toxic-biblioteca', v: 1, gerado: new Date().toISOString(), faixas };
}

/** Lê uma pasta do PC (só leitura, só os NOMES dos arquivos). */
export async function lerPasta(raiz) {
  const faixas = [];
  async function andar(dir) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const cam = join(dir, e.name);
      if (e.isDirectory()) await andar(cam);
      else if (AUDIO.test(e.name)) {
        const { a, t } = lerNomeDeArquivo(e.name);
        const rel = relative(raiz, dirname(cam)).split(sep).join('/');
        faixas.push({ fn: basename(cam), p: rel, t, a });
      }
    }
  }
  await andar(raiz);
  return bibliotecaDeFaixas(faixas);
}

/** Índice chave -> faixas. Faixa sem artista só casa se o artista do item também estiver vazio. */
export function indexar(biblioteca) {
  const mapa = new Map();
  for (const f of biblioteca.faixas ?? []) {
    const k = chave(f.a, f.t);
    if (!k) continue;
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k).push(f);
  }
  return mapa;
}

/** Grupos de músicas repetidas (mesma chave, 2 ou mais arquivos). O motor só AVISA; nunca apaga. */
export function acharDuplicadas(biblioteca) {
  const grupos = [];
  for (const [k, lista] of indexar(biblioteca)) {
    if (lista.length > 1) grupos.push({ chave: k, arquivos: lista.map((f) => ({ id: f.id, fn: f.fn, p: f.p })) });
  }
  grupos.sort((x, y) => y.arquivos.length - x.arquivos.length || x.chave.localeCompare(y.chave));
  return grupos;
}
