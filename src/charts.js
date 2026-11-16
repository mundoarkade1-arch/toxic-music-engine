// Lê o arquivo data/charts.js do site (window.CHARTS = {...}).
import { readFile } from 'node:fs/promises';

export function lerChartsTexto(texto) {
  const json = String(texto).trim().replace(/^window\.CHARTS\s*=\s*/, '').replace(/;\s*$/, '');
  const obj = JSON.parse(json);
  if (!obj || typeof obj.listas !== 'object') throw new Error('charts.js sem o campo "listas".');
  return obj;
}

export async function lerCharts(caminho) {
  return lerChartsTexto(await readFile(caminho, 'utf8'));
}

export const URL_CHARTS_PADRAO = 'https://raw.githubusercontent.com/mundoarkade1-arch/gerenciador-de-musicas/main/data/charts.js';

/** Baixa o charts.js publicado pelo site e confere que é válido ANTES de gravar. Devolve o texto. */
export async function baixarCharts(url = URL_CHARTS_PADRAO, fetchFn = fetch) {
  const r = await fetchFn(url);
  if (!r.ok) throw new Error(`Não consegui baixar o charts.js (erro ${r.status}). Se o repositório do site for privado, copie o arquivo data/charts.js para a pasta de dados.`);
  const texto = await r.text();
  lerChartsTexto(texto);
  return texto;
}
