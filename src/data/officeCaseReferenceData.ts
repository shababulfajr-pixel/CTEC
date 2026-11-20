import * as XLSX from 'xlsx';
import {
  HOSPITAL_CATEGORY_LABELS,
  OFFICE_PAYMENT_CHANNELS,
  OFFICE_WORKFLOW_META,
  type HospitalCategoryCode,
  type OfficeCase,
  type OfficeCaseWorkflowStatus,
  type OfficePaymentChannel,
} from '../types';

export type OfficeCaseSeedInput = Omit<
  OfficeCase,
  'id' | 'orgId' | 'createdBy' | 'createdByName' | 'updatedBy' | 'updatedByName' | 'createdAt' | 'updatedAt'
>;

const PAHOL_SHIPPING_ADDRESS = `นางสายรุ้ง วศินนิติวงศ์
หัวหน้าห้องผ่าตัด
โรงพยาบาลพหลพลพยุหเสนา
ต.ปากแพรก อ.เมือง
จ.กาญจนบุรี 71000
081-3480375`;

/**
 * Exact 14 records extracted directly from the user's attached CTEC Customized
 * Personalized Implant office ledger (ICR0002/2569).
 */
export const CTEC_OFFICE_REFERENCE_CASES: OfficeCaseSeedInput[] = [
  {
    salesSeqNo: 3960,
    jobNumber: '2569-001',
    monthlySeq: 1,
    icrNumber: 'ICR0002/2569',
    hospitalCategory: 1,
    productionPlanNo: '',
    barcode: '*8859599490325*',
    workflowStatus: 'delivered',
    paymentChannels: ['via_hospital'],
    price: 21000,
    paymentDetails: 'จ่ายผ่าน รพ.',
    paymentConditionNote: '',
    patientPrefix: 'นาย',
    patientFirstName: 'ธนพล',
    patientLastName: 'ธัญญาหาร',
    patientHN: '1627196',
    patientAge: '',
    patientPhone: '',
    hospitalName: 'ปทุมธานี',
    doctorName: 'นายแพทย์ธนบัตร เชิญรุ่งโรจน์',
    doctorPhone: '',
    productCode: 'CTPMMA-003',
    sidePosition: 'LEFT',
    anatomicalArea: 'กะโหลกศีรษะ',
    surgeryType: 'Reconstruction',
    materialType: 'PMMA',
    rpModelQty: 1,
    implantQty: 1,
    temporalSpec: 'ตัดส่วน temporal',
    productionSpec: 'ตัดส่วน temporal ยึดสกรูและ fix Plate ตามจุดที่มาร์ค',
    receivedDate: '5/1/2569',
    surgeryDate: '',
    caseReceiver: 'ยุ้ย',
    sterilizeOutDate: '20/1/2569',
    sterilizeReturnDate: '20/1/2569',
    radiationMinKgy: '',
    radiationMaxKgy: '',
    doseUniformity: '',
    qcReceiveDate: '21/1/2569',
    certificateNo: 'NCR0233/2569',
    deliveryDate: '23/1/2569',
    deliveryChannel: 'รพ.',
    deliveredBy: 'ต่าย',
    emsTrackingNo: '',
    shippingInfo: '',
    receiptAddress: '',
    packageInfo: '',
    remarks: '',
  },
  {
    salesSeqNo: 3971,
    jobNumber: '2569-012',
    monthlySeq: 12,
    icrNumber: 'ICR0002/2569',
    hospitalCategory: 1,
    productionPlanNo: '',
    barcode: '*8859599490301*',
    workflowStatus: 'delivered',
    paymentChannels: ['via_hospital'],
    price: 22500,
    paymentDetails: 'จ่ายผ่าน รพ.',
    paymentConditionNote: '',
    patientPrefix: 'นางสาว',
    patientFirstName: 'สถาพร',
    patientLastName: 'ถิ่นวัฒนากูล',
    patientHN: '1040804',
    patientAge: '',
    patientPhone: '',
    hospitalName: 'พหลพลพยุหเสนา กาญจนบุรี',
    doctorName: 'แพทย์หญิงนภาภรณ์ พุ่มมรินทร์',
    doctorPhone: '',
    productCode: 'CTPMMA-003',
    sidePosition: 'LEFT',
    anatomicalArea: 'กะโหลกศีรษะ',
    surgeryType: 'Reconstruction',
    materialType: 'PMMA',
    rpModelQty: 1,
    implantQty: 1,
    temporalSpec: 'ตัดส่วน temporal',
    productionSpec: 'แบบปกติตัดส่วน temporal ยึดสกรูและ fix Plate ตามจุดที่มาร์ค',
    receivedDate: '9/1/2569',
    surgeryDate: '10/2/2569',
    caseReceiver: 'ยุ้ย',
    sterilizeOutDate: '20/1/2569',
    sterilizeReturnDate: '20/1/2569',
    radiationMinKgy: '',
    radiationMaxKgy: '',
    doseUniformity: '',
    qcReceiveDate: '21/1/2569',
    certificateNo: 'NCR0233/2569',
    deliveryDate: '23/1/2569',
    deliveryChannel: 'เคอรี่',
    deliveredBy: 'ต่าย',
    emsTrackingNo: '',
    shippingInfo: PAHOL_SHIPPING_ADDRESS,
    receiptAddress: '',
    packageInfo: '',
    remarks: '',
  },
  {
    salesSeqNo: 3977,
    jobNumber: '2569-018',
    monthlySeq: 18,
    icrNumber: 'ICR0002/2569',
    hospitalCategory: 1,
    productionPlanNo: '',
    barcode: '*8859599490479*',
    workflowStatus: 'delivered',
    paymentChannels: ['via_hospital'],
    price: 22500,
    paymentDetails: 'จ่ายผ่าน รพ.',
    paymentConditionNote: '',
    patientPrefix: 'นาย',
    patientFirstName: 'ประกอบ',
    patientLastName: 'นิลน้ำเพชร',
    patientHN: '7074',
    patientAge: '',
    patientPhone: '',
    hospitalName: 'พหลพลพยุหเสนา กาญจนบุรี',
    doctorName: 'นายแพทย์วสุ ศรีวสุธา',
    doctorPhone: '',
    productCode: 'CTPMMA-003',
    sidePosition: 'RIGHT',
    anatomicalArea: 'กะโหลกศีรษะ',
    surgeryType: 'Reconstruction',
    materialType: 'PMMA',
    rpModelQty: 1,
    implantQty: 1,
    temporalSpec: 'ตัด Temporal',
    productionSpec: 'แบบเฉลี่ยเพิ่ม Soft Tissue ตัด Temporal ยึดสกรูและ fix Plate ตามจุดที่มาร์ค',
    receivedDate: '15/1/2569',
    surgeryDate: '19/2/2569',
    caseReceiver: 'ยุ้ย',
    sterilizeOutDate: '27/1/2569',
    sterilizeReturnDate: '27/1/2569',
    radiationMinKgy: '',
    radiationMaxKgy: '',
    doseUniformity: '',
    qcReceiveDate: '30/1/2569',
    certificateNo: 'NCR0249/2569',
    deliveryDate: '2/2/2569',
    deliveryChannel: 'รพ.',
    deliveredBy: 'ยุ้ย',
    emsTrackingNo: '',
    shippingInfo: PAHOL_SHIPPING_ADDRESS,
    receiptAddress: '',
    packageInfo: '',
    remarks: '',
  },
  {
    salesSeqNo: 4033,
    jobNumber: '2569-074',
    monthlySeq: 40,
    icrNumber: 'ICR0002/2569',
    hospitalCategory: 1,
    productionPlanNo: '',
    barcode: '*8859599491384*',
    workflowStatus: 'delivered',
    paymentChannels: ['via_hospital'],
    price: 22500,
    paymentDetails: 'จ่ายผ่าน รพ.',
    paymentConditionNote: '',
    patientPrefix: 'นาย',
    patientFirstName: 'วิรัฐ',
    patientLastName: 'เพิ่มสุขศรี',
    patientHN: '903951',
    patientAge: '',
    patientPhone: '',
    hospitalName: 'พหลพลพยุหเสนา กาญจนบุรี',
    doctorName: 'นายแพทย์วสุ ศรีวสุธา',
    doctorPhone: '',
    productCode: 'CTPMMA-003',
    sidePosition: 'LEFT',
    anatomicalArea: 'กะโหลกศีรษะ',
    surgeryType: 'Reconstruction',
    materialType: 'PMMA',
    rpModelQty: 1,
    implantQty: 1,
    temporalSpec: 'ไม่ตัด Temporal',
    productionSpec: 'แบบเฉลี่ยเพิ่ม Soft Tissue ไม่ตัด Temporal ยึดสกรูและ fix Plate ตามจุดที่มาร์ค',
    receivedDate: '24/2/2569',
    surgeryDate: '26/3/2569',
    caseReceiver: 'คิว',
    sterilizeOutDate: '12/3/2569',
    sterilizeReturnDate: '12/3/2569',
    radiationMinKgy: '',
    radiationMaxKgy: '',
    doseUniformity: '',
    qcReceiveDate: '13/3/2569',
    certificateNo: 'NCR0352/2569',
    deliveryDate: '18/3/2569',
    deliveryChannel: 'เคอรี่',
    deliveredBy: 'ต่าย',
    emsTrackingNo: '',
    shippingInfo: PAHOL_SHIPPING_ADDRESS,
    receiptAddress: '',
    packageInfo: '',
    remarks: '',
  },
  {
    salesSeqNo: 4222,
    jobNumber: '2569-263',
    monthlySeq: 22,
    icrNumber: 'ICR0002/2569',
    hospitalCategory: 1,
    productionPlanNo: '',
    barcode: '*8859599494644*',
    workflowStatus: 'delivered',
    paymentChannels: ['via_hospital'],
    price: 22500,
    paymentDetails: 'จ่ายผ่าน รพ.',
    paymentConditionNote: '',
    patientPrefix: 'นาง',
    patientFirstName: 'ลูกจันทร์',
    patientLastName: 'พรมทอง',
    patientHN: '438405',
    patientAge: '',
    patientPhone: '',
    hospitalName: 'พหลพลพยุหเสนา กาญจนบุรี',
    doctorName: 'แพทย์หญิงนภาภรณ์ พุ่มมรินทร์',
    doctorPhone: '',
    productCode: 'CTPMMA-003',
    sidePosition: 'LEFT',
    anatomicalArea: 'กะโหลกศีรษะ',
    surgeryType: 'Reconstruction',
    materialType: 'PMMA',
    rpModelQty: 1,
    implantQty: 1,
    temporalSpec: 'ตัด Temporal',
    productionSpec: 'แบบเฉลี่ยเพิ่ม Soft Tissue ตัด Temporal ยึดสกรูและ fix Plate ตามจุดที่มาร์ค',
    receivedDate: '12/6/2569',
    surgeryDate: '4/8/2569',
    caseReceiver: 'คิว',
    sterilizeOutDate: '14/7/2569',
    sterilizeReturnDate: '14/7/2569',
    radiationMinKgy: '22.12',
    radiationMaxKgy: '28.51',
    doseUniformity: '1.29',
    qcReceiveDate: '15/7/2569',
    certificateNo: 'NCR0606/2569',
    deliveryDate: '16/7/2569',
    deliveryChannel: 'เคอรี่',
    deliveredBy: 'ต่าย',
    emsTrackingNo: '',
    shippingInfo: PAHOL_SHIPPING_ADDRESS,
    receiptAddress: '',
    packageInfo: '',
    remarks: '',
  },
  {
    salesSeqNo: 4236,
    jobNumber: '2569-277',
    monthlySeq: 36,
    icrNumber: 'ICR0002/2569',
    hospitalCategory: 1,
    productionPlanNo: '',
    barcode: '*8859599494613*',
    workflowStatus: 'delivered',
    paymentChannels: ['via_hospital'],
    price: 22500,
    paymentDetails: 'จ่ายผ่าน รพ.',
    paymentConditionNote: '',
    patientPrefix: 'นาย',
    patientFirstName: 'ตุ้ม',
    patientLastName: '',
    patientHN: '1091551',
    patientAge: '',
    patientPhone: '',
    hospitalName: 'พหลพลพยุหเสนา กาญจนบุรี',
    doctorName: 'แพทย์หญิงนภาภรณ์ พุ่มมรินทร์',
    doctorPhone: '',
    productCode: 'CTPMMA-003',
    sidePosition: 'LEFT',
    anatomicalArea: 'กะโหลกศีรษะ',
    surgeryType: 'Reconstruction',
    materialType: 'PMMA',
    rpModelQty: 1,
    implantQty: 1,
    temporalSpec: 'ตัด Temporal',
    productionSpec: 'แบบเฉลี่ยเพิ่ม Soft Tissue ตัด Temporal ยึดสกรูและ fix Plate ตามจุดที่มาร์ค 4 จุด',
    receivedDate: '19/6/2569',
    surgeryDate: '',
    caseReceiver: 'คิว',
    sterilizeOutDate: '10/7/2569',
    sterilizeReturnDate: '10/7/2569',
    radiationMinKgy: '',
    radiationMaxKgy: '',
    doseUniformity: '',
    qcReceiveDate: '13/7/2569',
    certificateNo: 'NCR0602/2569',
    deliveryDate: '14/7/2569',
    deliveryChannel: 'เคอรี่',
    deliveredBy: 'ต่าย',
    emsTrackingNo: '',
    shippingInfo: PAHOL_SHIPPING_ADDRESS,
    receiptAddress: '',
    packageInfo: '',
    remarks: '',
  },
  {
    salesSeqNo: 4245,
    jobNumber: '2569-286',
    monthlySeq: 45,
    icrNumber: 'ICR0002/2569',
    hospitalCategory: 1,
    productionPlanNo: '',
    barcode: '*8859599494729*',
    workflowStatus: 'delivered',
    paymentChannels: ['via_hospital'],
    price: 22500,
    paymentDetails: 'จ่ายผ่าน รพ.',
    paymentConditionNote: '',
    patientPrefix: 'นาย',
    patientFirstName: 'เอกกมล',
    patientLastName: 'อุดมสุข',
    patientHN: '1092532',
    patientAge: '',
    patientPhone: '',
    hospitalName: 'พหลพลพยุหเสนา กาญจนบุรี',
    doctorName: 'แพทย์หญิงนภาภรณ์ พุ่มมรินทร์',
    doctorPhone: '',
    productCode: 'CTPMMA-003',
    sidePosition: 'RIGHT',
    anatomicalArea: 'กะโหลกศีรษะ',
    surgeryType: 'Reconstruction',
    materialType: 'PMMA',
    rpModelQty: 1,
    implantQty: 1,
    temporalSpec: 'ตัด Temporal',
    productionSpec: 'แบบเฉลี่ยเพิ่ม Soft Tissue ตัด Temporal ยึดสกรูและ fix Plate ตามจุดที่มาร์ค 4 จุด',
    receivedDate: '29/6/2569',
    surgeryDate: '18/8/2569',
    caseReceiver: 'คิว',
    sterilizeOutDate: '16/7/2569',
    sterilizeReturnDate: '16/7/2569',
    radiationMinKgy: '25.54',
    radiationMaxKgy: '28',
    doseUniformity: '1.1',
    qcReceiveDate: '20/7/2569',
    certificateNo: 'NCR0610/2569',
    deliveryDate: '23/7/2569',
    deliveryChannel: 'เคอรี่',
    deliveredBy: 'ต่าย',
    emsTrackingNo: '',
    shippingInfo: PAHOL_SHIPPING_ADDRESS,
    receiptAddress: '',
    packageInfo: '',
    remarks: '',
  },
  {
    salesSeqNo: 4246,
    jobNumber: '2569-287',
    monthlySeq: 46,
    icrNumber: 'ICR0002/2569',
    hospitalCategory: 1,
    productionPlanNo: '',
    barcode: '*8859599495573*',
    workflowStatus: 'delivered',
    paymentChannels: ['via_hospital'],
    price: 22500,
    paymentDetails: 'จ่ายผ่าน รพ.',
    paymentConditionNote: '',
    patientPrefix: 'นาย',
    patientFirstName: 'จอซิ',
    patientLastName: '',
    patientHN: '1088375',
    patientAge: '',
    patientPhone: '',
    hospitalName: 'พหลพลพยุหเสนา กาญจนบุรี',
    doctorName: 'แพทย์หญิงนภาภรณ์ พุ่มมรินทร์',
    doctorPhone: '',
    productCode: 'CTPMMA-003',
    sidePosition: 'LEFT',
    anatomicalArea: 'กะโหลกศีรษะ',
    surgeryType: 'Reconstruction',
    materialType: 'PMMA',
    rpModelQty: 1,
    implantQty: 1,
    temporalSpec: 'ตัด Temporal',
    productionSpec: 'แบบเฉลี่ยเพิ่ม Soft Tissue ตัด Temporal ยึดสกรูและ fix Plate ตามจุดที่มาร์ค 4 จุด',
    receivedDate: '29/6/2569',
    surgeryDate: '1/9/2569',
    caseReceiver: 'คิว',
    sterilizeOutDate: '14/8/2569',
    sterilizeReturnDate: '14/8/2569',
    radiationMinKgy: '23.9',
    radiationMaxKgy: '30.53',
    doseUniformity: '1.28',
    qcReceiveDate: '18/8/2569',
    certificateNo: 'NCR0670/2569',
    deliveryDate: '20/8/2569',
    deliveryChannel: 'เคอรี่',
    deliveredBy: 'ต่าย',
    emsTrackingNo: '',
    shippingInfo: PAHOL_SHIPPING_ADDRESS,
    receiptAddress: '',
    packageInfo: '',
    remarks: '',
  },
  {
    salesSeqNo: 4299,
    jobNumber: '2569-340',
    monthlySeq: 3,
    icrNumber: 'ICR0002/2569',
    hospitalCategory: 1,
    productionPlanNo: '',
    barcode: '*8859599496112*',
    workflowStatus: 'delivered',
    paymentChannels: ['via_hospital'],
    price: 22500,
    paymentDetails: 'จ่ายผ่าน รพ.',
    paymentConditionNote: '',
    patientPrefix: 'ด.ช.',
    patientFirstName: 'อนิรุทธ์',
    patientLastName: 'นุ่มดี',
    patientHN: '1093984',
    patientAge: '',
    patientPhone: '',
    hospitalName: 'พหลพลพยุหเสนา กาญจนบุรี',
    doctorName: 'แพทย์หญิงนภาภรณ์ พุ่มมรินทร์',
    doctorPhone: '',
    productCode: 'CTPMMA-003',
    sidePosition: 'RIGHT',
    anatomicalArea: 'กะโหลกศีรษะ',
    surgeryType: 'Reconstruction',
    materialType: 'PMMA',
    rpModelQty: 1,
    implantQty: 1,
    temporalSpec: 'ตัดส่วน temporal',
    productionSpec: 'แบบปกติตัดส่วน temporal ยึดสกรูและ fix Plate ตามจุดที่มาร์ค 5 จุด',
    receivedDate: '3/8/2569',
    surgeryDate: '15/9/2569',
    caseReceiver: 'คิว',
    sterilizeOutDate: '2/9/2569',
    sterilizeReturnDate: '2/9/2569',
    radiationMinKgy: '23.55',
    radiationMaxKgy: '27.75',
    doseUniformity: '1.18',
    qcReceiveDate: '4/9/2569',
    certificateNo: 'NCR0705/2569',
    deliveryDate: '9/9/2569',
    deliveryChannel: 'เคอรี่',
    deliveredBy: 'ต่าย',
    emsTrackingNo: '',
    shippingInfo: PAHOL_SHIPPING_ADDRESS,
    receiptAddress: '',
    packageInfo: '',
    remarks: '',
  },
  {
    salesSeqNo: 4345,
    jobNumber: '2569-386',
    monthlySeq: 49,
    icrNumber: 'ICR0002/2569',
    hospitalCategory: 1,
    productionPlanNo: '',
    barcode: '*8859599497157*',
    workflowStatus: 'delivered',
    paymentChannels: ['via_hospital'],
    price: 22500,
    paymentDetails: 'จ่ายผ่าน รพ.',
    paymentConditionNote: '',
    patientPrefix: 'นาย',
    patientFirstName: 'วีระพงษ์',
    patientLastName: 'ขาวบู่',
    patientHN: '1099406',
    patientAge: '',
    patientPhone: '',
    hospitalName: 'พหลพลพยุหเสนา กาญจนบุรี',
    doctorName: 'แพทย์หญิงนภาภรณ์ พุ่มมรินทร์',
    doctorPhone: '',
    productCode: 'CTPMMA-003',
    sidePosition: 'LEFT',
    anatomicalArea: 'กะโหลกศีรษะ',
    surgeryType: 'Reconstruction',
    materialType: 'PMMA',
    rpModelQty: 1,
    implantQty: 1,
    temporalSpec: 'ตัด Temporal',
    productionSpec: 'ตัด Temporal ยึดสกรูและ fix Plate ตามจุดที่มาร์ค 4 จุด',
    receivedDate: '21/8/2569',
    surgeryDate: '20/10/2569',
    caseReceiver: 'คิว',
    sterilizeOutDate: '12/10/2569',
    sterilizeReturnDate: '12/10/2569',
    radiationMinKgy: '20.95',
    radiationMaxKgy: '25.24',
    doseUniformity: '1.2',
    qcReceiveDate: '14/10/2569',
    certificateNo: 'NCR0011/2570',
    deliveryDate: '15/10/2569',
    deliveryChannel: 'เคอรี่',
    deliveredBy: 'ต่าย',
    emsTrackingNo: '',
    shippingInfo: PAHOL_SHIPPING_ADDRESS,
    receiptAddress: '',
    packageInfo: '',
    remarks: '',
  },
  {
    salesSeqNo: 4412,
    jobNumber: '2569-453',
    monthlySeq: 9,
    icrNumber: 'ICR0002/2569',
    hospitalCategory: 1,
    productionPlanNo: '',
    barcode: '*8859599497430*',
    workflowStatus: 'delivered',
    paymentChannels: ['via_hospital'],
    price: 22500,
    paymentDetails: 'จ่ายผ่าน รพ.',
    paymentConditionNote: '',
    patientPrefix: 'น.ส',
    patientFirstName: 'กนกวรรณ',
    patientLastName: 'สุขจับจันทร์',
    patientHN: '494735',
    patientAge: '',
    patientPhone: '',
    hospitalName: 'พหลพลพยุหเสนา กาญจนบุรี',
    doctorName: 'แพทย์หญิงนภาภรณ์ พุ่มมรินทร์',
    doctorPhone: '',
    productCode: 'CTPMMA-003',
    sidePosition: 'RIGHT',
    anatomicalArea: 'กะโหลกศีรษะ',
    surgeryType: 'Reconstruction',
    materialType: 'PMMA',
    rpModelQty: 1,
    implantQty: 1,
    temporalSpec: 'ตัด Temporal',
    productionSpec: 'ตัด Temporal ยึดสกรูและ fix Plate ตามจุดที่มาร์ค 5 จุด',
    receivedDate: '9/10/2569',
    surgeryDate: '3/11/2569',
    caseReceiver: 'คิว',
    sterilizeOutDate: '20/10/2569',
    sterilizeReturnDate: '20/10/2569',
    radiationMinKgy: '22.75',
    radiationMaxKgy: '27.98',
    doseUniformity: '1.23',
    qcReceiveDate: '26/10/2569',
    certificateNo: 'NCR0030/2570',
    deliveryDate: '28/10/2569',
    deliveryChannel: 'เคอรี่',
    deliveredBy: 'ต่าย',
    emsTrackingNo: '',
    shippingInfo: PAHOL_SHIPPING_ADDRESS,
    receiptAddress: '',
    packageInfo: '',
    remarks: '',
  },
  {
    salesSeqNo: 4413,
    jobNumber: '2569-454',
    monthlySeq: 10,
    icrNumber: 'ICR0002/2569',
    hospitalCategory: 1,
    productionPlanNo: '',
    barcode: '*8859599497645*',
    workflowStatus: 'delivered',
    paymentChannels: ['via_hospital'],
    price: 0,
    paymentDetails: 'จ่ายผ่าน รพ.',
    paymentConditionNote: 'รอระบุราคาเรียกเก็บ',
    patientPrefix: 'Mr.',
    patientFirstName: 'TUN TUN SOE',
    patientLastName: '',
    patientHN: '1099360',
    patientAge: '',
    patientPhone: '',
    hospitalName: 'พหลพลพยุหเสนา กาญจนบุรี',
    doctorName: 'แพทย์หญิงนภาภรณ์ พุ่มมรินทร์',
    doctorPhone: '',
    productCode: 'CTPMMA-003',
    sidePosition: 'RIGHT',
    anatomicalArea: 'กะโหลกศีรษะ',
    surgeryType: 'Reconstruction',
    materialType: 'PMMA',
    rpModelQty: 1,
    implantQty: 1,
    temporalSpec: 'ตัด Temporal',
    productionSpec: 'ตัด Temporal ยึดสกรูและ fix Plate ตามจุดที่มาร์ค 4 จุด',
    receivedDate: '9/10/2569',
    surgeryDate: '1/12/2569',
    caseReceiver: 'คิว',
    sterilizeOutDate: '26/10/2569',
    sterilizeReturnDate: '26/10/2569',
    radiationMinKgy: '23.27',
    radiationMaxKgy: '25.38',
    doseUniformity: '1.09',
    qcReceiveDate: '2/11/2569',
    certificateNo: 'NCR0046/2570',
    deliveryDate: '3/11/2569',
    deliveryChannel: 'เคอรี่',
    deliveredBy: 'ต่าย',
    emsTrackingNo: '',
    shippingInfo: PAHOL_SHIPPING_ADDRESS,
    receiptAddress: '',
    packageInfo: '',
    remarks: '',
  },
  {
    salesSeqNo: 4415,
    jobNumber: '2569-456',
    monthlySeq: 12,
    icrNumber: 'ICR0002/2569',
    hospitalCategory: 1,
    productionPlanNo: '',
    barcode: '*8859599497652*',
    workflowStatus: 'delivered',
    paymentChannels: ['via_hospital'],
    price: 0,
    paymentDetails: 'จ่ายผ่าน รพ.',
    paymentConditionNote: 'รอระบุราคาเรียกเก็บ',
    patientPrefix: 'นาย',
    patientFirstName: 'รัฐพล',
    patientLastName: 'จินจารักษ์',
    patientHN: '6174423',
    patientAge: '',
    patientPhone: '',
    hospitalName: 'พหลพลพยุหเสนา กาญจนบุรี',
    doctorName: 'แพทย์หญิงนภาภรณ์ พุ่มมรินทร์',
    doctorPhone: '',
    productCode: 'CTPMMA-003',
    sidePosition: 'RIGHT',
    anatomicalArea: 'กะโหลกศีรษะ',
    surgeryType: 'Reconstruction',
    materialType: 'PMMA',
    rpModelQty: 1,
    implantQty: 1,
    temporalSpec: 'ตัด Temporal',
    productionSpec: 'ตัด Temporal ยึดสกรูและ fix Plate ตามจุดที่มาร์ค 4 จุด',
    receivedDate: '12/10/2569',
    surgeryDate: '17/11/2569',
    caseReceiver: 'คิว',
    sterilizeOutDate: '26/10/2569',
    sterilizeReturnDate: '26/10/2569',
    radiationMinKgy: '23.27',
    radiationMaxKgy: '25.38',
    doseUniformity: '1.09',
    qcReceiveDate: '2/11/2569',
    certificateNo: 'NCR0046/2570',
    deliveryDate: '3/11/2569',
    deliveryChannel: 'เคอรี่',
    deliveredBy: 'ต่าย',
    emsTrackingNo: '',
    shippingInfo: PAHOL_SHIPPING_ADDRESS,
    receiptAddress: '',
    packageInfo: '',
    remarks: '',
  },
  {
    salesSeqNo: 4451,
    jobNumber: '2569-492',
    monthlySeq: 15,
    icrNumber: 'ICR0002/2569',
    hospitalCategory: 1,
    productionPlanNo: '',
    barcode: '',
    workflowStatus: 'sterilizing',
    paymentChannels: ['via_hospital'],
    price: 0,
    paymentDetails: 'จ่ายผ่าน รพ.',
    paymentConditionNote: '',
    patientPrefix: 'นาย',
    patientFirstName: 'ณรงค์ฤทธิ์',
    patientLastName: 'ปานธรรม',
    patientHN: '144137',
    patientAge: '',
    patientPhone: '',
    hospitalName: 'พหลพลพยุหเสนา กาญจนบุรี',
    doctorName: 'แพทย์หญิงนภาภรณ์ พุ่มมรินทร์',
    doctorPhone: '',
    productCode: 'CTPMMA-003',
    sidePosition: 'RIGHT',
    anatomicalArea: 'กะโหลกศีรษะ',
    surgeryType: 'Reconstruction',
    materialType: 'PMMA',
    rpModelQty: 1,
    implantQty: 1,
    temporalSpec: 'ตัด Temporal',
    productionSpec: 'ตัด Temporal ยึดสกรูและ fix Plate ตามจุดที่มาร์ค 4 จุด',
    receivedDate: '6/11/2569',
    surgeryDate: '',
    caseReceiver: 'คิว',
    sterilizeOutDate: '23/11/2569',
    sterilizeReturnDate: '',
    radiationMinKgy: '',
    radiationMaxKgy: '',
    doseUniformity: '',
    qcReceiveDate: '',
    certificateNo: '',
    deliveryDate: '',
    deliveryChannel: '',
    deliveredBy: '',
    emsTrackingNo: '',
    shippingInfo: '',
    receiptAddress: '',
    packageInfo: '',
    remarks: 'อยู่ระหว่างส่งชิ้นงานฆ่าเชื้อ (สีน้ำเงิน)',
  },
];

