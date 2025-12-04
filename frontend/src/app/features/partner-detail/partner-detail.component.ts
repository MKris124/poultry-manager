import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { ShipmentService } from '../../services/shipment.service';
import { AnalyticsService } from '../../services/analytics.service';
import { TrendChartComponent } from '../trend-chart/trend-chart.component';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { MultiSelectModule } from 'primeng/multiselect';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { HttpErrorResponse } from '@angular/common/http';
import { SelectButtonModule } from 'primeng/selectbutton';

@Component({
  selector: 'app-partner-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, 
    InputTextModule, ToastModule, TooltipModule, MultiSelectModule,
    ConfirmPopupModule, TrendChartComponent, SelectButtonModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './partner-detail.component.html'
})
export class PartnerDetailComponent implements OnChanges {
  @Input() partner: any;
  @Input() readOnly: boolean = false;

  shipments: any[] = [];
  clonedShipments: { [s: string]: any } = {};
  selectedStats: any = null;
  isSaving: boolean = false;

  // OPTIMALIZÁCIÓ: Dirty Set - Csak a változott sorok ID-ját tároljuk
  dirtyRowIds: Set<number> = new Set();
  // Új sorok (még nincs ID-juk, vagy negatív ID-val kezeljük)
  newRowsSet: Set<any> = new Set();

  cols: any[] = [
    { field: 'deliveryCode', header: 'Kód' },
    { field: 'deliveryDate', header: 'Beszállítás' },
    { field: 'processingWeek', header: 'Hét' },
    { field: 'processingDate', header: 'Vágás' },
    { field: 'quantity', header: 'Befogott db' },
    { field: 'totalWeight', header: 'Befogott kg' },
    { field: 'avgWeight', header: 'Átlag kg' },
    { field: 'netQuantity', header: 'Beszállított db' },
    { field: 'netWeight', header: 'Beszállított kg' },
    { field: 'netAvgWeight', header: 'Leadott átl. kg' },
    { field: 'transportMortality', header: 'Útihulla db' },
    { field: 'transportMortalityKg', header: 'Útihulla kg' },
    { field: 'liverWeight', header: 'Máj' },
    { field: 'kosherPercent', header: 'Kóser %' },
    { field: 'fatteningRate', header: 'Ráhízás' },
    { field: 'fatteningDays', header: 'Tömés nap' },
    { field: 'mortalityCount', header: 'Elhullás' },
    { field: 'mortalityRate', header: 'Elhullás %' }
  ];

  rows: number = 5;

  rowOptions: any[] = [
      { label: '5', value: 5 },
      { label: '10', value: 10 },
      { label: '25', value: 25 }
  ];
  
  _selectedColumns: any[] = [];
  visibleColumnsSet: Set<string> = new Set();

  constructor(
    private shipmentService: ShipmentService,
    private analyticsService: AnalyticsService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  get selectedColumns(): any[] { return this._selectedColumns; }
  
  set selectedColumns(val: any[]) { 
      this._selectedColumns = val;
      this.visibleColumnsSet = new Set(val.map(c => c.field));
  }

  get hasUnsavedChanges(): boolean { 
      return this.dirtyRowIds.size > 0 || this.newRowsSet.size > 0; 
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['partner'] && this.partner) {
      this.selectedColumns = this.cols; 
      this.loadData();
    }
  }

  loadData() {
    this.shipments = [];
    this.clonedShipments = {};
    this.selectedStats = null;
    this.dirtyRowIds.clear();
    this.newRowsSet.clear();

    if (this.partner.isGroup) {
        this.shipmentService.getHistoryByPartners(this.partner.ids).subscribe(data => {
            this.processShipmentData(data);
            this.calculateGroupStats();
        });

    } else {
        this.shipmentService.getHistoryByPartner(this.partner.id).subscribe(data => {
            this.processShipmentData(data);
        });
        
        this.analyticsService.getPartnerStats(this.partner.id).subscribe(s => this.selectedStats = s);
    }
  }

  processShipmentData(data: any[]) {
      this.shipments = data.map(ship => {
        const avg = ship.quantity > 0 ? (ship.totalWeight / ship.quantity) : 0;
        return { ...ship, avgWeight: avg };
      });
      this.shipments.forEach(s => this.clonedShipments[s.id] = { ...s });
  }

  calculateGroupStats() {
      let sumLiver = 0, countLiver = 0;
      let sumKosher = 0, countKosher = 0;
      let sumFattening = 0, countFattening = 0;
      let sumMortalityRate = 0, countMortalityRate = 0;

      this.shipments.forEach(s => {
          if (s.liverWeight != null) { sumLiver += s.liverWeight; countLiver++; }
          if (s.kosherPercent != null) { sumKosher += s.kosherPercent; countKosher++; }
          if (s.fatteningRate != null) { sumFattening += s.fatteningRate; countFattening++; }
          if (s.mortalityRate != null) { sumMortalityRate += s.mortalityRate; countMortalityRate++; }
      });

      this.selectedStats = {
          avgLiverWeight: countLiver ? (sumLiver / countLiver) : 0,
          avgKosherPercent: countKosher ? (sumKosher / countKosher) : 0,
          avgFatteningRate: countFattening ? (sumFattening / countFattening) : 0,
          avgMortalityRate: countMortalityRate ? (sumMortalityRate / countMortalityRate) : 0
      };
  }

