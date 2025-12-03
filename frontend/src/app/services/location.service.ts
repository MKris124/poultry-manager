import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, shareReplay } from 'rxjs/operators';
import { Observable } from 'rxjs';

interface CityDictionary {
  [city: string]: string; 
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private jsonUrl = 'assets/telepulesek.json'; 
  
  private cache$: Observable<CityDictionary> | null = null;

  constructor(private http: HttpClient) {}

  private getAllData(): Observable<CityDictionary> {
    if (!this.cache$) {
      this.cache$ = this.http.get<CityDictionary>(this.jsonUrl).pipe(
        shareReplay(1)
      );
    }
    return this.cache$;
  }

  getCounties(): Observable<string[]> {
    return this.getAllData().pipe(
      map(data => {
        const counties = Object.values(data);
        return [...new Set(counties)].sort();
      })
    );
  }

  getCities(selectedCounty: string): Observable<string[]> {
    return this.getAllData().pipe(
      map(data => {
        return Object.keys(data)
          .filter(city => data[city] === selectedCounty)
          .sort();
      })
    );
  }
}