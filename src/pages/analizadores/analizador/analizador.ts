import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NodoArbol } from '../../../clases/analizador-LL/nodo-arbol';
import { WisonService } from '../../../services/arbol-service/wison.service';
import { Arbol } from '../../arbolo-derivacion/arbol/arbol';
import { TokenLexer } from '../../../clases/analizador-LL/lexer-wison';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-analizador',
  imports: [CommonModule, FormsModule, Arbol, RouterLink],
  templateUrl: './analizador.html',
  styleUrl: './analizador.css',
})
export class Analizador {

  analizadorSeleccionado = '';
  cadenaEntrada          = '';
  modoTexto              = true;   // true = texto real | false = tokens manuales

  resultado: { aceptada: boolean; errores: string[] } | null = null;
  tokensLexer: TokenLexer[] = [];   // tokens que reconoció el lexer
  arbol: NodoArbol | null = null;

  constructor(public servicio: WisonService) {}

  analizar() {
    this.resultado   = null;
    this.arbol       = null;
    this.tokensLexer = [];

    if (!this.analizadorSeleccionado || !this.cadenaEntrada.trim()) return;

    if (this.modoTexto) {
      // ── Modo texto real: usa el lexer ──────────────────────────────────────
      const res = this.servicio.analizarTexto(
        this.analizadorSeleccionado,
        this.cadenaEntrada
      );
      if (!res) return;
      this.resultado   = { aceptada: res.aceptada, errores: res.errores };
      this.tokensLexer = res.tokens ?? [];
      this.arbol       = res.arbol;

    } else {
      // ── Modo tokens: el usuario escribe "$_ID $_Mas $_ID" ─────────────────
      const tokens = this.cadenaEntrada.trim().split(/\s+/).filter(t => t.length > 0);
      const res    = this.servicio.analizarCadena(this.analizadorSeleccionado, tokens);
      if (!res) return;
      this.resultado = { aceptada: res.aceptada, errores: res.errores };
      this.arbol     = res.arbol;
    }
  }
}