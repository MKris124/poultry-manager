import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ColorPickerModule } from 'primeng/colorpicker';
import { MessageService } from 'primeng/api';
import { PartnerService } from '../../services/partner.service';

@Component({
  selector: 'app-partner-group-create-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    ColorPickerModule
  ],
  templateUrl: './partner-group-dialog.component.html',
  styles: [`
    :host ::ng-deep .p-colorpicker-preview {
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
    }
  `]
})
export class PartnerGroupCreateDialogComponent {
  @Output() onSave = new EventEmitter<void>();

  visible = false;
  isLoading = false;

  groupName = '';
  groupColor = '3B82F6';
  selectedPartners: any[] = [];

  constructor(
    private partnerService: PartnerService,
    private messageService: MessageService
  ) {}

  get cssColor(): string {
    if (!this.groupColor) return '#3B82F6';
    return this.groupColor.startsWith('#') ? this.groupColor : `#${this.groupColor}`;
  }

  show(partners: any[]) {
    this.selectedPartners = partners ?? [];
    this.resetForm();
    this.visible = true;
  }

  resetForm() {
    this.groupName = '';
    this.groupColor = '3B82F6';
    this.isLoading = false;
  }

  close() {
    this.visible = false;
  }

  save() {
    if (!this.groupName.trim() || this.isLoading) return;

    const alreadyInGroup = this.selectedPartners.find(p => p.group != null);
    if (alreadyInGroup) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Nem lehetséges',
        detail: `${alreadyInGroup.name} már a(z) "${alreadyInGroup.group.name}" csoport tagja! Egy partner csak egy helyre tartozhat.`
      });
      return;
    }

    this.isLoading = true;

    const dto = {
      name: this.groupName.trim(),
      color: this.cssColor, // backendnek így tuti jó (pl. "#3B82F6")
      partnerIds: this.selectedPartners.map(p => p.id)
    };

    this.partnerService.createGroup(dto).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Siker',
          detail: 'Csoport sikeresen létrehozva'
        });
        this.visible = false;
        this.isLoading = false;
        this.onSave.emit();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Hiba',
          detail: 'Nem sikerült a csoport létrehozása'
        });
        this.isLoading = false;
      }
    });
  }
}
