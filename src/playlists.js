// Gera playlists no formato toxic-playlists v2 (o mesmo do site e do app). Escrito em playlists-motor.json.
import { normalizarArtista } from './normalize.js';

export const MIN_FAIXAS_ARTISTA = 5; // igual ao site: uma playlist por cantor com 5 músicas ou mais

function faixaOut(f) {
  const o = {};
  if (f.id) o.id = f.id;
  o.fn = f.fn; o.p = f.p ?? ''; o.t = f.t; o.a = f.a;
  return o;
}

export function playlistsPorArtista(biblioteca, minimo = MIN_FAIXAS_ARTISTA) {
  const grupos = new Map();
  for (const f of biblioteca.faixas ?? []) {
    const k = normalizarArtista(f.a);
    if (!k) continue;
    if (!grupos.has(k)) grupos.set(k, { nome: f.a.split(/,|;|\sfeat\.?\s/i)[0].trim(), faixas: [] });
    grupos.get(k).faixas.push(f);
  }
  const lista = [];
  for (const g of grupos.values()) {
    if (g.faixas.length < minimo) continue;
    lista.push({
      nome: g.nome, origem: 'Motor',
      regra: { tipo: 'artista', nome: g.nome },
      faixas: g.faixas.map(faixaOut),
    });
  }
  lista.sort((x, y) => y.faixas.length - x.faixas.length || x.nome.localeCompare(y.nome));
  return lista;
}

export function arquivoPlaylists(playlists, now) {
  return { formato: 'toxic-playlists', v: 2, gerado: (now ?? new Date()).toISOString(), playlists };
}
