import { Gramatica } from './gramatica';
import { ConjuntoFirst } from './conjunto-first';

export class ConjuntoFollow {

  private follow: Map<string, Set<string>> = new Map();
  private readonly EPSILON = 'ε';
  private readonly EOF     = '$';

  constructor(private g: Gramatica, private first: ConjuntoFirst) {
    this.calcular();
  }

  private calcular() {
    for (const nt of this.g.noTerminales) {
      this.follow.set(nt, new Set());
    }
    this.follow.get(this.g.simboloInicial)!.add(this.EOF);

    let cambio = true;
    while (cambio) {
      cambio = false;
      for (const prod of this.g.producciones) {
        const { cabeza, cuerpo } = prod;

        for (let i = 0; i < cuerpo.length; i++) {
          const B = cuerpo[i];
          if (!this.g.esNoTerminal(B)) continue;

          const beta = cuerpo.slice(i + 1);
          const firstBeta = this.first.firstDeCadena(beta);
          const antes = this.follow.get(B)!.size;

          for (const x of firstBeta) {
            if (x !== this.EPSILON) this.follow.get(B)!.add(x);
          }

          if (firstBeta.has(this.EPSILON)) {
            for (const x of this.follow.get(cabeza)!) {
              this.follow.get(B)!.add(x);
            }
          }

          if (this.follow.get(B)!.size !== antes) cambio = true;
        }
      }
    }
  }

  getFollow(simbolo: string): Set<string> {
    return this.follow.get(simbolo) ?? new Set();
  }
}