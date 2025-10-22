import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  ArrowRightLeft, 
  Search, 
  Filter,
  Download,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building,
  Warehouse,
  Factory
} from 'lucide-react';

interface LocationTransfer {
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

interface InventoryItem {
  id: number;
  item_name: string;
  item_code: string;
  color: string;
  remaining_quantity: number;
  location: string;
  supplier: string;
}

interface TransferFormData {
  item_name: string;
  item_code: string;
  color: string;
  quantity: number;
  source_location: 'MAIN_INVENTORY' | 'MONOFIA' | 'MATBAA';
  destination_location: 'MAIN_INVENTORY' | 'MONOFIA' | 'MATBAA';
  notes: string;
}

const LocationTransfersPage: React.FC = () => {
  const [transfers, setTransfers] = useState<LocationTransfer[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [transferForm, setTransferForm] = useState<TransferFormData>({
    item_name: '',
    item_code: '',
    color: '',
    quantity: 0,
    source_location: 'MAIN_INVENTORY',
    destination_location: 'MONOFIA',
    notes: ''
  });

  // Mock data - replace with actual API calls
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock transfers data
      const mockTransfers: LocationTransfer[] = [
        {
          id: '1',
          uuid: 'uuid-1',
          item_name: 'Premium Perfume Glass 50ml',
          item_code: 'PG-50-PREM',
          color: 'Clear',
          transfer_quantity: 100,
          transfer_date: '2024-01-15 10:30:00',
          user_id: 1,
          username: 'manager_ahmed',
          supplier: 'GlassCo International',
          notes: 'Regular stock transfer',
          source_location: 'MAIN_INVENTORY',
          destination_location: 'MONOFIA',
          created_at: '2024-01-15 10:30:00'
        },
        {
          id: '2',
          uuid: 'uuid-2',
          item_name: 'Luxury Bottle 100ml',
          item_code: 'LB-100-LUX',
          color: 'Amber',
          transfer_quantity: 50,
          transfer_date: '2024-01-14 14:20:00',
          user_id: 1,
          username: 'manager_ahmed',
          supplier: 'BottleMaster Ltd',
          notes: 'Urgent factory requirement',
          source_location: 'MONOFIA',
          destination_location: 'MATBAA',
          created_at: '2024-01-14 14:20:00'
        },
        {
          id: '3',
          uuid: 'uuid-3',
          item_name: 'Spray Pump Gold',
          item_code: 'SP-GOLD-01',
          color: 'Gold',
          transfer_quantity: 200,
          transfer_date: '2024-01-13 09:15:00',
          user_id: 2,
          username: 'supervisor_sara',
          supplier: 'PumpTech Industries',
          notes: 'Production line setup',
          source_location: 'MAIN_INVENTORY',
          destination_location: 'MATBAA',
          created_at: '2024-01-13 09:15:00'
        }
      ];

      // Mock inventory items
      const mockItems: InventoryItem[] = [
        {
          id: 1,
          item_name: 'Premium Perfume Glass 50ml',
          item_code: 'PG-50-PREM',
          color: 'Clear',
          remaining_quantity: 500,
          location: 'MAIN_INVENTORY',
          supplier: 'GlassCo International'
        },
        {
          id: 2,
          item_name: 'Luxury Bottle 100ml',
          item_code: 'LB-100-LUX',
          color: 'Amber',
          remaining_quantity: 200,
          location: 'MONOFIA',
          supplier: 'BottleMaster Ltd'
        },
        {
          id: 3,
          item_name: 'Spray Pump Gold',
          item_code: 'SP-GOLD-01',
          color: 'Gold',
          remaining_quantity: 1000,
          location: 'MAIN_INVENTORY',
          supplier: 'PumpTech Industries'
        }
      ];

      setTransfers(mockTransfers);
      setInventoryItems(mockItems);
      setIsLoading(false);
    };

    loadData();
  }, []);

  const handleItemSelect = (item: InventoryItem) => {
    setSelectedItem(item);
    setTransferForm(prev => ({
      ...prev,
      item_name: item.item_name,
      item_code: item.item_code,
      color: item.color,
      source_location: item.location as 'MAIN_INVENTORY' | 'MONOFIA' | 'MATBAA'
    }));
  };

  const handleTransfer = async () => {
    if (!selectedItem || transferForm.quantity <= 0) {
      alert('Please select an item and enter a valid quantity');
      return;
    }

    if (transferForm.source_location === transferForm.destination_location) {
      alert('Source and destination locations must be different');
      return;
    }

    if (transferForm.quantity > selectedItem.remaining_quantity) {
      alert('Transfer quantity exceeds available stock');
      return;
    }

    setIsLoading(true);

    try {
      // Replace with actual API call to inventory_system.transfer_between_locations function
      const transferData = {
        p_item_name: transferForm.item_name,
        p_item_code: transferForm.item_code,
        p_color: transferForm.color,
        p_quantity: transferForm.quantity,
        p_source_location: transferForm.source_location,
        p_destination_location: transferForm.destination_location,
        p_user_id: 1, // Current user ID from auth context
        p_notes: transferForm.notes
      };

      console.log('Transfer data:', transferData);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Add to transfers list
      const newTransfer: LocationTransfer = {
        id: (transfers.length + 1).toString(),
        uuid: `uuid-${Date.now()}`,
        ...transferForm,
        transfer_quantity: transferForm.quantity,
        transfer_date: new Date().toISOString(),
        user_id: 1,
        username: 'current_user', // Replace with actual username
        supplier: selectedItem.supplier,
        created_at: new Date().toISOString()
      };

      setTransfers(prev => [newTransfer, ...prev]);
      setShowTransferModal(false);
      setTransferForm({
        item_name: '',
        item_code: '',
        color: '',
        quantity: 0,
        source_location: 'MAIN_INVENTORY',
        destination_location: 'MONOFIA',
        notes: ''
      });
      setSelectedItem(null);

      alert('Transfer completed successfully!');

    } catch (error) {
      console.error('Transfer failed:', error);
      alert('Transfer failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTransfers = transfers.filter(transfer => {
    const matchesSearch = 
      transfer.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transfer.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transfer.color.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLocation = filterLocation === 'all' || 
      transfer.source_location === filterLocation || 
      transfer.destination_location === filterLocation;
    
    return matchesSearch && matchesLocation;
  });

  const getLocationIcon = (location: string) => {
    switch (location) {
      case 'MAIN_INVENTORY':
        return <Warehouse className="w-4 h-4" />;
      case 'MONOFIA':
        return <Factory className="w-4 h-4" />;
      case 'MATBAA':
        return <Building className="w-4 h-4" />;
      default:
        return <Warehouse className="w-4 h-4" />;
    }
  };

  const getLocationColor = (location: string) => {
    switch (location) {
      case 'MAIN_INVENTORY':
        return 'bg-blue-100 text-blue-700';
      case 'MONOFIA':
        return 'bg-green-100 text-green-700';
      case 'MATBAA':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const exportToCSV = () => {
    const headers = ['Item Name', 'Item Code', 'Color', 'Quantity', 'Source', 'Destination', 'Date', 'User', 'Notes'];
    const csvData = transfers.map(transfer => [
      transfer.item_name,
      transfer.item_code,
      transfer.color,
      transfer.transfer_quantity,
      transfer.source_location,
      transfer.destination_location,
      new Date(transfer.transfer_date).toLocaleDateString(),
      transfer.username,
      transfer.notes
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `location-transfers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading && transfers.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading location transfers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-2xl">
                <Truck className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Location Transfers
                </h1>
                <p className="text-slate-600">Manage inventory transfers between locations</p>
              </div>
            </div>
            <button
              onClick={() => setShowTransferModal(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/25 transition-all duration-200 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Transfer
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <ArrowRightLeft className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Total Transfers</p>
                <p className="text-2xl font-bold text-slate-900">{transfers.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">This Month</p>
                <p className="text-2xl font-bold text-slate-900">18</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Pending</p>
                <p className="text-2xl font-bold text-slate-900">2</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Warehouse className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Active Items</p>
                <p className="text-2xl font-bold text-slate-900">{inventoryItems.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search items, codes, colors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
              
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                <option value="all">All Locations</option>
                <option value="MAIN_INVENTORY">Main Inventory</option>
                <option value="MONOFIA">Monofia</option>
                <option value="MATBAA">Matbaa</option>
              </select>
            </div>
            
            <button
              onClick={exportToCSV}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl transition-all duration-200 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Transfers Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left p-6 font-semibold text-slate-900">Item Details</th>
                  <th className="text-left p-6 font-semibold text-slate-900">Quantity</th>
                  <th className="text-left p-6 font-semibold text-slate-900">Transfer Path</th>
                  <th className="text-left p-6 font-semibold text-slate-900">Date & User</th>
                  <th className="text-left p-6 font-semibold text-slate-900">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransfers.map((transfer) => (
                  <tr key={transfer.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-6">
                      <div>
                        <p className="font-semibold text-slate-900">{transfer.item_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-slate-600">{transfer.item_code}</span>
                          <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded-full">
                            {transfer.color}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="text-lg font-semibold text-blue-600">
                        {transfer.transfer_quantity}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${getLocationColor(transfer.source_location)}`}>
                          {getLocationIcon(transfer.source_location)}
                          {transfer.source_location.replace('_', ' ')}
                        </div>
                        <ArrowRightLeft className="w-4 h-4 text-slate-400" />
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${getLocationColor(transfer.destination_location)}`}>
                          {getLocationIcon(transfer.destination_location)}
                          {transfer.destination_location.replace('_', ' ')}
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {new Date(transfer.transfer_date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-slate-600">{transfer.username}</p>
                      </div>
                    </td>
                    <td className="p-6">
                      <p className="text-sm text-slate-600 max-w-xs truncate">
                        {transfer.notes || 'No notes'}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTransfers.length === 0 && (
            <div className="text-center py-12">
              <Truck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No transfers found</p>
            </div>
          )}
        </div>
      </div>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Create New Transfer</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Item Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Item to Transfer
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                  {inventoryItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleItemSelect(item)}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                        selectedItem?.id === item.id
                          ? 'border-blue-500 bg-blue-50/50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-slate-900">{item.item_name}</p>
                          <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                            <span>{item.item_code}</span>
                            <span className="px-2 py-1 bg-slate-100 rounded-full">{item.color}</span>
                            <span>Qty: {item.remaining_quantity}</span>
                          </div>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${getLocationColor(item.location)}`}>
                          {getLocationIcon(item.location)}
                          {item.location.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedItem && (
                <>
                  {/* Transfer Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Source Location
                      </label>
                      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-300 ${getLocationColor(transferForm.source_location)}`}>
                        {getLocationIcon(transferForm.source_location)}
                        <span className="font-medium">{transferForm.source_location.replace('_', ' ')}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Destination Location
                      </label>
                      <select
                        value={transferForm.destination_location}
                        onChange={(e) => setTransferForm(prev => ({
                          ...prev,
                          destination_location: e.target.value as 'MAIN_INVENTORY' | 'MONOFIA' | 'MATBAA'
                        }))}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      >
                        <option value="MONOFIA">Monofia</option>
                        <option value="MATBAA">Matbaa</option>
                        <option value="MAIN_INVENTORY">Main Inventory</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Transfer Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedItem.remaining_quantity}
                      value={transferForm.quantity}
                      onChange={(e) => setTransferForm(prev => ({
                        ...prev,
                        quantity: parseInt(e.target.value) || 0
                      }))}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Enter quantity"
                    />
                    <p className="text-sm text-slate-500 mt-1">
                      Available: {selectedItem.remaining_quantity} units
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={transferForm.notes}
                      onChange={(e) => setTransferForm(prev => ({
                        ...prev,
                        notes: e.target.value
                      }))}
                      rows={3}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Add any notes about this transfer..."
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowTransferModal(false)}
                className="px-6 py-3 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={!selectedItem || transferForm.quantity <= 0 || isLoading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4" />
                    Confirm Transfer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationTransfersPage;