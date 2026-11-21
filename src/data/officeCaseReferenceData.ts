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

export interface ParsedSheetResult {
  sheetName: string;
  cases: OfficeCaseSeedInput[];
  detectedFormat: ImportDetectedFormat;
  totalRowsScanned: number;
  warnings: string[];
}

export interface ParsedOfficeImportResult {
  cases: OfficeCaseSeedInput[];
  detectedFormat: ImportDetectedFormat;
  sheetName: string;
  totalRowsScanned: number;
  warnings: string[];
  sheetResults?: ParsedSheetResult[];
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

function hasMeaningfulText(v: string): boolean {
  const t = v.trim();
  if (!t) return false;
  if (/^[-–—_/]+$/.test(t)) return false;
  const lower = t.toLowerCase();
  if (lower === 'n/a' || lower === 'none' || lower === 'null' || lower === 'ไม่มี') {
    return false;
  }
  return true;
}

function cleanOptionalText(v: unknown): string {
  const cleaned = cleanCell(v);
  return hasMeaningfulText(cleaned) ? cleaned : '';
}

/**
 * Cleans a date cell string and converts raw Excel 1900-epoch serial numbers
 * (e.g. 46045) into Thai Buddhist Era d/m/YYYY format when Excel leaves them unformatted.
 */
function cleanDateCell(v: unknown): string {
  if (typeof v === 'number' && Number.isFinite(v) && v >= 35000 && v <= 65000) {
    const parsed = XLSX.SSF.parse_date_code(v);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      const thaiYear = parsed.y < 2400 ? parsed.y + 543 : parsed.y;
      return `${parsed.d}/${parsed.m}/${thaiYear}`;
    }
  }
  const cleaned = cleanCell(v);
  if (!hasMeaningfulText(cleaned)) return '';
  if (/^\d{5}(?:\.\d+)?$/.test(cleaned)) {
    const serial = Number(cleaned);
    if (serial >= 35000 && serial <= 65000) {
      const parsed = XLSX.SSF.parse_date_code(serial);
      if (parsed && parsed.y && parsed.m && parsed.d) {
        const thaiYear = parsed.y < 2400 ? parsed.y + 543 : parsed.y;
        return `${parsed.d}/${parsed.m}/${thaiYear}`;
      }
    }
  }
  return cleaned;
}

