import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalyticsService } from '../../services/analytics.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { RouterLink } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { PartnerSidebarComponent } from '../../shared/components/partner-sidebar/partner-sidebar.component';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    TableModule, 
    ButtonModule, 
    SelectButtonModule, 
    RouterLink, 
    TooltipModule, 
    InputTextModule, 
    PartnerSidebarComponent
  ],
  templateUrl: './leaderboard.component.html',
  styles: [`
    .fade-in { animation: fadeIn 0.3s ease-in; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `]
})
export class LeaderboardComponent implements OnInit {
[x: string]: any;
  
  rankedPartners: any[] = [];
  originalData: any[] = [];
  
  sidebarVisible: boolean = false;
  selectedPartner: any = null;
  disableSidebarAnim: boolean = false;
  
  // A kinyitott sorok tárolója (Key: ID, Value: true)
  expandedRows: { [key: string]: boolean } = {};

  viewMode: 'score' | 'category' = 'score';
  
  viewOptions: any[] = [
      { label: '🏆 Összesített Pontverseny', value: 'score' },
      { label: '📊 Kategória Ranglisták', value: 'category' }
  ];

  categoryOptions: any[] = [
    { label: 'Máj (kg)', value: 'liver', icon: 'pi pi-box' },
    { label: 'Kóser %', value: 'kosher', icon: 'pi pi-check-circle' },
    { label: 'Elhullás %', value: 'mortality', icon: 'pi pi-exclamation-triangle' }
  ];

  currentCategory: string = 'liver'; 

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit() {
    this.analyticsService.getLeaderboard().subscribe(data => {
      this.originalData = data;
      this.updateSorting(); 
    });
  }

  updateSorting() {
    let sorted = [...this.originalData];
    
    if (this.viewMode === 'score') {
        sorted.sort((a, b) => b.totalScore - a.totalScore);
    } 
    else {
        switch (this.currentCategory) {
            case 'liver':
                sorted.sort((a, b) => b.avgLiverWeight - a.avgLiverWeight);
                break;
            case 'kosher':
                sorted.sort((a, b) => b.avgKosherPercent - a.avgKosherPercent);
                break;
            case 'mortality':
                sorted.sort((a, b) => a.avgMortalityRate - b.avgMortalityRate);
                break;
        }
    }

    this.rankedPartners = sorted.map((item, index) => ({
        ...item,
        originalRank: index + 1
    }));
  }

  isActiveColumn(col: string): boolean {
      if (this.viewMode === 'score') return col === 'score';
      return this.currentCategory === col;
  }

  getMedal(rank: number): string {
      if (rank === 1) return '🥇';
      if (rank === 2) return '🥈';
      if (rank === 3) return '🥉';
      return rank + '.';
  }

  toggleGroup(partner: any, e?: Event) {
  e?.stopPropagation();
  const id = String(partner.partnerId);
  const next = { ...this.expandedRows };

  if (next[id]) delete next[id];
  else next[id] = true;

  this.expandedRows = next;
}

onRowClick(partner: any) {
  if (partner.group) this.toggleGroup(partner);
  else this.openPartnerStats(partner);
}

  openPartnerStats(leaderboardItem: any) {
    if (leaderboardItem.partnerId) {
        this.selectedPartner = {
            id: leaderboardItem.partnerId,
            name: leaderboardItem.partnerName,
            isGroup: false 
        };
        this.sidebarVisible = true;
        this.disableSidebarAnim = false;
    }
  }

  onSidebarHide() {
    this.selectedPartner = null;
    this.disableSidebarAnim = false;
  }
}