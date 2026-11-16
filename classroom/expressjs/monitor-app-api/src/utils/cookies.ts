/**
 * Lê o cabeçalho `Cookie` sem dependência externa.
 *
 * Um cookie é entrada do cliente como qualquer outra: o resultado daqui vai
 * para o schema, não direto para o banco.
 */
export function parseCookies(header?: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  for (const pair of header?.split(';') ?? []) {
    const [name, ...rest] = pair.split('=');

    const key = name?.trim();

    if (!key || rest.length === 0) {
      continue;
    }

    const value = rest.join('=').trim();

    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      // Um `%` solto faria o `decodeURIComponent` lançar: o cookie vem do
      // cliente, então o valor cru é melhor do que um erro 500.
      cookies[key] = value;
    }
  }

  return cookies;
}