const PAYMENT_COLUMN_ORDER: OfficePaymentChannel[] = [
  'patient_direct',
  'deposit_50_first',
  'balance_50_before_ship',
  'via_hospital',
  'free_case',
  'doctor_pay',
  'sell_via_ctec',
  'ctec',
  'wimanrat',
];

export type ImportDetectedFormat =
  | 'ctec_raw_ledger'
  | 'ctec_exported_excel'
  | 'flexible_headers'
  | 'unknown';

export interface ParsedOfficeImportResult {
  cases: OfficeCaseSeedInput[];
  detectedFormat: ImportDetectedFormat;
  sheetName: string;
  totalRowsScanned: number;
  warnings: string[];
}

function cleanCell(v: unknown): string {
  return String(v ?? '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200b/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
    .replace(/^"+|"+$/g, '')
    .replace(/""/g, '"')
    .trim();
}

function parseIntegerCell(v: unknown): number {
  const cleaned = cleanCell(v).replace(/,/g, '');
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function parseNumericPrice(v: unknown): number {
  const cleaned = cleanCell(v).replace(/[฿,\s]/g, '');
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function extractTemporalSpec(temporalCell: string, productionSpec: string): string {
  if (temporalCell) return temporalCell;
  const match = productionSpec.match(/ตัด\s*(?:ส่วน\s*)?temporal/i);
  return match ? match[0] : '';
}

function parseHospitalCategory(raw: string): HospitalCategoryCode {
  const text = raw.trim();
  if (text === '2' || text.includes('เอกชน')) return 2;
  if (text === '3' || text.includes('คลินิก')) return 3;
  return 1;
}

function parseWorkflowStatusCell(
  statusRaw: string,
  deliveryDate: string,
  sterilizeOutDate: string
): OfficeCaseWorkflowStatus {
  const lower = statusRaw.trim().toLowerCase();
  if (
    lower.includes('เขียว') ||
    lower.includes('จัดส่งแล้ว') ||
    lower.includes('ส่งแล้ว') ||
    lower === 'delivered'
  ) {
    return 'delivered';
  }
  if (
    lower.includes('น้ำเงิน') ||
    lower.includes('ฆ่าเชื้อ') ||
    lower === 'sterilizing'
  ) {
    return 'sterilizing';
  }
  if (
    lower.includes('ขาว') ||
    lower.includes('ระหว่างทำ') ||
    lower.includes('รอรับเคส') ||
    lower === 'in_progress'
  ) {
    return 'in_progress';
  }
  return inferWorkflowStatus(deliveryDate, sterilizeOutDate);
}

function splitFullName(fullName: string): {
  prefix: string;
  firstName: string;
  lastName: string;
} {
  const trimmed = fullName.replace(/\s+/g, ' ').trim();
  if (!trimmed) return { prefix: '', firstName: '', lastName: '' };

  const prefixes = [
    'นางสาว',
    'เด็กชาย',
    'เด็กหญิง',
    'น.ส.',
    'น.ส',
    'ด.ช.',
    'ด.ญ.',
    'นาย',
    'นาง',
    'Mrs.',
    'Miss',
    'Ms.',
    'Mr.',
    'Dr.',
  ];

  let prefix = '';
  let rest = trimmed;

  for (const p of prefixes) {
    if (rest.toLowerCase().startsWith(p.toLowerCase())) {
      const after = rest.slice(p.length);
      if (!after || after.startsWith(' ') || /[ก-๙A-Za-z]/.test(after[0])) {
        prefix = rest.slice(0, p.length);
        rest = after.trim();
        break;
      }
    }
  }

  const parts = rest.split(' ').filter(Boolean);
  if (parts.length === 0) {
    return { prefix, firstName: '', lastName: '' };
  }
  if (parts.length === 1) {
    return { prefix, firstName: parts[0], lastName: '' };
  }
  return {
    prefix,
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

export function inferWorkflowStatus(
  deliveryDate: string,
  sterilizeOutDate: string
): OfficeCaseWorkflowStatus {
  if (deliveryDate.trim()) return 'delivered';
  if (sterilizeOutDate.trim()) return 'sterilizing';
  return 'in_progress';
}

/**
 * Decodes raw bytes as UTF-8, falling back to Windows-874 (Thai Excel ANSI CSV)
 * whenever UTF-8 replacement characters (U+FFFD) appear.
 */
function decodeTextBytes(bytes: Uint8Array): string {
  // Check UTF-8 BOM
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  }
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  if (!utf8.includes('\uFFFD')) {
    return utf8;
  }
  try {
    return new TextDecoder('windows-874').decode(bytes);
  } catch {
    return utf8;
  }
}

function isBinarySpreadsheetBytes(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  // ZIP (.xlsx / .xlsm / .ods): PK\x03\x04
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return true;
  }
  // OLE2 Compound Binary (.xls): D0 CF 11 E0
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    return true;
  }
  return false;
}

function detectDelimiter(text: string): ',' | '\t' | ';' {
  const sampleLines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .slice(0, 12);

  let tabs = 0;
  let commas = 0;
  let semis = 0;

  for (const line of sampleLines) {
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (!inQuotes) {
        if (ch === '\t') tabs++;
        else if (ch === ',') commas++;
        else if (ch === ';') semis++;
      }
    }
  }

  if (tabs > 0 && tabs >= commas) return '\t';
  if (semis > commas && semis > tabs) return ';';
  return ',';
}

/**
 * RFC-4180 compliant delimited text parser that preserves raw strings (never
 * corrupts Thai job numbers like "2569-001" or dates like "5/1/2569" into Excel
 * serial numbers) and tolerates multi-line quoted cells and nested quotes.
 */
export function parseDelimitedTextToMatrix(rawText: string): string[][] {
  const text = rawText.replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        // Count consecutive quotes to handle doubled/nested quotes cleanly
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"' && field.length === 0) {
        inQuotes = true;
      } else if (ch === delimiter) {
        row.push(field);
        field = '';
      } else if (ch === '\r') {
        if (text[i + 1] === '\n') i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

type FlexibleFieldKey =
  | 'salesSeqNo'
  | 'workflowStatus'
  | 'hospitalCategory'
  | 'jobNumber'
  | 'monthlySeq'
  | 'icrNumber'
  | 'productionPlanNo'
  | 'temporalSpec'
  | 'productionSpec'
  | 'barcode'
  | 'patientFullName'
  | 'patientPrefix'
  | 'patientFirstName'
  | 'patientLastName'
  | 'patientHN'
  | 'patientAge'
  | 'hospitalName'
  | 'doctorName'
  | 'productCode'
  | 'sidePosition'
  | 'anatomicalArea'
  | 'surgeryType'
  | 'materialType'
  | 'rpModelQty'
  | 'implantQty'
  | 'patientPhone'
  | 'doctorPhone'
  | 'receivedDate'
  | 'surgeryDate'
  | 'caseReceiver'
  | 'sterilizeOutDate'
  | 'sterilizeReturnDate'
  | 'radiationMinKgy'
  | 'radiationMaxKgy'
  | 'doseUniformity'
  | 'qcReceiveDate'
  | 'certificateNo'
  | 'deliveryDate'
  | 'deliveryChannel'
  | 'deliveredBy'
  | 'emsTrackingNo'
  | 'price'
  | 'paymentDetails'
  | 'paymentConditionNote'
  | 'shippingInfo'
  | 'receiptAddress'
  | 'packageInfo'
  | 'remarks'
  | `pay:${OfficePaymentChannel}`;

const FLEXIBLE_HEADER_ALIASES: Array<{ key: FlexibleFieldKey; patterns: string[] }> = [
  { key: 'salesSeqNo', patterns: ['ลำดับขายทั้งหมด', 'ลำดับขาย', 'sales seq', 'seq no', 'ลำดับที่'] },
  { key: 'workflowStatus', patterns: ['สถานะสีหน้าจอรับงาน', 'สถานะสี', 'สถานะเคส', 'สถานะงาน', 'workflow', 'status'] },
  { key: 'pay:patient_direct', patterns: ['คนไข้จ่ายเองกับบริษัท', 'คนไข้จ่ายเอง'] },
  { key: 'pay:deposit_50_first', patterns: ['มัดจำ50%แรก', 'มัดจำ 50% แรก', 'มัดจำ50%'] },
  { key: 'pay:balance_50_before_ship', patterns: ['ก่อนส่ง 50%หลัง', 'ก่อนส่ง50%หลัง', '50%หลัง'] },
  { key: 'pay:via_hospital', patterns: ['จ่ายผ่าน รพ', 'จ่ายผ่านโรงพยาบาล', 'ผ่าน รพ'] },
  { key: 'pay:free_case', patterns: ['เคสฟรี', 'free case'] },
  { key: 'pay:doctor_pay', patterns: ['หมอจ่าย', 'แพทย์จ่าย'] },
  { key: 'pay:sell_via_ctec', patterns: ['ขายผ่ายซีเทค', 'ขายผ่านซีเทค'] },
  { key: 'pay:ctec', patterns: ['ซีเทค', 'ctec'] },
  { key: 'pay:wimanrat', patterns: ['วิมานรัตร์', 'วิมานรัตน์'] },
  { key: 'hospitalCategory', patterns: ['ประเภทโรงพยาบาล', 'ประเภทรพ', 'hospital category'] },
  { key: 'jobNumber', patterns: ['เลขที่รับงาน', 'เลขรับงาน', 'เลขเคส', 'รหัสเคส', 'job no', 'job number', 'case no'] },
  { key: 'monthlySeq', patterns: ['ลำดับแต่ละเดือน', 'ลำดับเดือน', 'monthly seq'] },
  { key: 'icrNumber', patterns: ['icr no', 'icr', 'เลข icr'] },
  { key: 'productionPlanNo', patterns: ['ใบวางแผนผลิต', 'แผนผลิต', 'production plan'] },
  { key: 'temporalSpec', patterns: ['temporal'] },
  { key: 'productionSpec', patterns: ['สถานะการผลิต', 'จุดยึด', 'รายละเอียดผลิต', 'สเปกผลิต', 'production spec'] },
  { key: 'barcode', patterns: ['รหัสบาร์โค้ด', 'บาร์โค้ด', 'barcode'] },
  { key: 'patientPrefix', patterns: ['คำนำหน้า', 'prefix'] },
  { key: 'patientFullName', patterns: ['ชื่อ-สกุล', 'ชื่อสกุล', 'ชื่อคนไข้', 'ชื่อผู้ป่วย', 'patient name'] },
  { key: 'patientFirstName', patterns: ['ชื่อจริง', 'ชื่อ', 'first name'] },
  { key: 'patientLastName', patterns: ['นามสกุล', 'สกุล', 'last name', 'surname'] },
  { key: 'patientHN', patterns: ['hn', 'เลข hn', 'รหัสคนไข้'] },
  { key: 'patientAge', patterns: ['อายุ', 'age'] },
  { key: 'hospitalName', patterns: ['โรงพยาบาล', 'รพ.', 'รพ', 'ชื่อโรงพยาบาล', 'hospital'] },
  { key: 'doctorName', patterns: ['แพทย์', 'หมอ', 'ชื่อแพทย์', 'ชื่อหมอ', 'doctor', 'surgeon'] },
  { key: 'productCode', patterns: ['รหัสสินค้า', 'รหัสชิ้นงาน', 'product code', 'sku'] },
  { key: 'sidePosition', patterns: ['ตำแหน่ง', 'ข้าง', 'side', 'left/right'] },
  { key: 'anatomicalArea', patterns: ['บริเวณที่สร้าง', 'บริเวณ', 'อวัยวะ', 'anatomical'] },
  { key: 'surgeryType', patterns: ['ประเภทการผ่าตัด', 'การผ่าตัด', 'surgery type'] },
  { key: 'materialType', patterns: ['ลักษณะชิ้นงาน', 'วัสดุ', 'material'] },
  { key: 'rpModelQty', patterns: ['rp model', 'จำนวน rp', 'rp'] },
  { key: 'implantQty', patterns: ['implant', 'จำนวนชิ้นงาน', 'จำนวน implant'] },
  { key: 'patientPhone', patterns: ['เบอร์คนไข้', 'โทรคนไข้', 'patient phone'] },
  { key: 'doctorPhone', patterns: ['เบอร์แพทย์', 'เบอร์หมอ', 'doctor phone'] },
  { key: 'receivedDate', patterns: ['วันรับงาน', 'วันที่รับงาน', 'วันรับเคส', 'received date'] },
  { key: 'surgeryDate', patterns: ['วันผ่าตัด', 'วันที่ผ่าตัด', 'surgery date'] },
  { key: 'caseReceiver', patterns: ['ผู้รับเคส', 'รับเคส', 'ผู้รับงาน', 'receiver'] },
  { key: 'sterilizeOutDate', patterns: ['วันส่งออก', 'ส่งฆ่าเชื้อ', 'sterilize out'] },
  { key: 'sterilizeReturnDate', patterns: ['วันรับเข้าฆ่าเชื้อ', 'รับกลับฆ่าเชื้อ', 'ฆ่าเชื้อ: วันรับเข้า', 'sterilize return'] },
  { key: 'radiationMinKgy', patterns: ['ปริมาณรังสีต่ำสุด', 'รังสีต่ำสุด', 'min kgy'] },
  { key: 'radiationMaxKgy', patterns: ['ปริมาณรังสีสูงสุด', 'รังสีสูงสุด', 'max kgy'] },
  { key: 'doseUniformity', patterns: ['dose uniformity', 'uniformity'] },
  { key: 'qcReceiveDate', patterns: ['วันรับเข้า qa', 'วันรับเข้า qc', 'qc date', 'qa date'] },
  { key: 'certificateNo', patterns: ['certificate no', 'certificate', 'เลขใบรับรอง', 'cert'] },
  { key: 'deliveryDate', patterns: ['วันที่ส่งงาน', 'วันจัดส่ง', 'วันที่จัดส่ง', 'delivery date'] },
  { key: 'deliveryChannel', patterns: ['ส่งที่', 'ขนส่ง', 'ช่องทางจัดส่ง', 'delivery channel'] },
  { key: 'deliveredBy', patterns: ['นำส่ง', 'ผู้นำส่ง', 'delivered by'] },
  { key: 'emsTrackingNo', patterns: ['เลขที่ ems', 'เลข ems', 'เลขพัสดุ', 'tracking', 'ems'] },
  { key: 'price', patterns: ['ราคาชิ้นงาน', 'ราคา', 'มูลค่า', 'ยอดเงิน', 'price', 'amount'] },
  { key: 'paymentDetails', patterns: ['รายละเอียดการจ่ายเงิน', 'การชำระเงิน', 'payment detail'] },
  { key: 'paymentConditionNote', patterns: ['เงื่อนไขการชำระ', 'เงื่อนไขจ่าย', 'payment condition'] },
  { key: 'shippingInfo', patterns: ['ข้อมูลการส่งของ', 'ที่อยู่จัดส่ง', 'shipping'] },
  { key: 'receiptAddress', patterns: ['ข้อมูลการส่งใบเสร็จ', 'ที่อยู่ใบเสร็จ', 'receipt address'] },
  { key: 'packageInfo', patterns: ['package', 'แพ็กเกจ', 'บรรจุภัณฑ์'] },
  { key: 'remarks', patterns: ['หมายเหตุ', 'บันทึกเพิ่มเติม', 'remarks', 'note', 'notes'] },
];

function normalizeHeader(cell: string): string {
  return cleanCell(cell)
    .toLowerCase()
    .replace(/[\s\n\r]+/g, ' ')
    .trim();
}

function matchHeaderToKey(header: string, usedKeys: Set<FlexibleFieldKey>): FlexibleFieldKey | null {
  if (!header) return null;
  for (const entry of FLEXIBLE_HEADER_ALIASES) {
    if (usedKeys.has(entry.key)) continue;
    for (const pattern of entry.patterns) {
      if (header === pattern) return entry.key;
    }
  }
  for (const entry of FLEXIBLE_HEADER_ALIASES) {
    if (usedKeys.has(entry.key)) continue;
    for (const pattern of entry.patterns) {
      if (pattern.length >= 2 && header.includes(pattern)) {
        // Avoid matching short "ชื่อ" against "ชื่อโรงพยาบาล" or "ชื่อแพทย์" (already checked above, double-guard)
        if (entry.key === 'patientFirstName' && (header.includes('โรงพยาบาล') || header.includes('แพทย์') || header.includes('หมอ') || header.includes('สกุล'))) {
          continue;
        }
        return entry.key;
      }
    }
  }
  return null;
}

function parseExportedCtecRows(
  rows: unknown[][],
  defaultIcr: string
): OfficeCaseSeedInput[] {
  const parsed: OfficeCaseSeedInput[] = [];
  let icrNumber = defaultIcr;
  let headerPassed = false;

  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const col1 = cleanCell(row[1]);
    if (col1.includes('สถานะสีหน้าจอรับงาน')) {
      headerPassed = true;
      continue;
    }
    if (!headerPassed) continue;

    const rowText = row.map((c) => cleanCell(c)).join(' ');
    const icrMatch = rowText.match(/ICR\d+\/\d+/i);
    if (icrMatch) icrNumber = icrMatch[0].toUpperCase();

    const jobNum = cleanCell(row[12]);
    const hospitalName = cleanCell(row[24]);
    const patientFirstName = cleanCell(row[20]);
    const doctorName = cleanCell(row[25]);
    const seqVal = parseIntegerCell(row[0]);

    if (!jobNum && !hospitalName && !patientFirstName && !doctorName) continue;

    const paymentChannels: OfficePaymentChannel[] = [];
    PAYMENT_COLUMN_ORDER.forEach((key, idx) => {
      const marker = cleanCell(row[2 + idx]);
      if (marker && marker !== '-' && marker !== '0') {
        paymentChannels.push(key);
      }
    });

    const hospitalCategory = parseHospitalCategory(cleanCell(row[11]));
    const sterilizeOutDate = cleanCell(row[38]);
    const deliveryDate = cleanCell(row[45]);
    const productionSpec = cleanCell(row[17]);

    parsed.push({
      salesSeqNo: seqVal,
      jobNumber: jobNum,
      monthlySeq: parseIntegerCell(row[13]),
      icrNumber: cleanCell(row[14]) || icrNumber,
      hospitalCategory,
      productionPlanNo: cleanCell(row[15]),
      temporalSpec: extractTemporalSpec(cleanCell(row[16]), productionSpec),
      productionSpec,
      barcode: cleanCell(row[18]),
      patientPrefix: cleanCell(row[19]),
      patientFirstName,
      patientLastName: cleanCell(row[21]),
      patientHN: cleanCell(row[22]),
      patientAge: cleanCell(row[23]),
      hospitalName,
      doctorName,
      productCode: cleanCell(row[26]),
      sidePosition: cleanCell(row[27]),
      anatomicalArea: cleanCell(row[28]),
      surgeryType: cleanCell(row[29]),
      materialType: cleanCell(row[30]),
      rpModelQty: parseIntegerCell(row[31]),
      implantQty: parseIntegerCell(row[32]),
      patientPhone: cleanCell(row[33]),
      doctorPhone: cleanCell(row[34]),
      receivedDate: cleanCell(row[35]),
      surgeryDate: cleanCell(row[36]),
      caseReceiver: cleanCell(row[37]),
      sterilizeOutDate,
      sterilizeReturnDate: cleanCell(row[39]),
      radiationMinKgy: cleanCell(row[40]),
      radiationMaxKgy: cleanCell(row[41]),
      doseUniformity: cleanCell(row[42]),
      qcReceiveDate: cleanCell(row[43]),
      certificateNo: cleanCell(row[44]),
      deliveryDate,
      deliveryChannel: cleanCell(row[46]),
      deliveredBy: cleanCell(row[47]),
      emsTrackingNo: cleanCell(row[48]),
      price: parseNumericPrice(row[49]),
      paymentDetails: cleanCell(row[50]),
      paymentConditionNote: cleanCell(row[51]),
      shippingInfo: cleanCell(row[52]),
      receiptAddress: cleanCell(row[53]),
      packageInfo: cleanCell(row[54]),
      remarks: cleanCell(row[55]),
      workflowStatus: parseWorkflowStatusCell(col1, deliveryDate, sterilizeOutDate),
      paymentChannels,
    });
  }

  return parsed;
}

function parseRawCtecLedgerRows(
  rows: unknown[][],
  defaultIcr: string
): OfficeCaseSeedInput[] {
  const parsed: OfficeCaseSeedInput[] = [];
  let icrNumber = defaultIcr;

  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 12) continue;

    const rowText = row.map((c) => cleanCell(c)).join(' ');
    const icrMatch = rowText.match(/ICR\d+\/\d+/i);
    if (icrMatch) icrNumber = icrMatch[0].toUpperCase();

    const seqRaw = cleanCell(row[0]).replace(/,/g, '');
    const jobNum = cleanCell(row[11]);
    const hospitalName = cleanCell(row[22]);
    const patientFirstName = cleanCell(row[18]);
    const doctorName = cleanCell(row[23]);

    // Skip obvious header rows
    if (
      seqRaw.includes('ลำดับ') ||
      jobNum.includes('เลขที่รับงาน') ||
      hospitalName === 'โรงพยาบาล' ||
      patientFirstName === 'ชื่อ'
    ) {
      continue;
    }

    const hasNumericSeq = /^\d+$/.test(seqRaw);
    const hasCoreCaseData = Boolean(
      jobNum || (hospitalName && (patientFirstName || doctorName))
    );
    if (!hasNumericSeq && !hasCoreCaseData) continue;
    if (!jobNum && !hospitalName && !patientFirstName) continue;

    const paymentChannels: OfficePaymentChannel[] = [];
    PAYMENT_COLUMN_ORDER.forEach((key, idx) => {
      const marker = cleanCell(row[1 + idx]);
      if (marker && marker !== '-' && marker !== '0') {
        paymentChannels.push(key);
      }
    });

    const hospitalCategory = parseHospitalCategory(cleanCell(row[10]));
    const sterilizeOutDate = cleanCell(row[36]);
    const deliveryDate = cleanCell(row[43]);
    const productionSpec = cleanCell(row[15]);
    const paymentDetailsRaw = cleanCell(row[48]);
    const inferredPaymentDetails =
      paymentDetailsRaw ||
      (paymentChannels.includes('via_hospital')
        ? 'จ่ายผ่าน รพ.'
        : paymentChannels.includes('patient_direct')
          ? 'คนไข้จ่ายเองกับบริษัท'
          : paymentChannels.includes('free_case')
            ? 'เคสฟรี'
            : '');

    parsed.push({
      salesSeqNo: hasNumericSeq ? Number(seqRaw) : 0,
      jobNumber: jobNum,
      monthlySeq: parseIntegerCell(row[12]),
      icrNumber,
      hospitalCategory,
      productionPlanNo: cleanCell(row[13]),
      temporalSpec: extractTemporalSpec(cleanCell(row[14]), productionSpec),
      productionSpec,
      barcode: cleanCell(row[16]),
      patientPrefix: cleanCell(row[17]),
      patientFirstName,
      patientLastName: cleanCell(row[19]),
      patientHN: cleanCell(row[20]),
      patientAge: cleanCell(row[21]),
      hospitalName,
      doctorName,
      productCode: cleanCell(row[24]),
      sidePosition: cleanCell(row[25]),
      anatomicalArea: cleanCell(row[26]),
      surgeryType: cleanCell(row[27]),
      materialType: cleanCell(row[28]),
      rpModelQty: parseIntegerCell(row[29]),
      implantQty: parseIntegerCell(row[30]),
      patientPhone: cleanCell(row[31]),
      doctorPhone: cleanCell(row[32]),
      receivedDate: cleanCell(row[33]),
      surgeryDate: cleanCell(row[34]),
      caseReceiver: cleanCell(row[35]),
      sterilizeOutDate,
      sterilizeReturnDate: cleanCell(row[37]),
      radiationMinKgy: cleanCell(row[38]),
      radiationMaxKgy: cleanCell(row[39]),
      doseUniformity: cleanCell(row[40]),
      qcReceiveDate: cleanCell(row[41]),
      certificateNo: cleanCell(row[42]),
      deliveryDate,
      deliveryChannel: cleanCell(row[44]),
      deliveredBy: cleanCell(row[45]),
      emsTrackingNo: cleanCell(row[46]),
      price: parseNumericPrice(row[47]),
      paymentDetails: inferredPaymentDetails,
      paymentConditionNote: cleanCell(row[49]),
      shippingInfo: cleanCell(row[50]),
      receiptAddress: cleanCell(row[51]),
      packageInfo: cleanCell(row[52]),
      remarks: cleanCell(row[53]),
      workflowStatus: inferWorkflowStatus(deliveryDate, sterilizeOutDate),
      paymentChannels,
    });
  }

  return parsed;
}

