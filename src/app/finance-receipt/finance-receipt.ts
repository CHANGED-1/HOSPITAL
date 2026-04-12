import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ReceiptLine {
  quantity: number;
  description: string;
  rate: number;
  amount: number;
  discountedAmount: number;
  vatRate: number;
  vatPayable: number;
  total: number;
  budgetTag: string;
  costCenterTag: string;
  depositCashTo: string;
  withdrawGoodsFrom: string;
}

interface ReceiptInfo {
  bookName: string;
  accPeriod: string;
  receiptNo: string;
  date: string;
  receivedFrom: string;
  receivedAs: string;
  figure: string;
  words: string;
  paymentFor: string;
  pricelist: string;
  chequeNo: string;
  transaction: string;
  phone: string;
  ward: string;
  ipNumber: string;
  idNumber: string;
  regNumber: string;
  age: string;
  sex: string;
  credit: string;
  servedBy: string;
  village: string;
}

@Component({
  selector: 'app-finance-receipt',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './finance-receipt.html',
  styleUrls: ['./finance-receipt.scss'],
})
export class FinanceReceipt {
  public receiptInfo: ReceiptInfo = {
    bookName: '',
    accPeriod: '',
    receiptNo: '',
    date: new Date().toISOString().slice(0, 10),
    receivedFrom: '',
    receivedAs: '',
    figure: '',
    words: '',
    paymentFor: '',
    pricelist: '',
    chequeNo: '',
    transaction: '',
    phone: '',
    ward: '',
    ipNumber: '',
    idNumber: '',
    regNumber: '',
    age: '',
    sex: '',
    credit: '',
    servedBy: '',
    village: '',
  };

  public receiptLines: ReceiptLine[] = [];

  public addLine() {
    this.receiptLines.push({
      quantity: 1,
      description: '',
      rate: 0,
      amount: 0,
      discountedAmount: 0,
      vatRate: 0,
      vatPayable: 0,
      total: 0,
      budgetTag: '',
      costCenterTag: '',
      depositCashTo: '',
      withdrawGoodsFrom: '',
    });
  }

  public updateReceiptLine(line: ReceiptLine) {
    line.amount = (line.quantity || 0) * (line.rate || 0);
    line.vatPayable = line.amount * ((line.vatRate || 0) / 100);
    line.total = line.amount + line.vatPayable - (line.discountedAmount || 0);
  }

  public removeReceiptLine(index: number) {
    this.receiptLines.splice(index, 1);
  }

  get receiptTotal() {
    return this.receiptLines.reduce((sum, line) => sum + line.total, 0);
  }
}
