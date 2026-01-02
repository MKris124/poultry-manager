import { Routes } from '@angular/router';
import { PartnerListComponent } from './features/partner-list/partner-list.component';
import { LeaderboardComponent } from './features/leaderboard/leaderboard.component';
import { GrowerListComponent } from './features/grower-list/grower-list.component'; 

export const routes: Routes = [
    { path: '', redirectTo: 'partners', pathMatch: 'full' },
    
    { 
        path: 'partners', 
        component: PartnerListComponent, 
        data: { animation: 'PartnersPage' } 
    },
    
    { 
        path: 'leaderboard', 
        component: LeaderboardComponent,
        data: { animation: 'LeaderboardPage' } 
    },

    { 
        path: 'growers', 
        component: GrowerListComponent,
        data: { animation: 'GrowersPage' }
    }
];