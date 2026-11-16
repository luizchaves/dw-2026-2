import { execFile } from 'node:child_process';
import { platform } from 'node:os';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface PingResult {
  success: boolean;
  latency: number | null;
}

/**
 * Um pacote só, com timeout. Os argumentos mudam por sistema:
 *
 * - Windows: `-n` conta pacotes e `-w` espera em **milissegundos**
 * - Linux: `-c` conta pacotes e `-W` espera em **segundos**
 * - macOS/BSD: `-c` conta pacotes e `-W` espera em **milissegundos**
 */
function buildArgs(address: string, timeoutSeconds: number): string[] {
  const os = platform();

  if (os === 'win32') {
    return ['-n', '1', '-w', String(timeoutSeconds * 1000), address];
  }

  if (os === 'linux') {
    return ['-c', '1', '-W', String(timeoutSeconds), address];
  }

  return ['-c', '1', '-W', String(timeoutSeconds * 1000), address];
}

/**
 * Lê a latência da saída do comando: `time=12.3 ms`, `tempo=12,3 ms` ou
 * `time<1ms`. Sem correspondência, devolve `null`.
 */
function parseLatency(output: string): number | null {
  const match = output.match(/(?:time|tempo)[=<]\s*([\d.,]+)\s*ms/i);

  if (!match?.[1]) {
    return null;
  }

  return Math.round(Number(match[1].replace(',', '.')));
}

/**
 * Mede um host chamando o binário `ping`.
 *
 * `execFile` executa o programa **sem shell**, com os argumentos em array: um
 * endereço como `8.8.8.8; rm -rf /` chega ao `ping` como um argumento único e
 * simplesmente falha, em vez de virar dois comandos. O schema da etapa 4 é a
 * primeira linha de defesa; esta chamada é a segunda.
 *
 * Host fora do ar, DNS que não resolve ou timeout devolvem
 * `{ success: false, latency: null }` — nunca uma exceção.
 */
export async function ping(
  address: string,
  timeoutSeconds = 2,
): Promise<PingResult> {
  try {
    const { stdout } = await execFileAsync(
      'ping',
      buildArgs(address, timeoutSeconds),
      { timeout: (timeoutSeconds + 1) * 1000 },
    );

    const latency = parseLatency(stdout);

    return { success: latency !== null, latency };
  } catch {
    return { success: false, latency: null };
  }
}
