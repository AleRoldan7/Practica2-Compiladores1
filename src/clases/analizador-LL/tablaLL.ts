import { Gramatica, Produccion } from './gramatica';
import { ConjuntoFirst }  from './conjunto-first';
import { ConjuntoFollow } from './conjunto-follow';

export interface CeldaTabla {
  produccion: Produccion;
  colision:   boolean;
}

export class TablaLL {

  tabla:     Map<string, Map<string, CeldaTabla>> = new Map();
  colisiones: string[] = [];
  private readonly EPSILON = 'ε';
  private readonly EOF     = '$';

  constructor(
    private g:      Gramatica,
    private first:  ConjuntoFirst,
    private follow: ConjuntoFollow
  ) {
    this.construir();
  }

  private construir() {
    for (const nt of this.g.noTerminales) {
      this.tabla.set(nt, new Map());
    }

    for (const prod of this.g.producciones) {
      const firstAlpha = this.first.firstDeCadena(prod.cuerpo);

      for (const a of firstAlpha) {
        if (a !== this.EPSILON) {
          this.insertar(prod.cabeza, a, prod);
        }
      }

      if (firstAlpha.has(this.EPSILON)) {
        for (const b of this.follow.getFollow(prod.cabeza)) {
          this.insertar(prod.cabeza, b, prod);
        }
      }
    }
  }

  private insertar(nt: string, terminal: string, prod: Produccion) {
    const fila = this.tabla.get(nt)!;
    if (fila.has(terminal)) {
      // Colisión — gramática no es LL(1)
      fila.get(terminal)!.colision = true;
      this.colisiones.push(
        `Colisión en [${nt}, ${terminal}]: ya existe producción`
      );
    } else {
      fila.set(terminal, { produccion: prod, colision: false });
    }
  }

  get esLL1(): boolean { return this.colisiones.length === 0; }

  getProduccion(nt: string, terminal: string): Produccion | null {
    return this.tabla.get(nt)?.get(terminal)?.produccion ?? null;
  }
}