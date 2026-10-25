import localtunnel from 'localtunnel';

const PORT = 3001;
const SUBDOMAIN = 'gentle-crabs-change';

let activeTunnel = null;
let isConnecting = false;

async function connect() {
  if (isConnecting) return;
  isConnecting = true;

  try {
    if (activeTunnel) {
      try {
        activeTunnel.close();
      } catch {}
      activeTunnel = null;
    }

    console.log(`[Tunnel] Solicitando https://${SUBDOMAIN}.loca.lt...`);
    const tunnel = await localtunnel({
      port: PORT,
      subdomain: SUBDOMAIN,
    });

    if (tunnel.url !== `https://${SUBDOMAIN}.loca.lt`) {
      console.warn(`[Tunnel] Servidor loca.lt ainda liberando socket anterior (${tunnel.url}). Aguardando 10s para fixar https://${SUBDOMAIN}.loca.lt...`);
      tunnel.close();
      activeTunnel = null;
      setTimeout(connect, 10000);
      return;
    }

    activeTunnel = tunnel;
    console.log(`[Tunnel] Online e fixado com sucesso: ${tunnel.url}`);

    tunnel.on('close', () => {
      console.warn('[Tunnel] Conexao encerrada pelo servidor. Reconectando...');
      activeTunnel = null;
      setTimeout(connect, 3000);
    });

    tunnel.on('error', (err) => {
      console.error('[Tunnel] Erro detectado:', err?.message || err);
      activeTunnel = null;
      setTimeout(connect, 4000);
    });
  } catch (err) {
    console.error('[Tunnel] Falha na abertura:', err?.message || err);
    setTimeout(connect, 5000);
  } finally {
    isConnecting = false;
  }
}

// Monitor Ativo: Garante que o Event Loop nunca feche e testa a saude a cada 20s
setInterval(async () => {
  if (!activeTunnel) {
    connect();
    return;
  }

  try {
    const res = await fetch(`https://${SUBDOMAIN}.loca.lt/api/status`, {
      headers: { 'Bypass-Tunnel-Reminder': 'true' },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      console.warn(`[Monitor] Resposta invalida (${res.status}). Forcando reconexao...`);
      connect();
    }
  } catch (err) {
    console.warn(`[Monitor] Ping falhou (${err.message}). Reconectando tunel...`);
    connect();
  }
}, 20000);

process.on('uncaughtException', (err) => {
  console.error('[Tunnel uncaughtException]:', err?.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Tunnel unhandledRejection]:', reason);
});

connect();
