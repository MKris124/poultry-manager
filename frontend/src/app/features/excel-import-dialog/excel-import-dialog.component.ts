import { Component, EventEmitter, Output, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule, FileUpload } from 'primeng/fileupload';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';

import { ImportService } from '../../services/import.service';

@Component({
  selector: 'app-excel-import-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, FileUploadModule, TableModule, ButtonModule],
  templateUrl: './excel-import-dialog.component.html',
  
})
export class ExcelImportDialogComponent {
  @Output() onClosed = new EventEmitter<void>();
  @ViewChild('fileUpload') fileUpload!: FileUpload;

  visible: boolean = false;
  isUploading: boolean = false;
  
  previewRows: any[] | null = null;

  constructor(
    private messageService: MessageService,
    private importService: ImportService,
    private cdr: ChangeDetectorRef
  ) {}

  show() {
    this.visible = true;
    this.resetState();
  }

  resetState() {
    this.isUploading = false;
    this.previewRows = null;
    if (this.fileUpload) {
      this.fileUpload.clear();
    }
  }

  uploadHandler(event: any) {
    if (event.files.length === 0) return;

    this.isUploading = true;
    const file = event.files[0];

    this.importService.previewExcel(file).subscribe({
      next: (response: any[]) => {
        this.isUploading = false;
        this.previewRows = response;
        
        if (this.previewRows.length === 0) {
           this.messageService.add({severity: 'warn', summary: 'Figyelem', detail: 'A fájl üres vagy nem tartalmaz adatot.'});
        }
        
        this.cdr.detectChanges(); 
      },
      error: (err: HttpErrorResponse) => {
        this.isUploading = false;
        console.error(err);
        this.messageService.add({severity: 'error', summary: 'Hiba', detail: 'Hiba a fájl feldolgozásakor (Előnézet).'});
        this.fileUpload.clear();
        
        this.cdr.detectChanges(); 
      }
    });
  }

  saveValidRows() {
    if (!this.previewRows) return;

    const validData = this.previewRows
        .filter((row: any) => row.valid)
        .map((row: any) => row.shipmentData);

    if (validData.length === 0) {
        this.messageService.add({severity: 'warn', summary: 'Nincs adat', detail: 'Nincs menthető (hibátlan) sor.'});
        return;
    }

    this.isUploading = true;
    this.cdr.detectChanges();

    this.importService.saveImportedRows(validData).subscribe({
        next: (response: any) => {
            this.isUploading = false;
            this.visible = false;
            
            this.messageService.add({
                severity: 'success', 
                summary: 'Siker', 
                detail: `${response.successCount} sor sikeresen importálva!`
            });

            this.onClosed.emit();
            this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
            this.isUploading = false;
            console.error(err);
            const msg = err.error?.message || 'Hiba a mentés során.';
            this.messageService.add({severity: 'error', summary: 'Hiba', detail: msg});
            this.cdr.detectChanges();
        }
    });
  }

  cancelPreview() {
    this.resetState();
  }

  getValidCount(): number {
    return this.previewRows ? this.previewRows.filter((r: any) => r.valid).length : 0;
  }
}