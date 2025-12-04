import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../services/analytics.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { RouterLink } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { PartnerSidebarComponent } from '../../shared/components/partner-sidebar/partner-sidebar.component';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [
    CommonModule, TableModule, ButtonModule, RouterLink, TooltipModule, 
    InputTextModule, DialogModule, PartnerSidebarComponent],
  templateUrl: './leaderboard.component.html',
  styles: [`
    :host ::ng-deep .p-row-selectable {
        cursor: pointer;
    }
  `]
})
export class LeaderboardComponent implements OnInit {
  
  rankedPartners: any[] = [];
  
  sidebarVisible: boolean = false;
  selectedPartner: any = null;
  disableSidebarAnim = false;
  constructor(
    private analyticsService: AnalyticsService,
  ) {}

  ngOnInit() {
    this.analyticsService.getLeaderboard().subscribe(data => {
      const sortedData = data.sort((a, b) => b.totalScore - a.totalScore);
      
      this.rankedPartners = sortedData.map((item, index) => ({
        ...item,
        originalRank: index + 1 
      }));
    });
  }

  getMedal(rank: number): string {
      if (rank === 1) return '🥇';
      if (rank === 2) return '🥈';
      if (rank === 3) return '🥉';
      return rank + '.';
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