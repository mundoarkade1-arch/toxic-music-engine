#!/usr/bin/env node
// Comandos do motor. Exemplos de uso estão no README.md.
import { resolve, join } from 'node:path';
import { lerJson, gravarJson } from './store.js';
import * as Q from './queue.js';
import { lerPasta } from './library.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { lerCharts, baixarCharts } from './charts.js';
import { entrar, desconectar, criarProvedorDeToken } from './google-auth.js';
import { DriveClient } from './drive.js';
import { enviarParaDrive } from './enviar.js';
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
  } else if (cmd === 'baixar-charts') {
    const texto = await baixarCharts(opcao('url', undefined));
    await mkdir(dados, { recursive: true });
    await writeFile(cfg.charts, texto, 'utf8');
    console.log(`Salvei as listas Top 200 em ${cfg.charts}`);
  } else if (cmd === 'entrar-google') {
    await entrar(dados, { mostrar: (url) => {
      console.log('\nAbra este link no navegador, escolha a sua conta e clique em Permitir:\n\n' + url + '\n\nEsperando você...');
    } });
    console.log('Pronto! O motor está conectado ao Google.');
  } else if (cmd === 'desconectar-google') {
    console.log((await desconectar(dados)) ? 'Desconectado. O acesso foi cancelado no Google e apagado deste PC.' : 'O motor não estava conectado.');
  } else if (cmd === 'ler-drive') {
    const drive = new DriveClient({ token: criarProvedorDeToken(dados) });
    const bib = await drive.lerBiblioteca();
    await gravarJson(cfg.biblioteca, bib);
    console.log(`Li ${bib.faixas.length} músicas no Drive. Salvei em ${cfg.biblioteca}`);
  } else if (cmd === 'enviar-drive') {
    const drive = new DriveClient({ token: criarProvedorDeToken(dados) });
    const enviados = await enviarParaDrive(drive, dados);
    console.log(enviados.length ? `Enviei para a pasta "Toxic Engine" do Drive: ${enviados.join(', ')}` : 'Nada para enviar ainda. Rode antes: planejar e executar.');
  } else if (cmd === 'tentar-de-novo') {
    const arq = resolve(dados, 'fila.json');
    const fila = await lerJson(arq, Q.filaVazia());
    let n = 0;
    for (const t of fila.tarefas) if (t.estado === 'erro') { Q.tentarDeNovo(t); n++; }
    await gravarJson(arq, fila);
    console.log(`${n} tarefa(s) com erro voltaram para a fila.`);
  } else {
    console.log('Comandos: ler-pasta <pasta> | baixar-charts | entrar-google | ler-drive | planejar | executar | enviar-drive | tentar-de-novo | desconectar-google');
    console.log('Opções: --dados <pasta> --charts <charts.js> --biblioteca <biblioteca.json>');
    process.exitCode = cmd ? 1 : 0;
  }
}
main().catch((e) => { console.error('ERRO:', e.message); process.exitCode = 1; });
