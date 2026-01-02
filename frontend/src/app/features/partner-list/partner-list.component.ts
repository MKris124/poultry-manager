import { Component, OnInit, ViewChild, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { SidebarModule } from 'primeng/sidebar';
import { ButtonModule } from 'primeng/button';
import { MessageService, ConfirmationService } from 'primeng/api'; 
import { ToastModule } from 'primeng/toast';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmPopupModule } from 'primeng/confirmpopup'; 
import { Router, NavigationStart } from '@angular/router';
import { filter, Subscription } from 'rxjs';

import { PartnerCreateDialogComponent } from '../partner-create-catalog/partner-create-catalog.component';
import { ExcelImportDialogComponent } from '../excel-import-dialog/excel-import-dialog.component';
import { ShipmentService } from '../../services/shipment.service';
import { PartnerService } from '../../services/partner.service';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { PartnerSidebarComponent } from '../../shared/components/partner-sidebar/partner-sidebar.component'; 
import { PartnerGroupCreateDialogComponent } from '../partner-create-group/partner-group-dialog.component';

@Component({
  selector: 'app-partner-list',
  standalone: true,
  providers: [MessageService, ConfirmationService], 
  templateUrl: './partner-list.component.html',
  styleUrls: ['./partner-list.component.scss'],
  imports: [
    CommonModule, TableModule, SidebarModule, ButtonModule, ToastModule,
    IconFieldModule, InputIconModule, PartnerCreateDialogComponent,
    ExcelImportDialogComponent, TooltipModule, ConfirmPopupModule, ConfirmDialog, 
    PartnerSidebarComponent, PartnerGroupCreateDialogComponent
  ]
})
export class PartnerListComponent implements OnInit, OnDestroy {
  @ViewChild('createDialog') createDialog!: PartnerCreateDialogComponent;
  @ViewChild('groupDialog') groupDialog!: PartnerGroupCreateDialogComponent;
  
  partners: any[] = [];
  selectedPartners: any[] = []; 
  selectedPartner: any = null;
  sidebarVisible: boolean = false;
  isDarkMode: boolean = false;
  private navSub?: Subscription;
  disableSidebarAnim = false;

