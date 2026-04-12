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

interface ReceiptLine {
  quantity: number;
  description: string;
  rate: number;
  amount: number;
  discountedAmount: number;
  vatRate: number;
  vatPayable: number;
  total: number;
  type: string;
  budget: string;
  costCenter: string;
  depositCashTo: string;
  withdrawGoods: string;
  selectedGood?: GoodsItem;
}

@Component({
  selector: 'app-receipt',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './receipt.html',
  styleUrls: ['./receipt.scss'],
})
export class Receipt implements OnInit {
  public form = {
    phone: '',
    age: '',
    sex: '',
    address: '',
    receivedFrom: '',
    paymentType: '',
    priceList: '',
    patientName: '',
  };

  public bookname = '';
  public receivedFrom = '';
  public receivedAs = '';
  public accPeriod = '';
  public receiptNo = '';
  public receiptDate = '';
  public pricelist = '';
  public chequeNo = '';
  public transaction = '';

  public phone = '';
  public ward = '';
  public ipNumber = '';
  public idNumber = '';
  public regNumber = '';
  public age = '';
  public sex = '';
  public credit = '';
  public servedBy = '';
  public village = '';

  public receiptLines: ReceiptLine[] = [];
  public goodsData: GoodsItem[] = [];
  public filteredGoods: GoodsItem[] = [];
  public showGoodsSuggestions = false;
  public activeLineIndex = -1;
  public activeField = '';
  public patientDiagnosis = '';
  public patientTreatments: string[] = [];

  public diagnosis: string[] = [];
  public treatments: string[] = [];
  public items: ReceiptLine[] = [];

  public incomingPatients: Array<{
    originalId?: string;
    patientName: string;
    regNo: string;
    idNumber: string;
    age: number;
    sex: string;
    village: string;
    ward: string;
    phone: string;
    source: 'OPD' | 'IPD';
    status: string;
    doctorName: string;
    diagnosis?: string;
    diagnoses?: string[];
    treatment?: string;
    treatments?: string[];
  }> = [];

  public selectedIncomingPatient: { originalId?: string; regNo: string; idNumber: string; patientName: string } | null = null;

  private readonly STORAGE_KEY = 'hospital_goods_items';
  private readonly DOCTOR_ASSIGNMENTS_KEY = 'hospital_doctor_assignments';

  ngOnInit(): void {
    this.loadGoods();
    this.loadIncomingPatients();
    this.addReceiptLine();
    this.items = this.receiptLines;
  }

  public loadIncomingPatients(): void {
    const raw = localStorage.getItem(this.DOCTOR_ASSIGNMENTS_KEY);
    if (!raw) {
      // During initial setup, start with empty incoming patients list
      this.incomingPatients = [];
      return;
    }

    try {
      const saved = JSON.parse(raw) as any[];
      this.incomingPatients = saved
        .filter((item) => item.patientName && item.status !== 'paid' && item.status !== 'completed')
        .map((item) => ({
          originalId: item.originalId || item.id || '',
          patientName: item.patientName || '',
          regNo: item.regNo || '',
          idNumber: item.idNumber || '',
          age: item.age || 0,
          sex: item.sex || '',
          village: item.village || '',
          ward: item.ward || '',
          phone: item.phone || '',
          source: item.source || 'OPD',
          status: item.status || 'pending',
          doctorName: item.doctorName || '',
          diagnosis: item.diagnosis || '',
          diagnoses: item.diagnoses || this.toList(item.diagnosis),
          treatment: item.treatment || '',
          treatments: item.treatments || this.toList(item.treatment),
        }));
    } catch {
      this.incomingPatients = [];
    }
  }

