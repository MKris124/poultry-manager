import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PartnerService {
  private apiUrl = 'http://localhost:8080/api/partners';

  constructor(private http: HttpClient) {}

  createPartner(partner: any): Observable<any> {
    return this.http.post(this.apiUrl, partner);
  }

  updatePartner(id: number, partner: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, partner);
  }

  deletePartner(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  deleteAll(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/delete-all`);
  }

  getPartners(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  createGroup(dto: { name: string, color: string, partnerIds: number[] }) {
    return this.http.post<any>(`${this.apiUrl}/groups`, dto);
  }

  deleteGroup(id: number) {
    return this.http.delete(`${this.apiUrl}/groups/${id}`);
  }
}