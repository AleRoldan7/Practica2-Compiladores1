import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Token } from '../../../clases/manejo-errores/token';
import Swal from 'sweetalert2';
import { ManejoErrores } from '../../../clases/manejo-errores/errores';
import { WisonService } from '../../../services/arbol-service/wison.service';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-editor',
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './editor.html',
  styleUrl: './editor.css',
})
export class Editor {

  private manejador = new ManejoErrores();
  codigo:           string  = "";
  nombreAnalizador: string  = "";   // ✅ el usuario le pone nombre
  tokens:           Token[] = [];
  errores:          Token[] = [];
  lineasArray:      number[] = [1];
  analizadorListo = false;

  constructor(private wisonService: WisonService) {}

  analizar() {
    this.analizadorListo = false;

    // ✅ Validar nombre antes de parsear
    if (!this.nombreAnalizador.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Nombre requerido',
        text: 'Ingresa un nombre para el analizador antes de continuar.'
      });
      return;
    }

    try {
      const parser = (window as any).wisonParser;
      this.manejador.reset();

      parser.yy = {
        Token:     Token,
        manejador: this.manejador
      };

      const resultado = parser.parse(this.codigo);

      this.tokens  = this.manejador.getToken();
      this.errores = this.manejador.getError();

      if (resultado.ast && this.errores.length === 0) {
        const erroresLL = this.wisonService.construirDesdeAST(
          resultado.ast,
          this.nombreAnalizador.trim()   // ✅ nombre dinámico
        );

        if (erroresLL.length > 0) {
          // Gramática con colisiones, no es LL(1)
          this.errores.push(...erroresLL.map(e =>
            new Token('', 0, 0, e, 'SEMANTICO')
          ));
        } else {
          this.analizadorListo = true;
          Swal.fire({
            icon: 'success',
            title: '¡Analizador listo!',
            text: `El analizador "${this.nombreAnalizador}" fue creado correctamente.`
          });
          return;   // salir antes del finally para no mostrar dos Swal
        }
      }

    } catch (error: any) {
      this.tokens  = this.manejador.getToken();
      this.errores = this.manejador.getError();
      if (this.errores.length === 0) {
        this.errores.push(new Token('', 0, 0, error.message, 'SINTACTICO'));
      }
    }

    // Solo llega aquí si hubo errores
    Swal.fire({
      icon: 'warning',
      title: 'Errores encontrados',
      text: `Total: ${this.errores.length}`
    });
  }

  limpiar() {
    this.codigo           = '';
    this.nombreAnalizador = '';
    this.tokens           = [];
    this.errores          = [];
    this.analizadorListo  = false;
  }

  actualizarLineas() {
    const totalLineas = this.codigo.split('\n').length;
    this.lineasArray  = Array(totalLineas).fill(0);
  }

  sincronizarScroll(event: any) {
    const lineasDiv = document.querySelector('.lineas');
    if (lineasDiv) lineasDiv.scrollTop = event.target.scrollTop;
  }
}