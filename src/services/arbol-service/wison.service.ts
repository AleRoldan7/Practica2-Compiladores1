// src/services/wison.service.ts
import { Injectable } from '@angular/core';
import { Gramatica } from '../../clases/analizador-LL/gramatica';
import { ConjuntoFirst } from '../../clases/analizador-LL/conjunto-first';
import { ConjuntoFollow } from '../../clases/analizador-LL/conjunto-follow';
import { TablaLL } from '../../clases/analizador-LL/tablaLL';
import { AnalizadorLL } from '../../clases/analizador-LL/analizador-ll';
import { ManejoErrores } from '../../clases/manejo-errores/errores';
import { Token } from '../../clases/manejo-errores/token';

export interface AnalizadorGuardado {
  nombre: string;
  gramatica: Gramatica;
  first: ConjuntoFirst;
  follow: ConjuntoFollow;
  tabla: TablaLL;
}

// wison.service.ts
@Injectable({ providedIn: 'root' })
export class WisonService {

  analizadores: AnalizadorGuardado[] = [];
  manejador = new ManejoErrores();

  // ✅ Guardar el último AST analizado
  ultimoAST: any = null;
  ultimoNombre: string = '';

  construirDesdeAST(ast: any, nombre: string): string[] {
    this.ultimoAST = ast;        // ✅ guardar
    this.ultimoNombre = nombre;
    const errores: string[] = [];

    const g = Gramatica.desdeAST(ast);
    const first = new ConjuntoFirst(g);
    const follow = new ConjuntoFollow(g, first);
    const tabla = new TablaLL(g, first, follow);

    if (!tabla.esLL1) {
      errores.push(...tabla.colisiones);
      return errores;
    }

    // Evitar duplicados
    const existe = this.analizadores.findIndex(a => a.nombre === nombre);
    if (existe >= 0) {
      this.analizadores[existe] = { nombre, gramatica: g, first, follow, tabla };
    } else {
      this.analizadores.push({ nombre, gramatica: g, first, follow, tabla });
    }

    return errores;
  }

  // wison.service.ts
  analizarCadena(nombreAnalizador: string, tokens: string[]) {
    const a = this.analizadores.find(x => x.nombre === nombreAnalizador);
    if (!a) {
      console.error('Analizador no encontrado:', nombreAnalizador);
      return null;
    }
    console.log('Analizando con:', a.nombre, 'tokens:', tokens); // ✅ debug
    const ll = new AnalizadorLL(a.gramatica, a.tabla);
    return ll.analizar(tokens);
  }
}