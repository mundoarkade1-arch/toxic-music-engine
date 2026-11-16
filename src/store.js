// Gravação segura em disco: escreve num arquivo temporário e troca. Se faltar luz no meio, o arquivo antigo continua inteiro.
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function lerJson(caminho, padrao) {
  try {
    return JSON.parse(await readFile(caminho, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return padrao;
    throw new Error(`Arquivo ${caminho} está ilegível: ${e.message}`);
  }
}

export async function gravarJson(caminho, objeto) {
  await mkdir(dirname(caminho), { recursive: true });
  const tmp = caminho + '.tmp';
  await writeFile(tmp, JSON.stringify(objeto, null, 1), 'utf8');
  await rename(tmp, caminho);
}
