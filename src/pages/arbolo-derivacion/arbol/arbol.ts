import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { RouterLink }    from '@angular/router';
import { WisonService }  from '../../../services/arbol-service/wison.service';
import { NodoArbol }     from '../../../clases/analizador-LL/nodo-arbol';

@Component({
  selector: 'app-arbol',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './arbol.html',
  styleUrl: './arbol.css'
})
export class Arbol implements OnInit, OnChanges {

  @Input() raiz: NodoArbol | null = null;

  analizadores:          string[] = [];
  analizadorSeleccionado = '';
  cadenaEntrada          = '';
  resultado: { aceptada: boolean; errores: string[] } | null = null;
  arbol:     NodoArbol | null = null;

  nodos:     NodoVisual[] = [];
  lineas:    LineaVisual[] = [];
  svgWidth  = 800;
  svgHeight = 400;

  readonly boxH        = 28;
  readonly padX        = 10;
  readonly charWidth   = 7.2;
  readonly nivelAltura = 80;
  readonly minSepX     = 20;

  constructor(private wisonService: WisonService) {}

  ngOnInit() {
    this.analizadores = this.wisonService.analizadores.map(a => a.nombre);
    if (this.analizadores.length === 1) {
      this.analizadorSeleccionado = this.analizadores[0];
    }
  }

  ngOnChanges() {
    if (this.raiz) {
      this.arbol = this.raiz;
      this.calcularLayout();
    } else {
      this.nodos  = [];
      this.lineas = [];
      this.arbol  = null;
    }
  }

  analizar() {
    const tokens = this.cadenaEntrada.trim().split(/\s+/).filter(t => t.length > 0);
    const res    = this.wisonService.analizarCadena(this.analizadorSeleccionado, tokens);
    if (!res) return;
    this.resultado = { aceptada: res.aceptada, errores: res.errores };
    this.arbol     = res.arbol;
    if (this.arbol) this.calcularLayout();
    else { this.nodos = []; this.lineas = []; }
  }

  calcularLayout() {
    this.nodos  = [];
    this.lineas = [];
    this._calcularAncho(this.arbol!);
    this.svgWidth  = Math.max(800, (this.arbol as any)._anchoMin + 80);
    this.svgHeight = (this._profundidad(this.arbol!) + 1) * this.nivelAltura + 60;
    this._asignarPos(this.arbol!, this.svgWidth / 2, 40, null);
  }

  private _calcularAncho(nodo: NodoArbol): number {
    const w = this._cajaAncho(this._etiqueta(nodo));
    if (nodo.hijos.length === 0) {
      (nodo as any)._anchoMin = w + this.minSepX;
      return (nodo as any)._anchoMin;
    }
    let total = 0;
    for (const h of nodo.hijos) total += this._calcularAncho(h);
    (nodo as any)._anchoMin = Math.max(w + this.minSepX, total);
    return (nodo as any)._anchoMin;
  }

  private _asignarPos(nodo: NodoArbol, x: number, y: number, padre: NodoVisual | null) {
    const etiqueta = this._etiqueta(nodo);
    const w        = this._cajaAncho(etiqueta);
    const visual: NodoVisual = {
      x, y, w,
      label:     etiqueta,
      tooltip:   nodo.nombre !== etiqueta ? `${nodo.nombre} = "${etiqueta}"` : nodo.nombre,
      esHoja:    nodo.esHoja,
      esEpsilon: nodo.nombre === 'ε'
    };
    this.nodos.push(visual);

    if (padre) {
      this.lineas.push({
        x1: padre.x, y1: padre.y + this.boxH / 2,
        x2: x,       y2: y       - this.boxH / 2
      });
    }

    if (!nodo.hijos.length) return;

    let offsetX = x - (nodo as any)._anchoMin / 2;
    for (const hijo of nodo.hijos) {
      const aw = (hijo as any)._anchoMin;
      this._asignarPos(hijo, offsetX + aw / 2, y + this.nivelAltura, visual);
      offsetX += aw;
    }
  }

  /**
   * Muestra el valor real si es hoja terminal con valor distinto al nombre.
   * Para no terminales siempre muestra el nombre.
   */
  private _etiqueta(nodo: NodoArbol): string {
    if (nodo.esHoja && nodo.valor && nodo.valor !== nodo.nombre && nodo.valor !== '') {
      return nodo.valor;
    }
    return nodo.nombre;
  }

  private _profundidad(nodo: NodoArbol): number {
    if (!nodo.hijos.length) return 0;
    return 1 + Math.max(...nodo.hijos.map(h => this._profundidad(h)));
  }

  private _cajaAncho(label: string): number {
    return Math.max(40, label.length * this.charWidth + this.padX * 2);
  }
}

interface NodoVisual {
  x: number; y: number; w: number;
  label:     string;
  tooltip:   string;
  esHoja:    boolean;
  esEpsilon: boolean;
}
interface LineaVisual { x1: number; y1: number; x2: number; y2: number; }