function parseFlexibleHeaderRows(
  rows: unknown[][],
  defaultIcr: string
): OfficeCaseSeedInput[] {
  let bestHeaderIdx = -1;
  let bestMap = new Map<number, FlexibleFieldKey>();
  let icrNumber = defaultIcr;

  // Scan top 15 rows to locate the best header row (and capture ICR if present)
  const scanLimit = Math.min(rows.length, 15);
  for (let rIdx = 0; rIdx < scanLimit; rIdx++) {
    const row = rows[rIdx];
    if (!Array.isArray(row)) continue;

    const rowText = row.map((c) => cleanCell(c)).join(' ');
    const icrMatch = rowText.match(/ICR\d+\/\d+/i);
    if (icrMatch) icrNumber = icrMatch[0].toUpperCase();

    const colMap = new Map<number, FlexibleFieldKey>();
    const usedKeys = new Set<FlexibleFieldKey>();

    row.forEach((cell, cIdx) => {
      const normalized = normalizeHeader(String(cell ?? ''));
      const matched = matchHeaderToKey(normalized, usedKeys);
      if (matched) {
        colMap.set(cIdx, matched);
        usedKeys.add(matched);
      }
    });

    if (colMap.size > bestMap.size) {
      bestMap = colMap;
      bestHeaderIdx = rIdx;
    }
  }

  // Require at least 2 recognized columns, with at least one core identifier column
  const coreKeys: FlexibleFieldKey[] = [
    'jobNumber',
    'hospitalName',
    'patientFirstName',
    'patientFullName',
    'doctorName',
    'productCode',
  ];
  const matchedValues = new Set(bestMap.values());
  const hasCore = coreKeys.some((k) => matchedValues.has(k));

  if (bestHeaderIdx < 0 || bestMap.size < 2 || !hasCore) {
    return [];
  }

  const parsed: OfficeCaseSeedInput[] = [];

  for (let rIdx = bestHeaderIdx + 1; rIdx < rows.length; rIdx++) {
    const row = rows[rIdx];
    if (!Array.isArray(row)) continue;

    const getVal = (key: FlexibleFieldKey): string => {
      for (const [colIdx, k] of bestMap.entries()) {
        if (k === key) return cleanCell(row[colIdx]);
      }
      return '';
    };

    let patientPrefix = getVal('patientPrefix');
    let patientFirstName = getVal('patientFirstName');
    let patientLastName = getVal('patientLastName');
    const fullName = getVal('patientFullName');
    if (fullName && !patientFirstName) {
      const split = splitFullName(fullName);
      if (!patientPrefix) patientPrefix = split.prefix;
      patientFirstName = split.firstName;
      if (!patientLastName) patientLastName = split.lastName;
    }

    const jobNumber = getVal('jobNumber');
    const hospitalName = getVal('hospitalName');
    const doctorName = getVal('doctorName');
    const productCode = getVal('productCode');
    const patientHN = getVal('patientHN');

    // Skip blank or subtotal rows
    if (!jobNumber && !hospitalName && !patientFirstName && !doctorName && !productCode && !patientHN) {
      continue;
    }
    const joined = `${jobNumber} ${hospitalName} ${patientFirstName}`.toLowerCase();
    if (joined.includes('รวมทั้งหมด') || joined.startsWith('total')) continue;

    const paymentChannels: OfficePaymentChannel[] = [];
    for (const [colIdx, k] of bestMap.entries()) {
      if (k.startsWith('pay:')) {
        const marker = cleanCell(row[colIdx]);
        if (marker && marker !== '-' && marker !== '0') {
          paymentChannels.push(k.slice(4) as OfficePaymentChannel);
        }
      }
    }

    const sterilizeOutDate = getVal('sterilizeOutDate');
    const deliveryDate = getVal('deliveryDate');
    const productionSpec = getVal('productionSpec');
    const workflowStatus = parseWorkflowStatusCell(
      getVal('workflowStatus'),
      deliveryDate,
      sterilizeOutDate
    );

    parsed.push({
      salesSeqNo: parseIntegerCell(getVal('salesSeqNo')),
      jobNumber,
      monthlySeq: parseIntegerCell(getVal('monthlySeq')),
      icrNumber: getVal('icrNumber') || icrNumber,
      hospitalCategory: parseHospitalCategory(getVal('hospitalCategory')),
      productionPlanNo: getVal('productionPlanNo'),
      temporalSpec: extractTemporalSpec(getVal('temporalSpec'), productionSpec),
      productionSpec,
      barcode: getVal('barcode'),
      patientPrefix,
      patientFirstName,
      patientLastName,
      patientHN,
      patientAge: getVal('patientAge'),
      hospitalName,
      doctorName,
      productCode,
      sidePosition: getVal('sidePosition'),
      anatomicalArea: getVal('anatomicalArea'),
      surgeryType: getVal('surgeryType'),
      materialType: getVal('materialType'),
      rpModelQty: parseIntegerCell(getVal('rpModelQty')) || 0,
      implantQty: parseIntegerCell(getVal('implantQty')) || 1,
      patientPhone: getVal('patientPhone'),
      doctorPhone: getVal('doctorPhone'),
      receivedDate: getVal('receivedDate'),
      surgeryDate: getVal('surgeryDate'),
      caseReceiver: getVal('caseReceiver'),
      sterilizeOutDate,
      sterilizeReturnDate: getVal('sterilizeReturnDate'),
      radiationMinKgy: getVal('radiationMinKgy'),
      radiationMaxKgy: getVal('radiationMaxKgy'),
      doseUniformity: getVal('doseUniformity'),
      qcReceiveDate: getVal('qcReceiveDate'),
      certificateNo: getVal('certificateNo'),
      deliveryDate,
      deliveryChannel: getVal('deliveryChannel'),
      deliveredBy: getVal('deliveredBy'),
      emsTrackingNo: getVal('emsTrackingNo'),
      price: parseNumericPrice(getVal('price')),
      paymentDetails: getVal('paymentDetails'),
      paymentConditionNote: getVal('paymentConditionNote'),
      shippingInfo: getVal('shippingInfo'),
      receiptAddress: getVal('receiptAddress'),
      packageInfo: getVal('packageInfo'),
      remarks: getVal('remarks'),
      workflowStatus,
      paymentChannels,
    });
  }

  return parsed;
}

