import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartnerCreateDialogComponent } from './partner-create-catalog.component';

describe('PartnerCreateCatalogComponent', () => {
  let component: PartnerCreateDialogComponent;
  let fixture: ComponentFixture<PartnerCreateDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnerCreateDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PartnerCreateDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
