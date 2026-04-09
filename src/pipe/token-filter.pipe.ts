import { Pipe, PipeTransform } from '@angular/core';
import { Token } from '../clases/manejo-errores/token';

@Pipe({ name: 'tokenFilter', standalone: true })
export class TokenFilterPipe implements PipeTransform {
  transform(tokens: Token[], tipo: string): number {
    return tokens.filter(t => t.type === tipo).length;
  }
}