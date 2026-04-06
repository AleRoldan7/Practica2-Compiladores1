export interface Produccion {
    cabeza: string;
    cuerpo: string[];
}

export class Gramatica {

    terminales:     Set<string> = new Set();
    noTerminales:   Set<string> = new Set();
    producciones:   Produccion[] = [];
    simboloInicial: string = '';

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
        const cabeza = prod.cabeza;
        const cuerpo = prod.cuerpo;
        this.extraerAlternativas(cabeza, cuerpo);
    }

    private extraerAlternativas(cabeza: string, nodo: any) {
        if (!nodo) return;

        if (nodo.tipo === 'Alternativa') {
            for (const opcion of nodo.opciones) {
                this.extraerAlternativas(cabeza, opcion);
            }
        } else if (nodo.tipo === 'Secuencia') {
            const cuerpo = nodo.simbolos.map((s: any) => s.nombre);
            this.producciones.push({ cabeza, cuerpo });
        }
    }

    esTerminal(s: string):   boolean { return this.terminales.has(s);   }
    esNoTerminal(s: string): boolean { return this.noTerminales.has(s); }
}