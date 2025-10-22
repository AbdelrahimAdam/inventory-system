import React, { useState, useRef } from 'react';
import { 
  CloudUpload, 
  CloudDownload, 
  Database, 
  Shield, 
  Clock,
  AlertTriangle,
  CheckCircle2,
  Download,
  Upload,
  HardDrive,
  Server
} from 'lucide-react';

interface BackupFile {
  id: string;
  filename: string;
  size: string;
  createdAt: string;
  type: 'full' | 'partial';
  database: 'perfume_inventory';
  status: 'completed' | 'failed' | 'in_progress';
}

interface BackupStats {
  totalBackups: number;
  lastBackup: string;
  totalSize: string;
  successRate: number;
}

const BackupRestore: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore'>('backup');
  const [backupType, setBackupType] = useState<'full' | 'incremental'>('full');
  const [includeData, setIncludeData] = useState(true);
  const [includeSchema, setIncludeSchema] = useState(true);
  const [includeUsers, setIncludeUsers] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock data - replace with actual API calls
  const backupFiles: BackupFile[] = [
    {
      id: '1',
      filename: 'backup_2024_01_15_full.sql',
      size: '2.4 GB',
      createdAt: '2024-01-15 14:30:00',
      type: 'full',
      database: 'perfume_inventory',
      status: 'completed'
    },
    {
      id: '2',
      filename: 'backup_2024_01_14_incremental.sql',
      size: '450 MB',
      createdAt: '2024-01-14 02:00:00',
      type: 'partial',
      database: 'perfume_inventory',
      status: 'completed'
    },
    {
      id: '3',
      filename: 'backup_2024_01_13_full.sql',
      size: '2.3 GB',
      createdAt: '2024-01-13 02:00:00',
      type: 'full',
      database: 'perfume_inventory',
      status: 'completed'
    }
  ];

  const backupStats: BackupStats = {
    totalBackups: 24,
    lastBackup: '2024-01-15 14:30:00',
    totalSize: '28.5 GB',
    successRate: 98.2
  };

  const handleBackup = async () => {
    setIsLoading(true);
    setMessage(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const backupConfig = {
        type: backupType,
        includeData,
        includeSchema,
        includeUsers,
        database: 'perfume_inventory'
      };

      // Replace with actual backup API call
      console.log('Backup configuration:', backupConfig);
      
      setMessage({
        type: 'success',
        text: `Backup completed successfully! ${backupType === 'full' ? 'Full' : 'Incremental'} backup created.`
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Backup failed. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Replace with actual restore API call
      console.log('Restoring backup:', selectedBackup);
      
      setMessage({
        type: 'success',
        text: 'Database restored successfully from backup.'
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Restore failed. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Handle file upload logic here
      console.log('File selected:', file);
      setMessage({
        type: 'success',
        text: `Backup file "${file.name}" uploaded successfully. Ready to restore.`
      });
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const downloadBackup = (backupId: string) => {
    // Implement download logic
    console.log('Downloading backup:', backupId);
    setMessage({
      type: 'success',
      text: 'Backup download started.'
    });
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
                  {new Date(backupStats.lastBackup).toLocaleDateString()}
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
                <p className="text-sm font-semibold text-slate-900">{backupStats.totalSize}</p>
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
                <p className="text-sm font-semibold text-slate-900">{backupStats.successRate}%</p>
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
                  <CloudUpload className="w-4 h-4" />
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
                  <CloudDownload className="w-4 h-4" />
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
                          <Clock className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-slate-900">Incremental Backup</p>
                          <p className="text-sm text-slate-600">Only changes since last backup</p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Backup Options */}
                  <div className="bg-slate-50 rounded-xl p-6">
                    <h4 className="font-medium text-slate-900 mb-4">Backup Options</h4>
                    <div className="space-y-4">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeData}
                          onChange={(e) => setIncludeData(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span className="text-slate-700">Include all data records</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeSchema}
                          onChange={(e) => setIncludeSchema(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span className="text-slate-700">Include database schema</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeUsers}
                          onChange={(e) => setIncludeUsers(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span className="text-slate-700">Include user accounts and permissions</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Create Backup Button */}
                <button
                  onClick={handleBackup}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 px-6 rounded-xl font-semibold shadow-lg shadow-blue-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating Backup...
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-5 h-5" />
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
                    <p className="text-sm text-slate-500">SQL backup files only</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".sql,.backup"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Existing Backups */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Available Backups</h3>
                  <div className="space-y-3">
                    {backupFiles.map((backup) => (
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
                              {backup.type === 'full' ? <Database className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{backup.filename}</p>
                              <div className="flex items-center gap-4 text-sm text-slate-600">
                                <span>{backup.size}</span>
                                <span>{backup.createdAt}</span>
                                <span className="flex items-center gap-1">
                                  <div className={`w-2 h-2 rounded-full ${
                                    backup.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
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
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Restore Button */}
                <button
                  onClick={handleRestore}
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
                      <CloudDownload className="w-5 h-5" />
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