export function parseMatrixToOfficeCases(
  rows: unknown[][],
  sheetName = 'Sheet1'
): ParsedOfficeImportResult {
  const warnings: string[] = [];
  let defaultIcr = 'ICR0002/2569';

  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const match = row.map((c) => cleanCell(c)).join(' ').match(/ICR\d+\/\d+/i);
    if (match) {
      defaultIcr = match[0].toUpperCase();
      break;
    }
  }

  // 1. Check if exported from this CRM app
  const isExported = rows
    .slice(0, 10)
    .some((row) => Array.isArray(row) && cleanCell(row[1]).includes('สถานะสีหน้าจอรับงาน'));

  if (isExported) {
    const cases = parseExportedCtecRows(rows, defaultIcr);
    return {
      cases,
      detectedFormat: 'ctec_exported_excel',
      sheetName,
      totalRowsScanned: rows.length,
      warnings,
    };
  }

  // 2. Check if original CTEC 54-column ledger (header match OR classic column geometry)
  const looksLikeCtecRaw =
    rows.slice(0, 10).some((row) => {
      if (!Array.isArray(row)) return false;
      const joined = row.map((c) => cleanCell(c)).join(' ');
      return (
        joined.includes('คนไข้จ่ายเองกับบริษัท') ||
        joined.includes('CTEC Customized') ||
        (cleanCell(row[11]).includes('เลขที่รับงาน') && cleanCell(row[22]).includes('โรงพยาบาล'))
      );
    }) ||
    rows.some(
      (row) =>
        Array.isArray(row) &&
        row.length >= 25 &&
        /^\d+$/.test(cleanCell(row[0]).replace(/,/g, '')) &&
        Boolean(cleanCell(row[11]) || cleanCell(row[22]))
    );

  if (looksLikeCtecRaw) {
    const cases = parseRawCtecLedgerRows(rows, defaultIcr);
    if (cases.length > 0) {
      return {
        cases,
        detectedFormat: 'ctec_raw_ledger',
        sheetName,
        totalRowsScanned: rows.length,
        warnings,
      };
    }
  }

  // 3. Fallback: Flexible Thai/English header-mapping parser (works on any custom spreadsheet!)
  const flexibleCases = parseFlexibleHeaderRows(rows, defaultIcr);
  if (flexibleCases.length > 0) {
    return {
      cases: flexibleCases,
      detectedFormat: 'flexible_headers',
      sheetName,
      totalRowsScanned: rows.length,
      warnings,
    };
  }

  warnings.push(
    'ไม่พบหัวคอลัมน์หรือแถวเคสที่รองรับ — แนะนำให้ใช้ไฟล์แม่แบบ Excel หรือมีอย่างน้อยหัวคอลัมน์ เช่น "เลขที่รับงาน", "โรงพยาบาล", "ชื่อคนไข้"'
  );

  return {
    cases: [],
    detectedFormat: 'unknown',
    sheetName,
    totalRowsScanned: rows.length,
    warnings,
  };
}

