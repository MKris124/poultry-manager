import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { GrowerService } from '../../services/grower.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast'; 

@Component({
  selector: 'app-grower-create-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, ToastModule],
  providers: [MessageService],
  templateUrl: './create-grower-dialog.component.html'
})
export class GrowerCreateDialogComponent {
  @Output() onSave = new EventEmitter<void>();
  visible: boolean = false;
  isEditMode: boolean = false;
  grower: any = { name: '', city: '' };

  constructor(
    private growerService: GrowerService,
    private messageService: MessageService
  ) {}

  show() {
    this.grower = { name: '', city: '' };
    this.visible = true;
  }

  edit(existingGrower: any) {
    this.isEditMode = true;
    this.grower = { ...existingGrower };
    this.visible = true;
  }

  save() {
    if (!this.grower.name) return;

    if (this.isEditMode) {
        this.growerService.updateGrower(this.grower.id, this.grower).subscribe({
            next: () => {
                this.messageService.add({severity:'success', summary:'Siker', detail:'Nevelő frissítve'});
                this.visible = false;
                this.onSave.emit();
            },
            error: () => this.messageService.add({severity:'error', summary:'Hiba', detail:'Sikertelen frissítés'})
        });
    } else {
        this.growerService.createGrower(this.grower).subscribe({
            next: () => {
                this.messageService.add({severity:'success', summary:'Siker', detail:'Nevelő létrehozva'});
                this.visible = false;
                this.onSave.emit();
            },
            error: () => this.messageService.add({severity:'error', summary:'Hiba', detail:'Sikertelen létrehozás'})
        });
    }
  }
}