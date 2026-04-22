import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReceptionFormComponent } from './reception-form.component';

describe('ReceptionFormComponent', () => {
  let component: ReceptionFormComponent;
  let fixture: ComponentFixture<ReceptionFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReceptionFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReceptionFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