/**
 * Parses raw text pasted directly from Excel, Google Sheets, or CSV files.
 */
export function parseCtecOfficeTextDetailed(rawText: string): ParsedOfficeImportResult {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return {
      cases: [],
      detectedFormat: 'unknown',
      sheetName: 'วางข้อมูลจากคลิปบอร์ด',
      totalRowsScanned: 0,
      warnings: ['กรุณาวางข้อมูลตารางจาก Excel, Google Sheets หรือ CSV ก่อนตรวจสอบ'],
    };
  }
  const matrix = parseDelimitedTextToMatrix(trimmed);
  return parseMatrixToOfficeCases(matrix, 'วางข้อมูลจากคลิปบอร์ด');
}

/**
 * Parses an uploaded Excel (.xlsx/.xls), CSV, TSV, or extensionless text file
 * (such as "รับเคสคิว19-11-69") with automatic encoding detection (UTF-8 / Windows-874),
 * multi-sheet scanning, and 3-tier format detection.
 */
export async function parseCtecOfficeUploadDetailed(
  file: File
): Promise<ParsedOfficeImportResult> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const lowerName = file.name.toLowerCase();
  const isBinaryExcel =
    isBinarySpreadsheetBytes(bytes) ||
    lowerName.endsWith('.xlsx') ||
    lowerName.endsWith('.xls') ||
    lowerName.endsWith('.xlsm');

  if (!isBinaryExcel) {
    const decodedText = decodeTextBytes(bytes);
    const matrix = parseDelimitedTextToMatrix(decodedText);
    return parseMatrixToOfficeCases(matrix, file.name);
  }

  // Binary Excel (.xlsx / .xls): scan every worksheet and return the first valid match
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  let bestResult: ParsedOfficeImportResult = {
    cases: [],
    detectedFormat: 'unknown',
    sheetName: workbook.SheetNames[0] || file.name,
    totalRowsScanned: 0,
    warnings: [],
  };

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
    });
    const res = parseMatrixToOfficeCases(rows, sheetName);
    if (res.cases.length > bestResult.cases.length) {
      bestResult = res;
    }
  }

  return bestResult;
}

