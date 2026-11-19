// Gravação segura em disco: escreve num arquivo temporário e troca. Se faltar luz no meio, o arquivo antigo continua inteiro.
// No Windows (principalmente em pasta do OneDrive) a troca pode falhar por alguns segundos com EPERM/EBUSY/EACCES,
// porque o OneDrive ou o antivírus estão mexendo no arquivo. Isso passa sozinho: por isso tentamos de novo, esperando um pouco.
import { readFile, writeFile, rename, rm, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function lerJson(caminho, padrao) {
  try {
    return JSON.parse(await readFile(caminho, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return padrao;
    throw new Error(`Arquivo ${caminho} está ilegível: ${e.message}`);
  }
}

// Erros de "arquivo ocupado" que costumam passar sozinhos.
const CODIGOS_PASSAGEIROS = new Set(['EPERM', 'EBUSY', 'EACCES']);

export const TENTATIVAS_GRAVAR = 8;
export const ESPERA_BASE_MS = 250; // espera 250, 500, 750... ms entre as tentativas (no total, uns 7 segundos)

const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms));

/**
 * Grava o JSON sem deixar o arquivo pela metade. Se o Windows disser "arquivo ocupado", tenta de novo.
 * @param {string} caminho
 * @param {object} objeto
 * @param {object} [opc] só para testes: { tentativas, esperaMs, renomear, esperar }
 */
export async function gravarJson(caminho, objeto, opc = {}) {
  const tentativas = opc.tentativas ?? TENTATIVAS_GRAVAR;
  const esperaMs = opc.esperaMs ?? ESPERA_BASE_MS;
  const renomear = opc.renomear ?? rename;
  const esperar = opc.esperar ?? dormir;

  await mkdir(dirname(caminho), { recursive: true });
  const tmp = caminho + '.tmp';
  const texto = JSON.stringify(objeto, null, 1);

  let ultimo;
  for (let n = 1; n <= tentativas; n++) {
    try {
      await writeFile(tmp, texto, 'utf8');
      await renomear(tmp, caminho);
      return;
    } catch (e) {
      ultimo = e;
      if (!CODIGOS_PASSAGEIROS.has(e.code)) break; // erro de verdade (disco cheio, caminho errado...): não adianta repetir
      if (n < tentativas) await esperar(esperaMs * n);
    }
  }
  await rm(tmp, { force: true }).catch(() => {}); // não deixa lixo para trás
  const dica = CODIGOS_PASSAGEIROS.has(ultimo?.code)
    ? ' O Windows (ou o OneDrive/antivírus) está segurando o arquivo. Se continuar, mova a pasta do motor para fora do OneDrive (por exemplo, C:\\ToxicEngine).'
    : '';
  throw new Error(`Não consegui salvar ${caminho}: ${ultimo?.message ?? 'erro desconhecido'}.${dica}`);
}
