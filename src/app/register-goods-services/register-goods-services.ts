import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

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

const STORAGE_KEY = 'hospital_goods_items';
const BUDGET_OPTIONS = ['Admission Fee', 'Consultations', 'Lab fees', 'Procedures', 'Scan Fees', 'Treatment', 'Other Income'];
const COSTCENTER_OPTIONS = ['Dental', 'Xray', 'Maternity', 'OPD', 'IPD', 'Ultrasound', 'Surgical', 'Pharmacy', 'Laboratory'];
const CATEGORY_OPTIONS = ['Goods', 'Services'];

@Component({
  selector: 'app-register-goods-services',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register-goods-services.html',
  styleUrls: ['./register-goods-services.scss'],
})
export class RegisterGoodsServices {
  public items: GoodsItem[] = [];
  public newItem: GoodsItem = this.getEmptyItem();

  public budgetOptions = BUDGET_OPTIONS;
  public costCenterOptions = COSTCENTER_OPTIONS;
  public categoryOptions = CATEGORY_OPTIONS;

  public pendingUploadFile: File | null = null;
  public pendingUploadName = '';

  public searchTerm = '';
  public isDirty = false;

  public showContextMenu = false;
  public contextMenuX = 0;
  public contextMenuY = 0;

  public currentPage = 1;
  public itemsPerPage = 25;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/dashboard']);
    }
    this.loadItems();
  }

  private getEmptyItem(): GoodsItem {
    return {
      productName: '',
      alternativeName: '',
      budgetTag: '',
      costCenterTag: '',
      category: '',
      priceCost: '',
      status: 'ACTIVE',
      barcode1: '',
      barcode2: '',
    };
  }

  private loadItems() {
    if (typeof window === 'undefined') { this.items = []; return; }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { this.items = []; return; }
    try { this.items = JSON.parse(raw) as GoodsItem[]; } catch { this.items = []; }
  }

  private saveItems() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
    this.isDirty = false;
  }

  public addItem() {
    if (!this.newItem.productName.trim()) return;
    this.items = [{ ...this.newItem }, ...this.items];
    this.isDirty = true;
    this.newItem = this.getEmptyItem();
  }

  public deleteItem(index: number) {
    this.items.splice(index, 1);
    this.isDirty = true;
  }

  public updateItem() {
    this.isDirty = true;
  }

  get filteredItems() {
    if (!this.searchTerm.trim()) return this.items;
    const term = this.searchTerm.toLowerCase();
    return this.items.filter(item =>
      item.productName.toLowerCase().includes(term) ||
      item.alternativeName.toLowerCase().includes(term) ||
      item.category.toLowerCase().includes(term)
    );
  }

  get paginatedItems() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredItems.slice(start, start + this.itemsPerPage);
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.filteredItems.length / this.itemsPerPage));
  }

  public nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  public prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  trackByIndex(index: number) {
    return index;
  }

  public onRightClick(event: MouseEvent) {
    event.preventDefault();
    this.showContextMenu = true;
    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
  }

  public hideContextMenu() {
    this.showContextMenu = false;
  }

  public exportToExcel() {
    this.hideContextMenu();
    const ws = XLSX.utils.json_to_sheet(this.filteredItems.map(item => ({
      'Product Name': item.productName,
      'Alternative Name': item.alternativeName,
      'Budget Tag': item.budgetTag,
      'CostCenter Tag': item.costCenterTag,
      'Category': item.category,
      'Price/Cost': item.priceCost,
      'Status': item.status,
      'Barcode1': item.barcode1,
      'Barcode2': item.barcode2,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Goods');
    XLSX.writeFile(wb, 'goods_export.xlsx');
  }

  public exportToPdf() {
    this.hideContextMenu();
    const doc = new jsPDF();
    doc.text('Goods / Items List', 20, 10);
    let y = 20;
    this.filteredItems.forEach((item, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${index + 1}. ${item.productName} - ${item.category} - ${item.priceCost}`, 20, y);
      y += 10;
    });
    doc.save('goods_export.pdf');
  }

  public manualSave() {
    this.saveItems();
  }

  public onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      this.pendingUploadFile = null;
      this.pendingUploadName = '';
      return;
    }
    this.pendingUploadFile = input.files[0];
    this.pendingUploadName = this.pendingUploadFile.name;
    input.value = '';
  }

  public openUploadedFile() {
    if (!this.pendingUploadFile) return;
    const fileName = this.pendingUploadFile.name.toLowerCase();
    const isXlsx = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCsv = fileName.endsWith('.csv');
    if (!isXlsx && !isCsv) { alert('Please select a CSV or Excel file.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      let imported: GoodsItem[] = [];
      if (isCsv) {
        const text = (reader.result as string) || '';
        const rows = text.split(/\r?\n/).map(r => r.trim()).filter(Boolean);
        if (!rows.length) return;
        const header = rows[0].split(',').map(h => h.trim().toLowerCase());
        const idx = (name: string) => header.findIndex(h => h === name.toLowerCase());
        const productIdx = idx('product name');
        const alternativeIdx = idx('alternative name');
        const budgetIdx = idx('budget tag');
        const costCenterIdx = idx('costcenter tag');
        const categoryIdx = idx('category');
        const priceCostIdx = idx('price/cost');
        const statusIdx = idx('status');
        const barcode1Idx = idx('barcode1');
        const barcode2Idx = idx('barcode2');

        imported = rows.slice(1).map((row) => {
          const cols = row.split(',').map(c => c.trim());
          return {
            productName: cols[productIdx] || '',
            alternativeName: cols[alternativeIdx] || '',
            budgetTag: cols[budgetIdx] || '',
            costCenterTag: cols[costCenterIdx] || '',
            category: cols[categoryIdx] || '',
            priceCost: cols[priceCostIdx] || '',
            status: cols[statusIdx] || 'ACTIVE',
            barcode1: cols[barcode1Idx] || '',
            barcode2: cols[barcode2Idx] || '',
          } as GoodsItem;
        }).filter(item => item.productName);
      } else {
        const workbook = XLSX.read(reader.result, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) return;
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        if (data.length < 1) return;
        const header = data[0].map(h => (h as string).toLowerCase());
        const idx = (name: string) => header.findIndex(h => h === name.toLowerCase());
        const productIdx = idx('product name');
        const alternativeIdx = idx('alternative name');
        const budgetIdx = idx('budget tag');
        const costCenterIdx = idx('costcenter tag');
        const categoryIdx = idx('category');
        const priceCostIdx = idx('price/cost');
        const statusIdx = idx('status');
        const barcode1Idx = idx('barcode1');
        const barcode2Idx = idx('barcode2');

        imported = data.slice(1).map((row) => {
          return {
            productName: (row[productIdx] as string) || '',
            alternativeName: (row[alternativeIdx] as string) || '',
            budgetTag: (row[budgetIdx] as string) || '',
            costCenterTag: (row[costCenterIdx] as string) || '',
            category: (row[categoryIdx] as string) || '',
            priceCost: (row[priceCostIdx] as string) || '',
            status: (row[statusIdx] as string) || 'ACTIVE',
            barcode1: (row[barcode1Idx] as string) || '',
            barcode2: (row[barcode2Idx] as string) || '',
          } as GoodsItem;
        }).filter(item => item.productName);
      }

      if (imported.length) {
        this.items = [...imported, ...this.items];
        this.saveItems();
        alert(`Imported ${imported.length} items successfully.`);
      } else {
        alert('No valid items found in the file.');
      }
      this.pendingUploadFile = null;
      this.pendingUploadName = '';
    };

    if (isCsv) {
      reader.readAsText(this.pendingUploadFile);
    } else {
      reader.readAsArrayBuffer(this.pendingUploadFile);
    }
  }
}
