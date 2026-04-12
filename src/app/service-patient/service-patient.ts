import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  selector: 'app-service-patient',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './service-patient.html',
  styleUrls: ['./service-patient.scss'],
})
export class ServicePatient implements OnInit {
  public offeredServices: OfferedService[] = [];

  constructor() {}

  ngOnInit() {
    this.loadServices();
  }

  private loadServices() {
    try {
      const goodsItemsData = localStorage.getItem('hospital_goods_items');
      if (goodsItemsData) {
        const allItems: GoodsItem[] = JSON.parse(goodsItemsData);
        // Filter to show only items with category === 'Services'
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
      }
    } catch (error) {
      console.error('Error loading services:', error);
      this.offeredServices = [];
    }
  }
}


