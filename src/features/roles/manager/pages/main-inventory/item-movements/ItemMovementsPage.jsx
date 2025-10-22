import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { debounce } from 'lodash';

const ItemMovementsPage = () => {
  const [mode, setMode] = useState(localStorage.getItem('themeMode') || 'dark');
  const isMobile = window.innerWidth < 768;
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(isMobile ? 20 : 50);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    itemName: '',
    code: '',
    color: '',
    startDate: null,
    endDate: null,
    factory: '',
    source: '',
    destination: '',
  });
  const [sortConfig, setSortConfig] = useState({
    field: 'date',
    direction: 'DESC',
  });
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [stats, setStats] = useState([]);
  const [inventoryData, setInventoryData] = useState({});

  // Movement types from the database schema including accessory types
  const movementTypes = [
    'صرف مصنع',
    'صرف خارجي',
    'مرتجع مصنع',
    'مرتجع اكسسوار',
    'صرف اكسسوار',
    'حركة مصنع',
    'تحويل مطبعة',
    'تحويل منوفية',
    'تحويل مخزون',
    'فاتورة شراء',
    'فاتورة بيع',
    'فاتورة صرف مصنع',
  ];

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  // Memoize expensive calculations
  const getAuthToken = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('يرجى تسجيل الدخول أولاً');
      return null;
    }
    return token;
  }, []);

  const formatDisplayDate = useCallback((dateString) => {
    if (!dateString || isNaN(new Date(dateString).getTime())) {
      return 'غير متوفر';
    }
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }, []);

  const formatDateForAPI = useCallback((date) => {
    if (!date) return null;
    return new Date(date).toISOString().split('T')[0];
  }, []);

  // Enhanced accessory quantity processing based on the first code
  const processAccessoryQuantities = useCallback((movement) => {
    // For accessory dispatches, extract detailed quantities
    if (movement.movementType === 'صرف اكسسوار' || movement.movementType === 'مرتجع اكسسوار') {
      return {
        total: movement.outgoingQuantity || movement.incomingQuantity || 0,
        pump: movement.bمب_مصروف || movement.bمب || 0,
        ring: movement.حلق_مصروف || movement.حلق || 0,
        cover: movement.غطاء_مصروف || movement.غطاء || 0,
        ribbons: movement.شرائط_مصروف || movement.شرائط || 0,
        stickers: movement.استيكرات_مصروف || movement.استيكرات || 0,
        tags: movement.علامات_مصروف || movement.علامات || 0,
        cartons: movement.عدد_الكراتين || 0,
        individual: movement.عدد_الاكسسوار_الفردي || 0,
        perCarton: movement.عدد_في_الكرتونة || 0
      };
    }
    return null;
  }, []);

  // Enhanced factory dispatch processing with carton and individual quantities
  const processFactoryDispatchQuantities = useCallback((movement) => {
    if (movement.movementType === 'صرف مصنع' || movement.movementType === 'فاتورة صرف مصنع') {
      return {
        cartons: movement.عدد_الكراتين || movement.cartons || 0,
        individual: movement.عدد_الفردي || movement.individual || 0,
        perCarton: movement.عدد_في_الكرتونة || movement.per_carton || 0,
        totalDispatched: movement.outgoingQuantity || movement["اجمالي_المصروف"] || 0
      };
    }
    return null;
  }, []);

  // Fetch current inventory from المخزون table
  const fetchInventoryData = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.log('No token available for inventory');
        return {};
      }

      console.log('Fetching inventory data...');
      const response = await fetch(`${API_URL}/item-movements/inventory`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Inventory data received:', data.data?.length || 0);
        
        if (data.success && Array.isArray(data.data)) {
          const inventoryMap = {};
          data.data.forEach((item) => {
            if (item.code) {
              inventoryMap[item.code] = {
                cartons: item.cartons || 0,
                individual: item.individual || 0,
                remaining: item.remaining || 0,
                per_carton: item.perCarton || item.per_carton || 0,
                // Add accessory specific fields
                pump: item.bمب || 0,
                ring: item.حلق || 0,
                cover: item.غطاء || 0,
                ribbons: item.شرائط || 0,
                stickers: item.استيكرات || 0,
                tags: item.علامات || 0,
              };
            }
          });
          setInventoryData(inventoryMap);
          return inventoryMap;
        }
      } else {
        console.warn('Inventory fetch failed with status:', response.status);
      }
    } catch (error) {
      console.error('Inventory fetch error:', error);
    }
    return {};
  }, [API_URL, getAuthToken]);

  // Enhanced movement data processing with accessory and factory dispatch details
  const processMovementData = useCallback((movement, inventoryMap) => {
    const currentInventory = movement.code ? inventoryMap[movement.code] : null;
    const isFactoryDispatch = movement.movementType === 'صرف مصنع' || movement.movementType === 'فاتورة صرف مصنع';
    const isAccessoryDispatch = movement.movementType === 'صرف اكسسوار' || movement.movementType === 'مرتجع اكسسوار';

    // Process accessory quantities
    const accessoryQuantities = processAccessoryQuantities(movement);
    
    // Process factory dispatch quantities
    const factoryDispatchQuantities = processFactoryDispatchQuantities(movement);

    return {
      id: movement.id,
      stockId: movement.stockId,
      itemName: movement.itemName || movement["الصنف"] || 'غير متوفر',
      code: movement.code || movement["الكود"] || 'غير متوفر',
      color: movement.color || movement["لون_الاكسسوار"] || 'غير متوفر',
      movementType: movement.movementType || 'غير محدد',
      balanceAfter: movement.balanceAfter || 0,
      factory: movement.factory || movement["الوجهه"] || (isFactoryDispatch ? movement.destination : '-'),
      date: movement.date || movement["تاريخ_الصرف"] || 'غير متوفر',
      user: movement.user || movement["المستخدم"] || 'غير متوفر',
      incomingQuantity: movement.incomingQuantity || 0,
      outgoingQuantity: movement.outgoingQuantity || movement["اجمالي_المصروف"] || 0,
      remainingCartons: isFactoryDispatch
        ? movement.remainingCartons ?? currentInventory?.cartons ?? 0
        : null,
      remainingIndividual: isFactoryDispatch
        ? movement.remainingIndividual ?? currentInventory?.individual ?? 0
        : null,
      perCarton: isFactoryDispatch ? currentInventory?.per_carton ?? 0 : null,
      currentRemaining: isFactoryDispatch
        ? currentInventory?.remaining ?? movement.balanceAfter ?? 0
        : movement.balanceAfter || 0,
      notes: movement.notes || movement["ملاحظات"] || 'لا توجد ملاحظات',
      source: movement.source || movement["المصدر"] || '-',
      destination: movement.destination || movement["الوجهه"] || '-',
      
      // Enhanced accessory details
      accessoryQuantities: accessoryQuantities,
      hasAccessoryDetails: isAccessoryDispatch && accessoryQuantities,
      
      // Enhanced factory dispatch details
      factoryDispatchQuantities: factoryDispatchQuantities,
      hasFactoryDispatchDetails: isFactoryDispatch && factoryDispatchQuantities,
      
      // Individual accessory fields for detailed display
      accessoryDetails: {
        pump: movement.bمب_مصروف || movement.bمب || 0,
        ring: movement.حلق_مصروف || movement.حلق || 0,
        cover: movement.غطاء_مصروف || movement.غطاء || 0,
        ribbons: movement.شرائط_مصروف || movement.شرائط || 0,
        stickers: movement.استيكرات_مصروف || movement.استيكرات || 0,
        tags: movement.علامات_مصروف || movement.علامات || 0,
        totalDispatched: movement["اجمالي_المصروف"] || 0,
        cartons: movement["عدد_الكراتين"] || 0,
        individual: movement["عدد_الاكسسوار_الفردي"] || 0,
        perCarton: movement["عدد_في_الكرتونة"] || 0
      }
    };
  }, [processAccessoryQuantities, processFactoryDispatchQuantities]);

  // Fetch movements from عرض_حركة_الاصناف_الموحد view
  const fetchMovements = useCallback(async (pageNum, limitNum, sortConfig, filtersObj) => {
    setLoading(true);
    setError('');

    try {
      const token = getAuthToken();
      if (!token) {
        setError('يرجى تسجيل الدخول أولاً');
        setLoading(false);
        return;
      }

      // Build query parameters
      const queryParams = new URLSearchParams({
        page: (pageNum + 1).toString(),
        limit: limitNum.toString(),
        sortBy: sortConfig.field,
        sortOrder: sortConfig.direction.toLowerCase(),
      });

      // Add filters with enhanced filtering logic
      Object.entries(filtersObj).forEach(([key, value]) => {
        if (value !== null && value !== '' && value !== undefined) {
          if (value instanceof Date) {
            queryParams.set(key, formatDateForAPI(value));
          } else if (value.toString().trim() !== '') {
            queryParams.set(key, value.toString().trim());
          }
        }
      });

      console.log('Fetching movements with params:', {
        page: pageNum + 1,
        limit: limitNum,
        sortBy: sortConfig.field,
        sortOrder: sortConfig.direction,
        filters: filtersObj
      });

      const response = await fetch(`${API_URL}/item-movements?${queryParams}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
        }
        if (response.status === 404) {
          throw new Error('البيانات غير متوفرة - الرابط غير صحيح');
        }
        throw new Error(`خطأ في الخادم: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

      if (data.success) {
        console.log('Received movements:', data.data?.length || 0);
        
        // Process movements with inventory data
        const processedMovements = data.data.map(movement => 
          processMovementData(movement, inventoryData)
        );
        
        setMovements(processedMovements);
        setTotalItems(data.pagination?.totalItems || 0);

        if (processedMovements.length === 0 && (filtersObj.type || filtersObj.search)) {
          setError('لا توجد نتائج تطابق معايير البحث');
        } else if (processedMovements.length === 0) {
          setError('لا توجد حركات مسجلة في النظام');
        }
      } else {
        throw new Error(data.message || 'فشل في جلب البيانات');
      }
    } catch (err) {
      console.error('Error fetching movements:', err);
      setError(err.message);
      setMovements([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [API_URL, getAuthToken, formatDateForAPI, processMovementData, inventoryData]);

  const debouncedFetchMovements = useMemo(
    () => debounce(fetchMovements, 500),
    [fetchMovements]
  );

  // Fetch stats from database
  const fetchStats = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.log('No token available for stats');
        return;
      }

      console.log('Fetching stats...');
      const response = await fetch(`${API_URL}/item-movements/stats`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('Stats response status:', response.status);

      if (!response.ok) {
        console.warn('Stats fetch failed with status:', response.status);
        setStats([
          { movementType: 'صرف مصنع', count: 0, totalIncoming: 0, totalOutgoing: 0 },
          { movementType: 'صرف اكسسوار', count: 0, totalIncoming: 0, totalOutgoing: 0 },
          { movementType: 'فاتورة شراء', count: 0, totalIncoming: 0, totalOutgoing: 0 },
        ]);
        return;
      }

      const data = await response.json();
      console.log('Stats data:', data);

      if (data.success && Array.isArray(data.data)) {
        setStats(data.data);
      } else {
        console.warn('Invalid stats data format:', data);
        setStats([
          { movementType: 'صرف مصنع', count: 0, totalIncoming: 0, totalOutgoing: 0 },
          { movementType: 'صرف اكسسوار', count: 0, totalIncoming: 0, totalOutgoing: 0 },
          { movementType: 'فاتورة شراء', count: 0, totalIncoming: 0, totalOutgoing: 0 },
        ]);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      setStats([
        { movementType: 'صرف مصنع', count: 0, totalIncoming: 0, totalOutgoing: 0 },
        { movementType: 'صرف اكسسوار', count: 0, totalIncoming: 0, totalOutgoing: 0 },
        { movementType: 'فاتورة شراء', count: 0, totalIncoming: 0, totalOutgoing: 0 },
      ]);
    }
  }, [API_URL, getAuthToken]);

  // Initialize data on component mount
  useEffect(() => {
    const initializeData = async () => {
      console.log('Initializing component data...');
      try {
        // First fetch inventory data
        const inventory = await fetchInventoryData();
        console.log('Inventory loaded, fetching movements...');
        
        // Then fetch movements with the inventory data
        await fetchMovements(page, rowsPerPage, sortConfig, filters);
        
        // Finally fetch stats
        await fetchStats();
        
        console.log('All data initialized successfully');
      } catch (error) {
        console.error('Error initializing data:', error);
        setError('فشل في تحميل البيانات: ' + error.message);
      }
    };

    initializeData();
  }, []); // Empty dependency array - only run on mount

  const handleChangePage = (newPage) => {
    console.log('Changing page to:', newPage);
    setPage(newPage);
    fetchMovements(newPage, rowsPerPage, sortConfig, filters);
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    console.log('Changing rows per page to:', newRowsPerPage);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    fetchMovements(0, newRowsPerPage, sortConfig, filters);
  };

  const handleSort = (field) => {
    const newSortConfig = {
      field,
      direction: sortConfig.field === field && sortConfig.direction === 'ASC' ? 'DESC' : 'ASC',
    };
    console.log('Sorting by:', newSortConfig);
    setSortConfig(newSortConfig);
    fetchMovements(page, rowsPerPage, newSortConfig, filters);
  };

  // Enhanced filtering with better type handling
  const handleFilterChange = (field, value) => {
    console.log('Filter changed:', field, value);
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    setPage(0);
    
    // Apply immediate filtering for certain fields
    if (field === 'type' || field === 'search') {
      debouncedFetchMovements(0, rowsPerPage, sortConfig, newFilters);
    } else {
      debouncedFetchMovements(0, rowsPerPage, sortConfig, newFilters);
    }
  };

  const clearFilters = () => {
    console.log('Clearing all filters');
    const clearedFilters = {
      search: '',
      type: '',
      itemName: '',
      code: '',
      color: '',
      startDate: null,
      endDate: null,
      factory: '',
      source: '',
      destination: '',
    };
    setFilters(clearedFilters);
    setPage(0);
    fetchMovements(0, rowsPerPage, sortConfig, clearedFilters);
  };

  const handleViewDetails = async (movement) => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('يرجى تسجيل الدخول أولاً');
        return;
      }

      console.log('Fetching details for movement:', movement.id);
      const response = await fetch(`${API_URL}/item-movements/${movement.id}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`خطأ في الخادم: ${response.status}`);
      }

      const data = await response.json();
      console.log('Movement details response:', data);

      if (data.success) {
        const processedMovement = processMovementData(data.data, inventoryData);
        setSelectedMovement(processedMovement);
        setDetailDialogOpen(true);
      } else {
        throw new Error(data.message || 'فشل في تحميل التفاصيل');
      }
    } catch (err) {
      console.error('Error loading details:', err);
      setError('فشل في تحميل التفاصيل: ' + err.message);
    }
  };

  const handleExport = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('يرجى تسجيل الدخول أولاً');
        return;
      }

      const queryParams = new URLSearchParams();

      // Add filters to export
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== '' && value !== undefined) {
          if (value instanceof Date) {
            queryParams.set(key, formatDateForAPI(value));
          } else if (value.toString().trim() !== '') {
            queryParams.set(key, value.toString().trim());
          }
        }
      });

      console.log('Exporting with params:', Object.fromEntries(queryParams));
      const response = await fetch(`${API_URL}/item-movements/export?${queryParams}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Export error response:', errorText);
        throw new Error(`خطأ في التصدير: ${response.status} - ${errorText}`);
      }

      const blob = await response.blob();
      
      // Check if blob is valid
      if (blob.size === 0) {
        throw new Error('الملف المُصدر فارغ');
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `movements-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('Export completed successfully');
    } catch (err) {
      console.error('Export error:', err);
      setError('فشل في تصدير الملف: ' + err.message);
    }
  };

  const handleRefresh = () => {
    console.log('Refreshing data...');
    setError('');
    fetchInventoryData().then(() => {
      fetchMovements(page, rowsPerPage, sortConfig, filters);
      fetchStats();
    });
  };

  const getMovementTypeColor = (type) => {
    const colors = {
      'صرف مصنع': 'from-blue-600 to-blue-800',
      'صرف خارجي': 'from-purple-600 to-purple-800',
      'مرتجع مصنع': 'from-green-600 to-green-800',
      'مرتجع اكسسوار': 'from-green-600 to-green-800',
      'صرف اكسسوار': 'from-amber-600 to-amber-800',
      'حركة مصنع': 'from-cyan-600 to-cyan-800',
      'تحويل مطبعة': 'from-blue-600 to-blue-800',
      'تحويل منوفية': 'from-purple-600 to-purple-800',
      'تحويل مخزون': 'from-cyan-600 to-cyan-800',
      'فاتورة شراء': 'from-green-600 to-green-800',
      'فاتورة بيع': 'from-red-600 to-red-800',
      'فاتورة صرف مصنع': 'from-blue-600 to-blue-800',
    };
    return colors[type] || 'from-gray-600 to-gray-800';
  };

  const getMovementIcon = (type) => {
    if (type.includes('صرف') || type.includes('بيع')) {
      return '↓'; // صادر
    } else if (type.includes('شراء') || type.includes('مرتجع')) {
      return '↑'; // وارد
    } else {
      return '↔';
    }
  };

  // Enhanced factory dispatch dropdown component
  const FactoryDispatchDropdown = ({ factoryQuantities, movementType }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (!factoryQuantities) {
      return (
        <button disabled className="p-2 bg-gray-600 text-gray-400 rounded-lg cursor-not-allowed text-xs">
          <span>🏭</span>
        </button>
      );
    }

    const factoryDetails = [
      { label: 'الكراتين المصروفة', key: 'cartons', icon: '📦' },
      { label: 'الفردي المصروف', key: 'individual', icon: '📏' },
      { label: 'في الكرتونة', key: 'perCarton', icon: '📊' },
      { label: 'الإجمالي المصروف', key: 'totalDispatched', icon: '∑' },
    ];

    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg shadow hover:shadow-md transition-all duration-200 text-xs"
          title="تفاصيل صرف المصنع"
        >
          <span>🏭</span>
        </button>
        {isOpen && (
          <div className="absolute z-50 mt-1 w-64 bg-gray-800 rounded-lg shadow-xl border border-gray-600 dark:bg-gray-800 light:bg-white">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white dark:from-blue-500 dark:to-cyan-500 light:from-blue-400 light:to-cyan-400">
              <h3 className="font-bold text-center font-tajawal text-xs">
                تفاصيل صرف المصنع
              </h3>
            </div>
            <div className="p-1 max-h-60 overflow-y-auto">
              {factoryDetails.map((detail) => (
                <div key={detail.key} className="flex justify-between items-center p-2 border-b border-gray-600 last:border-b-0 hover:bg-gray-700 dark:hover:bg-gray-700 light:hover:bg-gray-100 transition-colors duration-200">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{detail.icon}</span>
                    <span className="text-xs font-tajawal text-gray-200 dark:text-gray-200 light:text-gray-700">{detail.label}</span>
                  </div>
                  <span className="font-bold text-blue-400 bg-blue-900/30 px-2 py-1 rounded text-xs dark:bg-blue-900/30 light:bg-blue-100/50 min-w-12 text-center">
                    {factoryQuantities[detail.key]?.toLocaleString() || '0'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Enhanced AccessoryDetailsDropdown with comprehensive accessory information
  const AccessoryDetailsDropdown = ({ accessoryQuantities, movementType }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (!accessoryQuantities) {
      return (
        <button disabled className="p-2 bg-gray-600 text-gray-400 rounded-lg cursor-not-allowed text-xs">
          <span>↳</span>
        </button>
      );
    }

    const isReturn = movementType === 'مرتجع اكسسوار';
    const actionText = isReturn ? 'مسترجعة' : 'مصروفة';

    const accessoryTypes = [
      { label: `الإجمالي ${actionText}`, key: 'total', icon: '📊' },
      { label: `البمب ${actionText}`, key: 'pump', icon: '🔧' },
      { label: `الحلق ${actionText}`, key: 'ring', icon: '💍' },
      { label: `الغطاء ${actionText}`, key: 'cover', icon: '🛡️' },
      { label: `الشرائط ${actionText}`, key: 'ribbons', icon: '🎀' },
      { label: `الاستيكرات ${actionText}`, key: 'stickers', icon: '🏷️' },
      { label: `العلامات ${actionText}`, key: 'tags', icon: '📛' },
      { label: 'الكراتين المتبقية', key: 'cartons', icon: '📦' },
      { label: 'الفردي المتبقي', key: 'individual', icon: '📏' },
      { label: 'في الكرتونة', key: 'perCarton', icon: '📦' },
    ];

    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg shadow hover:shadow-md transition-all duration-200 text-xs"
          title={`تفاصيل الإكسسوار ${isReturn ? 'المسترجعة' : 'المصروفة'}`}
        >
          <span>↳ {isReturn ? '🔄' : '📤'}</span>
        </button>
        {isOpen && (
          <div className="absolute z-50 mt-1 w-64 bg-gray-800 rounded-lg shadow-xl border border-gray-600 dark:bg-gray-800 light:bg-white">
            <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white dark:from-amber-500 dark:to-orange-500 light:from-amber-400 light:to-orange-400">
              <h3 className="font-bold text-center font-tajawal text-xs">
                تفاصيل الإكسسوار {isReturn ? 'المسترجعة' : 'المصروفة'}
              </h3>
            </div>
            <div className="p-1 max-h-60 overflow-y-auto">
              {accessoryTypes.map((type) => (
                <div key={type.key} className="flex justify-between items-center p-2 border-b border-gray-600 last:border-b-0 hover:bg-gray-700 dark:hover:bg-gray-700 light:hover:bg-gray-100 transition-colors duration-200">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{type.icon}</span>
                    <span className="text-xs font-tajawal text-gray-200 dark:text-gray-200 light:text-gray-700">{type.label}</span>
                  </div>
                  <span className="font-bold text-blue-400 bg-blue-900/30 px-2 py-1 rounded text-xs dark:bg-blue-900/30 light:bg-blue-100/50 min-w-12 text-center">
                    {accessoryQuantities[type.key]?.toLocaleString() || '0'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const DetailItem = ({ icon, label, value, valueColor = 'text-gray-100 dark:text-gray-100 light:text-gray-900', isImportant = false }) => (
    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl shadow border border-gray-700 hover:border-blue-400 transition-all duration-200 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700 dark:hover:border-blue-400 light:from-white/80 light:to-gray-100 light:border-gray-200 light:hover:border-blue-300">
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow dark:from-blue-500 dark:to-purple-600 light:from-blue-400 light:to-purple-500">
        <span className="text-lg">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-300 dark:text-gray-300 light:text-gray-600 font-tajawal mb-1">{label}</p>
        <p className={`font-tajawal font-bold text-right ${isImportant ? 'text-lg' : 'text-base'} ${valueColor} break-words leading-tight`}>
          {value}
        </p>
      </div>
    </div>
  );

  const StatCard = ({ stat, index }) => (
    <div
      className={`relative overflow-hidden rounded-xl shadow hover:shadow-md transform hover:-translate-y-1 transition-all duration-300 group bg-gradient-to-r ${getMovementTypeColor(stat.movementType)}`}
    >
      <div className="absolute inset-0 bg-white/10 group-hover:bg-white/20 transition-all duration-300 dark:bg-white/10 dark:group-hover:bg-white/20 light:bg-black/5 light:group-hover:bg-black/10`}"></div>
      <div className="relative p-4 text-white dark:text-white light:text-gray-900">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <p className="text-xs font-bold opacity-90 mb-1 font-tajawal text-white/90 dark:text-white/90 light:text-gray-700/90">
              {stat.movementType}
            </p>
            <h2 className="text-xl font-bold mb-2 dark:text-shadow light:text-shadow-none">
              {stat.count.toLocaleString()}
            </h2>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <span className="text-green-300 text-sm dark:text-green-300 light:text-green-600">↑</span>
                <span className="text-xs font-semibold text-green-300 dark:text-green-300 light:text-green-600">
                  {stat.totalIncoming.toLocaleString()} وارد
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-red-300 text-sm dark:text-red-300 light:text-red-600">↓</span>
                <span className="text-xs font-semibold text-red-300 dark:text-red-300 light:text-red-600">
                  {stat.totalOutgoing.toLocaleString()} صادر
                </span>
              </div>
            </div>
          </div>
          <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm group-hover:bg-white/30 transition-all duration-300 dark:bg-white/20 light:bg-black/10">
            <span className="text-sm">{getMovementIcon(stat.movementType)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const mobileColumns = [
    { label: 'الصنف', field: 'itemName', width: '40%' },
    { label: 'نوع الحركة', field: 'movementType', width: '30%' },
    { label: 'الكمية', field: 'quantities', width: '20%' },
    { label: 'الإجراءات', field: null, width: '10%' },
  ];

  const desktopColumns = [
    { label: 'المعرف', field: 'id', width: '70px' },
    { label: 'الصنف', field: 'itemName', width: '150px' },
    { label: 'الكود', field: 'code', width: '100px' },
    { label: 'اللون', field: 'color', width: '100px' },
    { label: 'نوع الحركة', field: 'movementType', width: '130px' },
    { label: 'الكميات', field: 'quantities', width: '150px' },
    { label: 'الرصيد', field: 'balanceAfter', width: '100px' },
    { label: 'المصنع', field: 'factory', width: '120px' },
    { label: 'التاريخ', field: 'date', width: '110px' },
    { label: 'المستخدم', field: 'user', width: '100px' },
    { label: 'الإجراءات', field: null, width: '80px' },
  ];

  // Enhanced MobileMovementCard to include factory dispatch
  const MobileMovementCard = ({ movement }) => (
    <div className="bg-gray-800/50 dark:bg-gray-800/50 light:bg-white/80 rounded-xl p-3 mb-2 border border-gray-700 hover:border-blue-500 transition-all duration-200 dark:border-gray-700 dark:hover:border-blue-500 light:border-gray-200 light:hover:border-blue-300">
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="col-span-2">
          <p className="font-black text-blue-400 text-base text-right leading-tight dark:text-blue-400 light:text-blue-600" dir="rtl">
            {movement.itemName}
          </p>
          <p className="text-xs text-gray-400 mt-1 font-tajawal text-right dark:text-gray-400 light:text-gray-500">
            {movement.code} | {movement.color}
          </p>
        </div>
        <div className="col-span-2 flex justify-center">
          <span
            className={`font-bold text-xs px-2 py-1 rounded-lg text-white bg-gradient-to-r ${getMovementTypeColor(movement.movementType)}`}
          >
            {getMovementIcon(movement.movementType)} {movement.movementType}
          </span>
        </div>
        <div className="col-span-2">
          <div className="flex flex-col items-center gap-1">
            {(movement.movementType === 'صرف اكسسوار' || movement.movementType === 'مرتجع اكسسوار') ? (
              <AccessoryDetailsDropdown 
                accessoryQuantities={movement.accessoryQuantities} 
                movementType={movement.movementType}
              />
            ) : (movement.movementType === 'صرف مصنع' || movement.movementType === 'فاتورة صرف مصنع') ? (
              <FactoryDispatchDropdown 
                factoryQuantities={movement.factoryDispatchQuantities}
                movementType={movement.movementType}
              />
            ) : (
              <>
                {movement.incomingQuantity > 0 && (
                  <p className="text-green-400 font-black text-sm bg-green-900/30 px-2 py-0.5 rounded dark:bg-green-900/30 dark:text-green-400 light:bg-green-100/50 light:text-green-600">
                    +{movement.incomingQuantity.toLocaleString()} وارد
                  </p>
                )}
                {movement.outgoingQuantity > 0 && (
                  <p className="text-red-400 font-black text-sm bg-red-900/30 px-2 py-0.5 rounded dark:bg-red-900/30 dark:text-red-400 light:bg-red-100/50 light:text-red-600">
                    -{movement.outgoingQuantity.toLocaleString()} صادر
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-center">
        <button
          onClick={() => handleViewDetails(movement)}
          className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 hover:transform hover:scale-105 transition-all duration-200 shadow dark:from-blue-500 dark:to-purple-500 light:from-blue-400 light:to-purple-400"
        >
          <span className="text-sm">👁️</span>
        </button>
      </div>
    </div>
  );

  // Enhanced DesktopMovementRow to include factory dispatch
  const DesktopMovementRow = ({ movement, index }) => (
    <tr
      key={movement.id}
      className={`hover:bg-blue-900/20 transition-all duration-200 group ${index % 2 === 0 ? 'bg-gray-800/50 dark:bg-gray-800/50 light:bg-gray-50/50' : 'bg-gray-900/50 dark:bg-gray-900/50 light:bg-white/50'}`}
    >
      <td className="p-2 text-center text-gray-100 font-bold text-xs dark:text-gray-100 light:text-gray-900">
        {movement.id}
      </td>
      <td className="p-2 text-right">
        <p className="font-black text-blue-400 text-sm leading-tight dark:text-blue-400 light:text-blue-600" dir="rtl">
          {movement.itemName}
        </p>
      </td>
      <td className="p-2 text-center">
        <span className="bg-blue-900 text-blue-300 font-bold border border-blue-700 text-xs px-1 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700 light:bg-blue-100 light:text-blue-600 light:border-blue-300">
          {movement.code}
        </span>
      </td>
      <td className="p-2 text-center">
        <span className="bg-purple-900 text-purple-300 font-bold border border-purple-700 text-xs px-1 py-0.5 rounded dark:bg-purple-900 dark:text-purple-300 dark:border-purple-700 light:bg-purple-100 light:text-purple-600 light:border-purple-300">
          {movement.color}
        </span>
      </td>
      <td className="p-2 text-center">
        <span
          className={`font-bold text-xs px-2 py-1 rounded-lg text-white bg-gradient-to-r ${getMovementTypeColor(movement.movementType)}`}
        >
          {getMovementIcon(movement.movementType)} {movement.movementType}
        </span>
      </td>
      <td className="p-2 text-center">
        <div className="flex flex-col items-center gap-1">
          {(movement.movementType === 'صرف اكسسوار' || movement.movementType === 'مرتجع اكسسوار') ? (
            <AccessoryDetailsDropdown 
              accessoryQuantities={movement.accessoryQuantities}
              movementType={movement.movementType}
            />
          ) : (movement.movementType === 'صرف مصنع' || movement.movementType === 'فاتورة صرف مصنع') ? (
            <FactoryDispatchDropdown 
              factoryQuantities={movement.factoryDispatchQuantities}
              movementType={movement.movementType}
            />
          ) : (
            <>
              {movement.incomingQuantity > 0 && (
                <p className="text-green-400 font-bold text-xs bg-green-900/30 px-1 py-0.5 rounded dark:bg-green-900/30 dark:text-green-400 light:bg-green-100/50 light:text-green-600">
                  +{movement.incomingQuantity.toLocaleString()} وارد
                </p>
              )}
              {movement.outgoingQuantity > 0 && (
                <p className="text-red-400 font-bold text-xs bg-red-900/30 px-1 py-0.5 rounded dark:bg-red-900/30 dark:text-red-400 light:bg-red-100/50 light:text-red-600">
                  -{movement.outgoingQuantity.toLocaleString()} صادر
                </p>
              )}
            </>
          )}
        </div>
      </td>
      <td className="p-2 text-center">
        <p className={`font-black text-xs px-1 py-0.5 rounded-lg ${movement.currentRemaining < 0 ? 'text-red-400 bg-red-900/30 border border-red-700 dark:text-red-400 dark:bg-red-900/30 dark:border-red-700 light:text-red-600 light:bg-red-100/50 light:border-red-300' : 'text-green-400 bg-green-900/30 border border-green-700 dark:text-green-400 dark:bg-green-900/30 dark:border-green-700 light:text-green-600 light:bg-green-100/50 light:border-green-300'}`}>
          {movement.currentRemaining.toLocaleString()}
        </p>
      </td>
      <td className="p-2 text-center text-gray-300 font-bold text-xs dark:text-gray-300 light:text-gray-600">
        {movement.factory}
      </td>
      <td className="p-2 text-center">
        <span className="bg-blue-900 text-blue-300 font-bold border border-blue-700 text-xs px-1 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700 light:bg-blue-100 light:text-blue-600 light:border-blue-300">
          {formatDisplayDate(movement.date)}
        </span>
      </td>
      <td className="p-2 text-center">
        <span className="bg-purple-900 text-purple-300 font-bold border border-purple-700 text-xs px-1 py-0.5 rounded dark:bg-purple-900 dark:text-purple-300 dark:border-purple-700 light:bg-purple-100 light:text-purple-600 light:border-purple-300">
          {movement.user}
        </span>
      </td>
      <td className="p-2 text-center">
        <button
          onClick={() => handleViewDetails(movement)}
          className="p-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 hover:transform hover:scale-105 transition-all duration-200 shadow dark:from-blue-500 dark:to-purple-500 light:from-blue-400 light:to-purple-400"
        >
          <span className="text-xs">👁️</span>
        </button>
      </td>
    </tr>
  );

  const handleThemeToggle = () => {
    const newMode = mode === 'dark' ? 'light' : 'dark';
    setMode(newMode);
    localStorage.setItem('themeMode', newMode);
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 p-2 md:p-4 font-tajawal text-gray-100 flex flex-col dark:from-gray-900 dark:to-blue-900 light:from-gray-100 light:to-blue-100 light:text-gray-900`} dir="rtl">
      <style>
        {`
          body {
            font-family: 'Tajawal', 'Amiri', sans-serif;
            user-select: none;
          }
          input, textarea, select, p, span, div {
            user-select: text;
          }
          ::-webkit-scrollbar {
            width: 6px;
          }
          ::-webkit-scrollbar-track {
            background: #f1f5f9;
          }
          ::-webkit-scrollbar-thumb {
            background: #2563eb;
            border-radius: 6px;
            border: 1px solid #f1f5f9;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #3b82f6;
          }
          .dark ::-webkit-scrollbar-track {
            background: #1e293b;
          }
          .dark ::-webkit-scrollbar-thumb {
            background: #3b82f6;
            border: 1px solid #1e293b;
          }
          .dark ::-webkit-scrollbar-thumb:hover {
            background: #2563eb;
          }
        `}
      </style>
      
      {/* Header */}
      <div className="mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 rounded-2xl shadow border-0 relative overflow-hidden dark:from-blue-600 dark:via-purple-600 dark:to-blue-800 light:from-blue-400 light:via-purple-400 light:to-blue-600">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400"></div>
        <div className="relative p-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shadow border border-white/30 dark:bg-white/20 light:bg-black/10">
                <span className="text-xl font-bold text-white dark:text-white light:text-gray-900">📊</span>
              </div>
              <div>
                <h1 className="text-xl font-black text-white mb-1 font-tajawal dark:text-white light:text-gray-900">
                  حركة الأصناف
                </h1>
                <p className="text-sm text-white/90 font-medium font-tajawal dark:text-white/90 light:text-gray-700">
                  نظام متكامل لإدارة وتتبع حركات الأصناف
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap justify-center items-center">
              <button
                onClick={handleExport}
                disabled={loading}
                className="bg-white/20 backdrop-blur text-white font-black rounded-xl px-3 py-2 flex items-center gap-2 hover:bg-white/30 disabled:bg-white/10 disabled:text-white/50 transition-all duration-200 text-sm border border-white/30 dark:bg-white/20 dark:text-white light:bg-black/10 light:text-gray-900 light:border-black/20 light:hover:bg-black/20"
              >
                <span className="text-sm">↓</span>
                <span>تصدير</span>
              </button>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="bg-white/20 backdrop-blur text-white font-black rounded-xl px-3 py-2 flex items-center gap-2 hover:bg-white/30 disabled:bg-white/10 disabled:text-white/50 transition-all duration-200 text-sm border border-white/30 dark:bg-white/20 dark:text-white light:bg-black/10 light:text-gray-900 light:border-black/20 light:hover:bg-black/20"
              >
                <span className="text-sm">🔄</span>
                <span>تحديث</span>
              </button>
              <button
                onClick={() => setFilterDialogOpen(true)}
                className="bg-white/20 backdrop-blur text-white font-black rounded-xl px-3 py-2 flex items-center gap-2 hover:bg-white/30 transition-all duration-200 text-sm border border-white/30 dark:bg-white/20 dark:text-white light:bg-black/10 light:text-gray-900 light:border-black/20 light:hover:bg-black/20"
              >
                <span className="text-sm">🛠️</span>
                <span>فلاتر</span>
              </button>
              <div className="flex items-center gap-1 bg-white/20 backdrop-blur rounded-xl px-2 py-2 border border-white/30 dark:bg-white/20 light:bg-black/10 light:border-black/20">
                <span className="text-yellow-400 text-sm">☀️</span>
                <input
                  type="checkbox"
                  checked={mode === 'dark'}
                  onChange={handleThemeToggle}
                  className="w-5 h-5 rounded-full appearance-none bg-gray-400 checked:bg-blue-600 border border-gray-600 cursor-pointer transition-all duration-200"
                />
                <span className="text-blue-400 text-sm">🌙</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - Made thinner */}
      <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        {stats.slice(0, isMobile ? 2 : 4).map((stat, index) => (
          <StatCard key={`${stat.movementType}-${index}`} stat={stat} index={index} />
        ))}
      </div>

      {/* Search and Filters - Compact */}
      <div className="mb-4 bg-gray-800/80 backdrop-blur rounded-2xl shadow border border-gray-700/50 dark:bg-gray-800/80 light:bg-white/80 light:border-gray-200/50">
        <div className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
            <div className="md:col-span-2 relative">
              <input
                type="text"
                placeholder="🔍 ابحث في جميع الحقول..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full p-3 pr-10 bg-gray-700/50 rounded-xl border border-blue-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-tajawal backdrop-blur transition-all duration-200 text-white placeholder-gray-400 dark:bg-gray-700/50 dark:text-white light:bg-gray-100/50 light:text-gray-900 light:border-blue-300 light:focus:border-blue-400 light:placeholder-gray-500"
              />
            </div>
            <div>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full p-3 bg-gray-700/50 rounded-xl border border-purple-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm font-tajawal backdrop-blur transition-all duration-200 text-white dark:bg-gray-700/50 dark:text-white light:bg-gray-100/50 light:text-gray-900 light:border-purple-300 light:focus:border-purple-400"
              >
                <option value="">جميع الأنواع</option>
                {movementTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterDialogOpen(true)}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-black rounded-xl p-3 flex items-center justify-center gap-2 hover:from-blue-600 hover:to-purple-600 transition-all duration-200 text-sm dark:from-blue-500 dark:to-purple-500 light:from-blue-400 light:to-purple-400 light:text-white"
              >
                <span className="text-sm">🛠️</span>
                <span>فلاتر</span>
              </button>
              <button
                onClick={clearFilters}
                className="flex-1 bg-gradient-to-r from-gray-500 to-gray-700 text-white font-black rounded-xl p-3 hover:from-gray-600 hover:to-gray-800 transition-all duration-200 text-sm dark:from-gray-500 dark:to-gray-700 light:from-gray-200 light:to-gray-300 light:text-gray-900 light:hover:from-gray-300 light:to-gray-400"
              >
                مسح الكل
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-3 bg-gradient-to-r from-red-500 to-pink-600 text-white p-3 rounded-xl shadow font-tajawal text-sm font-bold flex items-center justify-between backdrop-blur dark:from-red-500 dark:to-pink-600 light:from-red-400 light:to-pink-500 light:text-white">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            {error}
          </div>
          <button onClick={() => setError('')} className="text-white/80 hover:text-white text-lg transition-colors duration-200">
            ✕
          </button>
        </div>
      )}

      {/* Main Content - Maximized Table */}
      {isMobile ? (
        <div className="flex-1 bg-gray-800/80 backdrop-blur rounded-2xl shadow border border-gray-700/50 overflow-hidden dark:bg-gray-800/80 light:bg-white/80 light:border-gray-200/50">
          <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-600 dark:to-purple-600 light:from-blue-400 light:to-purple-400">
            <h2 className="text-lg font-black text-white text-center font-tajawal dark:text-white light:text-white">
              حركات الأصناف ({totalItems.toLocaleString()})
            </h2>
          </div>
          <div className="p-2 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-700/50 rounded-xl h-32"></div>
                ))}
              </div>
            ) : movements.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 dark:text-gray-400 light:text-gray-500">
                  <h3 className="text-lg font-black mb-2 font-tajawal">لا توجد بيانات</h3>
                  <p className="text-sm">لم يتم العثور على أي حركات تطابق معايير البحث</p>
                </div>
              </div>
            ) : (
              movements.map((movement) => (
                <MobileMovementCard key={movement.id} movement={movement} />
              ))
            )}
          </div>
          
          {/* Compact Pagination */}
          <div className="p-2 border-t border-gray-700 bg-gray-800/50 backdrop-blur dark:border-gray-700 light:border-gray-200">
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-300 font-tajawal dark:text-gray-300 light:text-gray-600">عناصر لكل صفحة:</span>
                <select
                  value={rowsPerPage}
                  onChange={handleChangeRowsPerPage}
                  className="p-1 bg-gray-700 rounded border border-blue-600 text-xs font-bold focus:border-blue-500 text-white dark:bg-gray-700 dark:text-white light:bg-gray-100 light:text-gray-900 light:border-blue-300"
                >
                  {[20, 50, 100].map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleChangePage(page - 1)}
                  disabled={page === 0}
                  className="px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded disabled:from-gray-600 disabled:to-gray-800 disabled:cursor-not-allowed hover:from-blue-600 hover:to-purple-600 transition-all duration-200 text-xs dark:from-blue-500 dark:to-purple-500 light:from-blue-400 light:to-purple-400"
                >
                  السابق
                </button>
                <span className="text-xs font-bold text-gray-300 px-2 py-1 bg-gray-700/50 rounded border border-gray-600 dark:text-gray-300 dark:bg-gray-700/50 dark:border-gray-600 light:text-gray-600 light:bg-gray-100/50 light:border-gray-200">
                  {`${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, totalItems)} من ${totalItems.toLocaleString()}`}
                </span>
                <button
                  onClick={() => handleChangePage(page + 1)}
                  disabled={page >= Math.ceil(totalItems / rowsPerPage) - 1}
                  className="px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded disabled:from-gray-600 disabled:to-gray-800 disabled:cursor-not-allowed hover:from-blue-600 hover:to-purple-600 transition-all duration-200 text-xs dark:from-blue-500 dark:to-purple-500 light:from-blue-400 light:to-purple-400"
                >
                  التالي
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-gray-800/80 backdrop-blur rounded-2xl shadow border border-gray-700/50 overflow-hidden dark:bg-gray-800/80 light:bg-white/80 light:border-gray-200/50">
          <div className="relative max-h-[70vh] overflow-y-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead className="bg-gradient-to-r from-blue-500 to-purple-500 sticky top-0 z-10 dark:from-blue-500 dark:to-purple-500 light:from-blue-400 light:to-purple-400">
                <tr>
                  {desktopColumns.map((header, index) => (
                    <th
                      key={index}
                      onClick={header.field ? () => handleSort(header.field) : undefined}
                      className={`p-2 text-center font-black text-white text-sm dark:text-white light:text-white ${header.field ? 'cursor-pointer hover:bg-blue-600/80 transition-colors duration-200 dark:hover:bg-blue-600/80 light:hover:bg-blue-500/80' : ''} border-b border-white/30 dark:border-white/30 light:border-white/50`}
                      style={{ width: header.width }}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {header.label}
                        {sortConfig.field === header.field && (
                          <span className="text-white text-sm animate-pulse dark:text-white light:text-white">
                            {sortConfig.direction === 'ASC' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(rowsPerPage)].map((_, i) => (
                    <tr key={i}>
                      {desktopColumns.map((_, j) => (
                        <td key={j} className="p-2">
                          <div className="animate-pulse bg-gray-700/50 h-4 mx-2 rounded"></div>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={desktopColumns.length} className="py-8 text-center">
                      <div className="text-gray-400 dark:text-gray-400 light:text-gray-500">
                        <h3 className="text-lg font-black mb-2 font-tajawal">لا توجد بيانات</h3>
                        <p className="text-sm">لم يتم العثور على أي حركات تطابق معايير البحث</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  movements.map((movement, index) => (
                    <DesktopMovementRow key={movement.id} movement={movement} index={index} />
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Compact Pagination */}
          <div className="p-3 border-t border-gray-700 bg-gray-800/50 backdrop-blur dark:border-gray-700 light:border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-300 font-tajawal dark:text-gray-300 light:text-gray-600">عناصر لكل صفحة:</span>
                <select
                  value={rowsPerPage}
                  onChange={handleChangeRowsPerPage}
                  className="p-2 bg-gray-700 rounded border border-blue-600 text-sm font-bold focus:border-blue-500 text-white dark:bg-gray-700 dark:text-white light:bg-gray-100 light:text-gray-900 light:border-blue-300"
                >
                  {[25, 50, 100].map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleChangePage(page - 1)}
                  disabled={page === 0}
                  className="px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded disabled:from-gray-600 disabled:to-gray-800 disabled:cursor-not-allowed hover:from-blue-600 hover:to-purple-600 transition-all duration-200 text-sm dark:from-blue-500 dark:to-purple-500 light:from-blue-400 light:to-purple-400"
                >
                  السابق
                </button>
                <span className="text-sm font-bold text-gray-300 px-3 py-2 bg-gray-700/50 rounded border border-gray-600 dark:text-gray-300 dark:bg-gray-700/50 dark:border-gray-600 light:text-gray-600 light:bg-gray-100/50 light:border-gray-200">
                  {`${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, totalItems)} من ${totalItems.toLocaleString()}`}
                </span>
                <button
                  onClick={() => handleChangePage(page + 1)}
                  disabled={page >= Math.ceil(totalItems / rowsPerPage) - 1}
                  className="px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded disabled:from-gray-600 disabled:to-gray-800 disabled:cursor-not-allowed hover:from-blue-600 hover:to-purple-600 transition-all duration-200 text-sm dark:from-blue-500 dark:to-purple-500 light:from-blue-400 light:to-purple-400"
                >
                  التالي
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Dialog - Compact with Shadow */}
      {filterDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
          <div className="w-full max-w-md bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl p-4 dark:from-gray-800 dark:to-gray-900 light:from-white light:to-gray-100">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-t-xl dark:from-blue-600 dark:to-purple-600 light:from-blue-400 light:to-purple-400">
              <div className="flex items-center gap-2">
                <span className="text-lg text-white">🛠️</span>
                <h2 className="text-base font-black text-white font-tajawal">فلاتر متقدمة</h2>
              </div>
            </div>
            <div className="p-3 grid grid-cols-1 gap-3 dark:text-gray-200 light:text-gray-800 max-h-60 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-gray-300 dark:text-gray-300 light:text-gray-600 mb-1">اسم الصنف</label>
                <input
                  type="text"
                  value={filters.itemName}
                  onChange={(e) => handleFilterChange('itemName', e.target.value)}
                  className="w-full p-2 bg-gray-700/50 rounded-lg border border-blue-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-tajawal text-white dark:bg-gray-700/50 dark:text-white light:bg-gray-100/50 light:text-gray-900 light:border-blue-300 light:focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 dark:text-gray-300 light:text-gray-600 mb-1">الكود</label>
                <input
                  type="text"
                  value={filters.code}
                  onChange={(e) => handleFilterChange('code', e.target.value)}
                  className="w-full p-2 bg-gray-700/50 rounded-lg border border-blue-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-tajawal text-white dark:bg-gray-700/50 dark:text-white light:bg-gray-100/50 light:text-gray-900 light:border-blue-300 light:focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 dark:text-gray-300 light:text-gray-600 mb-1">اللون</label>
                <input
                  type="text"
                  value={filters.color}
                  onChange={(e) => handleFilterChange('color', e.target.value)}
                  className="w-full p-2 bg-gray-700/50 rounded-lg border border-blue-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-tajawal text-white dark:bg-gray-700/50 dark:text-white light:bg-gray-100/50 light:text-gray-900 light:border-blue-300 light:focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 dark:text-gray-300 light:text-gray-600 mb-1">المصنع</label>
                <input
                  type="text"
                  value={filters.factory}
                  onChange={(e) => handleFilterChange('factory', e.target.value)}
                  className="w-full p-2 bg-gray-700/50 rounded-lg border border-blue-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-tajawal text-white dark:bg-gray-700/50 dark:text-white light:bg-gray-100/50 light:text-gray-900 light:border-blue-300 light:focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 dark:text-gray-300 light:text-gray-600 mb-1">المصدر</label>
                <input
                  type="text"
                  value={filters.source}
                  onChange={(e) => handleFilterChange('source', e.target.value)}
                  className="w-full p-2 bg-gray-700/50 rounded-lg border border-blue-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-tajawal text-white dark:bg-gray-700/50 dark:text-white light:bg-gray-100/50 light:text-gray-900 light:border-blue-300 light:focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 dark:text-gray-300 light:text-gray-600 mb-1">الوجهة</label>
                <input
                  type="text"
                  value={filters.destination}
                  onChange={(e) => handleFilterChange('destination', e.target.value)}
                  className="w-full p-2 bg-gray-700/50 rounded-lg border border-blue-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-tajawal text-white dark:bg-gray-700/50 dark:text-white light:bg-gray-100/50 light:text-gray-900 light:border-blue-300 light:focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 dark:text-gray-300 light:text-gray-600 mb-1">من تاريخ</label>
                <input
                  type="date"
                  value={filters.startDate ? formatDateForAPI(filters.startDate) : ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value ? new Date(e.target.value) : null)}
                  className="w-full p-2 bg-gray-700/50 rounded-lg border border-blue-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-tajawal text-white dark:bg-gray-700/50 dark:text-white light:bg-gray-100/50 light:text-gray-900 light:border-blue-300 light:focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 dark:text-gray-300 light:text-gray-600 mb-1">إلى تاريخ</label>
                <input
                  type="date"
                  value={filters.endDate ? formatDateForAPI(filters.endDate) : ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value ? new Date(e.target.value) : null)}
                  className="w-full p-2 bg-gray-700/50 rounded-lg border border-blue-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-tajawal text-white dark:bg-gray-700/50 dark:text-white light:bg-gray-100/50 light:text-gray-900 light:border-blue-300 light:focus:border-blue-400"
                />
              </div>
            </div>
            <div className="p-3 bg-gradient-to-r from-gray-700 to-gray-800 rounded-b-xl flex gap-2 dark:from-gray-700 dark:to-gray-800 light:from-gray-100 light:to-gray-200 light:text-gray-900">
              <button
                onClick={clearFilters}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-bold border border-gray-500 text-gray-300 hover:border-gray-400 hover:bg-gray-600 dark:border-gray-500 dark:text-gray-300 light:border-gray-300 light:text-gray-600 light:hover:bg-gray-200"
              >
                مسح الكل
              </button>
              <button
                onClick={() => setFilterDialogOpen(false)}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-bold border border-blue-500 text-blue-400 hover:border-blue-400 hover:bg-blue-900/30 dark:border-blue-500 dark:text-blue-400 light:border-blue-300 light:text-blue-600 light:hover:bg-blue-100/30"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  setFilterDialogOpen(false);
                  fetchMovements(page, rowsPerPage, sortConfig, filters);
                }}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-bold bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow dark:from-blue-500 dark:to-purple-500 light:from-blue-400 light:to-purple-400"
              >
                تطبيق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Details Dialog with Accessory and Factory Information */}
      {detailDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
          <div className="w-full max-w-2xl max-h-[90vh] bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl overflow-hidden dark:from-gray-800 dark:to-gray-900 light:from-white light:to-gray-100">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 dark:from-blue-600 dark:to-purple-600 light:from-blue-400 light:to-purple-400">
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg text-white">📦</span>
                <h2 className="text-base font-black text-white font-tajawal">تفاصيل حركة الصنف</h2>
              </div>
            </div>
            <div className="p-3 max-h-[60vh] overflow-y-auto dark:text-gray-200 light:text-gray-800">
              {selectedMovement && (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-blue-400 mb-2 flex items-center gap-2 font-black font-tajawal border-b border-blue-700 pb-1 text-sm dark:text-blue-400 light:text-blue-600 light:border-blue-300">
                      <span className="text-base">📦</span> المعلومات الأساسية
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <DetailItem icon="📦" label="الصنف" value={selectedMovement.itemName} />
                      <DetailItem icon="🔢" label="الكود" value={selectedMovement.code} valueColor="text-blue-400 dark:text-blue-400 light:text-blue-600" />
                      <DetailItem icon="🎨" label="اللون" value={selectedMovement.color} />
                      <div className="flex items-center gap-3 p-2 bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg shadow border border-gray-700 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700 light:from-white/80 light:to-gray-100 light:border-gray-200">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow dark:from-blue-500 dark:to-purple-600 light:from-blue-400 light:to-purple-500">
                          <span className="text-sm">↔</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-300 font-tajawal mb-1 dark:text-gray-300 light:text-gray-600">نوع الحركة</p>
                          <span
                            className={`font-bold text-xs px-2 py-1 rounded-lg text-white bg-gradient-to-r ${getMovementTypeColor(selectedMovement.movementType)}`}
                          >
                            {getMovementIcon(selectedMovement.movementType)} {selectedMovement.movementType}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-700 dark:border-gray-700 light:border-gray-200"></div>

                  <div>
                    <h3 className="text-blue-400 mb-2 flex items-center gap-2 font-black font-tajawal border-b border-blue-700 pb-1 text-sm dark:text-blue-400 light:text-blue-600 light:border-blue-300">
                      <span className="text-base">⚖️</span> الكميات والرصيد
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <DetailItem
                        icon="↑"
                        label="الكمية الداخلة"
                        value={selectedMovement.incomingQuantity.toLocaleString()}
                        valueColor={selectedMovement.incomingQuantity > 0 ? 'text-green-400 dark:text-green-400 light:text-green-600' : 'text-gray-400 dark:text-gray-400 light:text-gray-500'}
                        isImportant={selectedMovement.incomingQuantity > 0}
                      />
                      <DetailItem
                        icon="↓"
                        label="الكمية الخارجة"
                        value={selectedMovement.outgoingQuantity.toLocaleString()}
                        valueColor={selectedMovement.outgoingQuantity > 0 ? 'text-red-400 dark:text-red-400 light:text-red-600' : 'text-gray-400 dark:text-gray-400 light:text-gray-500'}
                        isImportant={selectedMovement.outgoingQuantity > 0}
                      />
                      <DetailItem
                        icon="⚖️"
                        label="الرصيد بعد الحركة"
                        value={selectedMovement.currentRemaining.toLocaleString()}
                        valueColor={selectedMovement.currentRemaining < 0 ? 'text-red-400 dark:text-red-400 light:text-red-600' : 'text-green-400 dark:text-green-400 light:text-green-600'}
                        isImportant={true}
                      />
                    </div>
                  </div>

                  {(selectedMovement.movementType === 'صرف مصنع' || selectedMovement.movementType === 'فاتورة صرف مصنع') && selectedMovement.factoryDispatchQuantities && (
                    <>
                      <div className="border-t border-gray-700 dark:border-gray-700 light:border-gray-200"></div>
                      <div>
                        <h3 className="text-blue-400 mb-2 flex items-center gap-2 font-black font-tajawal border-b border-blue-700 pb-1 text-sm dark:text-blue-400 light:text-blue-600 light:border-blue-300">
                          <span className="text-base">🏭</span> تفاصيل صرف المصنع
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <DetailItem
                            icon="📦"
                            label="عدد الكراتين المصروفة"
                            value={selectedMovement.factoryDispatchQuantities.cartons?.toLocaleString() || '0'}
                            valueColor="text-amber-400 dark:text-amber-400 light:text-amber-600"
                          />
                          <DetailItem
                            icon="📏"
                            label="الفردي المصروف"
                            value={selectedMovement.factoryDispatchQuantities.individual?.toLocaleString() || '0'}
                            valueColor="text-cyan-400 dark:text-cyan-400 light:text-cyan-600"
                          />
                          <DetailItem
                            icon="📊"
                            label="في الكرتونة"
                            value={selectedMovement.factoryDispatchQuantities.perCarton?.toLocaleString() || '0'}
                            valueColor="text-blue-400 dark:text-blue-400 light:text-blue-600"
                          />
                          <DetailItem
                            icon="∑"
                            label="الإجمالي المصروف"
                            value={selectedMovement.factoryDispatchQuantities.totalDispatched?.toLocaleString() || '0'}
                            valueColor="text-purple-400 dark:text-purple-400 light:text-purple-600"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {(selectedMovement.movementType === 'صرف اكسسوار' || selectedMovement.movementType === 'مرتجع اكسسوار') && selectedMovement.accessoryQuantities && (
                    <>
                      <div className="border-t border-gray-700 dark:border-gray-700 light:border-gray-200"></div>
                      <div>
                        <h3 className="text-amber-400 mb-2 flex items-center gap-2 font-black font-tajawal border-b border-amber-700 pb-1 text-sm dark:text-amber-400 light:text-amber-600 light:border-amber-300">
                          <span className="text-base">🛠️</span> تفاصيل الإكسسوار {selectedMovement.movementType === 'مرتجع اكسسوار' ? 'المسترجعة' : 'المصروفة'}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {[
                            { label: 'الإجمالي', key: 'total', icon: '📊' },
                            { label: 'البمب', key: 'pump', icon: '🔧' },
                            { label: 'الحلق', key: 'ring', icon: '💍' },
                            { label: 'الغطاء', key: 'cover', icon: '🛡️' },
                            { label: 'الشرائط', key: 'ribbons', icon: '🎀' },
                            { label: 'الاستيكرات', key: 'stickers', icon: '🏷️' },
                            { label: 'العلامات', key: 'tags', icon: '📛' },
                            { label: 'الكراتين المتبقية', key: 'cartons', icon: '📦' },
                            { label: 'الفردي المتبقي', key: 'individual', icon: '📏' },
                            { label: 'في الكرتونة', key: 'perCarton', icon: '📦' },
                          ].map(({ label, key, icon }) => (
                            <DetailItem
                              key={key}
                              icon={icon}
                              label={label}
                              value={selectedMovement.accessoryQuantities[key]?.toLocaleString() || '0'}
                              valueColor="text-amber-400 dark:text-amber-400 light:text-amber-600"
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="border-t border-gray-700 dark:border-gray-700 light:border-gray-200"></div>

                  <div>
                    <h3 className="text-blue-400 mb-2 flex items-center gap-2 font-black font-tajawal border-b border-blue-700 pb-1 text-sm dark:text-blue-400 light:text-blue-600 light:border-blue-300">
                      <span className="text-base">ℹ️</span> معلومات إضافية
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <DetailItem icon="📅" label="التاريخ" value={formatDisplayDate(selectedMovement.date)} />
                      <DetailItem icon="👤" label="المستخدم" value={selectedMovement.user} />
                      <DetailItem icon="📍" label="المصدر" value={selectedMovement.source} />
                      <DetailItem icon="📍" label="الوجهة" value={selectedMovement.destination} />
                      <DetailItem
                        icon="📝"
                        label="الملاحظات"
                        value={selectedMovement.notes}
                        valueColor="text-gray-300 dark:text-gray-300 light:text-gray-600"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-3 bg-gradient-to-r from-gray-700 to-gray-800 rounded-b-xl flex justify-end dark:from-gray-700 dark:to-gray-800 light:from-gray-100 light:to-gray-200 light:text-gray-900">
              <button
                onClick={() => setDetailDialogOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-bold bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow dark:from-blue-500 dark:to-purple-500 light:from-blue-400 light:to-purple-400"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemMovementsPage;

