export interface Produccion {
    cabeza: string;
    cuerpo: string[];  // [] significa producción épsilon
}

export class Gramatica {

    terminales:     Set<string> = new Set();
    noTerminales:   Set<string> = new Set();
    producciones:   Produccion[] = [];
    simboloInicial: string = '';

    // Símbolo especial para épsilon 
    static readonly EPSILON = 'ε';

    static desdeAST(ast: any): Gramatica {
        const g = new Gramatica();

        for (const t of (ast.lex?.terminales || [])) {
            if (t) g.terminales.add(t.nombre);
        }

        for (const nt of (ast.syntax?.noTerminales || [])) {
            if (nt) g.noTerminales.add(nt.nombre);
        }

        if (ast.syntax?.simboloInicial) {
            g.simboloInicial = ast.syntax.simboloInicial.nombre;
        }

        for (const prod of (ast.syntax?.producciones || [])) {
            if (!prod) continue;
            g.extraerProducciones(prod);
        }

        return g;
    }

    private extraerProducciones(prod: any) {
        this.extraerAlternativas(prod.cabeza, prod.cuerpo);
    }

    private extraerAlternativas(cabeza: string, nodo: any) {
        if (!nodo) return;

        if (nodo.tipo === 'Alternativa') {
            for (const opcion of nodo.opciones) {
                this.extraerAlternativas(cabeza, opcion);
            }
        } else if (nodo.tipo === 'Secuencia') {
            const simbolos: string[] = nodo.simbolos.map((s: any) => s.nombre);

            const esEpsilon =
                simbolos.length === 0 ||
                (simbolos.length === 1 &&
                    (simbolos[0] === '$_EPSILON' ||
                     simbolos[0] === 'ε'         ||
                     simbolos[0] === Gramatica.EPSILON));

            this.producciones.push({
                cabeza,
                cuerpo: esEpsilon ? [] : simbolos
            });
        }
    }

    esTerminal(s: string):   boolean { return this.terminales.has(s);   }
    esNoTerminal(s: string): boolean { return this.noTerminales.has(s); }
}