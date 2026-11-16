// Envia para a pasta "Toxic Engine" do Drive os arquivos que o motor gerou. Só cria/atualiza os próprios arquivos.
import { join } from 'node:path';
import { lerJson } from './store.js';

export const PASTA_MOTOR = 'Toxic Engine';
export const ARQUIVOS_ENVIADOS = ['engine-status.json', 'fila.json', 'pendentes.json', 'playlists-motor.json'];

export async function enviarParaDrive(drive, dados) {
  const pastaId = await drive.pasta(PASTA_MOTOR);
  const enviados = [];
  for (const nome of ARQUIVOS_ENVIADOS) {
    const conteudo = await lerJson(join(dados, nome), null);
    if (!conteudo) continue; // ainda não foi gerado
    await drive.gravarJson(pastaId, nome, conteudo);
    enviados.push(nome);
  }
  return enviados;
}
