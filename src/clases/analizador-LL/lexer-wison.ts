export interface TokenLexer {
  nombre: string;
  valor: string;
}

type Matcher = (input: string, pos: number) => number;

export class LexerWison {

  private reglas: { nombre: string; matcher: Matcher; prioridad: number }[] = [];
  private mapaTerminales = new Map<string, any>();

  constructor(ast: any) {

    const terminales: any[] = ast?.lex?.terminales ?? [];

    // guardar terminales
    for (const t of terminales) {
      this.mapaTerminales.set(t.nombre, t.expresion);
    }

    // detectar macros
    const usados = new Set<string>();
    for (const t of terminales) {
      this.buscarReferencias(t.expresion, usados);
    }

    // crear reglas
    for (const t of terminales) {

      if (usados.has(t.nombre)) continue;

      const matcher = this.crearMatcher(t.expresion);

      this.reglas.push({
        nombre: t.nombre,
        matcher,
        prioridad: this.calcularPrioridad(t.expresion)
      });
    }

    // ordenar reglas
    this.reglas.sort((a, b) => {

      if (a.prioridad !== b.prioridad)
        return b.prioridad - a.prioridad;

      // longest match de prueba
      const prueba =
        "DEFINE MAP MOVE IF AND ON_BORDER UP DOWN LEFT RIGHT X 12345 !~~~ [] ()";

      const la = a.matcher(prueba, 0);
      const lb = b.matcher(prueba, 0);

      return lb - la;
    });
  }


  // prioridad léxica
  private calcularPrioridad(nodo: any): number {

    if (!nodo) return 0;

    switch (nodo.tipo) {

      // palabras reservadas o símbolos exactos
      case 'Caracter':
        return 100;

      // secuencias de símbolos 
      case 'Concatenacion':
        return 95;

      // grupo
      case 'Grupo':
        return this.calcularPrioridad(nodo.expr);

      
      case 'Union':
        return 80;

      // rangos
      case 'Rango':
        return 20;

      // identificadores o números
      case 'Kleene':
      case 'CerraduraPositiva':
        return 10;

      default:
        return 1;
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


  private crearMatcher(nodo: any): Matcher {

    if (!nodo) return () => 0;

    switch (nodo.tipo) {

      // texto literal
      case 'Caracter':

        return (input, pos) => {

          const texto = nodo.valor;

          return input.startsWith(texto, pos)
            ? texto.length
            : 0;
        };


      // rangos
      case 'Rango':

        return (input, pos) => {

          if (pos >= input.length) return 0;

          const c = input[pos];

          if (nodo.valor === '[0-9]')
            return c >= '0' && c <= '9' ? 1 : 0;

          if (nodo.valor === '[a-z]')
            return c >= 'a' && c <= 'z' ? 1 : 0;

          if (nodo.valor === '[A-Z]')
            return c >= 'A' && c <= 'Z' ? 1 : 0;

          if (
            nodo.valor === '[a-zA-Z]' ||
            nodo.valor === '[A-Za-z]'
          )
            return (
              (c >= 'a' && c <= 'z') ||
              (c >= 'A' && c <= 'Z')
            ) ? 1 : 0;

          return 0;
        };


      // concatenación
      case 'Concatenacion': {

        const izq = this.crearMatcher(nodo.izq);
        const der = this.crearMatcher(nodo.der);

        return (input, pos) => {

          const l1 = izq(input, pos);

          if (l1 === 0) return 0;

          const l2 = der(input, pos + l1);

          // permitir segunda parte opcional (*)
          return l1 + l2;
        };
      }


      // unión |
      case 'Union': {

        const a = this.crearMatcher(nodo.izq);
        const b = this.crearMatcher(nodo.der);

        return (input, pos) => {

          const l1 = a(input, pos);
          const l2 = b(input, pos);

          return Math.max(l1, l2);
        };
      }


      // *
      case 'Kleene': {

        const expr = this.crearMatcher(nodo.expr);

        return (input, pos) => {

          let total = 0;

          while (true) {

            const l = expr(input, pos + total);

            if (l === 0) break;

            total += l;
          }

          return total;
        };
      }


      // +
      case 'CerraduraPositiva': {

        const expr = this.crearMatcher(nodo.expr);

        return (input, pos) => {

          let total = 0;

          let l = expr(input, pos);

          if (l === 0) return 0;

          total += l;

          while (true) {

            l = expr(input, pos + total);

            if (l === 0) break;

            total += l;
          }

          return total;
        };
      }


      // ?
      case 'Opcional': {

        const expr = this.crearMatcher(nodo.expr);

        return (input, pos) => {

          return expr(input, pos);
        };
      }


      // ()
      case 'Grupo':

        return this.crearMatcher(nodo.expr);


      // macros
      case 'ReferenciaTerminal': {

        const ref = this.mapaTerminales.get(nodo.nombre);

        return this.crearMatcher(ref);
      }
    }

    return () => 0;
  }


  tokenizar(texto: string) {

    const tokens: TokenLexer[] = [];
    const errores: string[] = [];

    let pos = 0;

    while (pos < texto.length) {

      const c = texto[pos];

      // ignorar espacios
      if (/\s/.test(c)) {
        pos++;
        continue;
      }


      // cadenas
      if (c === '"' || c === "'") {

        const comilla = c;
        let i = pos + 1;
        let contenido = "";

        while (i < texto.length && texto[i] !== comilla) {

          contenido += texto[i];
          i++;
        }

        if (i >= texto.length) {

          errores.push(
            "Cadena sin cerrar en posicion " + pos
          );

          pos++;
          continue;
        }

        tokens.push({
          nombre: "$_Cadena",
          valor: comilla + contenido + comilla
        });

        pos = i + 1;
        continue;
      }


      let mejorToken: TokenLexer | null = null;
      let mejorLongitud = 0;
      let mejorPrioridad = -1;

      for (const regla of this.reglas) {

        const l = regla.matcher(texto, pos);

        if (
          l > 0 &&
          (
            l > mejorLongitud ||
            (
              l === mejorLongitud &&
              regla.prioridad > mejorPrioridad
            )
          )
        ) {

          mejorLongitud = l;
          mejorPrioridad = regla.prioridad;

          mejorToken = {
            nombre: regla.nombre,
            valor: texto.substring(pos, pos + l)
          };
        }
      }


      if (mejorToken) {

        tokens.push(mejorToken);
        pos += mejorLongitud;

      } else {

        tokens.push({
          nombre: "SIMBOLO",
          valor: c
        });

        pos++;
      }
    }

    return { tokens, errores };
  }

}