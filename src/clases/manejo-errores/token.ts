export class Token {

  lexema!: string
  line!: number
  column!: number
  description!: string
  type!: string

constructor(lexema: string, line: number, column: number, description: string, type: string) {
    this.lexema = lexema;
    this.line = line;
    this.column = column;
    this.description = description;
    this.type = type;
  }


  getLexema(): string {
    return this.lexema;
  }

  getLine(): number {
    return this.line;
  }

  getColumn(): number {
    return this.column;
  }

  getDescription(): string {
    return this.description;
  }

  getType(): string {
    return this.type;
  }
}
