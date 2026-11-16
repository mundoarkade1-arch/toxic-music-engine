// Cliente mínimo do Google Drive v3 (só o que o motor precisa). Respeita limites: espera e tenta de novo em 429/5xx.
import { lerNomeDeArquivo } from './normalize.js';
import { bibliotecaDeFaixas } from './library.js';

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const AUDIO = /\.(mp3|flac|wav|m4a|aac|ogg|opus)$/i;
export const MIME_PASTA = 'application/vnd.google-apps.folder';

export class ErroDrive extends Error {}

const aspas = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

export class DriveClient {
  /** @param {{ token: () => Promise<string>, fetchFn?: Function, esperar?: Function, tentativas?: number }} o */
  constructor({ token, fetchFn = fetch, esperar = dormir, tentativas = 4 }) {
    this.token = token; this.fetch = fetchFn; this.esperar = esperar; this.tentativas = tentativas;
  }

  async _req(url, opc = {}) {
    for (let i = 1; ; i++) {
      const r = await this.fetch(url, { ...opc, headers: { ...(opc.headers ?? {}), Authorization: `Bearer ${await this.token()}` } });
      if (r.ok) return r.status === 204 ? null : r.json();
      const temporario = r.status === 429 || r.status >= 500;
      if (temporario && i < this.tentativas) { await this.esperar(1000 * 2 ** (i - 1)); continue; }
      if (r.status === 401) throw new ErroDrive('O Google recusou o acesso. Dê dois cliques em 1-entrar-google.bat');
      if (r.status === 403) throw new ErroDrive('O Drive negou (403): cota esgotada ou falta de permissão. Tente mais tarde.');
      throw new ErroDrive(`O Drive respondeu com erro ${r.status}.`);
    }
  }

  /** Lista tudo (todas as páginas) que casa com a busca `q`. */
  async listar(q, campos) {
    const todos = [];
    let pagina = '';
    do {
      const p = new URLSearchParams({ q, fields: `nextPageToken,files(${campos})`, pageSize: '1000', spaces: 'drive', corpora: 'user' });
      if (pagina) p.set('pageToken', pagina);
      const j = await this._req(`${API}/files?${p}`);
      todos.push(...(j.files ?? []));
      pagina = j.nextPageToken ?? '';
    } while (pagina);
    return todos;
  }

  /** Lê o Drive inteiro (só nomes) e devolve no formato da biblioteca do motor. */
  async lerBiblioteca() {
    const pastas = await this.listar(`mimeType='${MIME_PASTA}' and trashed=false`, 'id,name,parents');
    const porId = new Map(pastas.map((p) => [p.id, p]));
    const caminho = (id) => {
      const partes = []; let atual = porId.get(id); let n = 0;
      while (atual && n++ < 30) { partes.unshift(atual.name); atual = porId.get(atual.parents?.[0]); }
      return partes.join('/');
    };
    const arqs = await this.listar("(mimeType contains 'audio/' or mimeType='application/octet-stream') and trashed=false", 'id,name,parents');
    const faixas = [];
    for (const f of arqs) {
      if (!AUDIO.test(f.name)) continue; // octet-stream traz de tudo; só ficam arquivos de áudio
      const { a, t } = lerNomeDeArquivo(f.name);
      faixas.push({ id: f.id, fn: f.name, p: caminho(f.parents?.[0]), t, a });
    }
    return bibliotecaDeFaixas(faixas);
  }

  /** Acha uma pasta pelo nome (na raiz do Drive) ou cria. Devolve o id. */
  async pasta(nome) {
    const achadas = await this.listar(`name='${aspas(nome)}' and mimeType='${MIME_PASTA}' and 'root' in parents and trashed=false`, 'id');
    if (achadas.length) return achadas[0].id;
    const j = await this._req(`${API}/files?fields=id`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nome, mimeType: MIME_PASTA }),
    });
    return j.id;
  }

  /** Cria ou atualiza (pelo nome, dentro da pasta) um arquivo JSON. Nunca apaga nada. */
  async gravarJson(pastaId, nomeArquivo, objeto) {
    const existentes = await this.listar(`name='${aspas(nomeArquivo)}' and '${pastaId}' in parents and trashed=false`, 'id');
    const limite = 'toxic' + Math.random().toString(36).slice(2);
    const meta = existentes.length ? { name: nomeArquivo } : { name: nomeArquivo, parents: [pastaId] };
    const corpo = `--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
      `--${limite}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(objeto, null, 1)}\r\n--${limite}--`;
    const url = existentes.length ? `${UPLOAD}/files/${existentes[0].id}?uploadType=multipart&fields=id` : `${UPLOAD}/files?uploadType=multipart&fields=id`;
    const j = await this._req(url, {
      method: existentes.length ? 'PATCH' : 'POST', headers: { 'Content-Type': `multipart/related; boundary=${limite}` }, body: corpo,
    });
    return j.id;
  }
}

