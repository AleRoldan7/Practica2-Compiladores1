import { Routes } from '@angular/router';
import { Editor } from '../pages/editor/editor/editor';
import { Analizador } from '../pages/analizadores/analizador/analizador';
import { Arbol } from '../pages/arbolo-derivacion/arbol/arbol';

export const routes: Routes = [

    { path: '', redirectTo: 'editor', pathMatch: 'full' },
    { path: 'editor', component: Editor },

    { path: 'analizador', component: Analizador },

    { path: 'arbol', component: Arbol }
];
