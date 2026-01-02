import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GrowerService {
  private apiUrl = 'http://localhost:8080/api/growers';

  constructor(private http: HttpClient) {}

  getAllGrowers(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  createGrower(grower: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, grower);
  }

  updateGrower(id: number, grower: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, grower);
  }

  deleteGrower(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}