/**
 * Backwards-compatible wrapper returning parsed case inputs directly.
 */
export async function parseCtecOfficeUpload(file: File): Promise<OfficeCaseSeedInput[]> {
  const res = await parseCtecOfficeUploadDetailed(file);
  return res.cases;
}

/**
 * Downloads a clean, ready-to-fill Excel template (.xlsx) for office staff
 * with sample rows so they can fill in partial or complete case details and re-import.
 */
export function downloadOfficeCaseTemplateExcel() {
  const wb = XLSX.utils.book_new();
  const headers = [
    'เลขที่รับงาน',
    'โรงพยาบาล',
    'ประเภทโรงพยาบาล',
    'คำนำหน้า',
    'ชื่อ',
    'สกุล',
    'HN',
    'อายุ',
    'แพทย์',
    'รหัสสินค้า',
    'ตำแหน่ง',
    'บริเวณที่สร้าง',
    'ประเภทการผ่าตัด',
    'ลักษณะชิ้นงาน',
    'RP model',
    'Implant',
    'สถานะการผลิต / จุดยึด',
    'วันรับงาน',
    'วันผ่าตัด',
    'รับเคส',
    'สถานะสีหน้าจอรับงาน',
    'ฆ่าเชื้อ: วันส่งออก',
    'ฆ่าเชื้อ: วันรับเข้า',
    'Certificate No.',
    'วันที่ส่งงาน',
    'ส่งที่',
    'นำส่ง',
    'เลขที่ EMS',
    'ราคาชิ้นงาน (บาท)',
    'รายละเอียดการจ่ายเงิน',
    'ข้อมูลการส่งของ/ชิ้นงาน',
    'หมายเหตุ',
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers]);
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(14, h.length + 4) }));
  XLSX.utils.book_append_sheet(wb, ws, 'แบบฟอร์มนำเข้าเคส CTEC');
  XLSX.writeFile(wb, 'CTEC-Office-Cases-Import-Template.xlsx');
}

