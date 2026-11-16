// Normalização de nomes. A "chave" de uma música é artista|título, ambos normalizados.
// Mesma ideia do 3º critério de casamento do app (título + artista sem acento e sem maiúscula).

const CONECTORES = new Set(['e', 'x', 'and', 'feat', 'ft', 'with', 'vs']);

function base(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Remove "(feat. X)", "[with Y]", "(ft. Z)" e "feat. X" no fim. NÃO remove "(Ao Vivo)" nem "(Remix)". */
function semParticipacao(t) {
  return t
    .replace(/[([]\s*(feat|ft|with|part|participa[cç][aã]o)\b[^)\]]*[)\]]/gi, ' ')
    .replace(/\s[-–]\s*(feat|ft)\.?\s.*$/i, ' ')
    .replace(/\s(feat|ft)\.?\s.*$/i, ' ');
}

function limpar(t) {
  return t
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizarTitulo(titulo) {
  return limpar(base(semParticipacao(String(titulo ?? ''))));
}

/** Só o artista principal (antes de vírgula, "feat", etc.). "Henrique & Juliano" e "Henrique e Juliano" ficam iguais. */
export function normalizarArtista(artista) {
  let a = String(artista ?? '').split(/,|;|\sfeat\.?\s|\sft\.?\s|\swith\s/i)[0];
  a = limpar(base(a));
  return a.split(' ').filter((p) => p && !CONECTORES.has(p)).join(' ');
}

/** Chave estável: "artista|título". Vazia se faltar título. */
export function chave(artista, titulo) {
  const t = normalizarTitulo(titulo);
  if (!t) return '';
  return normalizarArtista(artista) + '|' + t;
}

/** Lê nome de arquivo no formato "Artista - Título.mp3" (com ou sem número no começo). */
export function lerNomeDeArquivo(nomeArquivo) {
  const semExt = String(nomeArquivo ?? '').replace(/\.[A-Za-z0-9]{2,5}$/, '').trim();
  const s = semExt.replace(/^\d{1,3}\s*[-._)]\s*/, '');
  const i = s.indexOf(' - ');
  if (i > 0) return { a: s.slice(0, i).trim(), t: s.slice(i + 3).trim() };
  return { a: '', t: s };
}
