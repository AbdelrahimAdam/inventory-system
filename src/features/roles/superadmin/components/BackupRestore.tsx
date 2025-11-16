import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Download, 
  Database, 
  Shield, 
  Clock,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  Server,
  History,
  RefreshCw
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc,
  writeBatch,
  query,
  orderBy,
  where,
  Timestamp 
} from 'firebase/firestore';
import { db, storage } from '@/services/firebase';
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';

interface BackupFile {
  id: string;
  filename: string;
  size: number;
  createdAt: Timestamp;
  type: 'full' | 'incremental';
  collections: string[];
  status: 'completed' | 'failed' | 'in_progress';
  downloadUrl?: string;
}

interface BackupStats {
  totalBackups: number;
  lastBackup: Timestamp | null;
  totalSize: number;
  successRate: number;
}

const BackupRestore: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore'>('backup');
  const [backupType, setBackupType] = useState<'full' | 'incremental'>('full');
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const [backupStats, setBackupStats] = useState<BackupStats>({
    totalBackups: 0,
    lastBackup: null,
    totalSize: 0,
    successRate: 100
  });
  const [availableCollections, setAvailableCollections] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load available collections and backup files
  useEffect(() => {
    loadAvailableCollections();
    loadBackupFiles();
  }, []);

  const loadAvailableCollections = async () => {
    try {
      // Define the main collections you want to backup
      const collections = [
        'users',
        'products', 
        'categories',
        'invoices',
        'customers',
        'suppliers',
        'warehouseItems',
        'settings'
      ];
      setAvailableCollections(collections);
      setSelectedCollections(collections); // Select all by default
    } catch (error) {
      console.error('Error loading collections:', error);
    }
  };

  const loadBackupFiles = async () => {
    try {
      const backupsQuery = query(
        collection(db, 'backups'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(backupsQuery);
      
      const files: BackupFile[] = [];
      let totalSize = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        files.push({
          id: doc.id,
          ...data
        } as BackupFile);
        totalSize += data.size || 0;
      });

      setBackupFiles(files);
      
      // Calculate stats
      const stats: BackupStats = {
        totalBackups: files.length,
        lastBackup: files[0]?.createdAt || null,
        totalSize,
        successRate: files.filter(f => f.status === 'completed').length / files.length * 100
      };
      setBackupStats(stats);
    } catch (error) {
      console.error('Error loading backup files:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load backup files'
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: Timestamp): string => {
    return timestamp.toDate().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const createBackup = async () => {
    if (selectedCollections.length === 0) {
      setMessage({
        type: 'error',
        text: 'Please select at least one collection to backup'
      });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const backupId = `backup_${Date.now()}`;
      const backupData: any = {
        filename: `${backupId}.json`,
        type: backupType,
        collections: selectedCollections,
        status: 'in_progress',
        createdAt: Timestamp.now(),
        size: 0
      };

      // Create backup record
      const backupRef = await addDoc(collection(db, 'backups'), backupData);
      
      let totalSize = 0;
      const backupContent: any = {
        metadata: {
          version: '1.0',
          createdAt: new Date().toISOString(),
          type: backupType,
          collections: selectedCollections
        },
        data: {}
      };

      // Backup each selected collection
      for (const collectionName of selectedCollections) {
        try {
          const snapshot = await getDocs(collection(db, collectionName));
          const collectionData: any[] = [];
          
          snapshot.forEach(doc => {
            collectionData.push({
              id: doc.id,
              ...doc.data()
            });
          });

          backupContent.data[collectionName] = collectionData;
          totalSize += JSON.stringify(collectionData).length;
        } catch (error) {
          console.error(`Error backing up collection ${collectionName}:`, error);
        }
      }

      // Convert to JSON and create blob
      const jsonContent = JSON.stringify(backupContent, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      
      // Upload to Firebase Storage
      const storageRef = ref(storage, `backups/${backupId}.json`);
      await uploadBytes(storageRef, blob);
      
      // Get download URL
      const downloadUrl = await getDownloadURL(storageRef);

      // Update backup record with completed status
      await addDoc(collection(db, 'backups'), {
        ...backupData,
        id: backupRef.id,
        status: 'completed',
        size: totalSize,
        downloadUrl
      });

      setMessage({
        type: 'success',
        text: `Backup completed successfully! ${backupType === 'full' ? 'Full' : 'Incremental'} backup created.`
      });

      // Reload backup files
      await loadBackupFiles();
    } catch (error) {
      console.error('Backup error:', error);
      setMessage({
        type: 'error',
        text: 'Backup failed. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const restoreBackup = async () => {
    if (!selectedBackup) {
      setMessage({
        type: 'error',
        text: 'Please select a backup file to restore.'
      });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const backup = backupFiles.find(b => b.id === selectedBackup);
      if (!backup?.downloadUrl) {
        throw new Error('Backup file not found');
      }

      // Fetch backup data
      const response = await fetch(backup.downloadUrl);
      const backupContent = await response.json();

      const batch = writeBatch(db);
      let restoredCount = 0;

      // Restore each collection
      for (const [collectionName, documents] of Object.entries(backupContent.data)) {
        if (Array.isArray(documents)) {
          for (const docData of documents) {
            const docRef = doc(db, collectionName, docData.id);
            const { id, ...data } = docData;
            batch.set(docRef, data);
            restoredCount++;
          }
        }
      }

      // Commit the batch
      await batch.commit();

      setMessage({
        type: 'success',
        text: `Database restored successfully! ${restoredCount} documents restored.`
      });
    } catch (error) {
      console.error('Restore error:', error);
      setMessage({
        type: 'error',
        text: 'Restore failed. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setMessage(null);

    try {
      // Validate file type
      if (!file.name.endsWith('.json')) {
        throw new Error('Only JSON files are supported');
      }

      // Read and validate backup file
      const fileContent = await file.text();
      const backupData = JSON.parse(fileContent);

      if (!backupData.metadata || !backupData.data) {
        throw new Error('Invalid backup file format');
      }

      // Upload to Firebase Storage
      const backupId = `uploaded_${Date.now()}`;
      const storageRef = ref(storage, `backups/${backupId}.json`);
      await uploadBytes(storageRef, file);

      const downloadUrl = await getDownloadURL(storageRef);

      // Create backup record
      await addDoc(collection(db, 'backups'), {
        filename: file.name,
        type: 'full',
        collections: backupData.metadata.collections || [],
        status: 'completed',
        createdAt: Timestamp.now(),
        size: file.size,
        downloadUrl
      });

      setMessage({
        type: 'success',
        text: `Backup file "${file.name}" uploaded successfully. Ready to restore.`
      });

      await loadBackupFiles();
    } catch (error) {
      console.error('Upload error:', error);
      setMessage({
        type: 'error',
        text: 'Upload failed. Please check the file format.'
      });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const downloadBackup = async (backupId: string) => {
    try {
      const backup = backupFiles.find(b => b.id === backupId);
      if (!backup?.downloadUrl) {
        throw new Error('Download URL not available');
      }

      const response = await fetch(backup.downloadUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = backup.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setMessage({
        type: 'success',
        text: 'Backup download started.'
      });
    } catch (error) {
      console.error('Download error:', error);
      setMessage({
        type: 'error',
        text: 'Download failed. Please try again.'
      });
    }
  };

  const toggleCollection = (collectionName: string) => {
    setSelectedCollections(prev =>
      prev.includes(collectionName)
        ? prev.filter(c => c !== collectionName)
        : [...prev, collectionName]
    );
  };

  const selectAllCollections = () => {
    setSelectedCollections([...availableCollections]);
  };

  const deselectAllCollections = () => {
    setSelectedCollections([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Database Management
            </h1>
          </div>
          <p className="text-slate-600">Backup and restore your perfume inventory database</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <HardDrive className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Total Backups</p>
                <p className="text-2xl font-bold text-slate-900">{backupStats.totalBackups}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Last Backup</p>
                <p className="text-sm font-semibold text-slate-900">
                  {backupStats.lastBackup ? formatDate(backupStats.lastBackup) : 'Never'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Server className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Total Size</p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatFileSize(backupStats.totalSize)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Success Rate</p>
                <p className="text-sm font-semibold text-slate-900">
                  {backupStats.successRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-slate-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('backup')}
                className={`flex-1 py-4 px-6 text-center font-medium transition-all duration-200 ${
                  activeTab === 'backup'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" />
                  Create Backup
                </div>
              </button>
              <button
                onClick={() => setActiveTab('restore')}
                className={`flex-1 py-4 px-6 text-center font-medium transition-all duration-200 ${
                  activeTab === 'restore'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" />
                  Restore Backup
                </div>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {message && (
              <div
                className={`mb-6 p-4 rounded-xl border ${
                  message.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {message.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">{message.text}</span>
                </div>
              </div>
            )}

            {activeTab === 'backup' ? (
              <div className="space-y-6">
                {/* Backup Type Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Backup Configuration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <button
                      onClick={() => setBackupType('full')}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        backupType === 'full'
                          ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          backupType === 'full' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <Database className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-slate-900">Full Backup</p>
                          <p className="text-sm text-slate-600">Complete database backup</p>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => setBackupType('incremental')}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        backupType === 'incremental'
                          ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          backupType === 'incremental' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <History className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-slate-900">Incremental Backup</p>
                          <p className="text-sm text-slate-600">Only changes since last backup</p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Collection Selection */}
                  <div className="bg-slate-50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-slate-900">Select Collections</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={selectAllCollections}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Select All
                        </button>
                        <button
                          onClick={deselectAllCollections}
                          className="text-sm text-slate-600 hover:text-slate-700 font-medium"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {availableCollections.map(collection => (
                        <label key={collection} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedCollections.includes(collection)}
                            onChange={() => toggleCollection(collection)}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                          />
                          <span className="text-slate-700 capitalize">{collection}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Create Backup Button */}
                <button
                  onClick={createBackup}
                  disabled={isLoading || selectedCollections.length === 0}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 px-6 rounded-xl font-semibold shadow-lg shadow-blue-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating Backup...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Create Backup Now
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Upload Backup Section */}
                <div className="bg-slate-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Upload Backup File</h3>
                  <div
                    onClick={triggerFileInput}
                    className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer transition-all duration-200 hover:border-blue-400 hover:bg-blue-50/50"
                  >
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-700 mb-2">Click to upload or drag and drop</p>
                    <p className="text-sm text-slate-500">JSON backup files only</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Existing Backups */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">Available Backups</h3>
                    <button
                      onClick={loadBackupFiles}
                      className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh
                    </button>
                  </div>
                  <div className="space-y-3">
                    {backupFiles.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No backup files found</p>
                      </div>
                    ) : (
                      backupFiles.map((backup) => (
                        <div
                          key={backup.id}
                          className={`p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                            selectedBackup === backup.id
                              ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                          onClick={() => setSelectedBackup(backup.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                backup.type === 'full' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                              }`}>
                                {backup.type === 'full' ? <Database className="w-4 h-4" /> : <History className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{backup.filename}</p>
                                <div className="flex items-center gap-4 text-sm text-slate-600">
                                  <span>{formatFileSize(backup.size)}</span>
                                  <span>{formatDate(backup.createdAt)}</span>
                                  <span className="flex items-center gap-1">
                                    <div className={`w-2 h-2 rounded-full ${
                                      backup.status === 'completed' ? 'bg-green-500' : 
                                      backup.status === 'in_progress' ? 'bg-yellow-500' : 'bg-red-500'
                                    }`} />
                                    {backup.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadBackup(backup.id);
                                }}
                                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Download Backup"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Restore Button */}
                <button
                  onClick={restoreBackup}
                  disabled={isLoading || !selectedBackup}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-4 px-6 rounded-xl font-semibold shadow-lg shadow-emerald-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Restoring Database...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Restore Selected Backup
                    </>
                  )}
                </button>

                {/* Warning */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-amber-800">
                    <Shield className="w-4 h-4" />
                    <span className="text-sm font-medium">Important</span>
                  </div>
                  <p className="text-sm text-amber-700 mt-1">
                    Restoring a backup will replace all current data. This action cannot be undone.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupRestore;