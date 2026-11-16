// Compara as listas Top 200 com a biblioteca e diz o que falta. SÓ LISTA: não baixa nada.
import { chave } from './normalize.js';
import { indexar } from './library.js';

/** @returns {{ itens: object[], jaTem: number, total: number }} */
export function compararLista(idLista, charts, biblioteca) {
  const lista = charts.listas[idLista];
  if (!lista) throw new Error(`Lista "${idLista}" não existe em charts.js.`);
  const tem = indexar(biblioteca);
  const itens = [];
  let jaTem = 0;
  (lista.faixas ?? []).forEach((f, i) => {
    const k = chave(f.a, f.t);
    if (!k) return;
    if (tem.has(k)) { jaTem++; return; }
    itens.push({ chave: k, t: f.t, a: f.a, origem: lista.nome, deezerId: f.id, posicao: i + 1 });
  });
  return { itens, jaTem, total: (lista.faixas ?? []).length };
}

/** Junta pendentes de várias listas sem repetir a mesma música (fica a de melhor posição). */
export function juntarPendentes(grupos, now) {
  const mapa = new Map();
  for (const it of grupos.flat()) {
    const atual = mapa.get(it.chave);
    if (!atual || it.posicao < atual.posicao) mapa.set(it.chave, { ...it });
  }
  const vistaEm = (now ?? new Date()).toISOString();
  const itens = [...mapa.values()].map((x) => ({ ...x, vistaEm }));
  itens.sort((x, y) => x.posicao - y.posicao || x.chave.localeCompare(y.chave));
  return { formato: 'toxic-engine-pendentes', v: 1, gerado: vistaEm, itens };
}
