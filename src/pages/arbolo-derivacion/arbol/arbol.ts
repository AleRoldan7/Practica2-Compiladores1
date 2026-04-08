import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { WisonService } from '../../../services/arbol-service/wison.service';
import { NodoArbol } from '../../../clases/analizador-LL/nodo-arbol';

@Component({
  selector: 'app-arbol',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './arbol.html',
  styleUrl: './arbol.css'
})
export class Arbol implements OnInit, OnChanges {

  @Input() raiz: NodoArbol | null = null;

  analizadores: string[] = [];
  analizadorSeleccionado = '';
  cadenaEntrada = '';
  resultado: { aceptada: boolean; errores: string[] } | null = null;
  arbol: NodoArbol | null = null;

  nodos: NodoVisual[] = [];
  lineas: LineaVisual[] = [];
  svgWidth = 800;
  svgHeight = 400;
  readonly radio = 24;
  readonly nivelAltura = 90;
  readonly minSepX = 65;

  constructor(private wisonService: WisonService) { }

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
      this.nodos = [];
      this.lineas = [];
    }
  }

  analizar() {
    const tokens = this.cadenaEntrada.trim().split(/\s+/).filter(t => t.length > 0);
    const res = this.wisonService.analizarCadena(this.analizadorSeleccionado, tokens);
    if (!res) return;

    this.resultado = { aceptada: res.aceptada, errores: res.errores };
    this.arbol = res.arbol;
    if (this.arbol) this.calcularLayout();
  }

  calcularLayout() {
    this.nodos = [];
    this.lineas = [];
    this.calcularAncho(this.arbol!);
    const totalAncho = (this.arbol as any)._ancho * this.minSepX;
    this.svgWidth = Math.max(800, totalAncho + 100);
    this.svgHeight = (this.profundidad(this.arbol!) + 1) * this.nivelAltura + 60;
    this.asignarPos(this.arbol!, this.svgWidth / 2, 50, null);
  }

  private calcularAncho(nodo: NodoArbol): number {
    if (nodo.hijos.length === 0) { (nodo as any)._ancho = 1; return 1; }
    let total = 0;
    for (const h of nodo.hijos) total += this.calcularAncho(h);
    (nodo as any)._ancho = total;
    return total;
  }

  private asignarPos(nodo: NodoArbol, x: number, y: number, padre: NodoVisual | null) {
    const visual: NodoVisual = { x, y, label: nodo.nombre, esHoja: nodo.esHoja };
    this.nodos.push(visual);
    if (padre) this.lineas.push({ x1: padre.x, y1: padre.y, x2: x, y2: y });
    if (!nodo.hijos.length) return;

    let offsetX = x - ((nodo as any)._ancho * this.minSepX) / 2;
    for (const hijo of nodo.hijos) {
      const anchoHijo = (hijo as any)._ancho;
      this.asignarPos(hijo, offsetX + (anchoHijo * this.minSepX) / 2,
        y + this.nivelAltura, visual);
      offsetX += anchoHijo * this.minSepX;
    }
  }

  private profundidad(nodo: NodoArbol): number {
    if (!nodo.hijos.length) return 0;
    return 1 + Math.max(...nodo.hijos.map(h => this.profundidad(h)));
  }

  
}

interface NodoVisual { x: number; y: number; label: string; esHoja: boolean; }
interface LineaVisual { x1: number; y1: number; x2: number; y2: number; }