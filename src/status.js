// Resumo para o site mostrar. Formato: "toxic-engine-status" v1.
export const VERSAO = '0.1.0';

export function montarStatus({ fila, pendentes, duplicadas, estado, inicio, fim, resultado, avisos }, now) {
  const c = (e) => fila.tarefas.filter((t) => t.estado === e).length;
  return {
    formato: 'toxic-engine-status', v: 1, gerado: (now ?? new Date()).toISOString(),
    motor: { versao: VERSAO, estado: estado ?? 'ocioso' },
    ultimaExecucao: { inicio: inicio ?? null, fim: fim ?? null, resultado: resultado ?? null },
    contagem: {
      naFila: c('pendente') + c('rodando'),
      pendentes: pendentes?.itens?.length ?? 0,
      comErro: c('erro'),
      duplicadas: duplicadas?.length ?? 0,
    },
    avisos: avisos ?? [],
  };
}