function parseIntegerCell(v: unknown): number {
  const cleaned = cleanCell(v).replace(/,/g, '');
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function parseNumericPrice(v: unknown): number {
  if (typeof v === 'number') {
    return Number.isFinite(v) && v >= 0 && v <= 100_000_000 ? Math.round(v * 100) / 100 : 0;
  }
  const raw = cleanCell(v);
  if (!hasMeaningfulText(raw)) return 0;
  const lower = raw.toLowerCase();
  if (lower === 'ฟรี' || lower === 'free' || lower.includes('เคสฟรี')) return 0;

  // Never misinterpret dates (e.g. 23/1/2569) or CTEC job numbers (e.g. 2569-001) as prices
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(raw) || /^25\d{2}-\d{2,5}$/.test(raw)) {
    return 0;
  }

  // Strip Thai/English currency symbols, trailing ".-", commas, non-breaking spaces, unit suffixes
  const stripped = raw
    .replace(/[,฿\u00A0]/g, '')
    .replace(/\.-\s*$/g, '')
    .replace(/\b(?:thb|baht|usd)\b/gi, '')
    .replace(/(?:บาท|บ\.|\/เคส|\/ชิ้น)/g, '')
    .replace(/\s+/g, '')
    .trim();

  const direct = Number(stripped);
  if (Number.isFinite(direct) && direct >= 0 && direct <= 100_000_000) {
    return Math.round(direct * 100) / 100;
  }

  // Fallback for strings with embedded notes like "22,500 บาท (จ่ายผ่าน รพ.)" or "22,500.-*"
  const match = raw.match(/(\d{1,3}(?:,\d{3})+|\d{3,})(?:\.(\d{1,2}))?/);
  if (match) {
    const candidate = Number(`${match[1].replace(/,/g, '')}${match[2] ? `.${match[2]}` : ''}`);
    if (Number.isFinite(candidate) && candidate >= 0 && candidate <= 100_000_000) {
      return Math.round(candidate * 100) / 100;
    }
  }

  return 0;
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

interface WorkflowInferenceSignals {
  sterilizeReturnDate?: string;
  qcReceiveDate?: string;
  certificateNo?: string;
  deliveryChannel?: string;
  deliveredBy?: string;
  emsTrackingNo?: string;
}

function parseWorkflowStatusCell(
  statusRaw: string,
  deliveryDate: string,
  sterilizeOutDate: string,
  extra?: WorkflowInferenceSignals
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
  return inferWorkflowStatus(deliveryDate, sterilizeOutDate, extra);
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
  sterilizeOutDate: string,
  extra?: WorkflowInferenceSignals
): OfficeCaseWorkflowStatus {
  if (
    hasMeaningfulText(deliveryDate) ||
    hasMeaningfulText(extra?.emsTrackingNo || '') ||
    (hasMeaningfulText(extra?.deliveryChannel || '') && hasMeaningfulText(extra?.deliveredBy || ''))
  ) {
    return 'delivered';
  }
  if (
    hasMeaningfulText(sterilizeOutDate) ||
    hasMeaningfulText(extra?.sterilizeReturnDate || '') ||
    hasMeaningfulText(extra?.qcReceiveDate || '') ||
    hasMeaningfulText(extra?.certificateNo || '')
  ) {
    return 'sterilizing';
  }
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
  { key: 'salesSeqNo', patterns: ['ลำดับขายทั้งหมด', 'ลำดับขาย', 'sales seq', 'seq no', 'ลำดับที่', 'ลำดับ', 'no.', 'no'] },
  { key: 'workflowStatus', patterns: ['สถานะสีหน้าจอรับงาน', 'สถานะสี', 'สถานะเคส', 'สถานะงาน', 'สถานะ', 'workflow', 'status'] },
  { key: 'pay:patient_direct', patterns: ['คนไข้จ่ายเองกับบริษัท', 'คนไข้จ่ายเอง'] },
  { key: 'pay:deposit_50_first', patterns: ['มัดจำ50%แรก', 'มัดจำ 50% แรก', 'มัดจำ50%', 'มัดจำ 50%'] },
  { key: 'pay:balance_50_before_ship', patterns: ['ก่อนส่ง 50%หลัง', 'ก่อนส่ง50%หลัง', '50%หลัง', '50% หลัง'] },
  { key: 'pay:via_hospital', patterns: ['จ่ายผ่าน รพ.', 'จ่ายผ่าน รพ', 'จ่ายผ่านโรงพยาบาล', 'ผ่าน รพ.', 'ผ่าน รพ'] },
  { key: 'pay:free_case', patterns: ['เคสฟรี', 'free case'] },
  { key: 'pay:doctor_pay', patterns: ['หมอจ่าย', 'แพทย์จ่าย'] },
  { key: 'pay:sell_via_ctec', patterns: ['ขายผ่านซีเทค', 'ขายผ่ายซีเทค'] },
  { key: 'pay:ctec', patterns: ['ซีเทค', 'ctec'] },
  { key: 'pay:wimanrat', patterns: ['วิมานรัตน์', 'วิมานรัตร์'] },
  { key: 'hospitalCategory', patterns: ['ประเภทโรงพยาบาล', 'ประเภท รพ.', 'ประเภท รพ', 'ประเภทรพ', 'hospital category'] },
  { key: 'jobNumber', patterns: ['เลขที่รับงาน', 'เลขรับงาน', 'เลขที่งาน', 'เลขงาน', 'รหัสงาน', 'เลขเคส', 'รหัสเคส', 'job no.', 'job no', 'job number', 'case no', 'job id'] },
  { key: 'monthlySeq', patterns: ['ลำดับแต่ละเดือน', 'ลำดับประจำเดือน', 'ลำดับเดือน', 'monthly seq'] },
  { key: 'icrNumber', patterns: ['icr no.', 'icr no', 'เลขที่ icr', 'เลข icr', 'icr'] },
  { key: 'productionPlanNo', patterns: ['ใบวางแผนผลิต', 'แผนผลิต', 'production plan'] },
  { key: 'temporalSpec', patterns: ['temporal'] },
  { key: 'productionSpec', patterns: ['สถานะการผลิต / จุดยึด', 'สถานะการผลิต', 'จุดยึด', 'รายละเอียดผลิต', 'สเปกผลิต', 'production spec'] },
  { key: 'barcode', patterns: ['รหัสบาร์โค้ด', 'บาร์โค้ด', 'barcode'] },
  { key: 'patientPrefix', patterns: ['คำนำหน้าชื่อ', 'คำนำหน้า', 'prefix'] },
  { key: 'patientFullName', patterns: ['ชื่อ-นามสกุล', 'ชื่อ-สกุล', 'ชื่อ นามสกุล', 'ชื่อ สกุล', 'ชื่อสกุล', 'ชื่อคนไข้', 'ชื่อผู้ป่วย', 'ผู้ป่วย', 'คนไข้', 'patient name', 'patient'] },
  { key: 'patientFirstName', patterns: ['ชื่อจริง', 'ชื่อ', 'first name'] },
  { key: 'patientLastName', patterns: ['นามสกุล', 'สกุล', 'last name', 'surname'] },
  { key: 'patientHN', patterns: ['เลขที่ hn', 'เลข hn', 'รหัสคนไข้', 'h.n.', 'hn'] },
  { key: 'patientAge', patterns: ['อายุ', 'age'] },
  { key: 'hospitalName', patterns: ['ชื่อโรงพยาบาล', 'โรงพยาบาล', 'สถานพยาบาล', 'รพ.', 'รพ', 'hospital name', 'hospital'] },
  { key: 'doctorName', patterns: ['แพทย์ผู้ผ่าตัด', 'แพทย์เจ้าของไข้', 'ชื่อแพทย์', 'ชื่อหมอ', 'หมอผ่าตัด', 'แพทย์', 'หมอ', 'doctor', 'surgeon'] },
  { key: 'productCode', patterns: ['รหัสสินค้า', 'รหัสชิ้นงาน', 'สินค้า', 'product code', 'product', 'sku'] },
  { key: 'sidePosition', patterns: ['ตำแหน่ง', 'ข้าง', 'side', 'left/right'] },
  { key: 'anatomicalArea', patterns: ['บริเวณที่สร้าง', 'บริเวณ', 'อวัยวะ', 'anatomical'] },
  { key: 'surgeryType', patterns: ['ประเภทการผ่าตัด', 'การผ่าตัด', 'surgery type'] },
  { key: 'materialType', patterns: ['ลักษณะชิ้นงาน', 'วัสดุ', 'material'] },
  { key: 'rpModelQty', patterns: ['rp model', 'จำนวน rp', 'rp'] },
  { key: 'implantQty', patterns: ['จำนวน implant', 'จำนวนชิ้นงาน', 'implant', 'จำนวน'] },
  { key: 'patientPhone', patterns: ['เบอร์โทรคนไข้', 'เบอร์คนไข้', 'โทรคนไข้', 'patient phone'] },
  { key: 'doctorPhone', patterns: ['เบอร์โทรแพทย์', 'เบอร์แพทย์', 'เบอร์หมอ', 'โทรแพทย์', 'doctor phone'] },
  { key: 'receivedDate', patterns: ['วันที่รับงาน', 'วันรับงาน', 'วันที่รับเคส', 'วันรับเคส', 'วันรับ', 'received date'] },
  { key: 'surgeryDate', patterns: ['วันที่ผ่าตัด', 'วันผ่าตัด', 'surgery date', 'op date'] },
  { key: 'caseReceiver', patterns: ['ผู้รับเคส', 'รับเคส', 'ผู้รับงาน', 'ผู้รับผิดชอบ', 'พนักงานขาย', 'ผู้แทนขาย', 'เซลล์', 'receiver', 'sales'] },
  {
    key: 'sterilizeOutDate',
    patterns: [
      'ฆ่าเชื้อ: วันส่งออก',
      'ฆ่าเชื้อ วันส่งออก',
      'วันที่ส่งออกฆ่าเชื้อ',
      'วันส่งออกฆ่าเชื้อ',
      'วันที่ส่งฆ่าเชื้อ',
      'วันส่งฆ่าเชื้อ',
      'ส่งออกฆ่าเชื้อ',
      'ส่งฆ่าเชื้อ',
      'วันที่ส่งฉายรังสี',
      'วันส่งฉายรังสี',
      'ส่งฉายรังสี',
      'วันที่ส่งออก',
      'วันส่งออก',
      'ส่งออก',
      'sterilization out',
      'sterilize out',
      'sterilization date',
      'sterilize date',
    ],
  },
  {
    key: 'sterilizeReturnDate',
    patterns: [
      'ฆ่าเชื้อ: วันรับเข้า',
      'ฆ่าเชื้อ วันรับเข้า',
      'วันที่รับเข้าฆ่าเชื้อ',
      'วันรับเข้าฆ่าเชื้อ',
      'วันที่รับกลับฆ่าเชื้อ',
      'วันรับกลับฆ่าเชื้อ',
      'รับกลับฆ่าเชื้อ',
      'รับเข้าฆ่าเชื้อ',
      'วันรับเข้าหลังฆ่าเชื้อ',
      'รับเข้าหลังฆ่าเชื้อ',
      'วันรับชิ้นงานกลับ',
      'วันที่รับกลับ',
      'วันรับกลับ',
      'รับกลับ',
      'sterilization return',
      'sterilize return',
      'sterilize in',
    ],
  },
  {
    key: 'radiationMinKgy',
    patterns: [
      'ปริมาณรังสีต่ำสุด (kgy) 15',
      'ปริมาณรังสีต่ำสุด (kgy)',
      'ปริมาณรังสีต่ำสุด',
      'ค่ารังสีต่ำสุด',
      'รังสีต่ำสุด',
      'min kgy',
      'min dose',
      'dose min',
      'ต่ำสุด (kgy)',
    ],
  },
  {
    key: 'radiationMaxKgy',
    patterns: [
      'ปริมาณรังสีสูงสุด (kgy) 35',
      'ปริมาณรังสีสูงสุด (kgy)',
      'ปริมาณรังสีสูงสุด',
      'ค่ารังสีสูงสุด',
      'รังสีสูงสุด',
      'max kgy',
      'max dose',
      'dose max',
      'สูงสุด (kgy)',
    ],
  },
  {
    key: 'doseUniformity',
    patterns: ['dose uniformity', 'uniformity', 'อัตราส่วนรังสี', 'ค่า du', 'du'],
  },
  {
    key: 'qcReceiveDate',
    patterns: [
      'วันที่รับเข้า qa/qc',
      'วันรับเข้า qa/qc',
      'วันที่รับเข้า qa',
      'วันรับเข้า qa',
      'รับเข้า qa',
      'วันที่รับเข้า qc',
      'วันรับเข้า qc',
      'รับเข้า qc',
      'วันตรวจ qa',
      'วันตรวจ qc',
      'วันผ่าน qc',
      'วันผ่าน qa',
      'qa receive',
      'qc receive',
      'qa date',
      'qc date',
      'qa in',
      'qc in',
    ],
  },
  {
    key: 'certificateNo',
    patterns: [
      'certificate no.',
      'certificate no',
      'certificate number',
      'certificate',
      'เลขที่ certificate',
      'เลขที่ cert',
      'เลข cert',
      'เลขที่ใบรับรอง',
      'เลขใบรับรอง',
      'ใบรับรองฆ่าเชื้อ',
      'ใบรับรอง',
      'cert no.',
      'cert no',
      'cert.',
      'cert',
    ],
  },
  {
    key: 'deliveryDate',
    patterns: [
      'วันที่จัดส่งสินค้า',
      'วันที่ส่งชิ้นงาน',
      'วันส่งชิ้นงาน',
      'วันที่ส่งงาน',
      'วันส่งงาน',
      'วันที่จัดส่ง',
      'วันจัดส่ง',
      'วันที่ส่งของ',
      'วันส่งของ',
      'วันที่ส่งมอบ',
      'วันส่งมอบ',
      'จัดส่งวันที่',
      'ส่งงานวันที่',
      'วันที่ส่ง',
      'วันส่ง',
      'delivery date',
      'shipping date',
      'ship date',
      'dispatch date',
      'sent date',
    ],
  },
  {
    key: 'deliveryChannel',
    patterns: [
      'ช่องทางการจัดส่ง',
      'ช่องทางจัดส่ง',
      'ช่องทางส่ง',
      'วิธีจัดส่ง',
      'วิธีส่ง',
      'บริษัทขนส่ง',
      'ขนส่งโดย',
      'ขนส่ง',
      'จัดส่งที่',
      'ส่งที่',
      'ส่งทาง',
      'ส่งโดย',
      'delivery channel',
      'shipping method',
      'delivery method',
      'courier',
      'carrier',
    ],
  },
  {
    key: 'deliveredBy',
    patterns: [
      'ผู้นำส่ง',
      'นำส่งโดย',
      'นำส่ง',
      'ผู้จัดส่ง',
      'จัดส่งโดย',
      'ผู้ส่งของ',
      'ผู้ส่งงาน',
      'ผู้ส่ง',
      'พนักงานส่ง',
      'คนส่ง',
      'ส่งของโดย',
      'delivered by',
      'delivery by',
      'messenger',
      'sender',
    ],
  },
  {
    key: 'emsTrackingNo',
    patterns: [
      'เลขติดตามพัสดุ',
      'เลขที่ ems',
      'เลข ems',
      'รหัส ems',
      'เลขที่พัสดุ',
      'เลขพัสดุ',
      'รหัสพัสดุ',
      'เลขที่จัดส่ง',
      'เลขที่ขนส่ง',
      'เลขแทร็ก',
      'tracking number',
      'tracking no.',
      'tracking no',
      'tracking',
      'ems no',
      'ems',
    ],
  },
  {
    key: 'price',
    patterns: [
      'ราคาชิ้นงาน (บาท)',
      'ราคาชิ้นงาน',
      'ราคาสินค้า',
      'ราคาอุปกรณ์',
      'ราคาสุทธิ',
      'ราคาขาย',
      'ราคารวม',
      'ราคาต่อชิ้น',
      'ราคาต่อหน่วย',
      'ราคาเคส',
      'ราคา (บาท)',
      'ราคา(บาท)',
      'ราคาบาท',
      'ราคา',
      'มูลค่าสินค้า',
      'มูลค่าเคส',
      'มูลค่า',
      'ยอดขาย',
      'ยอดรวม',
      'ยอดเงิน',
      'ยอดชำระ',
      'จำนวนเงิน',
      'ค่าชิ้นงาน',
      'ค่าอุปกรณ์',
      'ค่าสินค้า',
      'ค่าบริการ',
      'ค่าใช้จ่าย',
      'total price',
      'unit price',
      'net price',
      'sale price',
      'selling price',
      'price',
      'amount',
      'total',
      'cost',
      'value',
      'บาท',
      'thb',
      'baht',
    ],
  },
  {
    key: 'paymentDetails',
    patterns: [
      'รายละเอียดการจ่ายเงิน',
      'รายละเอียดการชำระเงิน',
      'รายละเอียดชำระเงิน',
      'การชำระเงิน',
      'การจ่ายเงิน',
      'ชำระเงิน',
      'payment detail',
      'payment info',
    ],
  },
  {
    key: 'paymentConditionNote',
    patterns: ['เงื่อนไขการชำระเงิน', 'เงื่อนไขการชำระ', 'เงื่อนไขจ่าย', 'เงื่อนไข', 'payment condition', 'payment term'],
  },
  {
    key: 'shippingInfo',
    patterns: [
      'ข้อมูลการส่งของ/ชิ้นงาน',
      'ข้อมูลการส่งของ',
      'ข้อมูลการจัดส่ง',
      'ข้อมูลส่งของ',
      'ที่อยู่จัดส่งชิ้นงาน',
      'ที่อยู่จัดส่ง',
      'ที่อยู่ส่งของ',
      'สถานที่จัดส่ง',
      'shipping info',
      'shipping address',
      'delivery address',
    ],
  },
  {
    key: 'receiptAddress',
    patterns: [
      'ข้อมูลการส่งใบเสร็จที่บ้านคนไข้',
      'ข้อมูลการส่งใบเสร็จ',
      'ที่อยู่จัดส่งใบเสร็จ',
      'ที่อยู่ส่งใบเสร็จ',
      'ที่อยู่ใบเสร็จ',
      'ที่อยู่ออกใบเสร็จ',
      'receipt address',
      'billing address',
    ],
  },
  { key: 'packageInfo', patterns: ['package', 'แพ็กเกจ', 'แพ็คเกจ', 'บรรจุภัณฑ์'] },
  { key: 'remarks', patterns: ['หมายเหตุ', 'บันทึกเพิ่มเติม', 'remarks', 'remark', 'notes', 'note'] },
];

// Short English tokens that must only match as whole words (never inside "certificate no", "technician", "corp", etc.)
const WHOLE_WORD_ONLY_PATTERNS = new Set([
  'no',
  'no.',
  'hn',
  'rp',
  'du',
  'ems',
  'age',
  'ctec',
  'cert',
  'cert.',
  'note',
  'cost',
  'thb',
  'icr',
]);

// Pre-sorted longest-first flat pattern table for collision-free substring matching
const SORTED_SUBSTRING_ALIASES: Array<{ key: FlexibleFieldKey; pattern: string }> =
  FLEXIBLE_HEADER_ALIASES.flatMap((entry) =>
    entry.patterns.map((pattern) => ({ key: entry.key, pattern }))
  ).sort((a, b) => b.pattern.length - a.pattern.length);

function normalizeHeader(cell: string): string {
  return cleanCell(cell)
    .toLowerCase()
    .replace(/ผ่าย/g, 'ผ่าน')
    .replace(/วิมานรัตร์/g, 'วิมานรัตน์')
    .replace(/[\s\n\r]+/g, ' ')
    .trim();
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function headerContainsPattern(header: string, pattern: string): boolean {
  if (WHOLE_WORD_ONLY_PATTERNS.has(pattern)) {
    const re = new RegExp(`(?:^|[\\s:/()\\-_])${escapeRegExp(pattern)}(?:$|[\\s:/()\\-_])`, 'i');
    return re.test(header);
  }
  return header.includes(pattern);
}

function isSterilizeGroupHeader(text: string): boolean {
  return (
    text.includes('ฆ่าเชื้อ') ||
    text.includes('ฉายรังสี') ||
    text.includes('รังสี') ||
    text.includes('steril') ||
    text.includes('radiation') ||
    text.includes('gamma')
  );
}

function isQaQcGroupHeader(text: string): boolean {
  return (
    /\b(?:qa|qc)\b/i.test(text) ||
    text.includes('qa/qc') ||
    text.includes('ตรวจคุณภาพ') ||
    text.includes('ตรวจสอบคุณภาพ')
  );
}

function isDeliveryGroupHeader(text: string): boolean {
  return (
    text.includes('จัดส่ง') ||
    text.includes('ส่งมอบ') ||
    text.includes('ส่งงาน') ||
    text.includes('ส่งของ') ||
    text.includes('ขนส่ง') ||
    text.includes('delivery') ||
    text.includes('shipping') ||
    text.includes('dispatch')
  );
}

function isPriceGroupHeader(text: string): boolean {
  return (
    text.includes('ราคา') ||
    text.includes('การเงิน') ||
    text.includes('ชำระเงิน') ||
    text.includes('ค่าใช้จ่าย') ||
    text.includes('price') ||
    text.includes('payment')
  );
}

function isRecognizedGroupBanner(text: string): boolean {
  return (
    isSterilizeGroupHeader(text) ||
    isQaQcGroupHeader(text) ||
    isDeliveryGroupHeader(text) ||
    isPriceGroupHeader(text) ||
    text.includes('ข้อมูลคนไข้') ||
    text.includes('ข้อมูลผู้ป่วย') ||
    text.includes('ข้อมูลชิ้นงาน') ||
    text.includes('การผลิต')
  );
}

/**
 * Resolves ambiguous sub-headers (e.g. "วันรับเข้า", "วันที่", "วันส่ง", "15", "35", "เลขที่")
 * using merged/stacked parent group headers and left-to-right column position context.
 */
function matchContextualHeader(
  curNorm: string,
  parentNorm: string,
  usedKeys: Set<FlexibleFieldKey>
): FlexibleFieldKey | null {
  const combined = parentNorm && curNorm ? `${parentNorm} ${curNorm}` : curNorm || parentNorm;
  if (!combined) return null;

  // 1. Sterilization group context (e.g. parent = "การฆ่าเชื้อ" or "ฉายรังสี")
  if (isSterilizeGroupHeader(parentNorm) || isSterilizeGroupHeader(curNorm)) {
    if (
      !usedKeys.has('sterilizeOutDate') &&
      (curNorm.includes('ส่งออก') ||
        curNorm === 'วันส่ง' ||
        curNorm === 'วันที่ส่ง' ||
        curNorm === 'วันที่' ||
        curNorm.includes('out'))
    ) {
      return 'sterilizeOutDate';
    }
    if (
      !usedKeys.has('qcReceiveDate') &&
      (curNorm.includes('qa') || curNorm.includes('qc'))
    ) {
      return 'qcReceiveDate';
    }
    if (
      curNorm.includes('รับเข้า') ||
      curNorm.includes('รับกลับ') ||
      curNorm.includes('return') ||
      curNorm === 'in'
    ) {
      if (!usedKeys.has('sterilizeReturnDate')) return 'sterilizeReturnDate';
      if (!usedKeys.has('qcReceiveDate')) return 'qcReceiveDate';
    }
    if (
      !usedKeys.has('radiationMinKgy') &&
      (curNorm.includes('ต่ำสุด') || curNorm.includes('min') || curNorm === '15')
    ) {
      return 'radiationMinKgy';
    }
    if (
      !usedKeys.has('radiationMaxKgy') &&
      (curNorm.includes('สูงสุด') || curNorm.includes('max') || curNorm === '35')
    ) {
      return 'radiationMaxKgy';
    }
    if (
      !usedKeys.has('doseUniformity') &&
      (curNorm.includes('uniformity') || curNorm.includes('dose') || curNorm === 'du')
    ) {
      return 'doseUniformity';
    }
    if (
      !usedKeys.has('certificateNo') &&
      (curNorm.includes('cert') || curNorm.includes('ใบรับรอง'))
    ) {
      return 'certificateNo';
    }
  }

  // 2. QA / QC group context
  if (isQaQcGroupHeader(parentNorm)) {
    if (
      !usedKeys.has('qcReceiveDate') &&
      (curNorm.includes('รับเข้า') ||
        curNorm.includes('วันรับ') ||
        curNorm.includes('วันที่') ||
        curNorm.includes('date'))
    ) {
      return 'qcReceiveDate';
    }
    if (
      !usedKeys.has('certificateNo') &&
      (curNorm.includes('cert') || curNorm.includes('ใบรับรอง') || curNorm.includes('เลข'))
    ) {
      return 'certificateNo';
    }
  }

  // 3. Delivery group context (e.g. parent = "การจัดส่ง" / "ส่งมอบ" / "Delivery")
  if (isDeliveryGroupHeader(parentNorm)) {
    if (
      !usedKeys.has('deliveryDate') &&
      (curNorm === 'วันที่' ||
        curNorm === 'วันส่ง' ||
        curNorm === 'วันที่ส่ง' ||
        curNorm.includes('วันจัดส่ง') ||
        curNorm.includes('วันส่งงาน') ||
        curNorm.includes('วันส่งของ') ||
        curNorm.includes('วันส่งมอบ') ||
        curNorm === 'date' ||
        curNorm.includes('delivery date'))
    ) {
      return 'deliveryDate';
    }
    if (
      !usedKeys.has('deliveryChannel') &&
      (curNorm.includes('ส่งที่') ||
        curNorm.includes('ช่องทาง') ||
        curNorm.includes('ขนส่ง') ||
        curNorm.includes('วิธีส่ง') ||
        curNorm.includes('ส่งทาง') ||
        curNorm.includes('ส่งโดย') ||
        curNorm.includes('courier') ||
        curNorm.includes('channel'))
    ) {
      return 'deliveryChannel';
    }
    if (
      !usedKeys.has('deliveredBy') &&
      (curNorm.includes('นำส่ง') ||
        curNorm.includes('ผู้ส่ง') ||
        curNorm.includes('คนส่ง') ||
        curNorm.includes('จัดส่งโดย') ||
        curNorm.includes('by'))
    ) {
      return 'deliveredBy';
    }
    if (
      !usedKeys.has('emsTrackingNo') &&
      (curNorm.includes('ems') ||
        curNorm.includes('tracking') ||
        curNorm.includes('พัสดุ') ||
        curNorm.includes('เลขที่') ||
        curNorm.includes('เลข'))
    ) {
      return 'emsTrackingNo';
    }
    if (
      !usedKeys.has('shippingInfo') &&
      (curNorm.includes('ที่อยู่') || curNorm.includes('ข้อมูล') || curNorm.includes('address'))
    ) {
      return 'shippingInfo';
    }
  }

  // 4. Price / Finance group context
  if (isPriceGroupHeader(parentNorm)) {
    if (
      !usedKeys.has('price') &&
      (curNorm === 'ราคา' ||
        curNorm.includes('ราคา') ||
        curNorm.includes('บาท') ||
        curNorm.includes('จำนวนเงิน') ||
        curNorm.includes('ยอด') ||
        curNorm.includes('price') ||
        curNorm.includes('amount') ||
        curNorm.includes('total'))
    ) {
      return 'price';
    }
    if (!usedKeys.has('paymentDetails') && curNorm.includes('รายละเอียด')) {
      return 'paymentDetails';
    }
    if (!usedKeys.has('paymentConditionNote') && curNorm.includes('เงื่อนไข')) {
      return 'paymentConditionNote';
    }
    if (!usedKeys.has('receiptAddress') && curNorm.includes('ใบเสร็จ')) {
      return 'receiptAddress';
    }
  }

  // 5. Positional disambiguation when there is NO parent group row (single-row headers / flat CSV)
  const seenSterilize =
    usedKeys.has('sterilizeOutDate') ||
    usedKeys.has('sterilizeReturnDate') ||
    usedKeys.has('radiationMinKgy') ||
    usedKeys.has('radiationMaxKgy') ||
    usedKeys.has('doseUniformity');
  const seenPostSterilize =
    usedKeys.has('certificateNo') ||
    usedKeys.has('qcReceiveDate') ||
    seenSterilize;

  if (
    curNorm === 'วันรับเข้า' ||
    curNorm === 'วันที่รับเข้า' ||
    curNorm === 'รับเข้า'
  ) {
    if (usedKeys.has('sterilizeOutDate') && !usedKeys.has('sterilizeReturnDate')) {
      return 'sterilizeReturnDate';
    }
    if ((usedKeys.has('sterilizeReturnDate') || usedKeys.has('doseUniformity') || usedKeys.has('radiationMaxKgy')) && !usedKeys.has('qcReceiveDate')) {
      return 'qcReceiveDate';
    }
  }

  if (curNorm === 'วันที่' || curNorm === 'date') {
    if (seenPostSterilize && !usedKeys.has('deliveryDate')) {
      return 'deliveryDate';
    }
    if (!usedKeys.has('receivedDate')) {
      return 'receivedDate';
    }
  }

  if (seenSterilize) {
    if (!usedKeys.has('radiationMinKgy') && (curNorm === '15' || curNorm === 'min' || curNorm === 'ต่ำสุด')) {
      return 'radiationMinKgy';
    }
    if (!usedKeys.has('radiationMaxKgy') && (curNorm === '35' || curNorm === 'max' || curNorm === 'สูงสุด')) {
      return 'radiationMaxKgy';
    }
  }

  if (
    (usedKeys.has('deliveryDate') || usedKeys.has('deliveryChannel') || usedKeys.has('deliveredBy')) &&
    !usedKeys.has('emsTrackingNo') &&
    (curNorm === 'เลขที่' || curNorm === 'เลขที่ส่ง' || curNorm === 'เลขพัสดุ')
  ) {
    return 'emsTrackingNo';
  }

  return null;
}

function matchHeaderToKey(header: string, usedKeys: Set<FlexibleFieldKey>): FlexibleFieldKey | null {
  if (!header) return null;

  // Pass 1: exact match
  for (const entry of FLEXIBLE_HEADER_ALIASES) {
    if (usedKeys.has(entry.key)) continue;
    for (const pattern of entry.patterns) {
      if (header === pattern) return entry.key;
    }
  }

  // Pass 2: longest-pattern-first match (prevents short patterns like "สถานะ" or "จำนวน" stealing "สถานะการผลิต" or "จำนวนเงิน")
  for (const { key, pattern } of SORTED_SUBSTRING_ALIASES) {
    if (usedKeys.has(key)) continue;
    if (pattern.length < 2) continue;
    if (!headerContainsPattern(header, pattern)) continue;

    // Guard against cross-field false positives
    if (
      key === 'patientFirstName' &&
      (header.includes('โรงพยาบาล') ||
        header.includes('แพทย์') ||
        header.includes('หมอ') ||
        header.includes('สกุล') ||
        header.includes('ผู้รับ') ||
        header.includes('ผู้ส่ง') ||
        header.includes('สินค้า'))
    ) {
      continue;
    }
    if (
      key === 'price' &&
      (header.includes('เงื่อนไข') ||
        header.includes('รายละเอียดการจ่าย') ||
        header.includes('มัดจำ') ||
        header.includes('ใบเสร็จ'))
    ) {
      continue;
    }
    if (
      key === 'implantQty' &&
      (header.includes('เงิน') || header.includes('ราคา') || header.includes('บาท'))
    ) {
      continue;
    }
    if (
      key === 'receivedDate' &&
      (header.includes('ฆ่าเชื้อ') ||
        header.includes('qa') ||
        header.includes('qc') ||
        header.includes('รับเข้า') ||
        header.includes('รับกลับ'))
    ) {
      continue;
    }
    if (
      key === 'pay:ctec' &&
      (header.includes('ราคา') ||
        header.includes('รหัส') ||
        header.includes('implant') ||
        header.includes('customized'))
    ) {
      continue;
    }

    return key;
  }

  return null;
}

/**
 * Detects whether a row looks like actual case data (job number, barcode, patient prefix, Thai date)
 * so we never mistakenly pick a data row as a header row.
 */
function looksLikeDataRow(row: unknown[]): boolean {
  let dataSignals = 0;
  for (let i = 0; i < Math.min(row.length, 60); i++) {
    const val = cleanCell(row[i]);
    if (!val) continue;
    if (/^25\d{2}-\d{2,5}$/.test(val)) dataSignals += 2;
    else if (/^\*\d{8,}\*$/.test(val)) dataSignals += 2;
    else if (/^NCR\d+\/\d+$/i.test(val)) dataSignals += 2;
    else if (/^\d{1,2}\/\d{1,2}\/25\d{2}$/.test(val)) dataSignals += 1;
    else if (/^(?:นาย|นาง|นางสาว|ด\.ช\.|ด\.ญ\.)$/.test(val)) dataSignals += 1;
    else if (/^CT[A-Z]{2,}-\d+$/i.test(val)) dataSignals += 2;
  }
  return dataSignals >= 3;
}

/**
 * For unmerged CSV / pasted multi-row tables, forward-fills known group headers
 * (e.g. "การฆ่าเชื้อ", "การจัดส่ง", "การเงิน") across immediately following blank cells.
 */
function expandGroupBannerRow(row: unknown[] | null, maxCols: number): string[] {
  const out: string[] = new Array(maxCols).fill('');
  if (!row) return out;
  let activeGroup = '';
  let spanCount = 0;
  for (let c = 0; c < maxCols; c++) {
    const norm = normalizeHeader(String(row[c] ?? ''));
    if (norm) {
      out[c] = norm;
      if (isRecognizedGroupBanner(norm)) {
        activeGroup = norm;
        spanCount = 0;
      } else {
        activeGroup = '';
        spanCount = 0;
      }
    } else if (activeGroup && spanCount < 10) {
      out[c] = activeGroup;
      spanCount++;
    }
  }
  return out;
}

function inferPaymentDetailsFromChannels(
  paymentDetailsRaw: string,
  paymentChannels: OfficePaymentChannel[]
): string {
  if (paymentDetailsRaw) return paymentDetailsRaw;
  if (paymentChannels.includes('via_hospital')) return 'จ่ายผ่าน รพ.';
  if (paymentChannels.includes('patient_direct')) return 'คนไข้จ่ายเองกับบริษัท';
  if (paymentChannels.includes('free_case')) return 'เคสฟรี';
  if (paymentChannels.includes('doctor_pay')) return 'หมอจ่าย';
  return '';
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
    const sterilizeOutDate = cleanDateCell(row[38]);
    const sterilizeReturnDate = cleanDateCell(row[39]);
    const qcReceiveDate = cleanDateCell(row[43]);
    const certificateNo = cleanOptionalText(row[44]);
    const deliveryDate = cleanDateCell(row[45]);
    const deliveryChannel = cleanOptionalText(row[46]);
    const deliveredBy = cleanOptionalText(row[47]);
    const emsTrackingNo = cleanOptionalText(row[48]);
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
      receivedDate: cleanDateCell(row[35]),
      surgeryDate: cleanDateCell(row[36]),
      caseReceiver: cleanCell(row[37]),
      sterilizeOutDate,
      sterilizeReturnDate,
      radiationMinKgy: cleanOptionalText(row[40]),
      radiationMaxKgy: cleanOptionalText(row[41]),
      doseUniformity: cleanOptionalText(row[42]),
      qcReceiveDate,
      certificateNo,
      deliveryDate,
      deliveryChannel,
      deliveredBy,
      emsTrackingNo,
      price: parseNumericPrice(row[49]),
      paymentDetails: inferPaymentDetailsFromChannels(cleanCell(row[50]), paymentChannels),
      paymentConditionNote: cleanCell(row[51]),
      shippingInfo: cleanCell(row[52]),
      receiptAddress: cleanCell(row[53]),
      packageInfo: cleanCell(row[54]),
      remarks: cleanCell(row[55]),
      workflowStatus: parseWorkflowStatusCell(col1, deliveryDate, sterilizeOutDate, {
        sterilizeReturnDate,
        qcReceiveDate,
        certificateNo,
        deliveryChannel,
        deliveredBy,
        emsTrackingNo,
      }),
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
    const sterilizeOutDate = cleanDateCell(row[36]);
    const sterilizeReturnDate = cleanDateCell(row[37]);
    const qcReceiveDate = cleanDateCell(row[41]);
    const certificateNo = cleanOptionalText(row[42]);
    const deliveryDate = cleanDateCell(row[43]);
    const deliveryChannel = cleanOptionalText(row[44]);
    const deliveredBy = cleanOptionalText(row[45]);
    const emsTrackingNo = cleanOptionalText(row[46]);
    const productionSpec = cleanCell(row[15]);
    const inferredPaymentDetails = inferPaymentDetailsFromChannels(
      cleanCell(row[48]),
      paymentChannels
    );

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
      receivedDate: cleanDateCell(row[33]),
      surgeryDate: cleanDateCell(row[34]),
      caseReceiver: cleanCell(row[35]),
      sterilizeOutDate,
      sterilizeReturnDate,
      radiationMinKgy: cleanOptionalText(row[38]),
      radiationMaxKgy: cleanOptionalText(row[39]),
      doseUniformity: cleanOptionalText(row[40]),
      qcReceiveDate,
      certificateNo,
      deliveryDate,
      deliveryChannel,
      deliveredBy,
      emsTrackingNo,
      price: parseNumericPrice(row[47]),
      paymentDetails: inferredPaymentDetails,
      paymentConditionNote: cleanCell(row[49]),
      shippingInfo: cleanCell(row[50]),
      receiptAddress: cleanCell(row[51]),
      packageInfo: cleanCell(row[52]),
      remarks: cleanCell(row[53]),
      workflowStatus: inferWorkflowStatus(deliveryDate, sterilizeOutDate, {
        sterilizeReturnDate,
        qcReceiveDate,
        certificateNo,
        deliveryChannel,
        deliveredBy,
        emsTrackingNo,
      }),
      paymentChannels,
    });
  }

  return parsed;
}

