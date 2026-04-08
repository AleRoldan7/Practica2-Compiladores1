export interface TokenLexer {
  nombre: string;   // ej: $_ID
  valor: string;   // ej: variable
}

export class LexerWison {

  private reglas: { nombre: string; regex: RegExp }[] = [];
  private mapaTerminales = new Map<string, any>();

  constructor(ast: any) {

    const terminales: any[] = ast?.lex?.terminales ?? [];

    // 1. guardar todos los terminales en un mapa
    for (const t of terminales) {
      this.mapaTerminales.set(t.nombre, t.expresion);
    }

    // 2. detectar macros usadas dentro de otros macros
    const usados = new Set<string>();

    for (const t of terminales) {
      this._buscarReferencias(t.expresion, usados);
    }

    // 3. generar regex SOLO para los tokens finales
    for (const t of terminales) {

      // si este terminal es usado dentro de otro → es macro auxiliar
      if (usados.has(t.nombre)) continue;

      const patron = this._construirRegexExpandido(t.expresion);

      this.reglas.push({
        nombre: t.nombre,
        regex: new RegExp('^(?:' + patron + ')')
      });
    }
  }

  private _buscarReferencias(nodo: any, usados: Set<string>) {

    if (!nodo) return;

    switch (nodo.tipo) {

      case 'ReferenciaTerminal':
        usados.add(nodo.nombre);
        break;

      case 'Concatenacion':
      case 'Union':
        this._buscarReferencias(nodo.izq, usados);
        this._buscarReferencias(nodo.der, usados);
        break;

      case 'Kleene':
      case 'CerraduraPositiva':
      case 'Opcional':
      case 'Grupo':
        this._buscarReferencias(nodo.expr, usados);
        break;
    }
  }

  private _construirRegexExpandido(nodo: any): string {

    if (!nodo) return '';

    switch (nodo.tipo) {

      case 'Caracter':
        return this._escapar(nodo.valor);

      case 'Rango':
        return this._rangoARegex(nodo.valor);

      case 'Concatenacion':
        return this._construirRegexExpandido(nodo.izq)
          + this._construirRegexExpandido(nodo.der);

      case 'Union':
        return '(?:'
          + this._construirRegexExpandido(nodo.izq)
          + '|'
          + this._construirRegexExpandido(nodo.der)
          + ')';

      case 'Kleene':
        return '(?:'
          + this._construirRegexExpandido(nodo.expr)
          + ')*';

      case 'CerraduraPositiva':
        return '(?:'
          + this._construirRegexExpandido(nodo.expr)
          + ')+';

      case 'Opcional':
        return '(?:'
          + this._construirRegexExpandido(nodo.expr)
          + ')?';

      case 'Grupo':
        return '(?:'
          + this._construirRegexExpandido(nodo.expr)
          + ')';

      case 'ReferenciaTerminal':

        const ref = this.mapaTerminales.get(nodo.nombre);

        if (!ref) {
          console.warn("macro no encontrada:", nodo.nombre);
          return '';
        }

        return this._construirRegexExpandido(ref);
    }

    return '';
  }

  /**
   * Tokeniza el texto de entrada.
   * Devuelve null si encuentra un carácter que no reconoce.
   */
  tokenizar(texto: string): { tokens: TokenLexer[]; errores: string[] } {
    const tokens: TokenLexer[] = [];
    const errores: string[] = [];
    let resto = texto.trim();

    while (resto.length > 0) {
      // Ignorar espacios/tabs/saltos
      const espacios = resto.match(/^[\s]+/);
      if (espacios) {
        resto = resto.slice(espacios[0].length);
        continue;
      }

      let matchEncontrado = false;
      for (const regla of this.reglas) {
        const m = resto.match(regla.regex);
        if (m) {
          tokens.push({ nombre: regla.nombre, valor: m[0] });
          resto = resto.slice(m[0].length);
          matchEncontrado = true;
          break;
        }
      }

      if (!matchEncontrado) {
        // Carácter no reconocido — reportar y avanzar
        errores.push(`Carácter no reconocido: '${resto[0]}'`);
        resto = resto.slice(1);
      }
    }

    return { tokens, errores };
  }

  // ── Construcción de regex desde el AST de expresión regular ───────────────

  private _construirRegex(nodo: any): string {
    if (!nodo) return '';

    switch (nodo.tipo) {

      case 'Caracter':
        // 'a', 'if', 'while', etc — escapar caracteres especiales de regex
        return this._escapar(nodo.valor);

      case 'Rango':
        // [0-9], [aA-zZ], [a-z], [A-Z]
        return this._rangoARegex(nodo.valor);

      case 'Kleene':
        return '(?:' + this._construirRegex(nodo.expr) + ')*';

      case 'CerraduraPositiva':
        return '(?:' + this._construirRegex(nodo.expr) + ')+';

      case 'Opcional':
        return '(?:' + this._construirRegex(nodo.expr) + ')?';

      case 'Concatenacion':
        return this._construirRegex(nodo.izq) + this._construirRegex(nodo.der);

      case 'Union':
        return '(?:' + this._construirRegex(nodo.izq) + '|' + this._construirRegex(nodo.der) + ')';

      case 'Grupo':
        return '(?:' + this._construirRegex(nodo.expr) + ')';

      case 'ReferenciaTerminal':
        // Referencia a otro terminal — buscar su regex ya compilada
        const regla = this.reglas.find(r => r.nombre === nodo.nombre);
        if (regla) {
          // Extraer el patrón interno del regex (quitar el ^(?:...) wrapper)
          const src = regla.regex.source;
          return src.slice(4, src.length - 1); // quita '^(?:' y ')'
        }
        return this._escapar(nodo.nombre);

      default:
        return '';
    }
  }

  private _rangoARegex(valor: string): string {
    switch (valor) {
      case '[0-9]': return '[0-9]';
      case '[a-z]': return '[a-z]';
      case '[A-Z]': return '[A-Z]';
      case '[aA-zZ]': return '[a-zA-Z]';
      default: return valor;
    }
  }

  private _escapar(s: string): string {
    // Escapa caracteres especiales de regex
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}