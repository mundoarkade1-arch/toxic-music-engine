// Roda as tarefas da fila, uma por vez, salvando o progresso a cada passo.
import { join } from 'node:path';
import { lerJson, gravarJson } from './store.js';
import * as Q from './queue.js';
import { lerCharts } from './charts.js';
import { acharDuplicadas } from './library.js';
import { compararLista, juntarPendentes } from './pendentes.js';
import { playlistsPorArtista, arquivoPlaylists } from './playlists.js';
import { montarStatus } from './status.js';

/**
 * @param {object} cfg  { dados: pasta de dados, charts: caminho do charts.js, biblioteca: caminho do biblioteca.json }
 * @param {object} [opc] { agora: Date, aoTerminarTarefa: fn }
 */
export async function executar(cfg, opc = {}) {
  const now = opc.agora ?? new Date();
  const arqFila = join(cfg.dados, 'fila.json');
  const fila = await lerJson(arqFila, Q.filaVazia());
  Q.recuperar(fila, now);
  const inicio = now.toISOString();
  const avisos = [];

  const biblioteca = await lerJson(cfg.biblioteca, null);
  if (!biblioteca) throw new Error(`Não achei a biblioteca em ${cfg.biblioteca}. Rode antes o comando "ler-pasta".`);

  const arqPend = join(cfg.dados, 'pendentes.json');
  let pendentes = await lerJson(arqPend, { formato: 'toxic-engine-pendentes', v: 1, itens: [] });
  let duplicadas = (await lerJson(join(cfg.dados, 'duplicadas.json'), { grupos: [] })).grupos;
  const porLista = (await lerJson(join(cfg.dados, 'pendentes-por-lista.json'), {}));

  let feitas = 0, falhas = 0;
  for (let t = Q.proxima(fila, now); t; t = Q.proxima(fila, now)) {
    Q.iniciar(t, now);
    await gravarJson(arqFila, fila); // salva ANTES de rodar: se o programa fechar, sabemos o que estava no meio
    try {
      if (t.tipo === 'comparar-lista') {
        const charts = await lerCharts(cfg.charts);
        porLista[t.alvo] = compararLista(t.alvo, charts, biblioteca).itens;
        pendentes = juntarPendentes(Object.values(porLista), now);
        await gravarJson(arqPend, pendentes);
        await gravarJson(join(cfg.dados, 'pendentes-por-lista.json'), porLista);
      } else if (t.tipo === 'achar-duplicadas') {
        duplicadas = acharDuplicadas(biblioteca);
        await gravarJson(join(cfg.dados, 'duplicadas.json'), { formato: 'toxic-engine-duplicadas', v: 1, gerado: now.toISOString(), grupos: duplicadas });
      } else if (t.tipo === 'gerar-playlists') {
        const pl = playlistsPorArtista(biblioteca);
        await gravarJson(join(cfg.dados, 'playlists-motor.json'), arquivoPlaylists(pl, now));
      } else {
        throw new Error(`Tipo de tarefa desconhecido: ${t.tipo}`);
      }
      Q.concluir(t, now); feitas++;
    } catch (e) {
      Q.falhar(t, e.message, now); falhas++;
      avisos.push(`Tarefa ${t.id} (${t.tipo} ${t.alvo ?? ''}): ${e.message}`.slice(0, 300));
    }
    fila.gerado = now.toISOString();
    await gravarJson(arqFila, fila);
    if (opc.aoTerminarTarefa) opc.aoTerminarTarefa(t);
  }

  const status = montarStatus({
    fila, pendentes, duplicadas, estado: falhas ? 'erro' : 'ocioso', inicio, fim: new Date().toISOString(),
    resultado: falhas ? 'com-erros' : 'ok', avisos,
  }, now);
  await gravarJson(join(cfg.dados, 'engine-status.json'), status);
  return { feitas, falhas, status };
}