  saveAll() {
    const modifiedShips = this.shipments.filter(s => 
        (s.id && this.dirtyRowIds.has(s.id)) || this.newRowsSet.has(s)
    );

    if (modifiedShips.length === 0) return;

    const invalidShip = modifiedShips.find(s => !s.deliveryCode || s.deliveryCode.trim() === '');
    if (invalidShip) {
        this.messageService.add({
            severity: 'error', 
            summary: 'Hiányzó adat', 
            detail: 'A Kód mező kitöltése kötelező minden sornál!'
        });
        return; 
    }

    this.isSaving = true;
    const observables = [];

    for (const ship of modifiedShips) {
        let formattedDate = ship.deliveryDate;
        if (typeof ship.deliveryDate === 'object' && ship.deliveryDate !== null) {
            const d = ship.deliveryDate;
            const offset = d.getTimezoneOffset() * 60000;
            formattedDate = new Date(d.getTime() - offset).toISOString().split('T')[0];
        }

        const currentNetQty = (ship.quantity || 0) - (ship.mortalityCount || 0);

        const dto = { 
            ...ship, 
            partnerId: ship.partnerId || this.partner.id,
            deliveryDate: formattedDate,
            netQuantity: currentNetQty,
            fatteningRate: null, 
            mortalityRate: null 
        };

        if (!ship.id) {
            observables.push(this.shipmentService.createShipment(dto));
        } else {
            observables.push(this.shipmentService.updateShipment(ship.id, dto));
        }
    }

    forkJoin(observables).subscribe({
    next: (results) => {
         this.messageService.add({severity:'success', summary:'Siker', detail: 'Sikeres mentés.'});
         this.loadData(); 
         this.isSaving = false;
    },
    error: (err: HttpErrorResponse) => {
        this.isSaving = false;
        let userMessage = 'Hiba történt a mentés során.';
        if (err.error && err.error.message) userMessage = err.error.message;
        else if (typeof err.error === 'string') userMessage = err.error;
        else if (err.message) userMessage = err.message;

        this.messageService.add({
            severity: 'error', 
            summary: 'Hiba', 
            detail: userMessage, 
            life: 8000 
        });
    }
    });
  }

  deleteShipment(event: Event, ship: any) {
    this.confirmationService.confirm({
        target: event.target as EventTarget,
        message: 'Biztosan törölni szeretnéd ezt a sort?',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Igen',
        rejectLabel: 'Nem',
        accept: () => {
            this.shipmentService.deleteShipment(ship.id).subscribe({
                next: () => {
                    this.messageService.add({ severity: 'success', summary: 'Törölve', detail: 'Sikeres törlés.' });
                    this.loadData();
                },
                error: () => this.messageService.add({ severity: 'error', summary: 'Hiba' })
            });
        }
    });
  }

  addEmptyRow() {
    if (this.partner.isGroup) {
        this.messageService.add({severity:'warn', summary:'Figyelem', detail:'Csoportos nézetben nem lehet új sort felvenni.'});
        return;
    }

    const newRow = {
      // Nincs ID, így tudjuk, hogy új
      partnerId: this.partner.id, deliveryCode: '', deliveryDate: new Date().toISOString().split('T')[0],
      processingDate: null, quantity: 0, totalWeight: 0, avgWeight: 0, liverWeight: 0,
      kosherPercent: 0, fatteningRate: 0, mortalityCount: 0, mortalityRate: 0
    };
    
    this.shipments = [newRow, ...this.shipments];
    this.newRowsSet.add(newRow); // Azonnal jelöljük újként
  }

  revertAll() { 
      this.loadData(); 
      this.messageService.add({severity:'info', summary:'Visszavonva'}); 
  }

  onRowCancel(ship: any, index: number) {
    if (!ship.id) {
        this.shipments.splice(index, 1);
        this.newRowsSet.delete(ship);
    } else {
        this.shipments[index] = { ...this.clonedShipments[ship.id] };
        this.dirtyRowIds.delete(ship.id);
    }
  }

  // OPTIMALIZÁCIÓ: Ez most már csak akkor fut, ha szerkeszt a felhasználó
  onCellEdit(ship: any) {
      if (!ship.id) return; // Az új sorokat a newRowsSet kezeli

      if (this.checkRowReallyChanged(ship)) {
          this.dirtyRowIds.add(ship.id);
      } else {
          this.dirtyRowIds.delete(ship.id);
      }
  }

  // A kalkuláció változtatja az adatot, ezért itt is hívjuk a dirty check-et
  recalculateAvg(ship: any) {
    ship.avgWeight = ship.quantity > 0 ? (ship.totalWeight / ship.quantity) : 0;
    this.onCellEdit(ship);
  }

  checkRowReallyChanged(ship: any): boolean {
    const original = this.clonedShipments[ship.id];
    if (!original) return false;

    const keysToIgnore = ['avgWeight', 'netAvgWeight', 'fatteningRate', 'mortalityRate', 'netQuantity'];
    const shipProps = { ...ship };
    const origProps = { ...original };

    keysToIgnore.forEach(key => {
        delete shipProps[key];
        delete origProps[key];
    });
    
    if (shipProps.deliveryDate instanceof Date) {
        const d = shipProps.deliveryDate;
        const offset = d.getTimezoneOffset() * 60000;
        shipProps.deliveryDate = new Date(d.getTime() - offset).toISOString().split('T')[0];
    }

    return JSON.stringify(shipProps) !== JSON.stringify(origProps);
  }

  // OPTIMALIZÁCIÓ: Cache-ből olvas
  isColVisible(field: string): boolean { 
      return this.visibleColumnsSet.has(field); 
  }

  // OPTIMALIZÁCIÓ: trackBy az ngFor-hoz (Angular belső gyorsítás)
  trackByFn(index: number, item: any) {
      return item.id; // vagy index, ha nincs id az új soroknál
  }

  getLiverColor(val: number): string { return !val ? '' : (val >= 0.6 ? 'text-green-500' : 'text-yellow-500'); }
  getKosherColor(val: number): string { return !val ? '' : (val >= 60 ? 'text-green-500' : 'text-yellow-500'); }
}