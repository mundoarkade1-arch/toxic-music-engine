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
