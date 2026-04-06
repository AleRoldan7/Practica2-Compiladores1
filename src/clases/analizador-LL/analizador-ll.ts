import { Gramatica }  from './gramatica';
import { TablaLL }    from './tablaLL';
import { NodoArbol }  from './nodo-arbol';

export interface ResultadoAnalisis {
  aceptada: boolean;
  arbol:    NodoArbol | null;
  errores:  string[];
}

export class AnalizadorLL {

  private readonly EOF = '$';

  constructor(
    private g:      Gramatica,
    private tabla:  TablaLL
  ) {}

  analizar(tokens: string[]): ResultadoAnalisis {
    const errores: string[] = [];
    const entrada = [...tokens, this.EOF];
    let   ip      = 0;

    const raiz  = new NodoArbol(this.g.simboloInicial);
    const pila: Array<{ simbolo: string; nodo: NodoArbol }> = [
      { simbolo: this.EOF,              nodo: new NodoArbol(this.EOF, true) },
      { simbolo: this.g.simboloInicial, nodo: raiz }
    ];

    while (pila.length > 0) {
      const tope    = pila[pila.length - 1];
      const actual  = entrada[ip];

      if (tope.simbolo === this.EOF && actual === this.EOF) {
        pila.pop();
        break;
      }

      if (this.g.esTerminal(tope.simbolo) || tope.simbolo === this.EOF) {
        if (tope.simbolo === actual) {
          pila.pop();
          ip++;
        } else {
          errores.push(`Error: se esperaba '${tope.simbolo}' pero se encontró '${actual}' `);
          ip++; // recuperación
        }

      } else if (this.g.esNoTerminal(tope.simbolo)) {
        const prod = this.tabla.getProduccion(tope.simbolo, actual);

        if (prod) {
          pila.pop();
          const simbolos = prod.cuerpo.filter(s => s !== 'ε');

          // Agregar hijos al nodo
          const hijos = simbolos.map(s =>
            new NodoArbol(s, this.g.esTerminal(s))
          );
          for (const h of hijos) tope.nodo.agregarHijo(h);

          // Apilar en orden inverso
          for (let i = hijos.length - 1; i >= 0; i--) {
            pila.push({ simbolo: simbolos[i], nodo: hijos[i] });
          }

        } else {
          errores.push(
            `Error: no hay producción para [${tope.simbolo}, ${actual}]`
          );
          pila.pop(); // recuperación
        }
      }
    }

    return {
      aceptada: errores.length === 0,
      arbol:    errores.length === 0 ? raiz : null,
      errores
    };
  }
}