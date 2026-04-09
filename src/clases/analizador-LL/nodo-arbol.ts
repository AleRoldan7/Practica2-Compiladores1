export class NodoArbol {
  nombre:   string;
  valor:    string;     
  hijos:    NodoArbol[] = [];
  esHoja:   boolean;

  constructor(nombre: string, esHoja = false, valor = '') {
    this.nombre = nombre;
    this.esHoja = esHoja;
    this.valor  = valor;
  }

  agregarHijo(hijo: NodoArbol) {
    this.hijos.push(hijo);
  }
}