import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseCookies } from '@/utils/cookies.ts';

describe('parseCookies', () => {
  it('devolve objeto vazio quando não há cabeçalho', () => {
    assert.deepEqual(parseCookies(), {});
    assert.deepEqual(parseCookies(''), {});
  });

  it('lê um cookie', () => {
    assert.deepEqual(parseCookies('token=abc'), { token: 'abc' });
  });

  it('lê vários cookies separados por ponto e vírgula', () => {
    assert.deepEqual(parseCookies('token=abc; tema=escuro; idioma=pt-BR'), {
      token: 'abc',
      tema: 'escuro',
      idioma: 'pt-BR',
    });
  });

  it('ignora espaços em volta do nome e do valor', () => {
    assert.deepEqual(parseCookies('  token = abc  ;  tema = claro '), {
      token: 'abc',
      tema: 'claro',
    });
  });

  it('preserva o "=" dentro do valor', () => {
    // Um JWT em base64url pode terminar em "=" de padding: quebrar só no
    // primeiro "=" é o que mantém o valor inteiro.
    assert.deepEqual(parseCookies('token=a.b.c=='), { token: 'a.b.c==' });
  });

  it('decodifica valores com escape de URL', () => {
    assert.deepEqual(parseCookies('nome=Jo%C3%A3o%20Silva'), {
      nome: 'João Silva',
    });
  });

  it('devolve o valor cru quando o escape é inválido, em vez de lançar', () => {
    // Um "%" solto faria o `decodeURIComponent` lançar. O cookie vem do
    // cliente: um valor estranho não pode virar erro 500.
    assert.deepEqual(parseCookies('nome=100%'), { nome: '100%' });
  });

  it('ignora pedaços sem "=" e nomes vazios', () => {
    assert.deepEqual(parseCookies('token=abc; lixo; =sem-nome; tema=escuro'), {
      token: 'abc',
      tema: 'escuro',
    });
  });

  it('aceita valor vazio', () => {
    assert.deepEqual(parseCookies('token='), { token: '' });
  });

  it('mantém o último valor quando o nome se repete', () => {
    assert.deepEqual(parseCookies('token=antigo; token=novo'), {
      token: 'novo',
    });
  });
});
