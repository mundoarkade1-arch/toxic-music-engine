#!/usr/bin/env node
// Comandos do motor. Exemplos de uso estão no README.md.
import { resolve, join } from 'node:path';
import { lerJson, gravarJson } from './store.js';
import * as Q from './queue.js';
import { lerPasta } from './library.js';
import { lerCharts } from './charts.js';
import { executar } from './runner.js';

const args = process.argv.slice(2);
const cmd = args[0];
function opcao(nome, padrao) {
  const i = args.indexOf('--' + nome);
  return i >= 0 && args[i + 1] ? args[i + 1] : padrao;
}
const dados = resolve(opcao('dados', 'dados'));
const cfg = {
  dados,
  charts: resolve(opcao('charts', join(dados, 'charts.js'))),
  biblioteca: resolve(opcao('biblioteca', join(dados, 'biblioteca.json'))),
};

async function main() {
  if (cmd === 'ler-pasta') {
    const pasta = args[1];
    if (!pasta) throw new Error('Diga a pasta: motor ler-pasta "C:\\Musicas"');
    const bib = await lerPasta(resolve(pasta));
    await gravarJson(cfg.biblioteca, bib);
    console.log(`Li ${bib.faixas.length} músicas. Salvei em ${cfg.biblioteca}`);
  } else if (cmd === 'planejar') {
    const charts = await lerCharts(cfg.charts);
    const arq = resolve(dados, 'fila.json');
    const fila = await lerJson(arq, Q.filaVazia());
    Q.limparFeitas(fila);
    for (const id of Object.keys(charts.listas)) Q.adicionar(fila, 'comparar-lista', id);
    Q.adicionar(fila, 'achar-duplicadas', 'biblioteca');
    Q.adicionar(fila, 'gerar-playlists', 'artistas');
    await gravarJson(arq, fila);
    console.log(`Fila com ${fila.tarefas.filter((t) => t.estado === 'pendente').length} tarefas pendentes.`);
  } else if (cmd === 'executar') {
    const r = await executar(cfg, { aoTerminarTarefa: (t) => console.log(`${t.estado.padEnd(8)} ${t.tipo} ${t.alvo ?? ''}`) });
    console.log(`Pronto. Feitas: ${r.feitas}. Com erro: ${r.falhas}.`);
    console.log(`Faltam na biblioteca: ${r.status.contagem.pendentes}. Repetidas: ${r.status.contagem.duplicadas}.`);
  } else if (cmd === 'tentar-de-novo') {
    const arq = resolve(dados, 'fila.json');
    const fila = await lerJson(arq, Q.filaVazia());
    let n = 0;
    for (const t of fila.tarefas) if (t.estado === 'erro') { Q.tentarDeNovo(t); n++; }
    await gravarJson(arq, fila);
    console.log(`${n} tarefa(s) com erro voltaram para a fila.`);
  } else {
    console.log('Comandos: ler-pasta <pasta> | planejar | executar | tentar-de-novo');
    console.log('Opções: --dados <pasta> --charts <charts.js> --biblioteca <biblioteca.json>');
    process.exitCode = cmd ? 1 : 0;
  }
}
main().catch((e) => { console.error('ERRO:', e.message); process.exitCode = 1; });
