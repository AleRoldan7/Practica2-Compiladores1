import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NodoArbol } from '../../../clases/analizador-LL/nodo-arbol';
import { ErrorLL } from '../../../clases/analizador-LL/analizador-ll';
import { WisonService } from '../../../services/arbol-service/wison.service';
import { Arbol } from '../../arbolo-derivacion/arbol/arbol';
import { TokenLexer } from '../../../clases/analizador-LL/lexer-wison';

@Component({
  selector: 'app-analizador',
  imports: [CommonModule, FormsModule, Arbol, RouterLink],
  templateUrl: './analizador.html',
  styleUrl: './analizador.css',
})
export class Analizador {

  analizadorSeleccionado = '';
  cadenaEntrada          = '';
  modoTexto              = true;

  resultado:   { aceptada: boolean; errores: string[] } | null = null;
  erroresLL:   ErrorLL[]    = [];
  tokensLexer: TokenLexer[] = [];
  arbol:       NodoArbol | null = null;

  constructor(public servicio: WisonService) {}

  analizar() {
    this.resultado   = null;
    this.arbol       = null;
    this.erroresLL   = [];
    this.tokensLexer = [];

    if (!this.analizadorSeleccionado || !this.cadenaEntrada.trim()) return;

    if (this.modoTexto) {
      const res = this.servicio.analizarTexto(
        this.analizadorSeleccionado,
        this.cadenaEntrada
      );
      if (!res) return;
      this.resultado   = { aceptada: res.aceptada, errores: res.errores };
      this.erroresLL   = (res as any).erroresLL ?? [];
      this.tokensLexer = res.tokens ?? [];
      this.arbol       = res.arbol;

    } else {
      const tokens = this.cadenaEntrada.trim().split(/\s+/).filter(t => t.length > 0);
      const res    = this.servicio.analizarCadena(this.analizadorSeleccionado, tokens);
      if (!res) return;
      this.resultado = { aceptada: res.aceptada, errores: res.errores };
      this.erroresLL = (res as any).erroresLL ?? [];
      this.arbol     = res.arbol;
    }
  }

  get erroresLexicos():    ErrorLL[] { return this.erroresLL.filter(e => e.tipo === 'LEXICO'); }
  get erroresSintacticos():ErrorLL[] { return this.erroresLL.filter(e => e.tipo === 'SINTACTICO'); }
  get erroresSemanticos(): ErrorLL[] { return this.erroresLL.filter(e => e.tipo === 'SEMANTICO'); }
}