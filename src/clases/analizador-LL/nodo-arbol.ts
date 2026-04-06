export class NodoArbol {
  nombre:   string;
  hijos:    NodoArbol[] = [];
  esHoja:   boolean;

  constructor(nombre: string, esHoja = false) {
    this.nombre = nombre;
    this.esHoja = esHoja;
  }

  agregarHijo(hijo: NodoArbol) {
    this.hijos.push(hijo);
  }
}