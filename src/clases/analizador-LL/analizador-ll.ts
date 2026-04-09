import { Gramatica }  from './gramatica';
import { TablaLL }    from './tablaLL';
import { NodoArbol }  from './nodo-arbol';

export type TipoErrorLL = 'LEXICO' | 'SINTACTICO' | 'SEMANTICO';

export interface ErrorLL {
  tipo:     TipoErrorLL;
  mensaje:  string;
  token:    string;
  posicion: number;
}

export interface ResultadoAnalisis {
  aceptada:  boolean;
  arbol:     NodoArbol | null;
  errores:   string[];
  erroresLL: ErrorLL[];
}

export class AnalizadorLL {

  private readonly EOF     = '$';
  private readonly EPSILON = 'ε';
  private readonly MAX_ERR = 20;

  constructor(
    private g:     Gramatica,
    private tabla: TablaLL
  ) {}

  
  analizar(tokens: string[], valoresReales: string[] = []): ResultadoAnalisis {
    const erroresLL: ErrorLL[] = [];
    const entrada = [...tokens, this.EOF];
    let ip = 0;

    const raiz = new NodoArbol(this.g.simboloInicial, false);
    const pila: Array<{ simbolo: string; nodo: NodoArbol }> = [
      { simbolo: this.EOF,              nodo: new NodoArbol(this.EOF, true, this.EOF) },
      { simbolo: this.g.simboloInicial, nodo: raiz }
    ];

    // validación léxica 
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (!this.g.esTerminal(t) && !this.g.esNoTerminal(t)) {
        erroresLL.push({
          tipo:    'LEXICO',
          mensaje: `Token '${t}' no está declarado en la gramática`,
          token:    t,
          posicion: i
        });
      }
    }

    // análisis LL 
    while (pila.length > 0 && erroresLL.length < this.MAX_ERR) {
      const tope   = pila[pila.length - 1];
      const actual = entrada[ip];

      if (tope.simbolo === this.EOF && actual === this.EOF) {
        pila.pop();
        break;
      }

      // Terminal en tope
      if (this.g.esTerminal(tope.simbolo) || tope.simbolo === this.EOF) {
        if (tope.simbolo === actual) {
          // Asignar el valor real al nodo hoja cuando coincide
          tope.nodo.valor = valoresReales[ip] ?? actual;
          pila.pop();
          ip++;
        } else {
          erroresLL.push({
            tipo:    'SINTACTICO',
            mensaje: `Se esperaba '${tope.simbolo}' pero se encontró '${actual}' (posición ${ip})`,
            token:    actual,
            posicion: ip
          });
          if (this.tokenEnPila(actual, pila)) {
            pila.pop();
          } else {
            ip++;
          }
        }

      // No terminal en tope
      } else if (this.g.esNoTerminal(tope.simbolo)) {
        const prod = this.tabla.getProduccion(tope.simbolo, actual);

        if (prod) {
          pila.pop();

          if (prod.cuerpo.length === 0) {
            tope.nodo.agregarHijo(new NodoArbol(this.EPSILON, true, this.EPSILON));
          } else {
            const hijos = prod.cuerpo.map(s =>
              new NodoArbol(s, this.g.esTerminal(s))
            );
            for (const h of hijos) tope.nodo.agregarHijo(h);
            for (let i = hijos.length - 1; i >= 0; i--) {
              pila.push({ simbolo: prod.cuerpo[i], nodo: hijos[i] });
            }
          }

        } else {
          erroresLL.push({
            tipo:    'SINTACTICO',
            mensaje: `No existe producción para [${tope.simbolo}, '${actual}'] (posición ${ip})`,
            token:    actual,
            posicion: ip
          });
          const filaActual = this.tabla.tabla.get(tope.simbolo);
          if (filaActual?.has(actual)) {
            pila.pop();
          } else {
            pila.pop();
            while (ip < entrada.length - 1 &&
                   !this.esSincronizador(entrada[ip], pila)) {
              ip++;
            }
          }
        }

      } else {
        erroresLL.push({
          tipo:    'SEMANTICO',
          mensaje: `Símbolo desconocido en pila: '${tope.simbolo}'`,
          token:    tope.simbolo,
          posicion: ip
        });
        pila.pop();
      }
    }

    //tokens sobrantes 
    if (ip < entrada.length - 1 && erroresLL.length < this.MAX_ERR) {
      erroresLL.push({
        tipo:    'SINTACTICO',
        mensaje: `Tokens sin consumir desde posición ${ip}: '${entrada[ip]}'`,
        token:    entrada[ip],
        posicion: ip
      });
    }

    if (erroresLL.length >= this.MAX_ERR) {
      erroresLL.push({
        tipo:    'SINTACTICO',
        mensaje: `Límite de ${this.MAX_ERR} errores alcanzado.`,
        token:    '',
        posicion: ip
      });
    }

    const aceptada = erroresLL.length === 0;
    return {
      aceptada,
      arbol:     aceptada ? raiz : null,
      errores:   erroresLL.map(e => `[${e.tipo}] ${e.mensaje}`),
      erroresLL
    };
  }

  private tokenEnPila(
    token: string,
    pila:  Array<{ simbolo: string; nodo: NodoArbol }>
  ): boolean {
    return pila.some(e => e.simbolo === token);
  }

  private esSincronizador(
    token: string,
    pila:  Array<{ simbolo: string; nodo: NodoArbol }>
  ): boolean {
    for (const elem of pila) {
      if (!this.g.esNoTerminal(elem.simbolo)) continue;
      if (this.tabla.tabla.get(elem.simbolo)?.has(token)) return true;
    }
    return token === this.EOF;
  }
}