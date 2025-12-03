import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { MessageService } from 'primeng/api';
import { ShipmentService } from '../../services/shipment.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-excel-import-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, FileUploadModule],
  templateUrl: './excel-import-dialog.component.html',
})
export class ExcelImportDialogComponent {
  @Output() onClosed = new EventEmitter<void>();
  visible: boolean = false;
  isUploading: boolean = false;

  constructor(
    private messageService: MessageService,
    private shipmentService: ShipmentService
  ) {}

  show() {
    this.visible = true;
    this.isUploading = false;
  }

  uploadHandler(event: any) {
    if (event.files.length === 0) return;

    this.isUploading = true;
    const file = event.files[0];

    this.shipmentService.uploadExcel(file).subscribe({
      next: (response: any) => {
        this.isUploading = false;
        this.visible = false; 
        
        if (response.failedCount > 0) {
            const severity = response.successCount > 0 ? 'warn' : 'error';
            const summary = response.successCount > 0 ? 'Részleges siker' : 'Importálási hiba';
            
            let errorDetail = `Sikerült: ${response.successCount}, Hibás: ${response.failedCount}\n`;
            
            const errorsToShow = response.errorMessages.slice(0, 5);
            errorDetail += errorsToShow.join('\n');
            
            if (response.errorMessages.length > 5) {
                errorDetail += `\n...és további ${response.errorMessages.length - 5} hiba.`;
            }

            this.messageService.add({
                severity: severity, 
                summary: summary, 
                detail: errorDetail, 
                life: 10000 
            });
        } else {
            this.messageService.add({
                severity: 'success', 
                summary: 'Siker', 
                detail: `${response.successCount} sor sikeresen importálva!`
            });
        }

        this.onClosed.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.isUploading = false;
        console.error(err);
        
        const msg = err.error?.message || 'Kritikus szerver hiba történt.';
        this.messageService.add({severity: 'error', summary: 'Hiba', detail: msg});
      }
    });
  }
}