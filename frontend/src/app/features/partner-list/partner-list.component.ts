import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
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

import { PartnerDetailComponent } from '../partner-detail/partner-detail.component';
import { PartnerCreateDialogComponent } from '../partner-create-catalog/partner-create-catalog.component';
import { ExcelImportDialogComponent } from '../excel-import-dialog/excel-import-dialog.component';
import { ShipmentService } from '../../services/shipment.service';
import { PartnerService } from '../../services/partner.service'; 

@Component({
  selector: 'app-partner-list',
  standalone: true,
  providers: [MessageService, ConfirmationService], 
  templateUrl: './partner-list.component.html',
  styleUrls: ['./partner-list.component.scss'],
  imports: [
    CommonModule, TableModule, SidebarModule, ButtonModule, ToastModule,
    IconFieldModule, InputIconModule, PartnerDetailComponent, PartnerCreateDialogComponent,
    ExcelImportDialogComponent, TooltipModule, ConfirmPopupModule 
  ]
})
export class PartnerListComponent implements OnInit {
  @ViewChild('createDialog') createDialog!: PartnerCreateDialogComponent;
  
  partners: any[] = [];
  selectedPartners: any[] = []; 
  selectedPartner: any = null;
  sidebarVisible: boolean = false;
  isDarkMode: boolean = false;
  private navSub?: Subscription;

  cols: any[] = [
      { field: 'id', header: 'Azonosító' },
      { field: 'name', header: 'Név' },
      { field: 'city', header: 'Telephely' },
      { field: 'county', header: 'Megye' }
  ];

  constructor(
    private router: Router,
    private http: HttpClient, 
    private messageService: MessageService,
    private shipmentService: ShipmentService,
    private partnerService: PartnerService,         
    private confirmationService: ConfirmationService
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
        this.sidebarVisible = false;
        this.selectedPartner = null; 
      });
  }

  onSidebarHide() {
    setTimeout(() => {
      this.selectedPartner = null;
    }, 300);
  }

  loadPartners() {
    this.http.get<any[]>('http://localhost:8080/api/partners')
      .subscribe(data => this.partners = data);
  }

  openPartnerStats(partner: any) {
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
    this.sidebarVisible = true;
  }

  onPartnerCreated() {
    this.loadPartners();
    this.messageService.add({severity:'success', summary:'Siker', detail:'Művelet sikeres.'});
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.documentElement.classList.add('my-app-dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('my-app-dark');
      localStorage.setItem('theme', 'light');
    }
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
          acceptButtonStyleClass: 'p-button-danger p-button-sm',
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
}