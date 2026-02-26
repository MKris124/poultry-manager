import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RouterOutlet as RouterOutletType } from '@angular/router';
import { slideInAnimation } from './app.animations';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ButtonModule, RouterLink, RouterLinkActive], 
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  animations: [slideInAnimation]
})
export class AppComponent implements OnInit {
  title = 'Baromfi Menedzser';
  isDarkMode: boolean = false;

  appVersion: string = 'v1.0.0';

  ngOnInit() {
    if (!sessionStorage.getItem('first_reload_done')) {
      
      sessionStorage.setItem('first_reload_done', 'true');
      
      window.location.reload();
      
      return; 
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.isDarkMode = true;
      document.documentElement.classList.add('my-app-dark');
    }
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.documentElement.classList.add('my-app-dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('my-app-dark');
      localStorage.setItem('theme', 'light');
    }
  }

  prepareRoute(outlet: RouterOutletType) {
    return outlet && outlet.activatedRouteData && outlet.activatedRouteData['animation'];
  }
}