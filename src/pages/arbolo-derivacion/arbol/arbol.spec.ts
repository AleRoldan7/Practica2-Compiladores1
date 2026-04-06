import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Arbol } from './arbol';

describe('Arbol', () => {
  let component: Arbol;
  let fixture: ComponentFixture<Arbol>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Arbol]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Arbol);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
