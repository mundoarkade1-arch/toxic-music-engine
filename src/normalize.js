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

// ---- Leitura do nome do arquivo ----
// Dois jeitos aparecem na biblioteca real:
//  A) YouTube:  "Artista - Título (Official Video)-AbCdEfGhIjK.mp3"  (termina com código de 11 letras)
//  B) Spotify:  "Título - Artista.mp3"  ou  "Título - Versão - Artista1, Artista2.mp3"
// Regra: se tem o código do YouTube no fim, é "Artista - Título". Senão, é "Título - Artista" (o ÚLTIMO pedaço é o artista).

const CODIGO_YOUTUBE = /(?<=\S)-([A-Za-z0-9_-]{11})$/;
const LIXO = /\b(official|lyrics?|lyric video|video|audio|visuali[sz]er|4k|hd|mv|music video|performance video)\b/i;

function temCodigoYoutube(s) {
  const m = CODIGO_YOUTUBE.exec(s);
  // o código tem letra e número, ou maiúscula e minúscula (evita cortar palavras comuns)
  return !!m && (/\d/.test(m[1]) || (/[a-z]/.test(m[1]) && /[A-Z]/.test(m[1])));
}

/** Tira "(Official Video)", "[Lyrics]", "- Official Music Video" etc. NÃO tira "(Live)", "(Cover)", "(Remix)". */
function limparLixoYoutube(t) {
  return t
    .replace(/[([][^)\]]*[)\]]/g, (g) => (LIXO.test(g) ? ' ' : g))
    .split(' - ').filter((p) => !(LIXO.test(p) && p.trim().split(/\s+/).length <= 4)).join(' - ')
    .replace(/\s+/g, ' ').trim();
}

/** Lê o nome do arquivo e devolve { a: artista, t: título }. */
export function lerNomeDeArquivo(nomeArquivo) {
  const semExt = String(nomeArquivo ?? '').replace(/\.[A-Za-z0-9]{2,5}$/, '').trim();
  const s = semExt.replace(/^\d{1,3}\s*[-._)]\s*/, '');

  if (temCodigoYoutube(s)) {
    const limpo = s.replace(CODIGO_YOUTUBE, '').trim();
    const i = limpo.indexOf(' - ');
    if (i > 0) return { a: limpo.slice(0, i).trim(), t: limparLixoYoutube(limpo.slice(i + 3)) };
    return { a: '', t: limparLixoYoutube(limpo) };
  }

  const partes = s.split(' - ').map((p) => p.trim());
  if (partes.length >= 2 && partes[0] && partes[partes.length - 1]) {
    return { a: partes[partes.length - 1], t: partes.slice(0, -1).join(' - ') };
  }
  return { a: '', t: s };
}
