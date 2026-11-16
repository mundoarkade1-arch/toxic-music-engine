// Fila de tarefas com progresso salvo. Formato: "toxic-engine-fila" v1 (ver CONTRATO_MOTOR.md no repositório do Toxic Player).
export const ESPERA_MIN = [1, 5, 15, 60, 240]; // minutos entre tentativas
export const MAX_TENTATIVAS = 5;

export function filaVazia() {
  return { formato: 'toxic-engine-fila', v: 1, gerado: new Date().toISOString(), tarefas: [] };
}

function agora(now) { return (now ?? new Date()).toISOString(); }

/** Cria uma tarefa. Não duplica: se já existe tarefa pendente/rodando do mesmo tipo e alvo, devolve a existente. */
export function adicionar(fila, tipo, alvo, now) {
  const igual = fila.tarefas.find((t) => t.tipo === tipo && t.alvo === alvo && (t.estado === 'pendente' || t.estado === 'rodando'));
  if (igual) return igual;
  const n = fila.tarefas.reduce((m, t) => Math.max(m, Number(String(t.id).replace(/\D/g, '')) || 0), 0) + 1;
  const t = {
    id: 't-' + String(n).padStart(4, '0'), tipo, alvo, estado: 'pendente', tentativas: 0,
    ultimoErro: null, tentarApos: null, criada: agora(now), atualizada: agora(now),
  };
  fila.tarefas.push(t);
  return t;
}

/** Ao abrir o motor: o que estava "rodando" (o programa foi fechado no meio) volta a "pendente". */
export function recuperar(fila, now) {
  let n = 0;
  for (const t of fila.tarefas) {
    if (t.estado === 'rodando') { t.estado = 'pendente'; t.atualizada = agora(now); n++; }
  }
  return n;
}

/** Próxima tarefa que pode rodar agora (pendente e já passou a espera). */
export function proxima(fila, now) {
  const hora = (now ?? new Date()).getTime();
  return fila.tarefas.find((t) => t.estado === 'pendente' && (!t.tentarApos || new Date(t.tentarApos).getTime() <= hora)) ?? null;
}

export function iniciar(t, now) { t.estado = 'rodando'; t.atualizada = agora(now); }

export function concluir(t, now) { t.estado = 'feita'; t.ultimoErro = null; t.tentarApos = null; t.atualizada = agora(now); }

/** Falhou: espera cada vez mais. Depois de 5 tentativas vira "erro" e para de tentar sozinha. */
export function falhar(t, mensagem, now) {
  t.tentativas += 1;
  t.ultimoErro = String(mensagem).slice(0, 300);
  t.atualizada = agora(now);
  if (t.tentativas >= MAX_TENTATIVAS) {
    t.estado = 'erro';
    t.tentarApos = null;
  } else {
    t.estado = 'pendente';
    const min = ESPERA_MIN[Math.min(t.tentativas - 1, ESPERA_MIN.length - 1)];
    t.tentarApos = new Date((now ?? new Date()).getTime() + min * 60000).toISOString();
  }
}

export function cancelar(t, now) { t.estado = 'cancelada'; t.atualizada = agora(now); }

/** Dá outra chance a uma tarefa em erro (comando manual do usuário). */
export function tentarDeNovo(t, now) { t.estado = 'pendente'; t.tentativas = 0; t.tentarApos = null; t.atualizada = agora(now); }

/** Antes de planejar uma nova rodada: tira da fila as tarefas já feitas ou canceladas, para o arquivo não crescer para sempre. */
export function limparFeitas(fila) {
  const antes = fila.tarefas.length;
  fila.tarefas = fila.tarefas.filter((t) => t.estado !== 'feita' && t.estado !== 'cancelada');
  return antes - fila.tarefas.length;
}
