import { spawn, exec } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('[1/2] Iniciando o servidor Gerente de Lavagem...');
const serverProc = spawn('node', ['server/index.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true,
});

serverProc.on('error', (err) => {
  console.error('Erro no servidor:', err);
});

let browserOpened = false;

setTimeout(() => {
  console.log('[2/2] Gerando link público seguro (HTTPS) com Cloudflare...');
  const tunnel = spawn('npx.cmd', ['--yes', 'cloudflared', 'tunnel', '--url', 'http://127.0.0.1:3001'], {
    shell: true,
  });

  tunnel.stdout.on('data', (d) => process.stdout.write(d));
  tunnel.stderr.on('data', (d) => {
    const text = d.toString();
    const match = text.match(/https:\/\/[a-z0-9\-]+\.trycloudflare\.com/i);
    if (match && !browserOpened) {
      browserOpened = true;
      const url = match[0];
      console.log('\n========================================================');
      console.log(' SEU APLICATIVO ESTÁ ONLINE! LINK DE ACESSO:');
      console.log(' 👉 ' + url);
      console.log(' (Você e seus funcionários podem abrir este link no celular ou PC)');
      console.log('========================================================\n');
      try {
        exec(`start ${url}`);
      } catch {}
    } else if (!match) {
      process.stderr.write(d);
    }
  });

  tunnel.on('close', (code) => {
    console.log('Tunnel encerrado:', code);
  });
}, 2000);
