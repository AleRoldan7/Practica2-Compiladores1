import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Analizador } from './analizador';

describe('Analizador', () => {
  let component: Analizador;
  let fixture: ComponentFixture<Analizador>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Analizador]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Analizador);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
