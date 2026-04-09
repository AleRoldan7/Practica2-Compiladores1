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

// Error semántico detallado
export interface ErrorSemantico {
  tipo:    'AMBIGUEDAD' | 'RECURSIVIDAD_IZQUIERDA' | 'FALTA_FACTORIZACION' | 'COLISION';
  mensaje: string;
  detalle: string;
}

@Injectable({ providedIn: 'root' })
export class WisonService {

  analizadores: AnalizadorGuardado[] = [];
  manejador = new ManejoErrores();

  constructor() { this.cargarDesdeStorage(); }

  // Construcción desde AST
  construirDesdeAST(ast: any, nombre: string): string[] {
    const g      = Gramatica.desdeAST(ast);
    const first  = new ConjuntoFirst(g);
    const follow = new ConjuntoFollow(g, first);
    const tabla  = new TablaLL(g, first, follow);
    const lexer  = new LexerWison(ast);

    if (!tabla.esLL1) {
      // Analizar cada colisión 
      return this._analizarColisiones(tabla.colisiones, g);
    }

    const entrada: AnalizadorGuardado = { nombre, gramatica: g, first, follow, tabla, lexer, ast };
    const idx = this.analizadores.findIndex(a => a.nombre === nombre);
    if (idx >= 0) this.analizadores[idx] = entrada;
    else          this.analizadores.push(entrada);

    this.guardarEnStorage();
    return [];
  }

  /**
   * Analiza las colisiones de la tabla LL y determina la causa probable:
   * recursividad izquierda, falta de factorización o ambigüedad.
   */
  private _analizarColisiones(colisiones: string[], g: Gramatica): string[] {
    const mensajes: string[] = [];

    // Detectar recursividad izquierda directa
    for (const prod of g.producciones) {
      if (prod.cuerpo.length > 0 && prod.cuerpo[0] === prod.cabeza) {
        mensajes.push(
          `[RECURSIVIDAD IZQUIERDA] La producción '${prod.cabeza}' se llama a sí misma ` +
          `como primer símbolo: ${prod.cabeza} → ${prod.cuerpo.join(' ')}. ` +
          `Solución: eliminar la recursividad usando una producción auxiliar (ej: ${prod.cabeza}_PRIMA).`
        );
      }
    }

    // Detectar falta de factorización (dos alternativas con mismo primer símbolo)
    const cabezas = new Map<string, string[][]>();
    for (const prod of g.producciones) {
      if (!cabezas.has(prod.cabeza)) cabezas.set(prod.cabeza, []);
      cabezas.get(prod.cabeza)!.push(prod.cuerpo);
    }

    for (const [cabeza, cuerpos] of cabezas) {
      const primeros = new Map<string, string[][]>();
      for (const cuerpo of cuerpos) {
        if (cuerpo.length === 0) continue;
        const p = cuerpo[0];
        if (!primeros.has(p)) primeros.set(p, []);
        primeros.get(p)!.push(cuerpo);
      }
      for (const [primero, alts] of primeros) {
        if (alts.length > 1) {
          const altsStr = alts.map(a => a.join(' ')).join(' | ');
          mensajes.push(
            `[FALTA DE FACTORIZACIÓN] El no terminal '${cabeza}' tiene múltiples alternativas ` +
            `que comienzan con '${primero}': ${cabeza} → ${altsStr}. ` +
            `Solución: factorizar extrayendo el prefijo común en un nuevo no terminal.`
          );
        }
      }
    }

    //Si no detectó causa específica, reportar la colisión genérica
    if (mensajes.length === 0) {
      for (const col of colisiones) {
        mensajes.push(
          `[AMBIGÜEDAD / COLISIÓN] ${col}. ` +
          `La gramática no es LL(1). Revisa que no haya ambigüedad, ` +
          `recursividad por la izquierda ni prefijos comunes sin factorizar.`
        );
      }
    }

    return mensajes;
  }

  // Analizar cadena modo tokens manuales 
  analizarCadena(nombreAnalizador: string, tokens: string[]) {
    const a = this.analizadores.find(x => x.nombre === nombreAnalizador);
    if (!a) return null;
    const ll = new AnalizadorLL(a.gramatica, a.tabla);
    return ll.analizar(tokens, tokens);
  }

  // Analizar texto real 
  analizarTexto(nombreAnalizador: string, texto: string) {
    const a = this.analizadores.find(x => x.nombre === nombreAnalizador);
    if (!a) return null;

    const { tokens, errores: erroresLex } = a.lexer.tokenizar(texto);

    if (erroresLex.length > 0) {
      return {
        aceptada: false, arbol: null,
        errores: erroresLex,
        erroresLL: erroresLex.map((m, i) => ({
          tipo: 'LEXICO' as const, mensaje: m, token: '', posicion: i
        })),
        tokens
      };
    }

    const nombresTokens = tokens.map(t => t.nombre);
    const valoresReales = tokens.map(t => t.valor);
    const ll  = new AnalizadorLL(a.gramatica, a.tabla);
    const res = ll.analizar(nombresTokens, valoresReales);
    return { ...res, tokens };
  }

  // Obtener info completa de un analizador 
  getInfoAnalizador(nombre: string) {
    const a = this.analizadores.find(x => x.nombre === nombre);
    if (!a) return null;

    // Terminales con su regex legible desde el AST
    const terminales = (a.ast?.lex?.terminales ?? [])
      .filter((t: any) => t)
      .map((t: any) => ({
        nombre: t.nombre,
        regex:  this.regexLegible(t.expresion)
      }));

    // Producciones legibles
    const producciones = a.gramatica.producciones.map(p => ({
      cabeza: p.cabeza,
      cuerpo: p.cuerpo.length === 0 ? 'ε' : p.cuerpo.join(' ')
    }));

    return { terminales, producciones };
  }

  private regexLegible(nodo: any): string {
    if (!nodo) return '';
    switch (nodo.tipo) {
      case 'Caracter':         return `'${nodo.valor}'`;
      case 'Rango':            return nodo.valor;
      case 'Kleene':           return `(${this.regexLegible(nodo.expr)})*`;
      case 'CerraduraPositiva':return `(${this.regexLegible(nodo.expr)})+`;
      case 'Opcional':         return `(${this.regexLegible(nodo.expr)})?`;
      case 'Concatenacion':    return this.regexLegible(nodo.izq) + this.regexLegible(nodo.der);
      case 'Union':            return `${this.regexLegible(nodo.izq)} | ${this.regexLegible(nodo.der)}`;
      case 'Grupo':            return `(${this.regexLegible(nodo.expr)})`;
      case 'ReferenciaTerminal': return nodo.nombre;
      default:                 return '';
    }
  }

  eliminar(nombre: string): void {
    this.analizadores = this.analizadores.filter(a => a.nombre !== nombre);
    this.guardarEnStorage();
  }

  private guardarEnStorage(): void {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(
        this.analizadores.map(a => ({ nombre: a.nombre, ast: a.ast }))
      ));
    } catch (e) { console.warn('localStorage error:', e); }
  }

  private cargarDesdeStorage(): void {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      for (const { nombre, ast } of JSON.parse(raw)) {
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