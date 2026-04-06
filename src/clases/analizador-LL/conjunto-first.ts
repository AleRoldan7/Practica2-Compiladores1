import { Gramatica } from "./gramatica";

export class ConjuntoFirst {

    private first: Map<string, Set<string>> = new Map();
    private readonly EPSILON = 'ε';

    constructor(private gramatica: Gramatica) {
        this.calcularFirst();
    }

    private calcularFirst() {

        for (const nt of this.gramatica.noTerminales) {
            this.first.set(nt, new Set());
        }
        for (const t of this.gramatica.terminales) {
            this.first.set(t, new Set([t]));
        }

        let cambio = true;
        while (cambio) {
            cambio = false;
            for (const prod of this.gramatica.producciones) {
                const antes = this.first.get(prod.cabeza)!.size;
                const firstCuerpo = this.firstDeCadena(prod.cuerpo);
                for (const s of firstCuerpo) {
                    this.first.get(prod.cabeza)!.add(s);
                }
                if (this.first.get(prod.cabeza)!.size !== antes) cambio = true;
            }
        }
    }

    firstDeCadena(simbolos: string[]): Set<string> {
        const resultado: Set<string> = new Set();
        if (simbolos.length === 0) {
            resultado.add(this.EPSILON);
            return resultado;
        }

        for (const s of simbolos) {
            const fs = this.first.get(s) ?? new Set([s]);
            for (const x of fs) {
                if (x !== this.EPSILON) resultado.add(x);
            }
            if (!fs.has(this.EPSILON)) break;
            // Si llegamos al último y tiene epsilon
            if (s === simbolos[simbolos.length - 1]) {
                resultado.add(this.EPSILON);
            }
        }
        return resultado;
    }

    getFirst(simbolo: string): Set<string> {
        return this.first.get(simbolo) ?? new Set([simbolo]);
    }
}