import { Injectable } from '@angular/core';
import { Gramatica } from '../../clases/analizador-LL/gramatica';
import { ConjuntoFirst } from '../../clases/analizador-LL/conjunto-first';
import { ConjuntoFollow } from '../../clases/analizador-LL/conjunto-follow';
import { TablaLL } from '../../clases/analizador-LL/tablaLL';
import { AnalizadorLL } from '../../clases/analizador-LL/analizador-ll';
import { LexerWison } from '../../clases/analizador-LL/lexer-wison';
import { ManejoErrores } from '../../clases/manejo-errores/errores';

const LS_KEY = 'wison_analizadores';

export interface AnalizadorGuardado {
  nombre:    string;
  gramatica: Gramatica;
  first:     ConjuntoFirst;
  follow:    ConjuntoFollow;
  tabla:     TablaLL;
  lexer:     LexerWison;
  ast:       any;
}

@Injectable({ providedIn: 'root' })
export class WisonService {

  analizadores: AnalizadorGuardado[] = [];
  manejador = new ManejoErrores();

  constructor() { this.cargarDesdeStorage(); }

  construirDesdeAST(ast: any, nombre: string): string[] {
    const errores: string[] = [];
    const g      = Gramatica.desdeAST(ast);
    const first  = new ConjuntoFirst(g);
    const follow = new ConjuntoFollow(g, first);
    const tabla  = new TablaLL(g, first, follow);
    const lexer  = new LexerWison(ast);

    if (!tabla.esLL1) {
      errores.push(...tabla.colisiones);
      return errores;
    }

    const entrada: AnalizadorGuardado = { nombre, gramatica: g, first, follow, tabla, lexer, ast };
    const idx = this.analizadores.findIndex(a => a.nombre === nombre);
    if (idx >= 0) this.analizadores[idx] = entrada;
    else          this.analizadores.push(entrada);

    this.guardarEnStorage();
    return errores;
  }

  // Modo tokens manuales: "$_ID $_Mas $_ID"
  analizarCadena(nombreAnalizador: string, tokens: string[]) {
    const a = this.analizadores.find(x => x.nombre === nombreAnalizador);
    if (!a) return null;
    const ll = new AnalizadorLL(a.gramatica, a.tabla);
    // En modo manual el valor = el propio nombre del token
    return ll.analizar(tokens, tokens);
  }

  //Modo texto real: "variable + variable" 
  analizarTexto(nombreAnalizador: string, texto: string) {
    const a = this.analizadores.find(x => x.nombre === nombreAnalizador);
    if (!a) return null;

    const { tokens, errores: erroresLex } = a.lexer.tokenizar(texto);

    if (erroresLex.length > 0) {
      return { aceptada: false, arbol: null, errores: erroresLex,
               erroresLL: erroresLex.map((m, i) => ({
                 tipo: 'LEXICO' as const, mensaje: m, token: '', posicion: i
               })),
               tokens };
    }

    const nombresTokens  = tokens.map(t => t.nombre);
    const valoresReales  = tokens.map(t => t.valor);  

    const ll  = new AnalizadorLL(a.gramatica, a.tabla);
    const res = ll.analizar(nombresTokens, valoresReales);

    return { ...res, tokens };
  }

  eliminar(nombre: string): void {
    this.analizadores = this.analizadores.filter(a => a.nombre !== nombre);
    this.guardarEnStorage();
  }

  private guardarEnStorage(): void {
    try {
      const payload = this.analizadores.map(a => ({ nombre: a.nombre, ast: a.ast }));
      localStorage.setItem(LS_KEY, JSON.stringify(payload));
    } catch (e) { console.warn('localStorage error:', e); }
  }

  private cargarDesdeStorage(): void {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const payload: { nombre: string; ast: any }[] = JSON.parse(raw);
      for (const { nombre, ast } of payload) {
        try {
          const g      = Gramatica.desdeAST(ast);
          const first  = new ConjuntoFirst(g);
          const follow = new ConjuntoFollow(g, first);
          const tabla  = new TablaLL(g, first, follow);
          const lexer  = new LexerWison(ast);
          if (tabla.esLL1)
            this.analizadores.push({ nombre, gramatica: g, first, follow, tabla, lexer, ast });
        } catch (e) { console.warn(`No se pudo reconstruir "${nombre}":`, e); }
      }
    } catch (e) { console.warn('Error al leer localStorage:', e); }
  }
}