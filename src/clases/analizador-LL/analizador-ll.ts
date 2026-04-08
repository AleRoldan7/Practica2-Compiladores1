import { Gramatica }  from './gramatica';
import { TablaLL }    from './tablaLL';
import { NodoArbol }  from './nodo-arbol';

export interface ResultadoAnalisis {
  aceptada: boolean;
  arbol:    NodoArbol | null;
  errores:  string[];
}

export class AnalizadorLL {

  private readonly EOF     = '$';
  private readonly EPSILON = 'ε';

  constructor(
    private g:     Gramatica,
    private tabla: TablaLL
  ) {}

  analizar(tokens: string[]): ResultadoAnalisis {
    const errores: string[] = [];
    const entrada = [...tokens, this.EOF];
    let   ip      = 0;

    const raiz  = new NodoArbol(this.g.simboloInicial, false);
    const pila: Array<{ simbolo: string; nodo: NodoArbol }> = [
      { simbolo: this.EOF,              nodo: new NodoArbol(this.EOF, true) },
      { simbolo: this.g.simboloInicial, nodo: raiz }
    ];

    while (pila.length > 0) {
      const tope   = pila[pila.length - 1];
      const actual = entrada[ip];

      // ── Caso 1: ambos son EOF → aceptar ──────────────────────────────────
      if (tope.simbolo === this.EOF && actual === this.EOF) {
        pila.pop();
        break;
      }

      // ── Caso 2: tope es terminal ──────────────────────────────────────────
      if (this.g.esTerminal(tope.simbolo) || tope.simbolo === this.EOF) {
        if (tope.simbolo === actual) {
          pila.pop();
          ip++;
        } else {
          errores.push(
            `Se esperaba '${tope.simbolo}' pero se encontró '${actual}'`
          );
          pila.pop(); // recuperación: descartar tope
        }

      // ── Caso 3: tope es no terminal ───────────────────────────────────────
      } else if (this.g.esNoTerminal(tope.simbolo)) {
        const prod = this.tabla.getProduccion(tope.simbolo, actual);

        if (prod) {
          pila.pop();

          // Producción épsilon: cuerpo vacío → agregar nodo ε visual
          if (prod.cuerpo.length === 0) {
            const nodoEps = new NodoArbol(this.EPSILON, true);
            tope.nodo.agregarHijo(nodoEps);
            // No se apila nada — la producción es vacía

          } else {
            // Producción normal
            const hijos = prod.cuerpo.map(s =>
              new NodoArbol(s, this.g.esTerminal(s))
            );
            for (const h of hijos) tope.nodo.agregarHijo(h);

            // Apilar en orden inverso
            for (let i = hijos.length - 1; i >= 0; i--) {
              pila.push({ simbolo: prod.cuerpo[i], nodo: hijos[i] });
            }
          }

        } else {
          errores.push(
            `No hay producción para [${tope.simbolo}, ${actual}]`
          );
          pila.pop(); // recuperación: descartar tope
        }

      } else {
        // Símbolo desconocido — no debería ocurrir
        errores.push(`Símbolo desconocido en pila: '${tope.simbolo}'`);
        pila.pop();
      }
    }

    // Si quedaron tokens sin consumir también es error
    if (ip < entrada.length - 1) {
      errores.push(
        `Tokens sin consumir desde: '${entrada[ip]}'`
      );
    }

    return {
      aceptada: errores.length === 0,
      arbol:    errores.length === 0 ? raiz : null,
      errores
    };
  }
}