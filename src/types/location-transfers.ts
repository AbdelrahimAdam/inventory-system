// frontend/src/types/location-transfers.ts
export interface LocationTransfer {
  id: string;
  uuid: string;
  item_name: string;
  item_code: string;
  color: string;
  transfer_quantity: number;
  transfer_date: string;
  user_id: number;
  username: string;
  supplier: string;
  notes: string;
  source_location: 'MAIN_INVENTORY' | 'MONOFIA' | 'MATBAA';
  destination_location: 'MAIN_INVENTORY' | 'MONOFIA' | 'MATBAA';
  created_at: string;
}

export interface InventoryItem {
  id: number;
  item_name: string;
  item_code: string;
  color: string;
  remaining_quantity: number;
  location: string;
  supplier: string;
}

export interface TransferFormData {
  item_name: string;
  item_code: string;
  color: string;
  quantity: number;
  source_location: 'MAIN_INVENTORY' | 'MONOFIA' | 'MATBAA';
  destination_location: 'MAIN_INVENTORY' | 'MONOFIA' | 'MATBAA';
  notes: string;
}

export interface TransferRequest {
  p_item_name: string;
  p_item_code: string;
  p_color: string;
  p_quantity: number;
  p_source_location: string;
  p_destination_location: string;
  p_user_id: number;
  p_notes?: string;
}

export interface TransferResponse {
  success: boolean;
  message: string;
  transfer_id?: number;
  quantity_transferred?: number;
  source_location?: string;
  destination_location?: string;
}