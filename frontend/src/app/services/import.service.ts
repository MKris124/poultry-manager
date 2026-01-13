import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ImportService {
  private apiUrl = 'http://localhost:8080/api/import';

  constructor(private http: HttpClient) {}

  previewExcel(file: File): Observable<any[]> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any[]>(`${this.apiUrl}/preview`, formData);
  }

  saveImportedRows(rows: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/save`, rows);
  }
}