interface FlexibleParseOutput {
  cases: OfficeCaseSeedInput[];
  matchedColumnCount: number;
}

function parseFlexibleHeaderRows(
  rows: unknown[][],
  defaultIcr: string
): FlexibleParseOutput {
  let bestHeaderIdx = -1;
  let bestScore = -1;
  let bestMap = new Map<number, FlexibleFieldKey>();
  let bestFallbackPriceCols: number[] = [];
  let icrNumber = defaultIcr;

  // Scan top 25 rows to locate the best header row (supports 1-, 2-, or 3-row stacked/merged headers)
  const scanLimit = Math.min(rows.length, 25);
  for (let rIdx = 0; rIdx < scanLimit; rIdx++) {
    const row = rows[rIdx];
    if (!Array.isArray(row)) continue;

    const rowText = row.map((c) => cleanCell(c)).join(' ');
    const icrMatch = rowText.match(/ICR\d+\/\d+/i);
    if (icrMatch) icrNumber = icrMatch[0].toUpperCase();

    // Never treat an actual case data row as a header row
    if (looksLikeDataRow(row)) continue;

    const prevRow = rIdx > 0 && Array.isArray(rows[rIdx - 1]) ? rows[rIdx - 1] : null;
    const prev2Row = rIdx > 1 && Array.isArray(rows[rIdx - 2]) ? rows[rIdx - 2] : null;
    const maxCols = Math.max(
      row.length,
      prevRow ? prevRow.length : 0,
      prev2Row ? prev2Row.length : 0
    );

    const parent1Expanded = expandGroupBannerRow(prevRow, maxCols);
    const parent2Expanded = expandGroupBannerRow(prev2Row, maxCols);

    const colMap = new Map<number, FlexibleFieldKey>();
    const usedKeys = new Set<FlexibleFieldKey>();
    const fallbackPriceCols: number[] = [];
    let ownMatches = 0;
    let distinctSubMatches = 0;

    for (let cIdx = 0; cIdx < maxCols; cIdx++) {
      const curNorm = normalizeHeader(String(row[cIdx] ?? ''));
      const p1 = parent1Expanded[cIdx] || '';
      const p2 = parent2Expanded[cIdx] || '';
      const parentNorm = [p2, p1].filter((s) => s && s !== curNorm).join(' ').trim();

      // 1. Contextual match (handles group headers like "การฆ่าเชื้อ > วันรับเข้า" and "การจัดส่ง > วันที่")
      let matched = matchContextualHeader(curNorm, parentNorm, usedKeys);

      // 2. Combined header match (parent + child)
      if (!matched && parentNorm && curNorm) {
        matched = matchHeaderToKey(`${parentNorm} ${curNorm}`, usedKeys);
      }

      // 3. Direct current-cell match
      if (!matched && curNorm) {
        matched = matchHeaderToKey(curNorm, usedKeys);
      }

      // 4. Direct parent-cell match (for vertically merged single-line headers in unmerged CSV/paste)
      if (!matched && !curNorm && p1) {
        matched = matchHeaderToKey(p1, usedKeys);
      }

      if (matched) {
        colMap.set(cIdx, matched);
        usedKeys.add(matched);
        if (curNorm) {
          ownMatches++;
          if (curNorm !== p1) distinctSubMatches++;
        }
      } else if (
        usedKeys.has('price') &&
        curNorm &&
        (curNorm.includes('ราคา') || curNorm.includes('ราคารวม') || curNorm.includes('ยอดเงิน') || curNorm.includes('จำนวนเงิน') || curNorm === 'price' || curNorm === 'total') &&
        !curNorm.includes('เงื่อนไข') &&
        !curNorm.includes('รายละเอียด')
      ) {
        fallbackPriceCols.push(cIdx);
      }
    }

    // Require the candidate row itself to contribute at least 2 real header cells
    if (ownMatches < 2) continue;

    // Score prefers total matched columns + distinct sub-headers (so Row 2 of a 2-row merged header beats Row 1)
    const score = colMap.size * 10 + distinctSubMatches * 2 + ownMatches;
    if (score > bestScore) {
      bestScore = score;
      bestMap = colMap;
      bestHeaderIdx = rIdx;
      bestFallbackPriceCols = fallbackPriceCols;
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
    return { cases: [], matchedColumnCount: 0 };
  }

  // Pre-build O(1) key -> column index map and payment columns array for high-speed 500+ row parsing
  const keyToCol = new Map<FlexibleFieldKey, number>();
  const payCols: Array<{ colIdx: number; channel: OfficePaymentChannel }> = [];
  for (const [colIdx, k] of bestMap.entries()) {
    keyToCol.set(k, colIdx);
    if (k.startsWith('pay:')) {
      payCols.push({ colIdx, channel: k.slice(4) as OfficePaymentChannel });
    }
  }

  const parsed: OfficeCaseSeedInput[] = [];

  for (let rIdx = bestHeaderIdx + 1; rIdx < rows.length; rIdx++) {
    const row = rows[rIdx];
    if (!Array.isArray(row) || row.length === 0) continue;

    const getRaw = (key: FlexibleFieldKey): unknown => {
      const colIdx = keyToCol.get(key);
      return colIdx !== undefined ? row[colIdx] : '';
    };

    const getVal = (key: FlexibleFieldKey): string => cleanCell(getRaw(key));
    const getOptional = (key: FlexibleFieldKey): string => cleanOptionalText(getRaw(key));
    const getDate = (key: FlexibleFieldKey): string => cleanDateCell(getRaw(key));

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

    // Skip blank, repeated sub-header, or subtotal rows
    if (!jobNumber && !hospitalName && !patientFirstName && !doctorName && !productCode && !patientHN) {
      continue;
    }
    if (
      jobNumber.includes('เลขที่รับงาน') ||
      hospitalName === 'โรงพยาบาล' ||
      patientFirstName === 'ชื่อ'
    ) {
      continue;
    }
    const joined = `${jobNumber} ${hospitalName} ${patientFirstName}`.toLowerCase();
    if (joined.includes('รวมทั้งหมด') || joined.startsWith('total')) continue;

    const rowIcrMatch = row
      .map((c) => cleanCell(c))
      .join(' ')
      .match(/ICR\d+\/\d+/i);
    if (rowIcrMatch) icrNumber = rowIcrMatch[0].toUpperCase();

    const paymentChannels: OfficePaymentChannel[] = [];
    for (let p = 0; p < payCols.length; p++) {
      const marker = cleanCell(row[payCols[p].colIdx]);
      if (marker && marker !== '-' && marker !== '0') {
        paymentChannels.push(payCols[p].channel);
      }
    }

    const sterilizeOutDate = getDate('sterilizeOutDate');
    const sterilizeReturnDate = getDate('sterilizeReturnDate');
    const qcReceiveDate = getDate('qcReceiveDate');
    const certificateNo = getOptional('certificateNo');
    const deliveryDate = getDate('deliveryDate');
    const deliveryChannel = getOptional('deliveryChannel');
    const deliveredBy = getOptional('deliveredBy');
    const emsTrackingNo = getOptional('emsTrackingNo');
    const productionSpec = getVal('productionSpec');

    let priceVal = parseNumericPrice(getRaw('price'));
    if (priceVal === 0 && bestFallbackPriceCols.length > 0) {
      for (const fbCol of bestFallbackPriceCols) {
        const candidate = parseNumericPrice(row[fbCol]);
        if (candidate > 0) {
          priceVal = candidate;
          break;
        }
      }
    }

    const workflowStatus = parseWorkflowStatusCell(
      getVal('workflowStatus'),
      deliveryDate,
      sterilizeOutDate,
      {
        sterilizeReturnDate,
        qcReceiveDate,
        certificateNo,
        deliveryChannel,
        deliveredBy,
        emsTrackingNo,
      }
    );

    parsed.push({
      salesSeqNo: parseIntegerCell(getRaw('salesSeqNo')),
      jobNumber,
      monthlySeq: parseIntegerCell(getRaw('monthlySeq')),
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
      rpModelQty: parseIntegerCell(getRaw('rpModelQty')) || 0,
      implantQty: parseIntegerCell(getRaw('implantQty')) || 1,
      patientPhone: getVal('patientPhone'),
      doctorPhone: getVal('doctorPhone'),
      receivedDate: getDate('receivedDate'),
      surgeryDate: getDate('surgeryDate'),
      caseReceiver: getVal('caseReceiver'),
      sterilizeOutDate,
      sterilizeReturnDate,
      radiationMinKgy: getOptional('radiationMinKgy'),
      radiationMaxKgy: getOptional('radiationMaxKgy'),
      doseUniformity: getOptional('doseUniformity'),
      qcReceiveDate,
      certificateNo,
      deliveryDate,
      deliveryChannel,
      deliveredBy,
      emsTrackingNo,
      price: priceVal,
      paymentDetails: inferPaymentDetailsFromChannels(getVal('paymentDetails'), paymentChannels),
      paymentConditionNote: getVal('paymentConditionNote'),
      shippingInfo: getVal('shippingInfo'),
      receiptAddress: getVal('receiptAddress'),
      packageInfo: getVal('packageInfo'),
      remarks: getVal('remarks'),
      workflowStatus,
      paymentChannels,
    });
  }

  return { cases: parsed, matchedColumnCount: bestMap.size };
}

export function parseMatrixToOfficeCases(
  rows: unknown[][],
  sheetName = 'Sheet1'
): ParsedOfficeImportResult {
  const warnings: string[] = [];
  let defaultIcr = 'ICR0002/2569';

  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const match = row.map((c) => cleanCell(c)).join(' ').match(/ICR\d+\/\d+/i);
    if (match) {
      defaultIcr = match[0].toUpperCase();
      break;
    }
  }

  const isExportedSignature = rows
    .slice(0, 12)
    .some((row) => Array.isArray(row) && row.some((c) => cleanCell(c).includes('สถานะสีหน้าจอรับงาน')));

  const isCtecLedgerSignature = rows.slice(0, 15).some((row) => {
    if (!Array.isArray(row)) return false;
    const joined = row.map((c) => cleanCell(c)).join(' ');
    return (
      joined.includes('คนไข้จ่ายเองกับบริษัท') ||
      (joined.includes('เลขที่รับงาน') && joined.includes('โรงพยาบาล') && joined.includes('รับเคส'))
    );
  });

  // 1. Always try header-driven parsing FIRST so shifted/inserted/reordered columns (Price, Sterilization, Delivery)
  // are mapped accurately by their real header labels instead of brittle fixed column numbers.
  const flexibleOut = parseFlexibleHeaderRows(rows, defaultIcr);
  if (flexibleOut.cases.length > 0) {
    const detectedFormat: ImportDetectedFormat = isExportedSignature
      ? 'ctec_exported_excel'
      : isCtecLedgerSignature && flexibleOut.matchedColumnCount >= 12
        ? 'ctec_raw_ledger'
        : 'flexible_headers';
    return {
      cases: flexibleOut.cases,
      detectedFormat,
      sheetName,
      totalRowsScanned: rows.length,
      warnings,
    };
  }

  // 2. Fallback: exact exported format
  if (isExportedSignature) {
    const cases = parseExportedCtecRows(rows, defaultIcr);
    if (cases.length > 0) {
      return {
        cases,
        detectedFormat: 'ctec_exported_excel',
        sheetName,
        totalRowsScanned: rows.length,
        warnings,
      };
    }
  }

  // 3. Fallback: headerless CTEC 54-column raw ledger geometry (only if >= 45 columns)
  const looksLikeHeaderlessCtecRaw = rows.some(
    (row) =>
      Array.isArray(row) &&
      row.length >= 45 &&
      /^\d+$/.test(cleanCell(row[0]).replace(/,/g, '')) &&
      Boolean(cleanCell(row[11]) || cleanCell(row[22]))
  );
  if (looksLikeHeaderlessCtecRaw) {
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
 * Converts a SheetJS worksheet into a 2D matrix while:
 * 1) Preserving exact cell coordinates relative to !ref,
 * 2) Reading formatted strings (or falling back to raw cell.v when cell.w is missing/"###"),
 * 3) Propagating merged header cells (horizontal <= 15 cols & vertical) AND vertically merged data cells
 *    (e.g. batch sterilization dates, Certificate No., delivery dates merged across multiple rows).
 */