/**
 * Exports office cases to an Excel (.xlsx) workbook faithfully preserving every
 * column of the CTEC Customized Personalized Implant office ledger.
 */
export function exportOfficeCasesToExcel(cases: OfficeCase[], exportedBy: string) {
  const wb = XLSX.utils.book_new();

  const headerRows = [
    [
      'CTEC Customized Personalized Implant',
      '',
      'สถานะสีหน้าจอรับงาน:',
      'สีขาว = งานระหว่างทำ/รอรับเคส',
      'สีน้ำเงิน = ส่งชิ้นงานฆ่าเชื้อ',
      'สีเขียว = งานจัดส่งแล้ว',
      '',
      `ผู้ส่งออก: ${exportedBy}`,
      `วันที่ส่งออก: ${new Date().toLocaleString('th-TH')}`,
    ],
    [
      'ลำดับขายทั้งหมด',
      'สถานะสีหน้าจอรับงาน',
      ...OFFICE_PAYMENT_CHANNELS.map((c) => c.label),
      'ประเภทโรงพยาบาล',
      'เลขที่รับงาน',
      'ลำดับแต่ละเดือน',
      'ICR No.',
      'ใบวางแผนผลิต',
      'Temporal',
      'สถานะการผลิต / จุดยึด',
      'รหัสบาร์โค้ด',
      'คำนำหน้า',
      'ชื่อ',
      'สกุล',
      'HN',
      'อายุ',
      'โรงพยาบาล',
      'หมอ',
      'รหัสสินค้า',
      'ตำแหน่ง',
      'บริเวณที่สร้าง',
      'ประเภทการผ่าตัด',
      'ลักษณะชิ้นงาน',
      'RP model',
      'Implant',
      'เบอร์คนไข้',
      'เบอร์แพทย์',
      'วันรับงาน',
      'วันผ่าตัด',
      'รับเคส',
      'ฆ่าเชื้อ: วันส่งออก',
      'ฆ่าเชื้อ: วันรับเข้า',
      'ปริมาณรังสีต่ำสุด (kGy) 15',
      'ปริมาณรังสีสูงสุด (kGy) 35',
      'Dose uniformity',
      'วันรับเข้า QA',
      'Certificate No.',
      'วันที่ส่งงาน',
      'ส่งที่',
      'นำส่ง',
      'เลขที่ EMS',
      'ราคาชิ้นงาน (บาท)',
      'รายละเอียดการจ่ายเงิน',
      'เงื่อนไขการชำระ',
      'ข้อมูลการส่งของ/ชิ้นงาน',
      'ข้อมูลการส่งใบเสร็จที่บ้านคนไข้',
      'package',
      'หมายเหตุ',
    ],
  ];

  const dataRows = cases.map((c) => [
    c.salesSeqNo,
    OFFICE_WORKFLOW_META[c.workflowStatus].label,
    ...OFFICE_PAYMENT_CHANNELS.map((ch) => (c.paymentChannels.includes(ch.id) ? '*' : '')),
    HOSPITAL_CATEGORY_LABELS[c.hospitalCategory] || String(c.hospitalCategory),
    c.jobNumber,
    c.monthlySeq,
    c.icrNumber,
    c.productionPlanNo,
    c.temporalSpec,
    c.productionSpec,
    c.barcode,
    c.patientPrefix,
    c.patientFirstName,
    c.patientLastName,
    c.patientHN,
    c.patientAge,
    c.hospitalName,
    c.doctorName,
    c.productCode,
    c.sidePosition,
    c.anatomicalArea,
    c.surgeryType,
    c.materialType,
    c.rpModelQty,
    c.implantQty,
    c.patientPhone,
    c.doctorPhone,
    c.receivedDate,
    c.surgeryDate,
    c.caseReceiver,
    c.sterilizeOutDate,
    c.sterilizeReturnDate,
    c.radiationMinKgy,
    c.radiationMaxKgy,
    c.doseUniformity,
    c.qcReceiveDate,
    c.certificateNo,
    c.deliveryDate,
    c.deliveryChannel,
    c.deliveredBy,
    c.emsTrackingNo,
    c.price,
    c.paymentDetails,
    c.paymentConditionNote,
    c.shippingInfo,
    c.receiptAddress,
    c.packageInfo,
    c.remarks,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows]);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 28 },
    ...OFFICE_PAYMENT_CHANNELS.map(() => ({ wch: 14 })),
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
    { wch: 42 },
    { wch: 18 },
    { wch: 10 },
    { wch: 16 },
    { wch: 18 },
    { wch: 12 },
    { wch: 8 },
    { wch: 26 },
    { wch: 26 },
    { wch: 14 },
    { wch: 10 },
    { wch: 14 },
    { wch: 16 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 16 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 36 },
    { wch: 32 },
    { wch: 14 },
    { wch: 24 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'CTEC Personalized Implant');
  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `CTEC-Office-Cases-Ledger-${today}.xlsx`);
}