  constructor(
    private router: Router,
    private messageService: MessageService,
    private shipmentService: ShipmentService,
    private partnerService: PartnerService,         
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadPartners();
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.isDarkMode = true;
      document.documentElement.classList.add('my-app-dark');
    }
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationStart))
      .subscribe(() => {
        this.disableSidebarAnim = true;
        this.sidebarVisible = false;
        this.selectedPartner = null;
        this.cdr.detectChanges();
      });
  }

  ngOnDestroy() {
    if (this.navSub) {
      this.navSub.unsubscribe();
    }
  }

  onSidebarHide() {
      this.selectedPartner = null;
      this.disableSidebarAnim = false; 
  };

  loadPartners() {
  this.partnerService.getPartners().subscribe({
    next: (data) => {
      this.partners = data.map((p: any) => ({
        ...p,
        _searchLocations: p.locations?.map((l: any) => l.city + ' ' + l.county).join(' '),
        _firstCity: p.locations?.[0]?.city || '',
        _firstCounty: p.locations?.[0]?.county || ''
      }));
    },
    error: (err) => {
      console.error('Hiba a partnerek betöltésekor:', err);
      this.messageService.add({severity:'error', summary:'Hiba', detail:'Nem sikerült betölteni a partnereket.'});
    }
  });
}

  onDataChanged() {
    this.loadPartners();
    this.selectedPartners = [];
  }

  openCreateGroupDialog() {
    if (this.selectedPartners.length > 1) {
        this.groupDialog.show(this.selectedPartners);
    }
  }

  openLocationStats(location: any, partner: any) {
    this.disableSidebarAnim = false;
    
    const virtualLocationPartner = {
        ...partner,                 
        name: `${partner.name} (${location.city})`, 
        isLocation: true,           
        locationId: location.id,    
        originalPartnerId: partner.id 
    };

    this.selectedPartner = virtualLocationPartner;
    this.sidebarVisible = true;
  }

  deleteGroupOfPartner(partner: any) {
    if (!partner.group) return;
    
    this.confirmationService.confirm({
        message: `Biztosan felbontod a(z) "${partner.group.name}" csoportot? A partnerek megmaradnak, de visszakerülnek egyéni státuszba.`,
        header: 'Csoport Felbontása',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Felbontás',
        rejectLabel: 'Mégse',
        acceptButtonStyleClass: 'p-button-warning',
        accept: () => {
             this.partnerService.deleteGroup(partner.group.id).subscribe({
                next: () => {
                    this.messageService.add({severity:'success', summary:'Siker', detail:'Csoport felbontva'});
                    this.loadPartners();
                },
                error: () => this.messageService.add({severity:'error', summary:'Hiba', detail:'Sikertelen művelet'})
             });
        }
    });
  }

  openPartnerStats(partner: any) {
    this.disableSidebarAnim = false; 
    this.selectedPartner = partner;
    this.sidebarVisible = true;
  }

  openGroupStats() {
    if (this.selectedPartners.length === 0) return;

    const groupName = `${this.selectedPartners.length} partner összesítve`;
    const groupIds = this.selectedPartners.map(p => p.id);

    const virtualPartner = {
        id: -1, 
        name: groupName,
        isGroup: true, 
        ids: groupIds 
    };

    this.selectedPartner = virtualPartner;
    this.disableSidebarAnim = false;
    this.sidebarVisible = true;
  }

  onPartnerCreated() {
    this.loadPartners();
    this.messageService.add({severity:'success', summary:'Siker', detail:'Művelet sikeres.'});
  }

  exportSelectedData() {
    if (this.selectedPartners.length === 0) return;
    const ids = this.selectedPartners.map(p => p.id);
    this.messageService.add({severity:'info', summary:'Exportálás...', detail:'Fájl generálása...'});

    this.shipmentService.downloadExport(ids).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `szallitmanyok_export_${new Date().toISOString().slice(0,10)}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.messageService.add({severity:'success', summary:'Kész', detail:'Letöltés kész.'});
      },
      error: () => {
        this.messageService.add({severity:'error', summary:'Hiba', detail:'Nem sikerült az exportálás.'});
      }
    });
  }

  editPartner(partner: any) {
      this.createDialog.showEdit(partner);
  }

  deletePartner(event: Event, partner: any) {
      this.confirmationService.confirm({
          target: event.target as EventTarget,
          message: `Biztosan törölni szeretnéd ${partner.name}-t?`,
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'Igen',
          rejectLabel: 'Nem',
          acceptButtonStyleClass: 'p-button-danger p-button-sm w-6rem',
          rejectButtonStyleClass: 'p-button-text p-button-sm w-6rem',
          accept: () => {
              this.partnerService.deletePartner(partner.id).subscribe({
                  next: () => {
                      this.messageService.add({severity:'success', summary:'Törölve', detail:'Partner eltávolítva.'});
                      this.loadPartners();
                  },
                  error: () => {
                      this.messageService.add({severity:'error', summary:'Hiba', detail:'Törlés nem sikerült (lehet, hogy van szállítmánya).'});
                  }
              });
          }
      });
  }

  deleteAllData() {
      this.confirmationService.confirm({
          message: 'BIZTOSAN törölni akarsz MINDEN adatot (partnereket és szállítmányokat)? Ez a művelet NEM vonható vissza!',
          header: 'Vigyázat! Adatvesztés veszélye',
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'IGEN, mindent törlök',
          rejectLabel: 'Mégse',
          acceptButtonStyleClass: 'p-button-danger p-button-raised',
          rejectButtonStyleClass: 'p-button-text',
          accept: () => {
              this.partnerService.deleteAll().subscribe({
                  next: () => {
                      this.messageService.add({severity:'success', summary:'Törölve', detail:'Az adatbázis sikeresen kiürítve.'});
                      this.loadPartners();
                      this.selectedPartners = [];
                  },
                  error: () => {
                      this.messageService.add({severity:'error', summary:'Hiba', detail:'Nem sikerült a törlés.'});
                  }
              });
          }
      });
    }

    getRowStyle(partner: any) {
    if (partner.group) {
        const hex = partner.group.color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return {
            'background': `linear-gradient(90deg, rgba(${r},${g},${b},0.15) 0%, rgba(${r},${g},${b},0.02) 100%)`,
            'border-left': `4px solid ${partner.group.color}`
        };
    }
    return {};
  }
}