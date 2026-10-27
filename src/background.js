if (typeof importScripts === 'function' && !globalThis.Janonismo?.lista) {
  importScripts('shared/plataformas.js', 'shared/lista.js');
}

const { lista } = globalThis.Janonismo;
const ALARME = 'atualizar-lista-remota';
const INTERVALO_MIN = 6 * 60;

async function inicializar() {
  const { config } = await chrome.storage.local.get('config');
  if (!config) await chrome.storage.local.set({ config: lista.CONFIG_PADRAO });
  await lista.recalcular();
  if (!(await chrome.alarms.get(ALARME))) {
    chrome.alarms.create(ALARME, { delayInMinutes: 1, periodInMinutes: INTERVALO_MIN });
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await inicializar();
  lista.atualizarRemota();
});

chrome.runtime.onStartup.addListener(inicializar);

chrome.alarms.onAlarm.addListener((alarme) => {
  if (alarme.name === ALARME) lista.atualizarRemota();
});

chrome.runtime.onMessage.addListener((msg, _sender, responder) => {
  if (msg?.tipo === 'atualizarRemota') {
    lista.atualizarRemota().then(responder);
    return true;
  }
  if (msg?.tipo === 'recalcular') {
    lista.recalcular().then((indice) => responder({ total: Object.keys(indice).length }));
    return true;
  }
  if (msg?.tipo === 'contar') {
    chrome.storage.local.get('contador').then(({ contador = 0 }) =>
      chrome.storage.local.set({ contador: contador + 1 })
    );
  }
  return false;
});
