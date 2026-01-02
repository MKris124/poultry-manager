import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { TooltipModule } from 'primeng/tooltip';
import { PartnerService } from '../../services/partner.service';
import { LocationService } from '../../services/location.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-partner-create-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, DropdownModule, TooltipModule],
  templateUrl: './partner-create-dialog.component.html'
})
export class PartnerCreateDialogComponent implements OnInit {
  @Output() onSave = new EventEmitter<any>();
  visible: boolean = false;
  isEditMode: boolean = false;

  partner: any = { id: null, name: '', locations: [] };
  counties: any[] = [];

  constructor(
    private partnerService: PartnerService,
    private locationService: LocationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.locationService.getCounties().subscribe(data => {
        this.counties = data.map(c => ({ label: c, value: c }));
    });
  }

  show() {
    this.isEditMode = false;
    this.partner = { id: null, name: '', locations: [] };
    this.addLocation();
    this.visible = true;
  }

  showEdit(partnerToEdit: any) {
      this.isEditMode = true;
      this.partner = JSON.parse(JSON.stringify(partnerToEdit));

      if (!this.partner.locations) {
          this.partner.locations = [];
      }

      this.partner.locations.forEach((loc: any) => {
          if (loc.county) {
              this.loadCitiesForLocation(loc);
          }
      });

      this.visible = true;
  }


  addLocation() {
      this.partner.locations.push({ 
          city: '', 
          county: '', 
          availableCities: []
      });
  }

  removeLocation(index: number) {
      this.partner.locations.splice(index, 1);
  }

  onCountyChange(loc: any) {
      loc.city = '';
      this.loadCitiesForLocation(loc);
  }

  loadCitiesForLocation(loc: any) {
      if (loc.county) {
          this.locationService.getCities(loc.county).subscribe(data => {
              loc.availableCities = data.map(c => ({ label: c, value: c }));
          });
      } else {
          loc.availableCities = [];
      }
  }

  isValid(): boolean {
      if (!this.partner.id || !this.partner.name) return false;
      for (const loc of this.partner.locations) {
          if (!loc.city || !loc.county) return false;
      }
      return true;
  }

  save() {
    const cleanPartner = JSON.parse(JSON.stringify(this.partner));
    cleanPartner.locations.forEach((loc: any) => delete loc.availableCities);

    if (this.isEditMode) {
        this.partnerService.updatePartner(this.partner.id, cleanPartner).subscribe({
            next: () => {
                this.onSave.emit();
                this.visible = false;
            },
            error: () => this.messageService.add({severity:'error', summary:'Hiba', detail:'Mentés sikertelen'})
        });
    } else {
        this.partnerService.createPartner(cleanPartner).subscribe({
            next: () => {
                this.onSave.emit();
                this.visible = false;
            },
            error: () => this.messageService.add({severity:'error', summary:'Hiba', detail:'Létrehozás sikertelen'})
        });
    }
  }
}