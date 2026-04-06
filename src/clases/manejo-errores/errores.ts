import { Token } from './token';

/* Clase para manejar los tokens y errores del análisis léxico y sintáctico */

export class ManejoErrores {

  private tokens: Token[] = [];
  private errores: Token[] = [];

  reset() {
    this.tokens = [];
    this.errores = [];
  }

  agregarToken(lexema: string, linea: number, columna: number, descripcion: string, tipo: string) {
    this.tokens.push(new Token(lexema, linea, columna, descripcion, tipo));
  }

  /* ERRORES LEXICOS */

  errorLexico(lexema: string, linea: number, columna: number) {
    this.errores.push(new Token(
      lexema, linea, columna,
      `Caracter no reconocido: '${lexema}'`,
      'LEXICO'
    ));
  }

  /* ERRORES SINTACTICOS */

  errorSintactico(lexema: string, linea: number, columna: number, descripcion: string) {
    this.errores.push(new Token(
      lexema,
      linea,
      columna,
      descripcion,
      'SINTACTICO'
    ));
  }

  errorEstructuraWison(lexema: string, linea: number, columna: number) {
    this.errorSintactico(lexema, linea, columna,
      'Error en la estructura principal: Wison ¿ ... ? Wison'
    );
  }

  errorBloqueLex(lexema: string, linea: number, columna: number) {
    this.errorSintactico(lexema, linea, columna,
      'Error en bloque lexico: Lex {: ... :}'
    );
  }

  errorDeclaracionTerminal(lexema: string, linea: number, columna: number) {
    this.errorSintactico(lexema, linea, columna,
      'Error en declaracion: Terminal $_Nombre <- expresion ;'
    );
  }

  errorExpresionRegular(lexema: string, linea: number, columna: number) {
    this.errorSintactico(lexema, linea, columna,
      'Expresion regular invalida'
    );
  }

  errorBloqueSyntax(lexema: string, linea: number, columna: number) {
    this.errorSintactico(lexema, linea, columna,
      'Error en bloque sintactico: Syntax {{: ... :}}'
    );
  }

  errorDeclaracionNoTerminal(lexema: string, linea: number, columna: number) {
    this.errorSintactico(lexema, linea, columna,
      'Error en declaracion: No_Terminal %_Nombre ;'
    );
  }

  errorSimboloInicial(lexema: string, linea: number, columna: number) {
    this.errorSintactico(lexema, linea, columna,
      'Error en declaracion: Initial_Sim %_Nombre ;'
    );
  }

  errorProduccion(lexema: string, linea: number, columna: number) {
    this.errorSintactico(lexema, linea, columna,
      'Error en produccion: %_NoTerminal <= simbolos... ;'
    );
  }

  /* ERRORES SEMANTICOS */

  errorSemantico(lexema: string, linea: number, columna: number, descripcion: string) {
    this.errores.push(new Token(
      lexema,
      linea,
      columna,
      descripcion,
      'SEMANTICO'
    ));
  }

  terminalDuplicado(nombre: string, linea: number, columna: number) {
    this.errorSemantico(nombre, linea, columna,
      `Terminal '${nombre}' ya fue declarado anteriormente`
    );
  }

  noTerminalDuplicado(nombre: string, linea: number, columna: number) {
    this.errorSemantico(nombre, linea, columna,
      `No terminal '${nombre}' ya fue declarado anteriormente`
    );
  }

  terminalNoDeclarado(nombre: string, linea: number, columna: number) {
    this.errorSemantico(nombre, linea, columna,
      `Terminal '${nombre}' usado pero no declarado`
    );
  }

  noTerminalNoDeclarado(nombre: string, linea: number, columna: number) {
    this.errorSemantico(nombre, linea, columna,
      `No terminal '${nombre}' usado pero no declarado`
    );
  }

  simboloInicialNoDeclarado(nombre: string, linea: number, columna: number) {
    this.errorSemantico(nombre, linea, columna,
      `Simbolo inicial '${nombre}' no fue declarado como No_Terminal`
    );
  }

  sinSimboloInicial() {
    this.errorSemantico('', 0, 0,
      'No se declaro un simbolo inicial con Initial_Sim'
    );
  }

  getToken(): Token[] { return this.tokens; }
  getError(): Token[] { return this.errores; }

  getHayErrores(): boolean { return this.errores.length > 0; }

  get resumen() {
    return {
      totalTokens: this.tokens.length,
      totalErrores: this.errores.length,
      erroresLexicos: this.errores.filter(e => e.type === 'LEXICO').length,
      erroresSintact: this.errores.filter(e => e.type === 'SINTACTICO').length,
      erroresSemanticos: this.errores.filter(e => e.type === 'SEMANTICO').length,
    };
  }

}