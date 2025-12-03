import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ShipmentService {
  private apiUrl = 'http://localhost:8080/api/shipments';

  constructor(private http: HttpClient) {}

  getHistoryByPartner(partnerId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/partner/${partnerId}`);
  }

  getHistoryByPartners(partnerIds: number[]): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}/history/batch`, partnerIds);
  }

  createShipment(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  updateShipment(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  deleteShipment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  downloadExport(partnerIds: number[]): Observable<Blob> {
    return this.http.post(`${this.apiUrl.replace('/shipments', '')}/export/selected-partners`, partnerIds, {
      responseType: 'blob'
    });
  }

  uploadExcel(file: File): Observable<any> {
    const formData: FormData = new FormData();
    formData.append('file', file);
    const uploadUrl = this.apiUrl.replace('/shipments', '/import/excel');

    return this.http.post(uploadUrl, formData);
  }

}