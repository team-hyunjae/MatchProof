export type ProfileId = "student-a" | "student-b" | "visitor";
export type MerchantId = "campus-kitchen" | "green-table";
export interface Profile {
  id: ProfileId;
  name: string;
  studentNumber: string;
  eligible: boolean;
  issued: boolean;
  usedToday: boolean;
}
export interface Receipt {
  nullifier: string;
  merchantId: MerchantId;
  merchantName: string;
  day: string;
  at: string;
}
export interface PublicState {
  mode: "local-simulator";
  date: string;
  day: string;
  programId: string;
  root: string;
  issuedCount: number;
  redeemedCount: number;
  todayCount: number;
  merchants: {
    id: MerchantId;
    name: string;
    description: string;
    initials: string;
  }[];
  receipts: Receipt[];
}
export interface DemoState extends PublicState {
  profiles: Profile[];
}
export interface ActionResult {
  message: string;
  receipt?: Receipt;
}
