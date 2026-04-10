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
  analizadoresFiltrados: typeof this.servicio.analizadores = [];
  filtroAnalizador = '';

  sidebarAbierta = false;

  cadenaEntrada = '';
  modoTexto     = true;
  nombreArchivo = '';
  dragging      = false;

  resultado:   { aceptada: boolean; errores: string[] } | null = null;
  erroresLL:   ErrorLL[]    = [];
  tokensLexer: TokenLexer[] = [];
  arbol:       NodoArbol | null = null;

  infoAnalizador: {
    terminales:   { nombre: string; regex: string }[];
    producciones: { cabeza: string; cuerpo: string }[];
  } | null = null;

  constructor(public servicio: WisonService) {
    this.analizadoresFiltrados = this.servicio.analizadores;
  }


  seleccionarAnalizador(nombre: string) {
    this.analizadorSeleccionado = nombre;
    this.sidebarAbierta         = false;
    this.infoAnalizador         = nombre ? this.servicio.getInfoAnalizador(nombre) : null;
    this.resultado   = null;
    this.arbol       = null;
    this.erroresLL   = [];
    this.tokensLexer = [];
    this.cadenaEntrada = '';
    this.nombreArchivo = '';
  }

  filtrarAnalizadores() {
    const q = this.filtroAnalizador.toLowerCase().trim();
    this.analizadoresFiltrados = q
      ? this.servicio.analizadores.filter(a => a.nombre.toLowerCase().includes(q))
      : this.servicio.analizadores;
  }

  onCambiarAnalizador(nombre: string) {
    this.seleccionarAnalizador(nombre);
  }


  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragging = true;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.leerArchivo(file);
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (file) this.leerArchivo(file);
    // Reset para permitir recargar el mismo archivo
    input.value = '';
  }

  private leerArchivo(file: File) {
    if (!file.name.endsWith('.txt')) {
      alert('Solo se aceptan archivos .txt');
      return;
    }
    this.nombreArchivo = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.cadenaEntrada = (e.target?.result as string) ?? '';
    };
    reader.readAsText(file);
  }


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


  get erroresLexicos():     ErrorLL[] { return this.erroresLL.filter(e => e.tipo === 'LEXICO'); }
  get erroresSintacticos(): ErrorLL[] { return this.erroresLL.filter(e => e.tipo === 'SINTACTICO'); }
  get erroresSemanticos():  ErrorLL[] { return this.erroresLL.filter(e => e.tipo === 'SEMANTICO'); }
}