import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Token } from '../../../clases/manejo-errores/token';
import Swal from 'sweetalert2';
import { ManejoErrores } from '../../../clases/manejo-errores/errores';
import { WisonService } from '../../../services/arbol-service/wison.service';
import { RouterLink } from '@angular/router';
import { TokenFilterPipe } from '../../../pipe/token-filter.pipe';

@Component({
  selector: 'app-editor',
  imports: [FormsModule, CommonModule, RouterLink, TokenFilterPipe],
  templateUrl: './editor.html',
  styleUrl: './editor.css',
})
export class Editor {

  private manejador = new ManejoErrores();
  codigo:           string  = '';
  nombreAnalizador: string  = '';
  tokens:           Token[] = [];
  errores:          Token[] = [];
  lineasArray:      number[] = [1];
  analizadorListo = false;

  constructor(public wisonService: WisonService) {}

  analizar() {
    this.analizadorListo = false;

    if (!this.nombreAnalizador.trim()) {
      Swal.fire({ icon: 'warning', title: 'Nombre requerido',
        text: 'Ingresa un nombre para el analizador antes de continuar.' });
      return;
    }

    try {
      const parser = (window as any).wisonParser;
      this.manejador.reset();
      parser.yy = { Token, manejador: this.manejador };

      const resultado = parser.parse(this.codigo);
      this.tokens  = this.manejador.getToken();
      this.errores = this.manejador.getError();

      if (resultado.ast && this.errores.length === 0) {
        const erroresLL = this.wisonService.construirDesdeAST(
          resultado.ast, this.nombreAnalizador.trim()
        );

        if (erroresLL.length > 0) {
          this.errores.push(...erroresLL.map(e =>
            new Token('', 0, 0, e, 'SEMANTICO')
          ));
        } else {
          this.analizadorListo = true;
          Swal.fire({ icon: 'success', title: '¡Analizador listo!',
            text: `"${this.nombreAnalizador}" fue creado y guardado.` });
          return;
        }
      }

    } catch (error: any) {
      this.tokens  = this.manejador.getToken();
      this.errores = this.manejador.getError();
      if (this.errores.length === 0) {
        this.errores.push(new Token('', 0, 0, error.message, 'SINTACTICO'));
      }
    }

    Swal.fire({ icon: 'warning', title: 'Errores encontrados',
      text: `Total: ${this.errores.length}` });
  }

  cargarArchivo(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.codigo = e.target?.result as string;
      this.actualizarLineas();
    };
    reader.readAsText(input.files[0]);
    input.value = '';
  }

  eliminarAnalizador(nombre: string) {
    Swal.fire({
      icon: 'warning', title: '¿Eliminar analizador?',
      text: `"${nombre}" se eliminará permanentemente.`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar', confirmButtonColor: '#dc3545',
      cancelButtonText: 'Cancelar'
    }).then(r => {
      if (r.isConfirmed) {
        this.wisonService.eliminar(nombre);
        Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1200, showConfirmButton: false });
      }
    });
  }

  limpiar() {
    this.codigo           = '';
    this.nombreAnalizador = '';
    this.tokens           = [];
    this.errores          = [];
    this.analizadorListo  = false;
    this.lineasArray      = [1];
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