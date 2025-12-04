// frontend/src/app/shared/components/partner-sidebar/partner-sidebar.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarModule } from 'primeng/sidebar';
import { PartnerDetailComponent } from '../../../features/partner-detail/partner-detail.component';

@Component({
  selector: 'app-partner-sidebar',
  standalone: true,
  imports: [CommonModule, SidebarModule, PartnerDetailComponent],
  template: `
    <p-sidebar
      *ngIf="visible"
      [(visible)]="visible"
      [transitionOptions]="disableSidebarAnim ? '0ms' : '150ms'"
      (onHide)="onHide()"
      appendTo="body"
      position="right"
      [style]="{ width: '60%' }"
      styleClass="w-full md:w-9 lg:w-8 border-none shadow-8"
      [modal]="true"
      [dismissible]="true"
      [showCloseIcon]="true"
      [blockScroll]="true">

      <ng-template pTemplate="header">
        <div class="flex align-items-center gap-3" *ngIf="partner">
          <div class="bg-primary-50 text-primary border-round p-2">
            <i class="pi pi-user text-2xl"></i>
          </div>
          <div>
            <div class="font-bold text-3xl text-900">{{ partner?.name }}</div>
            <div class="text-500">Részletes adatlap</div>
          </div>
        </div>
      </ng-template>

      <div class="mt-4">
        <app-partner-detail *ngIf="partner" [partner]="partner" [readOnly]="readOnly"></app-partner-detail>
      </div>
    </p-sidebar>
  `
})
export class PartnerSidebarComponent {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Input() partner: any = null;
  @Input() readOnly = false;
  @Input() disableSidebarAnim = false; 
  @Output() closed = new EventEmitter<void>();

  onHide() {
    this.visible = false;
    this.visibleChange.emit(this.visible);
    this.closed.emit();
  }
}
