import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast'; 
import { MessageService, ConfirmationService } from 'primeng/api'; 
import { ConfirmPopupModule } from 'primeng/confirmpopup';

import { GrowerService } from '../../services/grower.service';
import { PartnerSidebarComponent } from '../../shared/components/partner-sidebar/partner-sidebar.component';
import { GrowerCreateDialogComponent } from '../create-grower-dialog/create-grower-dialog.components';

@Component({
  selector: 'app-grower-list',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TooltipModule,
    ToastModule,
    PartnerSidebarComponent,
    GrowerCreateDialogComponent,
    ConfirmPopupModule
],
  providers: [MessageService, ConfirmationService],
  templateUrl: './grower-list.component.html'
})
export class GrowerListComponent implements OnInit {
  @ViewChild('createDialog') createDialog!: GrowerCreateDialogComponent;

  growers: any[] = [];
  selectedGrower: any = null;
  sidebarVisible: boolean = false;
  expandedRows: { [key: string]: boolean } = {};

  constructor(
    private growerService: GrowerService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadGrowers();
  }

  loadGrowers() {
    this.growerService.getAllGrowers().subscribe(data => {
      this.growers = data;
    });
  }

  editGrower(grower: any, event: Event) {
    event.stopPropagation();
    this.createDialog.edit(grower); 
  }

  deleteGrower(grower: any, event: Event) {
    event.stopPropagation();
    
    this.confirmationService.confirm({
        target: event.target as EventTarget,
        message: `Biztosan törölni szeretnéd ${grower.name} nevelőt?`,
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Igen',
        rejectLabel: 'Nem',
        acceptButtonStyleClass: 'p-button-danger p-button-sm',
        accept: () => {
            this.growerService.deleteGrower(grower.id).subscribe({
                next: () => {
                    this.messageService.add({severity:'success', summary:'Törölve', detail: 'Nevelő sikeresen törölve.'});
                    this.loadGrowers();
                },
                error: () => {
                    this.messageService.add({severity:'error', summary:'Hiba', detail: 'Nem sikerült a törlés (lehet, hogy van hozzárendelt adat).'});
                }
            });
        }
    });
  }

  toggleRow(grower: any, event?: Event) {
    if (event) {
        event.stopPropagation(); 
    }
    
    const id = String(grower.id);
    const next = { ...this.expandedRows }; 

    if (next[id]) {
        delete next[id]; 
    } else {
        next[id] = true; 
    }

    this.expandedRows = next; 
  }

  openGrowerStats(grower: any) {
    this.selectedGrower = {
        ...grower,
        isGrower: true, 
        growerId: grower.id,
        name: grower.name + (grower.city ? ` (${grower.city})` : '')
    };
    this.sidebarVisible = true;
  }

  onSidebarHide() {
    this.selectedGrower = null;
  }
}