  public selectIncomingPatient(patient: {
    originalId?: string;
    patientName: string;
    regNo: string;
    idNumber: string;
    age: number;
    sex: string;
    village: string;
    ward: string;
    phone: string;
    source: 'OPD' | 'IPD';
    status: string;
    doctorName: string;
    diagnosis?: string;
    diagnoses?: string[];
    treatment?: string;
    treatments?: string[];
  }): void {
    this.bookname = patient.source === 'IPD' ? 'IPD Receipt' : 'OPD Receipt';
    this.receivedFrom = patient.patientName;
    this.receivedAs = patient.source;
    this.accPeriod = new Date().getFullYear().toString();
    this.receiptNo = `RCP-${Date.now()}`;
    this.receiptDate = new Date().toISOString().substring(0, 10);
    this.pricelist = 'Standard';
    this.chequeNo = '';
    this.transaction = patient.source;

    this.phone = patient.phone;
    this.ward = patient.ward || patient.village;
    this.ipNumber = patient.source === 'IPD' ? patient.regNo || patient.idNumber : '';
    this.idNumber = patient.idNumber;
    this.regNumber = patient.regNo || patient.idNumber;
    this.age = patient.age ? String(patient.age) : '';
    this.sex = patient.sex;
    this.credit = patient.source === 'IPD' ? 'Insurance' : 'Cash';
    this.servedBy = patient.doctorName;
    this.village = patient.village;

    this.form = {
      phone: patient.phone,
      age: patient.age ? String(patient.age) : '',
      sex: patient.sex,
      address: patient.village,
      receivedFrom: patient.patientName,
      paymentType: patient.source === 'IPD' ? 'Insurance' : 'Cash',
      priceList: 'Standard',
      patientName: patient.patientName,
    };

    this.selectedIncomingPatient = {
      originalId: patient.originalId,
      patientName: patient.patientName,
      regNo: patient.regNo,
      idNumber: patient.idNumber,
    };

    this.patientDiagnosis = patient.diagnosis || '';
    this.patientTreatments = patient.treatments?.length ? patient.treatments : this.toList(patient.treatment);

    this.diagnosis = this.toList(patient.diagnosis) || [];
    this.treatments = this.patientTreatments || [];

    const treatmentLines = this.patientTreatments;
    if (treatmentLines?.length) {
      this.populateReceiptLinesFromTreatments(treatmentLines);
      this.items = this.receiptLines;
    }
  }

  private populateReceiptLinesFromTreatments(treatments: string[]): void {
    this.receiptLines = [];
    treatments.forEach((treatment) => {
      const matchedGood = this.goodsData.find(
        (good) =>
          good.productName?.toLowerCase() === treatment.toLowerCase() ||
          good.alternativeName?.toLowerCase() === treatment.toLowerCase()
      );
      const newLine: ReceiptLine = {
        quantity: 1,
        description: treatment,
        rate: matchedGood ? parseFloat(matchedGood.priceCost) || 0 : 0,
        amount: 0,
        discountedAmount: 0,
        vatRate: 0,
        vatPayable: 0,
        total: 0,
        type: 'Treatment',
        budget: matchedGood?.budgetTag || '',
        costCenter: matchedGood?.costCenterTag || '',
        depositCashTo: '',
        withdrawGoods: '',
        selectedGood: matchedGood,
      };
      this.receiptLines.push(newLine);
    });
    this.receiptLines.forEach((_, idx) => this.calculateLineAmount(idx));
  }

