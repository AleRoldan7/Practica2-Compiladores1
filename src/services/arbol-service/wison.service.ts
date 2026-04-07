// src/services/arbol-service/wison.service.ts
import { Injectable } from '@angular/core';
import { Gramatica } from '../../clases/analizador-LL/gramatica';
import { ConjuntoFirst } from '../../clases/analizador-LL/conjunto-first';
import { ConjuntoFollow } from '../../clases/analizador-LL/conjunto-follow';
import { TablaLL } from '../../clases/analizador-LL/tablaLL';
import { AnalizadorLL } from '../../clases/analizador-LL/analizador-ll';
import { ManejoErrores } from '../../clases/manejo-errores/errores';

// ─── Clave en localStorage ────────────────────────────────────────────────────
const LS_KEY = 'wison_analizadores';

export interface AnalizadorGuardado {
  nombre: string;
  gramatica: Gramatica;
  first: ConjuntoFirst;
  follow: ConjuntoFollow;
  tabla: TablaLL;
  /** AST original, se persiste para poder reconstruir al recargar */
  ast: any;
}

@Injectable({ providedIn: 'root' })
export class WisonService {

  analizadores: AnalizadorGuardado[] = [];
  manejador = new ManejoErrores();
  ultimoAST: any = null;
  ultimoNombre: string = '';

  constructor() {
    this._cargarDesdeStorage();
  }

  // ─── Construcción desde AST ───────────────────────────────────────────────
  construirDesdeAST(ast: any, nombre: string): string[] {
    this.ultimoAST    = ast;
    this.ultimoNombre = nombre;
    const errores: string[] = [];

    const g      = Gramatica.desdeAST(ast);
    const first  = new ConjuntoFirst(g);
    const follow = new ConjuntoFollow(g, first);
    const tabla  = new TablaLL(g, first, follow);

    if (!tabla.esLL1) {
      errores.push(...tabla.colisiones);
      return errores;
    }

    const entrada: AnalizadorGuardado = { nombre, gramatica: g, first, follow, tabla, ast };
    const idx = this.analizadores.findIndex(a => a.nombre === nombre);
    if (idx >= 0) {
      this.analizadores[idx] = entrada;
    } else {
      this.analizadores.push(entrada);
    }

    this._guardarEnStorage();
    return errores;
  }

  // ─── Análisis de cadena ───────────────────────────────────────────────────
  analizarCadena(nombreAnalizador: string, tokens: string[]) {
    const a = this.analizadores.find(x => x.nombre === nombreAnalizador);
    if (!a) {
      console.error('Analizador no encontrado:', nombreAnalizador);
      return null;
    }
    const ll = new AnalizadorLL(a.gramatica, a.tabla);
    return ll.analizar(tokens);
  }

  // ─── Eliminar analizador ──────────────────────────────────────────────────
  eliminar(nombre: string): void {
    this.analizadores = this.analizadores.filter(a => a.nombre !== nombre);
    this._guardarEnStorage();
  }

  // ─── Persistencia ─────────────────────────────────────────────────────────

  /**
   * Guarda sólo los ASTs (son objetos planos serializables).
   * Al recuperarlos los reconstruye con Gramatica.desdeAST → first/follow/tabla.
   */
  private _guardarEnStorage(): void {
    try {
      const payload = this.analizadores.map(a => ({
        nombre: a.nombre,
        ast:    a.ast
      }));
      localStorage.setItem(LS_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('No se pudo guardar en localStorage:', e);
    }
  }

  private _cargarDesdeStorage(): void {
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

          if (tabla.esLL1) {
            this.analizadores.push({ nombre, gramatica: g, first, follow, tabla, ast });
          }
        } catch (e) {
          console.warn(`No se pudo reconstruir "${nombre}":`, e);
        }
      }
    } catch (e) {
      console.warn('Error al leer localStorage:', e);
    }
  }
}