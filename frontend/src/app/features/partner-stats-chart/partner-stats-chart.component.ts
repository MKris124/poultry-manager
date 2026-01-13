import { Component, Input, OnChanges, SimpleChanges, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChartModule } from 'primeng/chart';

@Component({
  selector: 'app-partner-stats-chart',
  standalone: true,
  imports: [CommonModule, ChartModule],
  templateUrl: './partner-stats-chart.component.html',
})
export class PartnerStatsChartComponent implements OnChanges {
  @Input() shipments: any[] = [];
  @Input() label: string = 'Partner teljesítmény'; // pl. Partner neve vagy Csoport neve

  lineData: any;
  lineOptions: any;
  
  barData: any;
  barOptions: any;

  constructor(@Inject(PLATFORM_ID) private platformId: any) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['shipments'] && this.shipments) {
      this.initCharts();
    }
  }

  initCharts() {
    if (!isPlatformBrowser(this.platformId)) return;

    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

    const sortedData = [...this.shipments].sort((a, b) => 
      new Date(a.processingDate).getTime() - new Date(b.processingDate).getTime()
    );

    const labels = sortedData.map(s => s.deliveryCode); 
    const liverWeights = sortedData.map(s => s.liverWeight);
    const kosherPercents = sortedData.map(s => s.kosherPercent);

    this.lineData = {
      labels: labels,
      datasets: [
        {
          label: 'Átlag Májsúly (kg)',
          data: liverWeights,
          fill: false,
          borderColor: documentStyle.getPropertyValue('--blue-500'),
          tension: 0.4,
          yAxisID: 'y'
        },
        {
          label: 'Kóser %',
          data: kosherPercents,
          fill: false,
          borderColor: documentStyle.getPropertyValue('--green-500'),
          tension: 0.4,
          yAxisID: 'y1'
        }
      ]
    };

    this.lineOptions = {
      stacked: false,
      maintainAspectRatio: false,
      aspectRatio: 0.6,
      plugins: {
        legend: { labels: { color: textColor } }
      },
      scales: {
        x: {
          ticks: { color: textColorSecondary },
          grid: { color: surfaceBorder, drawBorder: false }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          ticks: { color: textColorSecondary },
          grid: { color: surfaceBorder, drawBorder: false },
          title: { display: true, text: 'Súly (kg)' }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          ticks: { color: textColorSecondary },
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'Százalék (%)' }
        }
      }
    };
    
    // Itt készíthetsz további diagramokat (pl. elhullás) is...
  }
}