  private loadGoods(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) this.goodsData = JSON.parse(stored);
  }

  public addReceiptLine(): void {
    this.receiptLines.push({
      quantity: 1,
      description: '',
      rate: 0,
      amount: 0,
      discountedAmount: 0,
      vatRate: 0,
      vatPayable: 0,
      total: 0,
      type: 'Treatment',
      budget: '',
      costCenter: '',
      depositCashTo: '',
      withdrawGoods: '',
    });
    this.items = this.receiptLines;
  }

  public onDescriptionInput(lineIndex: number, event: any): void {
    const input = event.target.value;
    this.activeLineIndex = lineIndex;
    this.activeField = 'description';

    if (input.length > 0) {
      this.filteredGoods = this.goodsData.filter(
        (good) =>
          good.productName.toLowerCase().includes(input.toLowerCase()) ||
          good.alternativeName.toLowerCase().includes(input.toLowerCase()) ||
          good.barcode1.includes(input) ||
          good.barcode2.includes(input)
      );
      this.showGoodsSuggestions = this.filteredGoods.length > 0;
    } else {
      this.showGoodsSuggestions = false;
    }
  }

  public selectGood(good: GoodsItem, lineIndex: number): void {
    const line = this.receiptLines[lineIndex];
    line.description = good.productName;
    line.rate = parseFloat(good.priceCost) || 0;
    line.budget = good.budgetTag;
    line.costCenter = good.costCenterTag;
    line.selectedGood = good;
    this.showGoodsSuggestions = false;
    this.calculateLineAmount(lineIndex);
  }

  public calculateLineAmount(lineIndex: number): void {
    const line = this.receiptLines[lineIndex];
    line.amount = line.quantity * line.rate;
    line.vatPayable = line.amount * (line.vatRate / 100);
    line.total = line.amount - line.discountedAmount + line.vatPayable;
  }

  public removeReceiptLine(index: number): void {
    this.receiptLines.splice(index, 1);
    this.items = this.receiptLines;
  }

  public get receiptTotal(): number { return this.receiptLines.reduce((sum, line) => sum + line.total, 0); }
  public get totalAmount(): number { return this.receiptLines.reduce((sum, line) => sum + line.amount, 0); }
  public get totalVAT(): number { return this.receiptLines.reduce((sum, line) => sum + line.vatPayable, 0); }
  public get totalDiscount(): number { return this.receiptLines.reduce((sum, line) => sum + line.discountedAmount, 0); }

  public get patientTreatmentsDisplay(): string {
    return this.patientTreatments.join('\n');
  }

  public hideGoodsSuggestions(): void { setTimeout(() => { this.showGoodsSuggestions = false; }, 200); }

  public toList(value?: string): string[] {
    if (!value) return [];
    return value
      .split(/\r?\n/)
      .map((v) => v.trim())
      .filter((v) => !!v);
  }

  private saveAssignments(assignments: any[]): void {
    localStorage.setItem(this.DOCTOR_ASSIGNMENTS_KEY, JSON.stringify(assignments));
  }

  private saveIncomingPatients(): void {
    localStorage.setItem(this.DOCTOR_ASSIGNMENTS_KEY, JSON.stringify(this.incomingPatients));
  }

  private removePrintedPatientFromNotifications(): void {
    if (!this.selectedIncomingPatient) return;

    const assignmentsRaw = localStorage.getItem(this.DOCTOR_ASSIGNMENTS_KEY);
    if (assignmentsRaw) {
      try {
        const assignments = JSON.parse(assignmentsRaw) as any[];

        assignments.forEach((a) => {
          const matchesOriginalId =
            this.selectedIncomingPatient?.originalId &&
            (a.originalId === this.selectedIncomingPatient.originalId || a.id === this.selectedIncomingPatient.originalId);

          const matchesIdentifiers =
            (a.regNo && this.selectedIncomingPatient?.regNo && a.regNo === this.selectedIncomingPatient.regNo) ||
            (a.idNumber && this.selectedIncomingPatient?.idNumber && a.idNumber === this.selectedIncomingPatient.idNumber);

          if (matchesOriginalId || matchesIdentifiers) {
            a.status = 'paid';
            a.paidAt = new Date().toISOString();
          }
        });

        this.saveAssignments(assignments);
      } catch {
        // ignore
      }
    }

    this.selectedIncomingPatient = null;
    this.loadIncomingPatients();
  }

  private updatePatientDiagnosesTreatments(): void {
    if (!this.selectedIncomingPatient || !this.patientDiagnosis) return;

    // Update doctor assignments
    const assignmentsRaw = localStorage.getItem(this.DOCTOR_ASSIGNMENTS_KEY);
    if (assignmentsRaw) {
      try {
        const assignments = JSON.parse(assignmentsRaw) as any[];

        assignments.forEach((a) => {
          const matchesOriginalId =
            this.selectedIncomingPatient?.originalId &&
            (a.originalId === this.selectedIncomingPatient.originalId || a.id === this.selectedIncomingPatient.originalId);

          const matchesIdentifiers =
            (a.regNo && this.selectedIncomingPatient?.regNo && a.regNo === this.selectedIncomingPatient.regNo) ||
            (a.idNumber && this.selectedIncomingPatient?.idNumber && a.idNumber === this.selectedIncomingPatient.idNumber);

          if (matchesOriginalId || matchesIdentifiers) {
            a.diagnosis = this.patientDiagnosis;
            a.diagnoses = this.toList(this.patientDiagnosis);
            a.treatments = this.patientTreatments;
            a.treatment = this.patientTreatments?.join('\n') || '';
          }
        });

        localStorage.setItem(this.DOCTOR_ASSIGNMENTS_KEY, JSON.stringify(assignments));
      } catch {
        // ignore
      }
    }

    // Update OPD/IPD registers with diagnosis and treatment
    this.updateOPDIPDRegister();
  }

  private updateOPDIPDRegister(): void {
    if (!this.selectedIncomingPatient) return;

    const { receivedAs } = this; // OPD or IPD

    if (receivedAs === 'OPD') {
      const opdStorageKey = 'hospital_opd_register';
      const opdRaw = localStorage.getItem(opdStorageKey);
      if (opdRaw) {
        try {
          const opdEntries = JSON.parse(opdRaw) as any[];

          opdEntries.forEach((entry) => {
            const matchesReg = entry.regNo === this.selectedIncomingPatient?.regNo;
            const matchesId = entry.opdNo === this.selectedIncomingPatient?.idNumber;
            const matchesName = entry.patientName === this.selectedIncomingPatient?.patientName;

            if (matchesReg || matchesId || matchesName) {
              entry.diagnosis = this.patientDiagnosis;
              entry.treatment = this.patientTreatments?.join('\n') || this.patientDiagnosis;
            }
          });

          localStorage.setItem(opdStorageKey, JSON.stringify(opdEntries));
        } catch {
          // ignore
        }
      }
    } else if (receivedAs === 'IPD') {
      const ipdStorageKey = 'hospital_ipd_register';
      const ipdRaw = localStorage.getItem(ipdStorageKey);
      if (ipdRaw) {
        try {
          const ipdEntries = JSON.parse(ipdRaw) as any[];

          ipdEntries.forEach((entry) => {
            const matchesId = entry.id === this.selectedIncomingPatient?.idNumber;
            const matchesName = entry.patientName === this.selectedIncomingPatient?.patientName;

            if (matchesId || matchesName) {
              entry.diagnosis = this.patientDiagnosis;
              entry.treatment = this.patientTreatments?.join('\n') || this.patientDiagnosis;
            }
          });

          localStorage.setItem(ipdStorageKey, JSON.stringify(ipdEntries));
        } catch {
          // ignore
        }
      }
    }
  }

  public saveAndPrintReceipt(): void {
    this.updatePatientDiagnosesTreatments();
    const receiptData = {
      bookname: this.bookname,
      receivedFrom: this.receivedFrom,
      receivedAs: this.receivedAs,
      accPeriod: this.accPeriod,
      receiptNo: this.receiptNo,
      receiptDate: this.receiptDate,
      patientInfo: {
        phone: this.phone,
        ward: this.ward,
        ipNumber: this.ipNumber,
        idNumber: this.idNumber,
        regNumber: this.regNumber,
        diagnosis: this.patientDiagnosis,
        treatments: this.patientTreatments,
      },
      receiptLines: this.receiptLines,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('receiptData', JSON.stringify(receiptData));
    window.print();
    this.removePrintedPatientFromNotifications();

    this.bookname = '';
    this.receivedFrom = '';
    this.receivedAs = '';
    this.accPeriod = '';
    this.receiptNo = '';
    this.receiptDate = '';
    this.pricelist = '';
    this.chequeNo = '';
    this.transaction = '';
    this.phone = '';
    this.ward = '';
    this.ipNumber = '';
    this.idNumber = '';
    this.regNumber = '';
    this.age = '';
    this.sex = '';
    this.credit = '';
    this.servedBy = '';
    this.village = '';
    this.patientDiagnosis = '';
    this.patientTreatments = [];
    this.receiptLines = [];
    this.selectedIncomingPatient = null;
    this.addReceiptLine();
  }

  public get newPatients() {
    return this.incomingPatients;
  }

  public openPatient(patient: any): void {
    this.selectIncomingPatient(patient);
  }

  public viewAllReferrals(): void {
    // Placeholder: Navigate to referrals page or show modal
    alert('Viewing all referrals...');
  }

  public addDiagnosis(): void {
    this.diagnosis.push('');
  }

  public addTreatment(): void {
    this.treatments.push('');
  }

  public calculate(): void {
    this.receiptLines.forEach((_, idx) => this.calculateLineAmount(idx));
  }

  public removeItem(index: number): void {
    this.removeReceiptLine(index);
  }

  public addItem(): void {
    this.addReceiptLine();
  }

  public saveReceipt(): void {
    this.saveAndPrintReceipt();
  }

  public printReceipt(): void {
    this.saveAndPrintReceipt();
  }

  public get summary() {
    return {
      subtotal: this.totalAmount,
      discount: this.totalDiscount,
      vat: this.totalVAT,
      total: this.receiptTotal,
    };
  }
}
