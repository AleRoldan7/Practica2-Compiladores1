import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NodoArbol } from '../../../clases/analizador-LL/nodo-arbol';
import { WisonService } from '../../../services/arbol-service/wison.service';
import { Arbol } from '../../arbolo-derivacion/arbol/arbol';

@Component({
  selector: 'app-analizador',
  imports: [CommonModule, FormsModule, Arbol],
  templateUrl: './analizador.html',
  styleUrl: './analizador.css',
})
export class Analizador {

  analizadorSeleccionado = '';
  cadenaEntrada = '';
  resultado: { aceptada: boolean; errores: string[] } | null = null;
  arbol: NodoArbol | null = null;

  constructor(public servicio: WisonService) { }

  analizar() {
    const tokens = this.cadenaEntrada.trim().split(/\s+/).filter(t => t.length > 0);
    console.log('Tokens a analizar:', tokens); // ✅ debug

    const res = this.servicio.analizarCadena(this.analizadorSeleccionado, tokens);
    if (!res) return;

    console.log('Resultado:', res); // ✅ debug
    this.resultado = { aceptada: res.aceptada, errores: res.errores };
    this.arbol = res.arbol;
  }
}