function sheetToMatrixWithMerges(sheet: XLSX.WorkSheet): unknown[][] {
  const ref = sheet['!ref'];
  if (!ref) return [];
  const range = XLSX.utils.decode_range(ref);
  const numRows = range.e.r - range.s.r + 1;
  const numCols = range.e.c - range.s.c + 1;
  if (numRows <= 0 || numCols <= 0) return [];

  const maxScanRows = Math.min(numRows, 25000);
  const maxScanCols = Math.min(numCols, 120);

  const matrix: unknown[][] = [];
  for (let r = 0; r < maxScanRows; r++) {
    const rowArr: unknown[] = new Array(maxScanCols).fill('');
    let hasAny = false;
    for (let c = 0; c < maxScanCols; c++) {
      const addr = XLSX.utils.encode_cell({ r: range.s.r + r, c: range.s.c + c });
      const cell = sheet[addr] as XLSX.CellObject | undefined;
      if (!cell) continue;
      let val: unknown = '';
      if (
        cell.w !== undefined &&
        cell.w !== null &&
        String(cell.w).trim() !== '' &&
        !/^#+$/.test(String(cell.w).trim())
      ) {
        val = cell.w;
      } else if (cell.v !== undefined && cell.v !== null) {
        const formatted = XLSX.utils.format_cell(cell);
        val = formatted && !/^#+$/.test(formatted.trim()) ? formatted : cell.v;
      }
      if (val !== '') {
        rowArr[c] = val;
        hasAny = true;
      }
    }
    matrix.push(hasAny ? rowArr : []);
  }

  const merges = sheet['!merges'] || [];
  for (const m of merges) {
    const sr = m.s.r - range.s.r;
    const er = Math.min(m.e.r - range.s.r, matrix.length - 1);
    const sc = m.s.c - range.s.c;
    const ec = Math.min(m.e.c - range.s.c, maxScanCols - 1);
    if (sr < 0 || sc < 0 || sr >= matrix.length || sc >= maxScanCols) continue;

    const srcRow = matrix[sr];
    const val = Array.isArray(srcRow) ? srcRow[sc] : '';
    if (!cleanCell(val)) continue;

    const colSpan = ec - sc + 1;
    const rowSpan = er - sr + 1;

    // Skip sheet-wide title banners (16+ cols) so they don't overwrite column header slots
    if (colSpan > 15) continue;

    const isHeaderZone = sr < 25 && er < 25;
    const isDataVerticalMerge = colSpan === 1 && rowSpan <= 100;

    if (isHeaderZone || isDataVerticalMerge) {
      for (let r = sr; r <= er; r++) {
        if (!matrix[r] || matrix[r].length < ec + 1) {
          const existing = matrix[r] ? [...matrix[r]] : [];
          while (existing.length < maxScanCols) existing.push('');
          matrix[r] = existing;
        }
        for (let c = sc; c <= ec; c++) {
          if (!cleanCell(matrix[r][c])) {
            matrix[r][c] = val;
          }
        }
      }
    }
  }

  return matrix.filter((row) => row.length > 0 && row.some((cell) => cleanCell(cell) !== ''));
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
 * multi-sheet scanning, merged-cell propagation, and header-driven column detection.
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

  // Binary Excel (.xlsx / .xls): scan every worksheet with merged-cell propagation
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const sheetResults: ParsedSheetResult[] = [];
  let bestResult: ParsedOfficeImportResult = {
    cases: [],
    detectedFormat: 'unknown',
    sheetName: workbook.SheetNames[0] || file.name,
    totalRowsScanned: 0,
    warnings: [],
    sheetResults: [],
  };

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rows = sheetToMatrixWithMerges(sheet);
    if (rows.length === 0) continue;
    const res = parseMatrixToOfficeCases(rows, sheetName);
    if (res.cases.length > 0) {
      sheetResults.push({
        sheetName: res.sheetName,
        cases: res.cases,
        detectedFormat: res.detectedFormat,
        totalRowsScanned: res.totalRowsScanned,
        warnings: res.warnings,
      });
    }
    if (res.cases.length > bestResult.cases.length) {
      bestResult = res;
    }
  }

  return {
    ...bestResult,
    sheetResults,
  };
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
