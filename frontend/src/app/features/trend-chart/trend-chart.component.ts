import { Component, Input, OnChanges, SimpleChanges, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Kell a ngModel-hez
import { ChartModule } from 'primeng/chart';
import { DropdownModule } from 'primeng/dropdown'; // Kell a lenyílóhoz

@Component({
  selector: 'app-trend-chart',
  standalone: true,
  imports: [CommonModule, ChartModule, DropdownModule, FormsModule],
  template: `
    <div *ngIf="chartData" class="modern-card mb-5 p-3">
        <div class="flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <h4 class="m-0 font-medium" style="color: var(--p-text-color)">
                Éves Beszállítási Mennyiség (db) / Hét
            </h4>
            <p-dropdown 
                [options]="years" 
                [(ngModel)]="selectedYear" 
                (onChange)="initChart()" 
                [style]="{'width':'150px'}" 
                optionLabel="label"
                optionValue="value">
            </p-dropdown>
        </div>
        <div style="height: 300px;">
            <p-chart type="bar" [data]="chartData" [options]="chartOptions" height="100%"></p-chart>
        </div>
    </div>
  `
})
export class TrendChartComponent implements OnChanges, OnInit, OnDestroy {
  @Input() shipments: any[] = [];

  chartData: any;
  chartOptions: any;
  
  years: any[] = [];
  selectedYear: number = new Date().getFullYear();

  private themeObserver: MutationObserver | null = null;

  private baseColors = [
      '#10b981', '#3b82f6', '#f97316', '#a855f7', '#ec4899', 
      '#eab308', '#06b6d4', '#6366f1', '#84cc16', '#f43f5e'
  ];

  ngOnInit() {
    this.themeObserver = new MutationObserver(() => { this.initChart(); });
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }

  ngOnDestroy() {
    if (this.themeObserver) this.themeObserver.disconnect();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['shipments'] && this.shipments) {
      this.updateYears();
      this.initChart();
    }
  }

  updateYears() {
    if (!this.shipments || this.shipments.length === 0) {
        this.years = [{ label: this.selectedYear.toString(), value: this.selectedYear }];
        return;
    }

    const uniqueYears = new Set<number>();
    
    this.shipments.forEach(s => {
        const dateStr = s.processingDate || s.deliveryDate;
        if (dateStr) {
            const year = new Date(dateStr).getFullYear();
            uniqueYears.add(year);
        }
    });

    if (uniqueYears.size === 0) {
        uniqueYears.add(new Date().getFullYear());
    }

    this.years = Array.from(uniqueYears)
        .sort((a, b) => b - a)
        .map(y => ({ label: y.toString(), value: y }));

    const hasSelected = this.years.some(y => y.value === this.selectedYear);
    if (!hasSelected && this.years.length > 0) {
        this.selectedYear = this.years[0].value;
    }
  }

  initChart() {
    if (!this.shipments || this.shipments.length === 0) {
        this.chartData = null;
        return;
    }

    const weeks = Array.from({length: 53}, (_, i) => (i + 1) + '. hét');
    const partnerDataMap = new Map<string, number[]>();

    const filteredShipments = this.shipments.filter(ship => {
        const dateStr = ship.processingDate || ship.deliveryDate;
        if (!dateStr) return false;
        const year = new Date(dateStr).getFullYear();
        return year === this.selectedYear;
    });

    if (filteredShipments.length === 0) {
    }

    filteredShipments.forEach(ship => {
        const amount = ship.netQuantity ? ship.netQuantity : (ship.quantity || 0);
        
        let weekIndex = -1;
        if (ship.processingWeek) {
             weekIndex = ship.processingWeek - 1; 
        }

        if (weekIndex >= 0 && weekIndex < 53) {
            const name = ship.partner ? ship.partner.name : 'Ismeretlen';

            if (!partnerDataMap.has(name)) {
                partnerDataMap.set(name, new Array(53).fill(0));
            }

            partnerDataMap.get(name)![weekIndex] += amount;
        }
    });

    const isDark = document.documentElement.classList.contains('my-app-dark');
    const textColor = isDark ? '#ffffff' : '#334155';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    const datasets = [];
    let colorIndex = 0;

    for (const [partnerName, data] of partnerDataMap.entries()) {
        const color = this.getColor(colorIndex);
        
        datasets.push({
            label: partnerName,
            data: data,
            backgroundColor: isDark ? this.hexToRgba(color, 0.8) : this.hexToRgba(color, 0.7),
            borderColor: color,
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.7,
            stack: 'total' 
        });
        colorIndex++;
    }

    this.chartData = { labels: weeks, datasets: datasets };

    this.chartOptions = {
        maintainAspectRatio: false,
        aspectRatio: 0.6,
        plugins: {
            legend: { labels: { color: textColor } },
            tooltip: {
                mode: 'index',
                intersect: false,
                titleColor: textColor,
                bodyColor: textColor,
                backgroundColor: isDark ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)',
                borderColor: gridColor,
                borderWidth: 1,
                callbacks: {
                    title: (tooltipItems: any) => {
                        return tooltipItems[0].label; 
                    }
                }
            }
        },
        scales: {
            x: {
                stacked: true,
                ticks: { color: textColor, autoSkip: true, maxTicksLimit: 26 },
                grid: { color: gridColor, drawBorder: false }
            },
            y: {
                stacked: true,
                ticks: { color: textColor },
                grid: { color: gridColor, drawBorder: false },
                title: { display: true, text: 'Darab', color: textColor }
            }
        }
    };
  }

  getColor(index: number): string {
      if (index < this.baseColors.length) {
          return this.baseColors[index];
      }
      const hue = (index * 137.508) % 360;
      return `hsl(${hue}, 70%, 50%)`;
  }

  hexToRgba(hex: string, alpha: number) {
    if (hex.startsWith('hsl')) return hex.replace(')', `, ${alpha})`).replace('hsl', 'hsla');
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}