import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

interface GoodsItem {
  productName: string;
  alternativeName: string;
  budgetTag: string;
  costCenterTag: string;
  category: string;
  priceCost: string;
  status: string;
  barcode1: string;
  barcode2: string;
}

interface OfferedService {
  productName: string;
  alternativeName: string;
  budgetTag: string;
  costCenterTag: string;
  category: string;
  priceCost: string;
  status: string;
}

@Component({
  selector: 'app-services-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './services-dashboard.html',
  styleUrls: ['./services-dashboard.scss'],
})
export class ServicesDashboard implements OnInit {
  public offeredServices: OfferedService[] = [];

  constructor(public auth: AuthService) {}

  ngOnInit() {
    this.loadServices();
  }

  public get isAdmin() {
    return this.auth.isAdmin();
  }

  private loadServices() {
    try {
      const raw = localStorage.getItem('hospital_goods_items');
      if (raw) {
        const allItems: GoodsItem[] = JSON.parse(raw);
        // Filter only services from goods list
        this.offeredServices = allItems
          .filter(item => item.category === 'Services')
          .map(item => ({
            productName: item.productName,
            alternativeName: item.alternativeName,
            budgetTag: item.budgetTag,
            costCenterTag: item.costCenterTag,
            category: item.category,
            priceCost: item.priceCost,
            status: item.status,
          }));
      } else {
        this.offeredServices = [];
      }
    } catch (error) {
      console.error('Error loading services from goods list:', error);
      this.offeredServices = [];
    }
  }
}
