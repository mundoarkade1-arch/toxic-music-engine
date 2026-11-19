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

// ---- Relatório de nomes esquisitos (para o usuário colar no chat e a gente melhorar a leitura dos nomes) ----
const sem = (x) => String(x ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const GRUPOS = [
  ['SEM ARTISTA (o motor não achou o cantor)', (f) => !String(f.a ?? '').trim()],
  ['AO VIVO / LIVE', (f) => /\b(ao vivo|live)\b/.test(sem(f.t))],
  ['REMIX / EDIT / EXTENDED', (f) => /\b(remix|radio edit|bootleg|mashup|extended)\b/.test(sem(f.t))],
  ['KARAOKÊ / INSTRUMENTAL', (f) => /\b(karaoke|playback|instrumental|backing track)\b/.test(sem(f.t))],
  ['COVER / ACÚSTICO / REMASTER / OUTRA VERSÃO', (f) => /\b(cover|acoustic|acustico|remaster(ed)?|sped up|slowed|reverb|version|versao|demo)\b/.test(sem(f.t))],
  ['PARTICIPAÇÃO NO TÍTULO (feat, ft, with)', (f) => /\b(feat|ft|featuring|with|part|participacao)\b/.test(sem(f.t))],
  ['VÁRIOS CANTORES NO ARTISTA (vírgula, &, x)', (f) => /,|;|&|\sx\s/i.test(String(f.a ?? ''))],
  ['SOBROU LIXO DE YOUTUBE NO TÍTULO (official, lyrics, HD...)', (f) => /\b(official|oficial|lyrics?|letra|audio|video|visuali[sz]er|full song|hd|4k|clipe)\b/.test(sem(f.t))],
  ['NOME COM 3 PEDAÇOS OU MAIS (" - " duas vezes ou mais)', (f) => String(f.fn ?? '').replace(/\.[A-Za-z0-9]{2,5}$/, '').split(' - ').length >= 3],
];

/** Texto simples com alguns exemplos de cada tipo de nome esquisito. Só nomes de arquivo; nada secreto. */
export function relatorioNomesEstranhos(biblioteca, porGrupo = 10) {
  const faixas = biblioteca.faixas ?? [];
  const linhas = [`Nomes esquisitos da biblioteca (${faixas.length} músicas). Cada grupo mostra até ${porGrupo} exemplos espalhados.`, ''];
  for (const [titulo, regra] of GRUPOS) {
    const achadas = faixas.filter(regra);
    linhas.push(`== ${titulo}: ${achadas.length} ==`);
    const passo = Math.max(1, Math.floor(achadas.length / porGrupo));
    for (let i = 0, n = 0; i < achadas.length && n < porGrupo; i += passo, n++) {
      const f = achadas[i];
      linhas.push(`${f.fn}  =>  artista: [${f.a ?? ''}]  título: [${f.t ?? ''}]`);
    }
    linhas.push('');
  }
  return linhas.join('\n');
}
