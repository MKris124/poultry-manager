import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { PartnerService } from '../../services/partner.service';
import { LocationService } from '../../services/location.service';

@Component({
  selector: 'app-partner-create-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, DropdownModule],
  templateUrl: './partner-create-dialog.component.html'
})
export class PartnerCreateDialogComponent implements OnInit {
  @Output() onSave = new EventEmitter<any>();
  visible: boolean = false;
  isEditMode: boolean = false; // <--- ÚJ

  partner: any = { id: null, name: '', city: '', county: '' };
  counties: any[] = [];
  cities: any[] = [];

  constructor(
    private partnerService: PartnerService,
    private locationService: LocationService
  ) {}

  ngOnInit() {
    this.locationService.getCounties().subscribe(data => {
        this.counties = data.map(c => ({ label: c, value: c }));
    });
  }

  // ÚJ FELVITEL
  show() {
    this.isEditMode = false;
    this.partner = { id: null, name: '', city: '', county: '' };
    this.cities = [];
    this.visible = true;
  }

  // SZERKESZTÉS MEGNYITÁSA (ÚJ)
  showEdit(partnerToEdit: any) {
      this.isEditMode = true;
      this.partner = { ...partnerToEdit }; // Másolat készítése
      
      // Városok betöltése a meglévő megyéhez
      if (this.partner.county) {
          this.locationService.getCities(this.partner.county).subscribe(data => {
            this.cities = data.map(c => ({ label: c, value: c }));
        });
      }
      this.visible = true;
  }

  onCountyChange() {
    this.partner.city = '';
    if (this.partner.county) {
        this.locationService.getCities(this.partner.county).subscribe(data => {
            this.cities = data.map(c => ({ label: c, value: c }));
        });
    } else {
        this.cities = [];
    }
  }

  save() {
    if (this.isEditMode) {
        // UPDATE HÍVÁS
        this.partnerService.updatePartner(this.partner.id, this.partner).subscribe(() => {
            this.onSave.emit();
            this.visible = false;
        });
    } else {
        // CREATE HÍVÁS
        this.partnerService.createPartner(this.partner).subscribe(() => {
            this.onSave.emit();
            this.visible = false;
        });
    }
  }
}