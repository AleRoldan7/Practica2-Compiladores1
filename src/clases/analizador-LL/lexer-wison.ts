export interface TokenLexer {
  nombre: string;   // ej: $_ID
  valor: string;   // ej: variable
}

export class LexerWison {

  private reglas: { nombre: string; regex: RegExp }[] = [];
  private mapaTerminales = new Map<string, any>();

  constructor(ast: any) {

    const terminales: any[] = ast?.lex?.terminales ?? [];

    //guarda todos los terminales en un mapa
    for (const t of terminales) {
      this.mapaTerminales.set(t.nombre, t.expresion);
    }

    //detectar macros usadas dentro de otros macros
    const usados = new Set<string>();

    for (const t of terminales) {
      this.buscarReferencias(t.expresion, usados);
    }

    // generar ER SOLO para los tokens finales
    for (const t of terminales) {

      // si este terminal es usado dentro de otro es una macro
      if (usados.has(t.nombre)) continue;

      const patron = this.construirERExpandida(t.expresion);

      this.reglas.push({
        nombre: t.nombre,
        regex: new RegExp('^(?:' + patron + ')')
      });
    }
  }

  private buscarReferencias(nodo: any, usados: Set<string>) {

    if (!nodo) return;

    switch (nodo.tipo) {

      case 'ReferenciaTerminal':
        usados.add(nodo.nombre);
        break;

      case 'Concatenacion':
      case 'Union':
        this.buscarReferencias(nodo.izq, usados);
        this.buscarReferencias(nodo.der, usados);
        break;

      case 'Kleene':
      case 'CerraduraPositiva':
      case 'Opcional':
      case 'Grupo':
        this.buscarReferencias(nodo.expr, usados);
        break;
    }
  }

  private construirERExpandida(nodo: any): string {

    if (!nodo) return '';

    switch (nodo.tipo) {

      case 'Caracter':
        return this.escapar(nodo.valor);

      case 'Rango':
        return this.rangoER(nodo.valor);

      case 'Concatenacion':
        return this.construirERExpandida(nodo.izq)
          + this.construirERExpandida(nodo.der);

      case 'Union':
        return '(?:'
          + this.construirERExpandida(nodo.izq)
          + '|'
          + this.construirERExpandida(nodo.der)
          + ')';

      case 'Kleene':
        return '(?:'
          + this.construirERExpandida(nodo.expr)
          + ')*';

      case 'CerraduraPositiva':
        return '(?:'
          + this.construirERExpandida(nodo.expr)
          + ')+';

      case 'Opcional':
        return '(?:'
          + this.construirERExpandida(nodo.expr)
          + ')?';

      case 'Grupo':
        return '(?:'
          + this.construirERExpandida(nodo.expr)
          + ')';

      case 'ReferenciaTerminal':

        const ref = this.mapaTerminales.get(nodo.nombre);

        if (!ref) {
          console.warn("macro no encontrada:", nodo.nombre);
          return '';
        }

        return this.construirERExpandida(ref);
    }

    return '';
  }


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

  // ── Construcción de regex desde el AST de expresión regular 

  private _construirRegex(nodo: any): string {
    if (!nodo) return '';

    switch (nodo.tipo) {

      case 'Caracter':
        // 'a', 'if', 'while'
        return this.escapar(nodo.valor);

      case 'Rango':
        // [0-9], [aA-zZ], [a-z], [A-Z]
        return this.rangoER(nodo.valor);

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
        // Referencia a otro terminal 
        const regla = this.reglas.find(r => r.nombre === nodo.nombre);
        if (regla) {
          // Extraer el patrón interno del regex 
          const src = regla.regex.source;
          return src.slice(4, src.length - 1); // quita '^(?:' y ')'
        }
        return this.escapar(nodo.nombre);

      default:
        return '';
    }
  }

  private rangoER(valor: string): string {
    switch (valor) {
      case '[0-9]': return '[0-9]';
      case '[a-z]': return '[a-z]';
      case '[A-Z]': return '[A-Z]';
      case '[aA-zZ]': return '[a-zA-Z]';
      default: return valor;
    }
  }

  private escapar(s: string): string {
    // Escapa caracteres especiales de regex
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}