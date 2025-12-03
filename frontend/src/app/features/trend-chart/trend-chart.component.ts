import { Component, Input, OnChanges, SimpleChanges, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';

@Component({
  selector: 'app-trend-chart',
  standalone: true,
  imports: [CommonModule, ChartModule],
  template: `
    <div *ngIf="chartData" class="modern-card mb-5 p-3">
        <div class="flex justify-content-between align-items-center mb-3">
            <h4 class="m-0 font-medium" style="color: var(--p-text-color)">
                Éves Beszállítási Mennyiség (db) / Hét
            </h4>
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
      this.initChart();
    }
  }

  initChart() {
    if (!this.shipments || this.shipments.length === 0) {
        this.chartData = null;
        return;
    }

    // 1. X-Tengely: 1-53 hét
    const weeks = Array.from({length: 53}, (_, i) => (i + 1) + '. hét');

    // 2. Adatok csoportosítása
    const partnerDataMap = new Map<string, number[]>();

    this.shipments.forEach(ship => {
        const amount = ship.netQuantity ? ship.netQuantity : (ship.quantity || 0);
        
        // MÓDOSÍTÁS: Közvetlenül a vágási hetet használjuk!
        let weekIndex = -1;
        
        if (ship.processingWeek) {
             // 1. hét -> 0. index a tömbben
             weekIndex = ship.processingWeek - 1; 
        }

        // Csak akkor dolgozzuk fel, ha érvényes hét (1-53)
        if (weekIndex >= 0 && weekIndex < 53) {
            const name = ship.partner ? ship.partner.name : 'Ismeretlen';

            if (!partnerDataMap.has(name)) {
                partnerDataMap.set(name, new Array(53).fill(0));
            }

            partnerDataMap.get(name)![weekIndex] += amount;
        }
    });

    // 3. Datasets összeállítása
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

  // --- SEGÉDFÜGGVÉNYEK ---

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