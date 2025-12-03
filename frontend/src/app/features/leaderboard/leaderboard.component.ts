import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../services/analytics.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { RouterLink } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, RouterLink, TooltipModule],
  templateUrl: './leaderboard.component.html'
})
export class LeaderboardComponent implements OnInit {
  
  rankedPartners: any[] = [];

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit() {
    this.analyticsService.getLeaderboard().subscribe(data => {
      this.rankedPartners = data.sort((a, b) => b.totalScore - a.totalScore);
    });
  }

  getMedal(index: number): string {
      if (index === 0) return '🥇';
      if (index === 1) return '🥈';
      if (index === 2) return '🥉';
      return (index + 1) + '.';
  }
}